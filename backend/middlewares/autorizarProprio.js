import { httpError } from '../utils/httpError.js';

export function autorizarProprio(chaveVinculo, parametro = 'id') {
  return (req, res, next) => {
    const proprio = String(req.usuario?.[chaveVinculo] ?? '') === String(req.params[parametro] ?? '');
    const administrador = req.usuario?.tipo_usuario === 'ADMINISTRADOR';
    if (!proprio && !administrador) {
      next(httpError(403, 'Você não pode acessar os dados de outra pessoa.'));
      return;
    }
    next();
  };
}
