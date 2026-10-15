import { pool } from '../db.js';

export class ErroNegocio extends Error {
  constructor(mensagem, status = 422) {
    super(mensagem);
    this.status = status;
  }
}

const formatarSenha = (serie, numero) => `${serie}-${String(numero).padStart(3, '0')}`;

async function buscarPorSessao(sessaoId) {
  const { rows } = await pool.query(
    `SELECT p.id, p.sessao_id, p.status, s.serie, s.numero
       FROM pedido p
       JOIN senha_atendimento s ON s.pedido_id = p.id
      WHERE p.sessao_id = $1`,
    [sessaoId]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    pedidoId: r.id,
    sessaoId: r.sessao_id,
    status: r.status,
    senha: formatarSenha(r.serie, r.numero),
  };
}

export async function registrarPedido({ sessaoId, itens, criadoEm }, { simularFalha = false } = {}) {
  // 1) Confere se os cortes existem e estão disponíveis (fora da transação).
  const ids = itens.map((i) => i.corteId);
  const { rows: cortes } = await pool.query(
    'SELECT id FROM corte WHERE id = ANY($1) AND disponivel',
    [ids]
  );
  if (cortes.length !== ids.length) {
    throw new ErroNegocio('Um ou mais cortes não existem ou estão indisponíveis.');
  }

  // 2) Transação única: pedido + itens + senha, tudo ou nada.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // RN-001: se já existe pedido para essa sessão, não cria outro.
    const ins = await client.query(
      `INSERT INTO pedido (sessao_id, criado_no_totem_em)
       VALUES ($1, $2)
       ON CONFLICT (sessao_id) DO NOTHING
       RETURNING id`,
      [sessaoId, criadoEm ?? new Date()]
    );

    if (ins.rowCount === 0) {
      await client.query('ROLLBACK');
      return { criado: false, pedido: await buscarPorSessao(sessaoId) };
    }

    const pedidoId = ins.rows[0].id;

    for (const it of itens) {
      await client.query(
        `INSERT INTO item_pedido (pedido_id, corte_id, quantidade, unidade)
         VALUES ($1, $2, $3, $4)`,
        [pedidoId, it.corteId, it.quantidade, it.unidade]
      );
    }

    const { rows } = await client.query(`SELECT nextval('senha_numero_seq') AS n`);
    await client.query(
      `INSERT INTO senha_atendimento (pedido_id, serie, numero) VALUES ($1, 'A', $2)`,
      [pedidoId, Number(rows[0].n)]
    );

    if (simularFalha) throw new Error('Falha simulada antes do COMMIT');

    await client.query('COMMIT'); // RN-004: só depois disto a senha pode ser devolvida
    return { criado: true, pedido: await buscarPorSessao(sessaoId) };
  } catch (erro) {
    await client.query('ROLLBACK').catch(() => {});
    throw erro;
  } finally {
    client.release();
  }
}