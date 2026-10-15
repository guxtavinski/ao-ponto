import { useEffect, useState } from 'react';
import { buscarCortes, registrarPedido } from '../api.js';

const UNIDADES = [
  { valor: 'peca', rotulo: 'Peça' },
  { valor: 'pedaco', rotulo: 'Pedaço' },
  { valor: 'fatia', rotulo: 'Fatia' },
  { valor: 'gramas', rotulo: 'Gramas' },
];

export default function TelaPedido({ sessaoId, aoConfirmar }) {
  const [cortes, setCortes] = useState([]);
  const [erroCardapio, setErroCardapio] = useState('');
  const [selecao, setSelecao] = useState({}); // { [corteId]: { quantidade, unidade } }
  const [erros, setErros] = useState([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    buscarCortes().then(setCortes).catch((e) => setErroCardapio(e.message));
  }, []);

  function alternarCorte(id) {
    setSelecao((atual) => {
      const copia = { ...atual };
      if (copia[id]) delete copia[id];
      else copia[id] = { quantidade: 1, unidade: null };
      return copia;
    });
  }

  function atualizar(id, mudanca) {
    setSelecao((atual) => ({ ...atual, [id]: { ...atual[id], ...mudanca } }));
  }

  async function confirmar() {
    const itens = Object.entries(selecao).map(([id, v]) => ({ corteId: Number(id), ...v }));
    const msgs = [];
    if (itens.length === 0) msgs.push('Selecione ao menos um corte.');
    itens.forEach((it) => {
      const nome = cortes.find((c) => c.id === it.corteId)?.nome;
      if (!(it.quantidade > 0)) msgs.push(`${nome}: informe uma quantidade maior que zero.`);
      if (!it.unidade) msgs.push(`${nome}: escolha a unidade de medida.`);
    });
    if (msgs.length > 0) return setErros(msgs);

    setErros([]);
    setEnviando(true);
    try {
      const pedido = await registrarPedido({
        sessaoId,
        criadoEm: new Date().toISOString(),
        itens,
      });
      aoConfirmar(pedido);
    } catch (e) {
      setErros([e.message]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="tela">
      <h1>Monte seu pedido</h1>
      <p>Toque nos cortes que deseja.</p>
      {erroCardapio && <p className="erros">{erroCardapio}</p>}

      <div className="grade">
        {cortes.map((c) => {
          const sel = selecao[c.id];
          return (
            <section key={c.id} className={`cartao ${sel ? 'ativo' : ''}`}>
              <button className="corte" onClick={() => alternarCorte(c.id)}>
                {c.nome} {sel ? '✓' : ''}
              </button>
              {sel && (
                <div className="detalhes">
                  <div className="quantidade">
                    <button aria-label="Diminuir"
                      onClick={() => atualizar(c.id, { quantidade: Math.max(0, sel.quantidade - 1) })}>−</button>
                    <strong>{sel.quantidade}</strong>
                    <button aria-label="Aumentar"
                      onClick={() => atualizar(c.id, { quantidade: sel.quantidade + 1 })}>+</button>
                  </div>
                  <div className="unidades">
                    {UNIDADES.map((u) => (
                      <button key={u.valor}
                        className={sel.unidade === u.valor ? 'marcada' : ''}
                        onClick={() => atualizar(c.id, { unidade: u.valor })}>
                        {u.rotulo}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {erros.length > 0 && (
        <ul className="erros" role="alert">
          {erros.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}

      <button className="confirmar" onClick={confirmar} disabled={enviando}>
        {enviando ? 'Enviando…' : 'Confirmar pedido'}
      </button>
    </main>
  );
}