import { Router } from 'express';
import { validarPedido } from '../validacao.js';
import { registrarPedido } from '../services/pedidoService.js';

const router = Router();

router.post('/', async (req, res) => {
  const erros = validarPedido(req.body);
  if (erros.length > 0) return res.status(422).json({ erros });

  const simularFalha =
    process.env.PERMITIR_SIMULACAO === 'true' && req.get('x-simular-falha') === 'true';

  const criadoEm = Date.parse(req.body.criadoEm) ? new Date(req.body.criadoEm) : new Date();

  const { criado, pedido } = await registrarPedido(
    { sessaoId: req.body.sessaoId, itens: req.body.itens, criadoEm },
    { simularFalha }
  );

  // 201 = pedido novo; 200 = já existia (reenvio), devolve o mesmo registro.
  res.status(criado ? 201 : 200).json(pedido);
});

export default router;