import conexao from '../database/conexao.js';
import { asyncHandler, httpError } from '../utils/httpError.js';

function criarPayload(body, campos) {
  const fonte = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  return Object.fromEntries(campos
    .filter((campo) => Object.hasOwn(fonte, campo))
    .map((campo) => [campo, fonte[campo]]));
}

export function crud(tabela, { campos, obrigatorios = [], validar = () => {} }) {
  return {
    listar: asyncHandler(async (req, res) => {
      const [registros] = await conexao.query(`SELECT * FROM ${tabela} ORDER BY id DESC`);
      res.json(registros);
    }),
    obter: asyncHandler(async (req, res) => {
      const [registros] = await conexao.execute(`SELECT * FROM ${tabela} WHERE id = ? LIMIT 1`, [req.params.id]);
      if (!registros.length) throw httpError(404, 'Registro não encontrado.');
      res.json(registros[0]);
    }),
    criar: asyncHandler(async (req, res) => {
      const dados = criarPayload(req.body, campos);
      if (obrigatorios.some((campo) => dados[campo] === undefined || dados[campo] === '')) {
        throw httpError(400, 'Preencha os campos obrigatórios.');
      }
      validar(dados);
      const nomes = Object.keys(dados);
      if (!nomes.length) throw httpError(400, 'Nenhum campo válido foi enviado.');
      validar(dados);
      const marcadores = nomes.map(() => '?').join(', ');
      const [resultado] = await conexao.execute(
        `INSERT INTO ${tabela} (${nomes.join(', ')}) VALUES (${marcadores})`,
        nomes.map((nome) => dados[nome]),
      );
      const [registros] = await conexao.execute(`SELECT * FROM ${tabela} WHERE id = ?`, [resultado.insertId]);
      res.status(201).json(registros[0]);
    }),
    atualizar: asyncHandler(async (req, res) => {
      const dados = criarPayload(req.body, campos);
      const nomes = Object.keys(dados);
      if (!nomes.length) throw httpError(400, 'Nenhum campo válido foi enviado.');
      const atribuicoes = nomes.map((nome) => `${nome} = ?`).join(', ');
      const [resultado] = await conexao.execute(
        `UPDATE ${tabela} SET ${atribuicoes} WHERE id = ?`,
        [...nomes.map((nome) => dados[nome]), req.params.id],
      );
      if (!resultado.affectedRows) throw httpError(404, 'Registro não encontrado.');
      const [registros] = await conexao.execute(`SELECT * FROM ${tabela} WHERE id = ?`, [req.params.id]);
      res.json(registros[0]);
    }),
    remover: asyncHandler(async (req, res) => {
      const [resultado] = await conexao.execute(`DELETE FROM ${tabela} WHERE id = ?`, [req.params.id]);
      if (!resultado.affectedRows) throw httpError(404, 'Registro não encontrado.');
      res.status(204).end();
    }),
  };
}
