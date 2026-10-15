export default function TelaSenha({ pedido, aoNovoPedido }) {
  return (
    <main className="tela centro">
      <h1>Pedido registrado!</h1>
      <p>Sua senha de atendimento:</p>
      <div className="senha" data-testid="senha">{pedido.senha}</div>
      <p>Acompanhe a chamada no painel.</p>
      <button className="confirmar" onClick={aoNovoPedido}>Novo pedido</button>
    </main>
  );
}