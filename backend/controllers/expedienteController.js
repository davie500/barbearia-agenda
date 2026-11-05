import conexao from '../database/conexao.js';
import { asyncHandler, httpError } from '../utils/httpError.js';

function validarExpediente(body) {
  const dia = Number(body.dia_semana);
  const horario = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
  const campos = ['inicio_expediente', 'fim_expediente'];
  if (!Number.isInteger(dia) || dia < 0 || dia > 6
      || campos.some((campo) => !horario.test(String(body[campo] ?? '')))) {
    throw httpError(400, 'Informe dia_semana entre 0 e 6 e horários válidos no formato HH:mm.');
  }
  const inicio = String(body.inicio_expediente).slice(0, 5);
  const fim = String(body.fim_expediente).slice(0, 5);
  if (inicio >= fim) throw httpError(400, 'O fim do expediente deve ser posterior ao início.');

  const inicioAlmoco = body.inicio_almoco || null;
  const fimAlmoco = body.fim_almoco || null;
  if ((inicioAlmoco && !horario.test(String(inicioAlmoco)))
      || (fimAlmoco && !horario.test(String(fimAlmoco)))
      || Boolean(inicioAlmoco) !== Boolean(fimAlmoco)) {
    throw httpError(400, 'Informe os dois horários de almoço ou deixe ambos vazios.');
  }
  if (inicioAlmoco && (String(inicioAlmoco).slice(0, 5) < inicio
      || String(fimAlmoco).slice(0, 5) > fim
      || String(inicioAlmoco).slice(0, 5) >= String(fimAlmoco).slice(0, 5))) {
    throw httpError(400, 'O intervalo de almoço deve ficar dentro do expediente.');
  }
  return {
    profissional_id: Number(body.profissional_id),
    dia_semana: dia,
    inicio_expediente: inicio,
    inicio_almoco: inicioAlmoco ? String(inicioAlmoco).slice(0, 5) : null,
    fim_almoco: fimAlmoco ? String(fimAlmoco).slice(0, 5) : null,
    fim_expediente: fim,
  };
}

export const listarPorBarbeiro = asyncHandler(async (req, res) => {
  const barbeiroId = Number(req.params.barbeiroId);
  if (req.usuario.tipo_usuario === 'BARBEIRO' && req.usuario.barbeiro_id !== barbeiroId) {
    throw httpError(403, 'Você só pode consultar o próprio expediente.');
  }
  const [rows] = await conexao.execute(
    'SELECT * FROM expediente WHERE profissional_id = ? ORDER BY dia_semana, inicio_expediente',
    [barbeiroId],
  );
  res.json(rows);
});

export const criar = asyncHandler(async (req, res) => {
  const dados = validarExpediente(req.body);
  if (!Number.isInteger(dados.profissional_id) || dados.profissional_id < 1) {
    throw httpError(400, 'Barbeiro inválido.');
  }
  const [result] = await conexao.execute(
    `INSERT INTO expediente
      (profissional_id, dia_semana, inicio_expediente, inicio_almoco, fim_almoco, fim_expediente)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [dados.profissional_id, dados.dia_semana, dados.inicio_expediente,
      dados.inicio_almoco, dados.fim_almoco, dados.fim_expediente],
  );
  const [rows] = await conexao.execute('SELECT * FROM expediente WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

export const atualizar = asyncHandler(async (req, res) => {
  const dados = validarExpediente(req.body);
  if (!Number.isInteger(dados.profissional_id) || dados.profissional_id < 1) {
    throw httpError(400, 'Barbeiro inválido.');
  }
  const [result] = await conexao.execute(
    `UPDATE expediente SET profissional_id = ?, dia_semana = ?, inicio_expediente = ?,
       inicio_almoco = ?, fim_almoco = ?, fim_expediente = ? WHERE id = ?`,
    [dados.profissional_id, dados.dia_semana, dados.inicio_expediente,
      dados.inicio_almoco, dados.fim_almoco, dados.fim_expediente, req.params.id],
  );
  if (!result.affectedRows) throw httpError(404, 'Expediente não encontrado.');
  res.json({ mensagem: 'Expediente atualizado.' });
});

export const remover = asyncHandler(async (req, res) => {
  const [result] = await conexao.execute('DELETE FROM expediente WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw httpError(404, 'Expediente não encontrado.');
  res.status(204).end();
});
