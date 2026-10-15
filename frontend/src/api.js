export async function buscarCortes() {
  const r = await fetch('/api/cortes');
  if (!r.ok) throw new Error('Não foi possível carregar o cardápio.');
  return r.json();
}

export async function registrarPedido(pedido) {
  let r;
  try {
    r = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
    });
  } catch {
    // Na Iteração 2, é AQUI que entra o caminho offline (IndexedDB).
    throw new Error('Sem conexão com o servidor. Tente novamente.');
  }
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erros?.join(' ') ?? 'Erro ao registrar o pedido.');
  return dados;
}

// crypto.randomUUID só existe em contexto seguro (HTTPS ou localhost).
// Como o totem pode abrir por IP da rede local em HTTP, deixamos um plano B.
export function novaSessaoId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}