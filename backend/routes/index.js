import { Router } from 'express';
import conexao from '../database/conexao.js';
import { cadastro, login, perfil } from '../controllers/authController.js';
import { crud } from '../controllers/crudController.js';
import { autenticar } from '../middlewares/autenticacao.js';
import { autorizar } from '../middlewares/autorizar.js';
import { autorizarProprio } from '../middlewares/autorizarProprio.js';
import * as expedienteController from '../controllers/expedienteController.js';
import * as agendamentoController from '../controllers/agendamentoController.js';
import * as usuarioController from '../controllers/usuarioController.js';
import { httpError } from '../utils/httpError.js';

const router = Router();

const clientes = crud('clientes', {
  campos: ['nome', 'email', 'telefone'],
  obrigatorios: ['nome', 'email'],
  validar(dados) {
    if (dados.nome !== undefined && String(dados.nome).trim().length < 2) {
      throw httpError(400, 'O nome do cliente deve ter ao menos 2 caracteres.');
    }
    if (dados.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(dados.email).trim())) {
      throw httpError(400, 'Informe um e-mail válido.');
    }
  },
});
const barbeiros = crud('barbeiros', {
  campos: ['nome', 'foto'],
  obrigatorios: ['nome'],
  validar(dados) {
    if (dados.nome !== undefined && String(dados.nome).trim().length < 2) {
      throw httpError(400, 'O nome do barbeiro deve ter ao menos 2 caracteres.');
    }
  },
});
const servicos = crud('servicos', {
  campos: ['nome', 'preco', 'duracao_minutos'],
  obrigatorios: ['nome', 'preco', 'duracao_minutos'],
  validar(dados) {
    if (dados.nome !== undefined && String(dados.nome).trim().length < 2) {
      throw httpError(400, 'O nome do serviço deve ter ao menos 2 caracteres.');
    }
    if (dados.preco !== undefined && (!Number.isFinite(Number(dados.preco)) || Number(dados.preco) < 0)) {
      throw httpError(400, 'O preço deve ser um número igual ou maior que zero.');
    }
    if (dados.duracao_minutos !== undefined
        && (!Number.isInteger(Number(dados.duracao_minutos)) || Number(dados.duracao_minutos) < 1)) {
      throw httpError(400, 'A duração deve ser um número inteiro positivo.');
    }
  },
});

router.post('/auth/cadastro', cadastro);
router.post('/auth/login', login);
router.get('/auth/perfil', ...perfil);

router.get('/health', async (req, res) => {
  try {
    await conexao.query('SELECT 1');
    res.json({ status: 'ok', banco: 'conectado' });
  } catch (error) {
    console.error('Falha ao verificar o banco MySQL.', error.code ?? error.message);
    res.status(503).json({ status: 'indisponível', banco: 'desconectado' });
  }
});

router.get('/clientes', autenticar, autorizar('ADMINISTRADOR'), clientes.listar);
router.get('/clientes/:id', autenticar, autorizarProprio('cliente_id'), clientes.obter);
router.post('/clientes', autenticar, autorizar('ADMINISTRADOR'), clientes.criar);
router.put('/clientes/:id', autenticar, autorizarProprio('cliente_id'), clientes.atualizar);
router.delete('/clientes/:id', autenticar, autorizar('ADMINISTRADOR'), clientes.remover);

router.get('/barbeiros', barbeiros.listar);
router.get('/barbeiros/:id', barbeiros.obter);
router.post('/barbeiros', autenticar, autorizar('ADMINISTRADOR'), barbeiros.criar);
router.put('/barbeiros/:id', autenticar, autorizar('ADMINISTRADOR'), barbeiros.atualizar);
router.delete('/barbeiros/:id', autenticar, autorizar('ADMINISTRADOR'), barbeiros.remover);

router.get('/servicos', servicos.listar);
router.get('/servicos/:id', servicos.obter);
router.post('/servicos', autenticar, autorizar('ADMINISTRADOR'), servicos.criar);
router.put('/servicos/:id', autenticar, autorizar('ADMINISTRADOR'), servicos.atualizar);
router.delete('/servicos/:id', autenticar, autorizar('ADMINISTRADOR'), servicos.remover);

router.get('/usuarios', autenticar, autorizar('ADMINISTRADOR'), usuarioController.listar);
router.post('/usuarios', autenticar, autorizar('ADMINISTRADOR'), usuarioController.criar);
router.put('/usuarios/:id', autenticar, autorizar('ADMINISTRADOR'), usuarioController.atualizar);
router.delete('/usuarios/:id', autenticar, autorizar('ADMINISTRADOR'), usuarioController.remover);

router.get('/expediente/:barbeiroId', autenticar, expedienteController.listarPorBarbeiro);
router.post('/expediente', autenticar, autorizar('ADMINISTRADOR'), expedienteController.criar);
router.put('/expediente/:id', autenticar, autorizar('ADMINISTRADOR'), expedienteController.atualizar);
router.delete('/expediente/:id', autenticar, autorizar('ADMINISTRADOR'), expedienteController.remover);

router.get('/agendamentos/disponibilidade', agendamentoController.disponibilidade);
router.get('/agendamentos/cliente/:clienteId', autenticar, agendamentoController.listarPorCliente);
router.get('/agendamentos/barbeiro/:barbeiroId', autenticar, agendamentoController.listarPorBarbeiro);
router.get('/agendamentos', autenticar, agendamentoController.listar);
router.get('/agendamentos/:id', autenticar, agendamentoController.obter);
router.post('/agendamentos', autenticar, agendamentoController.criar);
router.put('/agendamentos/:id', autenticar, agendamentoController.atualizar);
router.delete('/agendamentos/:id', autenticar, agendamentoController.cancelar);

export default router;
