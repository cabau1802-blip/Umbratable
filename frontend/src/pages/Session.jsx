import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {api} from "../services/api";
import useAuth from "../hooks/useAuth"; // Assumindo que você tem esse hook ou context

// Conecta no backend (ajuste a URL se precisar)
const socket = io("http://localhost:3000");

export default function SessionPage() {
  const { id: campaignId } = useParams();
  const { user } = useAuth(); // Pega usuário logado
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [campaign, setCampaign] = useState(null);
  
  // Referência para scrollar chat
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Carrega dados da campanha para saber se sou mestre/jogador
    api.get(`/campaigns/${campaignId}`)
      .then(res => setCampaign(res.data))
      .catch(err => console.error("Erro ao carregar campanha", err));

    // Conecta na sala
    socket.emit("join_campaign", campaignId);

    // Ouve mensagens
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, { type: 'chat', ...data }]);
    });

    // Ouve dados
    socket.on("dice_rolled", (data) => {
      setMessages((prev) => [...prev, { type: 'dice', ...data }]);
    });

    return () => {
      socket.off("receive_message");
      socket.off("dice_rolled");
    };
  }, [campaignId]);

  // Scroll automático do chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    socket.emit("send_message", {
      campaignId,
      username: user.username || user.email,
      message: inputMsg
    });
    setInputMsg("");
  };

  const rollDice = (sides) => {
    const result = Math.floor(Math.random() * sides) + 1;
    socket.emit("roll_dice", {
      campaignId,
      username: user.username || user.email,
      rollResult: result,
      diceType: `d${sides}`
    });
  };

  if (!campaign) return <div style={{color:'#fff'}}>Carregando Taverna...</div>;

  return (
    <div style={styles.container}>
      {/* HEADER DA SESSÃO */}
      <header style={styles.header}>
        <h2>{campaign.name}</h2>
        <div style={{fontSize:'0.8rem', opacity: 0.7}}>
          Você está jogando como: <strong>{user.username}</strong>
        </div>
      </header>

      <div style={styles.mainArea}>
        {/* ÁREA CENTRAL (Mesa / Mapa - Futuro) */}
        <div style={styles.board}>
            <div style={styles.placeholderMap}>
                <h3>Mapa da Aventura (Em breve)</h3>
                <p>Imagine uma masmorra escura aqui...</p>
                {/* Aqui entraremos com Canvas/Imagens no futuro */}
            </div>
            
            {/* Controles de Dados Rápidos */}
            <div style={styles.diceControls}>
                <button onClick={() => rollDice(20)} style={styles.d20}>Rolar D20</button>
                <button onClick={() => rollDice(6)} style={styles.diceBtn}>D6</button>
                <button onClick={() => rollDice(8)} style={styles.diceBtn}>D8</button>
                <button onClick={() => rollDice(10)} style={styles.diceBtn}>D10</button>
                <button onClick={() => rollDice(12)} style={styles.diceBtn}>D12</button>
            </div>
        </div>

        {/* BARRA LATERAL (Chat e Logs) */}
        <div style={styles.sidebar}>
          <div style={styles.chatLog}>
            {messages.map((msg, idx) => (
              <div key={idx} style={styles.msgRow}>
                {msg.type === 'dice' ? (
                   <div style={styles.diceMsg}>
                      🎲 <strong>{msg.username}</strong> rolou <strong>{msg.diceType}</strong>: 
                      <span style={styles.rollResult}>{msg.rollResult}</span>
                   </div>
                ) : (
                   <div style={styles.chatMsg}>
                      <strong>{msg.username}:</strong> {msg.message}
                   </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          <form onSubmit={sendMessage} style={styles.chatInputArea}>
            <input 
              style={styles.chatInput} 
              value={inputMsg} 
              onChange={e => setInputMsg(e.target.value)} 
              placeholder="Digite sua mensagem..." 
            />
            <button type="submit" style={styles.sendBtn}>Enviar</button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#e2e8f0' },
  header: { padding: '10px 20px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mainArea: { display: 'flex', flex: 1, overflow: 'hidden' },
  board: { flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', alignItems: 'center', justifyContent: 'center', background: '#020617' },
  placeholderMap: { width: '80%', height: '60%', border: '2px dashed #475569', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' },
  diceControls: { marginTop: '20px', display: 'flex', gap: '10px' },
  sidebar: { width: '350px', background: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column' },
  chatLog: { flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' },
  msgRow: { fontSize: '0.9rem' },
  chatMsg: { background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '4px' },
  diceMsg: { background: 'rgba(99, 102, 241, 0.2)', padding: '6px 10px', borderRadius: '4px', borderLeft: '3px solid #6366f1' },
  rollResult: { fontSize: '1.1rem', fontWeight: 'bold', color: '#fbbf24', marginLeft: '5px' },
  chatInputArea: { padding: '10px', background: '#0f172a', display: 'flex', gap: '5px' },
  chatInput: { flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #334155', background: '#1e293b', color: '#fff' },
  sendBtn: { padding: '8px 15px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  d20: { padding: '10px 20px', fontSize: '1rem', fontWeight: 'bold', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  diceBtn: { padding: '8px 12px', background: '#475569', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};
