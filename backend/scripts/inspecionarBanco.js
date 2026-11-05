import 'dotenv/config';
import mysql from 'mysql2/promise';

const conexao = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
});
const banco = process.env.DB_NAME ?? 'barbearia';

try {
  const [bancos] = await conexao.query('SELECT SCHEMA_NAME AS banco FROM information_schema.schemata ORDER BY SCHEMA_NAME');
  if (!bancos.some(({ banco: nome }) => nome === banco)) {
    console.log(JSON.stringify({ erro: `Banco '${banco}' não encontrado neste servidor.`, bancos }, null, 2));
    process.exitCode = 2;
  } else {
  const [tabelas] = await conexao.query(
    `SELECT TABLE_NAME AS tabela FROM information_schema.tables
      WHERE table_schema = ? ORDER BY TABLE_NAME`, [banco],
  );
  const [colunas] = await conexao.query(
    `SELECT TABLE_NAME AS tabela, COLUMN_NAME AS coluna, COLUMN_TYPE AS tipo,
            IS_NULLABLE AS aceita_nulo, COLUMN_DEFAULT AS valor_padrao
       FROM information_schema.columns WHERE table_schema = ?
       ORDER BY TABLE_NAME, ORDINAL_POSITION`, [banco],
  );
  const [chaves] = await conexao.query(
    `SELECT TABLE_NAME AS tabela, CONSTRAINT_NAME AS constraint_name,
            COLUMN_NAME AS coluna, REFERENCED_TABLE_NAME AS tabela_referenciada,
            REFERENCED_COLUMN_NAME AS coluna_referenciada
       FROM information_schema.key_column_usage
      WHERE table_schema = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, CONSTRAINT_NAME`, [banco],
  );
  const contagens = {};
  for (const { tabela } of tabelas) {
    const [rows] = await conexao.query(`SELECT COUNT(*) AS total FROM \`${banco}\`.\`${tabela}\``);
    contagens[tabela] = rows[0].total;
  }
  console.log(JSON.stringify({ banco, tabelas, colunas, chaves, contagens }, null, 2));
  }
} catch (error) {
  console.log(JSON.stringify({ erro: error.message }, null, 2));
  process.exitCode = 2;
} finally {
  await conexao.end();
}
