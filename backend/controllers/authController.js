import bcrypt from 'bcrypt';
import conexao from '../database/conexao.js';
import { autenticar, gerarToken, validarConfiguracaoJwt } from '../middlewares/autenticacao.js';
import { asyncHandler, httpError } from '../utils/httpError.js';

const saltRounds = 12;

function normalizarEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const cadastro = asyncHandler(async (req, res) => {
  validarConfiguracaoJwt();
  const nome = String(req.body.nome ?? '').trim();
  const email = normalizarEmail(req.body.email);
  const telefone = String(req.body.telefone ?? '').trim();
  const senha = String(req.body.senha ?? '');

  if (nome.length < 2 || !validarEmail(email) || telefone.length < 8 || senha.length < 8) {
    throw httpError(400, 'Informe nome, e-mail válido, telefone e senha com ao menos 8 caracteres.');
  }

  const conexaoTransacional = await conexao.getConnection();
  try {
    await conexaoTransacional.beginTransaction();
    const [usuariosExistentes] = await conexaoTransacional.execute(
      'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
      [email],
    );
    if (usuariosExistentes.length) throw httpError(409, 'Este e-mail já está cadastrado.');

    const hash = await bcrypt.hash(senha, saltRounds);
    const [resultadoCliente] = await conexaoTransacional.execute(
      'INSERT INTO clientes (nome, email, telefone) VALUES (?, ?, ?)',
      [nome, email, telefone],
    );
    const [resultadoUsuario] = await conexaoTransacional.execute(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario, cliente_id)
       VALUES (?, ?, ?, 'CLIENTE', ?)`,
      [nome, email, hash, resultadoCliente.insertId],
    );
    const usuario = {
      id: resultadoUsuario.insertId,
      nome,
      email,
      tipo_usuario: 'CLIENTE',
      cliente_id: resultadoCliente.insertId,
      barbeiro_id: null,
    };
    const token = gerarToken(usuario);
    await conexaoTransacional.commit();
    res.status(201).json({ token, usuario });
  } catch (error) {
    await conexaoTransacional.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw httpError(409, 'Este e-mail já está cadastrado.');
    throw error;
  } finally {
    conexaoTransacional.release();
  }
});

export const login = asyncHandler(async (req, res) => {
  const email = normalizarEmail(req.body.email);
  const senha = String(req.body.senha ?? '');
  if (!validarEmail(email) || !senha) throw httpError(400, 'Informe um e-mail válido e a senha.');

  const [usuarios] = await conexao.execute(
    `SELECT id, nome, email, senha, tipo_usuario, cliente_id, barbeiro_id
       FROM usuarios WHERE email = ? LIMIT 1`,
    [email],
  );
  const usuario = usuarios[0];
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
    throw httpError(401, 'E-mail ou senha incorretos.');
  }

  const { senha: senhaHash, ...perfil } = usuario;
  res.json({ token: gerarToken(perfil), usuario: perfil });
});

export const perfil = [autenticar, asyncHandler(async (req, res) => {
  const [usuarios] = await conexao.execute(
    `SELECT id, nome, email, tipo_usuario, cliente_id, barbeiro_id
       FROM usuarios WHERE id = ? LIMIT 1`,
    [req.usuario.sub],
  );
  if (!usuarios.length) throw httpError(401, 'Usuário não encontrado.');
  res.json({ usuario: usuarios[0] });
})];
