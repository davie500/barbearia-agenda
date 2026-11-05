import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origem não permitida pela configuração de CORS.'));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = error.status
    ?? (error.code === 'ER_DUP_ENTRY' ? 409
      : ['ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2'].includes(error.code) ? 409
        : error.code === 'ER_BAD_NULL_ERROR' ? 400
          : error.message?.includes('CORS') ? 403 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({
    erro: status >= 500 ? 'Erro interno do servidor.' : (error.status ? error.message : 'Operação incompatível com os dados existentes.'),
  });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, '0.0.0.0', () => {
  console.log(`BarberApp API disponível na porta ${port}.`);
});
