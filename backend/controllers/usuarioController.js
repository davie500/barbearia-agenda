import bcrypt from 'bcrypt';
import conexao from '../database/conexao.js';
import { asyncHandler, httpError } from '../utils/httpError.js';

const tipos = ['ADMINISTRADOR', 'BARBEIRO', 'CLIENTE'];

export const listar = asyncHandler(async (req, res) => {
  const [usuarios] = await conexao.execute(
    `SELECT id, nome, email, tipo_usuario, cliente_id, barbeiro_id
       FROM usuarios ORDER BY id DESC`,
  );
  res.json(usuarios);
});

export const criar = asyncHandler(async (req, res) => {
  const nome = String(req.body.nome ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const senha = String(req.body.senha ?? '');
  const tipo = String(req.body.tipo_usuario ?? '');
  const clienteId = req.body.cliente_id ? Number(req.body.cliente_id) : null;
  const barbeiroId = req.body.barbeiro_id ? Number(req.body.barbeiro_id) : null;
  if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || senha.length < 8 || !tipos.includes(tipo)) {
    throw httpError(400, 'Informe nome, e-mail válido, senha com 8 caracteres e tipo de usuário.');
  }
  const perfilValido = (tipo === 'ADMINISTRADOR' && !clienteId && !barbeiroId)
    || (tipo === 'CLIENTE' && Number.isInteger(clienteId) && clienteId > 0 && !barbeiroId)
    || (tipo === 'BARBEIRO' && Number.isInteger(barbeiroId) && barbeiroId > 0 && !clienteId);
  if (!perfilValido) throw httpError(400, 'Associe o usuário ao cadastro correspondente ao seu tipo.');

  const senhaHash = await bcrypt.hash(senha, 12);
  const [resultado] = await conexao.execute(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario, cliente_id, barbeiro_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [nome, email, senhaHash, tipo, clienteId, barbeiroId],
  );
  res.status(201).json({ id: resultado.insertId, nome, email, tipo_usuario: tipo, cliente_id: clienteId, barbeiro_id: barbeiroId });
});

export const atualizar = asyncHandler(async (req, res) => {
  const nome = String(req.body.nome ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, 'Informe nome e e-mail válidos.');
  }
  if (req.body.senha !== undefined && String(req.body.senha).length < 8) {
    throw httpError(400, 'A senha deve ter ao menos 8 caracteres.');
  }
  const conexaoTransacional = await conexao.getConnection();
  try {
    await conexaoTransacional.beginTransaction();
    if (req.body.senha !== undefined) {
      const senhaHash = await bcrypt.hash(String(req.body.senha), 12);
      await conexaoTransacional.execute(
        'UPDATE usuarios SET nome = ?, email = ?, senha = ? WHERE id = ?',
        [nome, email, senhaHash, req.params.id],
      );
    } else {
      await conexaoTransacional.execute(
        'UPDATE usuarios SET nome = ?, email = ? WHERE id = ?',
        [nome, email, req.params.id],
      );
    }
    const [rows] = await conexaoTransacional.execute(
      `SELECT id, nome, email, tipo_usuario, cliente_id, barbeiro_id
         FROM usuarios WHERE id = ? LIMIT 1`, [req.params.id],
    );
    if (!rows.length) throw httpError(404, 'Usuário não encontrado.');
    await conexaoTransacional.commit();
    res.json(rows[0]);
  } catch (error) {
    await conexaoTransacional.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw httpError(409, 'Este e-mail ou cadastro já está associado a outro usuário.');
    throw error;
  } finally {
    conexaoTransacional.release();
  }
});

export const remover = asyncHandler(async (req, res) => {
  if (Number(req.params.id) === Number(req.usuario.id)) {
    throw httpError(409, 'Não é possível excluir a própria conta de administrador.');
  }
  const [resultado] = await conexao.execute('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
  if (!resultado.affectedRows) throw httpError(404, 'Usuário não encontrado.');
  res.status(204).end();
});
