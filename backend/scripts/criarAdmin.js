import 'dotenv/config';
import bcrypt from 'bcrypt';
import conexao from '../database/conexao.js';

const nome = String(process.env.ADMINISTRADOR_NOME ?? '').trim();
const email = String(process.env.ADMINISTRADOR_EMAIL ?? '').trim().toLowerCase();
const senha = String(process.env.ADMINISTRADOR_SENHA ?? '');

try {
  if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || senha.length < 8) {
    throw new Error('Configure ADMINISTRADOR_NOME, ADMINISTRADOR_EMAIL e ADMINISTRADOR_SENHA (mínimo 8 caracteres) no backend/.env.');
  }
  const [existentes] = await conexao.execute(
    "SELECT id FROM usuarios WHERE tipo_usuario = 'ADMINISTRADOR' LIMIT 1",
  );
  if (existentes.length) throw new Error('Já existe um administrador. Use o painel para gerenciar usuários.');

  const hash = await bcrypt.hash(senha, 12);
  await conexao.execute(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario)
     VALUES (?, ?, ?, 'ADMINISTRADOR')`,
    [nome, email, hash],
  );
  console.log(`Administrador ${email} criado.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await conexao.end();
}
