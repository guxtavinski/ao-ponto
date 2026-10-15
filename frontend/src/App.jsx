import { useState } from 'react';
import { novaSessaoId } from './api.js';
import TelaPedido from './telas/TelaPedido.jsx';
import TelaSenha from './telas/TelaSenha.jsx';

export default function App() {
  const [sessaoId, setSessaoId] = useState(novaSessaoId);
  const [pedido, setPedido] = useState(null);

  function novoPedido() {
    setPedido(null);
    setSessaoId(novaSessaoId());
  }

  return pedido
    ? <TelaSenha pedido={pedido} aoNovoPedido={novoPedido} />
    : <TelaPedido key={sessaoId} sessaoId={sessaoId} aoConfirmar={setPedido} />;
}