import conexao from '../database/conexao.js';
import { asyncHandler, httpError } from '../utils/httpError.js';

const horaValida = /^([01]\d|2[0-3]):[0-5]\d$/;
const dataValida = /^\d{4}-\d{2}-\d{2}$/;
const statusValidos = ['Agendado', 'Confirmado', 'Em atendimento', 'Finalizado', 'Cancelado'];

function diaDaSemana(data) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

function agoraLocal() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const valor = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valor.year}-${valor.month}-${valor.day} ${valor.hour}:${valor.minute}:00`;
}

function validarData(data) {
  if (!dataValida.test(data)) throw httpError(400, 'Informe a data no formato AAAA-MM-DD.');
  const dataNormalizada = new Date(`${data}T12:00:00.000Z`);
  if (Number.isNaN(dataNormalizada.valueOf()) || dataNormalizada.toISOString().slice(0, 10) !== data) {
    throw httpError(400, 'Data inválida.');
  }
}

function minutos(hora) {
  const [h, m] = String(hora).split(':').map(Number);
  return (h * 60) + m;
}

function formatarHora(total) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function intervaloValido(expedientes, inicio, fim) {
  return expedientes.some((expediente) => {
    const inicioExpediente = minutos(expediente.inicio_expediente);
    const fimExpediente = minutos(expediente.fim_expediente);
    const dentro = inicio >= inicioExpediente && fim <= fimExpediente;
    const temAlmoco = expediente.inicio_almoco && expediente.fim_almoco;
    const cruzaAlmoco = temAlmoco
      && inicio < minutos(expediente.fim_almoco)
      && fim > minutos(expediente.inicio_almoco);
    return dentro && !cruzaAlmoco;
  });
}

async function buscarExpediente(barbeiroId, data) {
  const [rows] = await conexao.execute(
    'SELECT * FROM expediente WHERE profissional_id = ? AND dia_semana = ?',
    [barbeiroId, diaDaSemana(data)],
  );
  return rows;
}

async function buscarConflitos(barbeiroId, data, inicio, fim, ignorarId = null, db = conexao) {
  const parametros = [barbeiroId, data, fim, inicio];
  let sql = `SELECT id FROM agendamentos
      WHERE profissional_id = ? AND DATE(data_hora_inicio) = ?
        AND status <> 'Cancelado'
        AND data_hora_inicio < ? AND data_hora_fim > ?`;
  if (ignorarId !== null) {
    sql += ' AND id <> ?';
    parametros.push(ignorarId);
  }
  const [rows] = await db.execute(sql, parametros);
  return rows;
}

async function buscarServico(servicoId, db = conexao) {
  const [rows] = await db.execute(
    'SELECT id, nome, preco, duracao_minutos FROM servicos WHERE id = ? LIMIT 1',
    [servicoId],
  );
  const servico = rows[0];
  if (!servico) throw httpError(404, 'Serviço não encontrado.');
  if (!Number.isInteger(Number(servico.duracao_minutos)) || Number(servico.duracao_minutos) < 1) {
    throw httpError(409, 'O serviço tem duração inválida.');
  }
  return servico;
}

async function validarHorario({ barbeiroId, servicoId, data, hora, db = conexao, ignorarId = null }) {
  if (!horaValida.test(hora)) {
    throw httpError(400, 'Informe data no formato AAAA-MM-DD e horário no formato HH:mm.');
  }
  validarData(data);

  const servico = await buscarServico(servicoId, db);
  const inicioMinutos = minutos(hora);
  const fimMinutos = inicioMinutos + Number(servico.duracao_minutos);
  if (fimMinutos > 24 * 60) throw httpError(409, 'O serviço termina fora do horário permitido.');
  const fim = formatarHora(fimMinutos);
  const inicioDatetime = `${data} ${hora}:00`;
  const fimDatetime = `${data} ${fim}:00`;
  if (inicioDatetime <= agoraLocal()) throw httpError(409, 'Não é possível agendar em um horário passado.');

  const [barbeiros] = await db.execute('SELECT id FROM barbeiros WHERE id = ? LIMIT 1', [barbeiroId]);
  if (!barbeiros.length) throw httpError(404, 'Barbeiro não encontrado.');
  const expedientes = await buscarExpediente(barbeiroId, data);
  if (!intervaloValido(expedientes, inicioMinutos, fimMinutos)) {
    throw httpError(409, 'O horário está fora do expediente ou atravessa o intervalo de almoço.');
  }
  if ((await buscarConflitos(barbeiroId, data, fimDatetime, inicioDatetime, ignorarId, db)).length) {
    throw httpError(409, 'Este horário não está mais disponível.');
  }
  return { servico, inicioDatetime, fimDatetime };
}

export const disponibilidade = asyncHandler(async (req, res) => {
  const barbeiroId = Number(req.query.barbeiro_id);
  const servicoId = Number(req.query.servico_id);
  const data = String(req.query.data ?? '');
  if (!Number.isInteger(barbeiroId) || barbeiroId < 1 || !Number.isInteger(servicoId) || servicoId < 1) {
    throw httpError(400, 'Informe barbeiro_id, servico_id e data.');
  }
  validarData(data);

  const servico = await buscarServico(servicoId);
  const expedientes = await buscarExpediente(barbeiroId, data);
  const [agendamentos] = await conexao.execute(
    `SELECT data_hora_inicio, data_hora_fim FROM agendamentos
      WHERE profissional_id = ? AND DATE(data_hora_inicio) = ? AND status <> 'Cancelado'`,
    [barbeiroId, data],
  );
  const agora = agoraLocal();
  const duracao = Number(servico.duracao_minutos);
  const horarios = new Set();
  for (const expediente of expedientes) {
    const inicioExpediente = minutos(expediente.inicio_expediente);
    const fimExpediente = minutos(expediente.fim_expediente);
    for (let inicio = Math.ceil(inicioExpediente / 15) * 15; inicio + duracao <= fimExpediente; inicio += 15) {
      const fim = inicio + duracao;
      if (!intervaloValido([expediente], inicio, fim)) continue;
      const horario = formatarHora(inicio);
      if (`${data} ${horario}:00` <= agora) continue;
      const inicioCandidato = `${data} ${horario}:00`;
      const fimCandidato = `${data} ${formatarHora(fim)}:00`;
      const conflito = agendamentos.some((agendamento) => {
        return inicioCandidato < agendamento.data_hora_fim
          && fimCandidato > agendamento.data_hora_inicio;
      });
      if (!conflito) horarios.add(horario);
    }
  }
  res.json({ data, barbeiro_id: barbeiroId, servico, horarios: [...horarios].sort() });
});

export const criar = asyncHandler(async (req, res) => {
  if (req.usuario.tipo_usuario !== 'CLIENTE' || !req.usuario.cliente_id) {
    throw httpError(403, 'Somente clientes podem criar agendamentos.');
  }
  const barbeiroId = Number(req.body.barbeiro_id);
  const servicoId = Number(req.body.servico_id);
  if (!Number.isInteger(barbeiroId) || barbeiroId < 1 || !Number.isInteger(servicoId) || servicoId < 1) {
    throw httpError(400, 'Selecione um barbeiro e um serviço válidos.');
  }
  const data = String(req.body.data ?? '');
  const hora = String(req.body.horario ?? '');
  const nomeLock = `barberapp:${data}:${barbeiroId}`;
  const conexaoTransacional = await conexao.getConnection();
  let lockObtido = false;
  try {
    const [[lock]] = await conexaoTransacional.execute('SELECT GET_LOCK(?, 5) AS obtido', [nomeLock]);
    if (lock.obtido !== 1) throw httpError(409, 'Não foi possível reservar este horário agora; tente novamente.');
    lockObtido = true;
    await conexaoTransacional.beginTransaction();
    const horarioValidado = await validarHorario({
      barbeiroId, servicoId, data, hora, db: conexaoTransacional,
    });
    const [resultado] = await conexaoTransacional.execute(
      `INSERT INTO agendamentos
        (cliente_id, profissional_id, servico_id, data_hora_inicio, data_hora_fim, status)
       VALUES (?, ?, ?, ?, ?, 'Agendado')`,
      [req.usuario.cliente_id, barbeiroId, servicoId,
        horarioValidado.inicioDatetime, horarioValidado.fimDatetime],
    );
    await conexaoTransacional.commit();
    const [rows] = await conexao.execute(
      `SELECT a.id, a.data_hora_inicio, a.data_hora_fim, a.status,
              b.nome AS barbeiro, s.nome AS servico, s.preco
         FROM agendamentos a
         JOIN barbeiros b ON b.id = a.profissional_id
         JOIN servicos s ON s.id = a.servico_id WHERE a.id = ?`,
      [resultado.insertId],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    await conexaoTransacional.rollback();
    throw error;
  } finally {
    if (lockObtido) await conexaoTransacional.execute('SELECT RELEASE_LOCK(?)', [nomeLock]);
    conexaoTransacional.release();
  }
});

const consultaComDetalhes = `SELECT a.id, a.cliente_id, a.profissional_id AS barbeiro_id,
    a.servico_id, a.data_hora_inicio, a.data_hora_fim, a.status,
    c.nome AS cliente, c.telefone, b.nome AS barbeiro, s.nome AS servico, s.preco
  FROM agendamentos a
  JOIN clientes c ON c.id = a.cliente_id
  JOIN barbeiros b ON b.id = a.profissional_id
  JOIN servicos s ON s.id = a.servico_id`;

export const listar = asyncHandler(async (req, res) => {
  let filtro = '';
  let parametros = [];
  if (req.usuario.tipo_usuario === 'CLIENTE') {
    filtro = ' WHERE a.cliente_id = ?';
    parametros = [req.usuario.cliente_id];
  } else if (req.usuario.tipo_usuario === 'BARBEIRO') {
    filtro = ' WHERE a.profissional_id = ?';
    parametros = [req.usuario.barbeiro_id];
  }
  const [rows] = await conexao.execute(`${consultaComDetalhes}${filtro} ORDER BY a.data_hora_inicio DESC`, parametros);
  res.json(rows);
});

export const listarPorCliente = asyncHandler(async (req, res) => {
  const clienteId = Number(req.params.clienteId);
  if (req.usuario.tipo_usuario !== 'ADMINISTRADOR'
      && !(req.usuario.tipo_usuario === 'CLIENTE' && req.usuario.cliente_id === clienteId)) {
    throw httpError(403, 'Você só pode consultar seus próprios agendamentos.');
  }
  const [rows] = await conexao.execute(
    `${consultaComDetalhes} WHERE a.cliente_id = ? ORDER BY a.data_hora_inicio DESC`, [clienteId],
  );
  res.json(rows);
});

export const listarPorBarbeiro = asyncHandler(async (req, res) => {
  const barbeiroId = Number(req.params.barbeiroId);
  if (req.usuario.tipo_usuario !== 'ADMINISTRADOR'
      && !(req.usuario.tipo_usuario === 'BARBEIRO' && req.usuario.barbeiro_id === barbeiroId)) {
    throw httpError(403, 'Você só pode consultar seus próprios agendamentos.');
  }
  const [rows] = await conexao.execute(
    `${consultaComDetalhes} WHERE a.profissional_id = ? ORDER BY a.data_hora_inicio`, [barbeiroId],
  );
  res.json(rows);
});

export const obter = asyncHandler(async (req, res) => {
  const [rows] = await conexao.execute(`${consultaComDetalhes} WHERE a.id = ? LIMIT 1`, [req.params.id]);
  if (!rows.length) throw httpError(404, 'Agendamento não encontrado.');
  const agendamento = rows[0];
  const permitido = req.usuario.tipo_usuario === 'ADMINISTRADOR'
    || (req.usuario.tipo_usuario === 'CLIENTE' && req.usuario.cliente_id === agendamento.cliente_id)
    || (req.usuario.tipo_usuario === 'BARBEIRO' && req.usuario.barbeiro_id === agendamento.barbeiro_id);
  if (!permitido) throw httpError(403, 'Você não pode acessar este agendamento.');
  res.json(agendamento);
});

export const atualizar = asyncHandler(async (req, res) => {
  const [rows] = await conexao.execute('SELECT * FROM agendamentos WHERE id = ? LIMIT 1', [req.params.id]);
  const agendamento = rows[0];
  if (!agendamento) throw httpError(404, 'Agendamento não encontrado.');
  const status = String(req.body.status ?? '');
  if (!statusValidos.includes(status)) throw httpError(400, 'Status inválido.');
  const administrador = req.usuario.tipo_usuario === 'ADMINISTRADOR';
  const barbeiroResponsavel = req.usuario.tipo_usuario === 'BARBEIRO'
    && req.usuario.barbeiro_id === agendamento.profissional_id;
  if (!administrador && !barbeiroResponsavel) {
    throw httpError(403, 'Somente o administrador ou o barbeiro responsável pode alterar o status.');
  }
  if (barbeiroResponsavel && !['Confirmado', 'Em atendimento', 'Finalizado'].includes(status)) {
    throw httpError(403, 'O barbeiro pode confirmar, iniciar ou finalizar o atendimento.');
  }
  if (barbeiroResponsavel) {
    const transicoes = {
      Agendado: ['Confirmado'],
      Confirmado: ['Em atendimento'],
      'Em atendimento': ['Finalizado'],
      Finalizado: [],
      Cancelado: [],
    };
    if (!transicoes[agendamento.status]?.includes(status) && agendamento.status !== status) {
      throw httpError(409, 'Esta mudança de status não é permitida.');
    }
  }
  await conexao.execute('UPDATE agendamentos SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ mensagem: 'Status atualizado.', status });
});

export const cancelar = asyncHandler(async (req, res) => {
  const [rows] = await conexao.execute('SELECT * FROM agendamentos WHERE id = ? LIMIT 1', [req.params.id]);
  const agendamento = rows[0];
  if (!agendamento) throw httpError(404, 'Agendamento não encontrado.');
  const administrador = req.usuario.tipo_usuario === 'ADMINISTRADOR';
  const clienteResponsavel = req.usuario.tipo_usuario === 'CLIENTE'
    && req.usuario.cliente_id === agendamento.cliente_id;
  if (!administrador && !clienteResponsavel) throw httpError(403, 'Você não pode cancelar este agendamento.');
  if (clienteResponsavel && agendamento.data_hora_inicio <= agoraLocal()) {
    throw httpError(409, 'Só é possível cancelar agendamentos futuros.');
  }
  if (agendamento.status === 'Finalizado') throw httpError(409, 'Um atendimento finalizado não pode ser cancelado.');
  await conexao.execute("UPDATE agendamentos SET status = 'Cancelado' WHERE id = ?", [req.params.id]);
  res.json({ mensagem: 'Agendamento cancelado.', status: 'Cancelado' });
});
