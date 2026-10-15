export const UNIDADES = ['peca', 'pedaco', 'fatia', 'gramas'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validarPedido(corpo) {
  const erros = [];

  if (typeof corpo?.sessaoId !== 'string' || !UUID_RE.test(corpo.sessaoId)) {
    erros.push('sessaoId inválido (esperado um UUID).');
  }

  const itens = corpo?.itens;
  if (!Array.isArray(itens) || itens.length === 0) {
    erros.push('O pedido precisa ter ao menos um corte (RN-006).');
    return erros;
  }

  itens.forEach((it, i) => {
    const n = i + 1;
    if (!Number.isInteger(it?.corteId)) erros.push(`Item ${n}: corteId inválido.`);
    if (!Number.isInteger(it?.quantidade) || it.quantidade <= 0) {
      erros.push(`Item ${n}: informe uma quantidade maior que zero (RN-006).`);
    }
    if (!UNIDADES.includes(it?.unidade)) {
      erros.push(`Item ${n}: informe a unidade de medida (RN-007).`);
    }
  });

  const ids = itens.map((it) => it?.corteId);
  if (new Set(ids).size !== ids.length) erros.push('Há cortes repetidos no pedido.');

  return erros;
}