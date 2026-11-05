import { httpError } from '../utils/httpError.js';

export function autorizar(...tiposPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !tiposPermitidos.includes(req.usuario.tipo_usuario)) {
      next(httpError(403, 'Você não tem permissão para esta operação.'));
      return;
    }
    next();
  };
}
