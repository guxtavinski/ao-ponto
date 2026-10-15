import express from 'express';
import { pool } from './db.js';
import cortes from './routes/cortes.js';
import pedidos from './routes/pedidos.js';

const app = express();
app.use(express.json());

app.get('/api/saude', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
});
app.use('/api/cortes', cortes);
app.use('/api/pedidos', pedidos);

// No Express 5, erros em funções async caem aqui automaticamente.
app.use((err, _req, res, _next) => {
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ erros: [err.message] });
  }
  console.error(err);
  res.status(500).json({ erros: ['Erro interno ao registrar o pedido.'] });
});

const porta = process.env.PORT ?? 3000;
app.listen(porta, () => console.log(`API ouvindo na porta ${porta}`));