import jwt from 'jsonwebtoken';
import conexao from '../database/conexao.js';
import { httpError } from '../utils/httpError.js';

function segredoJwt() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'gere-um-segredo-longo-e-aleatorio') {
    throw httpError(500, 'JWT_SECRET não foi configurado no backend.');
  }
  return secret;
}

export function validarConfiguracaoJwt() {
  segredoJwt();
}

export function gerarToken(usuario) {
  return jwt.sign({
    sub: usuario.id,
    tipo_usuario: usuario.tipo_usuario,
    cliente_id: usuario.cliente_id,
    barbeiro_id: usuario.barbeiro_id,
  }, segredoJwt(), { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' });
}

export async function autenticar(req, res, next) {
  let secret;
  try {
    secret = segredoJwt();
  } catch (error) {
    next(error);
    return;
  }

  const authorization = req.get('Authorization') ?? '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    next(httpError(401, 'Token de acesso obrigatório.'));
    return;
  }

  let dadosToken;
  try {
    dadosToken = jwt.verify(token, secret);
  } catch {
    next(httpError(401, 'Token inválido ou expirado.'));
    return;
  }

  try {
    const [usuarios] = await conexao.execute(
      `SELECT id, nome, email, tipo_usuario, cliente_id, barbeiro_id
         FROM usuarios WHERE id = ? LIMIT 1`,
      [dadosToken.sub],
    );
    if (!usuarios.length) {
      next(httpError(401, 'Usuário não encontrado.'));
      return;
    }
    req.usuario = usuarios[0];
    next();
  } catch (error) {
    next(error);
  }
}
