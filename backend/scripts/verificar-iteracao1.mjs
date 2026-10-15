import pg from "pg";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.API_URL ?? "http://localhost:3000";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const falhas = [];

function resultado(id, descricao, ok, detalhe = "") {
  console.log(`${ok ? "PASSOU" : "FALHOU"}  ${id} — ${descricao}`);
  if (detalhe) console.log(`            ${detalhe}`);
  if (!ok) falhas.push(id);
}

async function post(corpo, cabecalhos = {}) {
  const t0 = performance.now();
  const r = await fetch(`${BASE}/api/pedidos`, {
    method: "POST",
    headers: { "content-type": "application/json", ...cabecalhos },
    body: JSON.stringify(corpo),
  });
  const ms = performance.now() - t0;
  const json = await r.json().catch(() => null);
  return { status: r.status, json, ms };
}

const contar = async (sql, sessaoId) =>
  (await pool.query(sql, [sessaoId])).rows[0].n;
const pedidosDa = (s) =>
  contar("SELECT count(*)::int AS n FROM pedido WHERE sessao_id = $1", s);
const senhasDa = (s) =>
  contar(
    `SELECT count(*)::int AS n FROM senha_atendimento s
     JOIN pedido p ON p.id = s.pedido_id WHERE p.sessao_id = $1`,
    s,
  );

const cortes = await (await fetch(`${BASE}/api/cortes`)).json();
const item = (extra = {}) => ({
  corteId: cortes[0].id,
  quantidade: 1,
  unidade: "peca",
  ...extra,
});

console.log("\n=== Verificação — Iteração 1 (registro de pedido online) ===\n");

// US01 (critérios 1 e 2): senha exibida corresponde a pedido persistido
{
  let ok = true,
    amostra = "";
  for (let i = 0; i < 5; i++) {
    const sessaoId = randomUUID();
    const r = await post({ sessaoId, itens: [item()] });
    const { rows } = await pool.query(
      `SELECT s.serie || '-' || lpad(s.numero::text, 3, '0') AS senha
         FROM senha_atendimento s JOIN pedido p ON p.id = s.pedido_id
        WHERE p.sessao_id = $1`,
      [sessaoId],
    );
    const noBanco = rows[0]?.senha;
    if (r.status !== 201 || !noBanco || noBanco !== r.json?.senha) ok = false;
    amostra = `última execução: API devolveu ${r.json?.senha}, banco tem ${noBanco}`;
  }
  resultado(
    "US01 (criterios 1 e 2)",
    "senha exibida corresponde a pedido gravado (5/5 execuções)",
    ok,
    amostra,
  );
}

// RN-001: no máximo um pedido por sessão
{
  const sessaoId = randomUUID();
  const a = await post({ sessaoId, itens: [item()] });
  const b = await post({ sessaoId, itens: [item()] });
  const n = await pedidosDa(sessaoId);
  resultado(
    "RN-001",
    "mesma sessão enviada 2x gera um único pedido",
    a.status === 201 &&
      b.status === 200 &&
      n === 1 &&
      a.json.senha === b.json.senha,
    `1º envio: ${a.status} (${a.json?.senha}) | 2º envio: ${b.status} (${b.json?.senha}) | registros no banco: ${n}`,
  );
}

// RN-004: falha antes do COMMIT não pode emitir senha
{
  const sessaoId = randomUUID();
  const r = await post(
    { sessaoId, itens: [item()] },
    { "x-simular-falha": "true" },
  );
  const p = await pedidosDa(sessaoId);
  const s = await senhasDa(sessaoId);
  resultado(
    "RN-004",
    "falha simulada não emite senha nem deixa pedido gravado",
    r.status === 500 && !r.json?.senha && p === 0 && s === 0,
    `status: ${r.status} | pedidos: ${p} | senhas: ${s}` +
      (r.status === 201 ? " (PERMITIR_SIMULACAO não está ativo?)" : ""),
  );
}

// RN-006: pedido vazio e quantidade zero
{
  const s1 = randomUUID(),
    s2 = randomUUID();
  const vazio = await post({ sessaoId: s1, itens: [] });
  const zero = await post({ sessaoId: s2, itens: [item({ quantidade: 0 })] });
  const ok =
    vazio.status === 422 &&
    zero.status === 422 &&
    (await pedidosDa(s1)) === 0 &&
    (await pedidosDa(s2)) === 0;
  resultado(
    "RN-006",
    "pedido vazio e quantidade zero são bloqueados",
    ok,
    `vazio: ${vazio.status} | quantidade 0: ${zero.status}`,
  );
}

// RN-007: unidade obrigatória
{
  const sessaoId = randomUUID();
  const r = await post({
    sessaoId,
    itens: [{ corteId: cortes[0].id, quantidade: 1 }],
  });
  resultado(
    "RN-007",
    "item sem unidade de medida é bloqueado",
    r.status === 422 && (await pedidosDa(sessaoId)) === 0,
    `status: ${r.status} — ${r.json?.erros?.[0]}`,
  );
}

// RNF-001: 95% dos registros em até 2 s (amostra de 30)
{
  const N = 30,
    tempos = [];
  for (let i = 0; i < N; i++) {
    const r = await post({ sessaoId: randomUUID(), itens: [item()] });
    if (r.status !== 201)
      console.log("   aviso: registro de teste falhou", r.status);
    tempos.push(r.ms);
  }
  const ordenados = [...tempos].sort((x, y) => x - y);
  const p95 = ordenados[Math.ceil(0.95 * N) - 1];
  const dentro = tempos.filter((t) => t <= 2000).length;
  mkdirSync("evidencias", { recursive: true });
  writeFileSync(
    "evidencias/iteracao1-desempenho.csv",
    "execucao,tempo_ms\n" +
      tempos.map((t, i) => `${i + 1},${t.toFixed(1)}`).join("\n"),
  );
  resultado(
    "RNF-001",
    `95% dos ${N} registros em até 2 s`,
    dentro / N >= 0.95,
    `dentro do limite: ${dentro}/${N} | p95: ${p95.toFixed(1)} ms | CSV em evidencias/iteracao1-desempenho.csv`,
  );
}

await pool.end();
console.log(
  falhas.length
    ? `\nFALHAS: ${falhas.join(", ")}\n`
    : "\nTodas as verificações passaram.\n",
);
process.exit(falhas.length ? 1 : 0);
