import React, { useMemo, useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../../services/api";
// Importa artigos de ajuda (necessário para a aba Grimório)
import { HELP_ARTICLES, getSuggestedArticles } from "../../help/helpContent";
import "./HelpCenterModal.css";

const INITIAL_MSG = "Saudações, guerreiro. Eu sou o Oráculo. Meu conhecimento se limita aos segredos do UmbralTable. O que deseja saber?";

export default function HelpCenterModal({ isOpen, onClose, currentPath, onNavigate }) {
  const [activeTab, setActiveTab] = useState("oracle"); // <--- PADRÃO: ORÁCULO

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="help-backdrop"
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="help-modal"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
        >
          {/* Header */}
          <div className="help-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h2 className="help-title"><span style={{fontSize:'1.5rem'}}>🔮</span> O Oráculo</h2>
              <div className="help-tabs">
                <button 
                  className={`tab-btn ${activeTab === "oracle" ? "active" : ""}`} 
                  onClick={() => setActiveTab("oracle")}
                >
                  Chat com IA
                </button>
                <button 
                  className={`tab-btn ${activeTab === "grimoire" ? "active" : ""}`} 
                  onClick={() => setActiveTab("grimoire")}
                >
                  Grimório (Docs)
                </button>
              </div>
            </div>
            <button className="btn-close" onClick={onClose} title="Fechar">✕</button>
          </div>

          {/* Body */}
          <div className="help-body">
            {activeTab === "oracle" ? (
              <OracleChat currentPath={currentPath} />
            ) : (
              <GrimoireList currentPath={currentPath} onNavigate={onNavigate} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// --- Componente do Chat (Oráculo) ---
function OracleChat({ currentPath }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ id: 1, role: "oracle", text: INITIAL_MSG }]);
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setMessages(prev => [...prev, { id: Date.now(), role: "user", text: userText }]);
    setInput("");
    setTyping(true);

    try {
      // Chama o Backend (que chama o n8n)
      const res = await api.post("/ai/oracle", { 
        message: userText, 
        context: currentPath 
      }, { timeout: 60000 }); // Timeout maior para IA
      
      const aiText = res.data?.response || "O Oráculo permanece em silêncio...";
      setMessages(prev => [...prev, { id: Date.now()+1, role: "oracle", text: aiText }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now()+1, role: "oracle", text: "🔮 Interferência mágica detectada. (Erro de conexão)" }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="oracle-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="chat-history">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg ${msg.role}`}>
            <div className="msg-avatar">{msg.role === "oracle" ? "🧙‍♂️" : "👤"}</div>
            <div className="msg-bubble">{msg.text}</div>
          </div>
        ))}
        {typing && (
          <div className="msg oracle">
            <div className="msg-avatar">🧙‍♂️</div>
            <div className="msg-bubble" style={{ fontStyle: 'italic', opacity: 0.7 }}>Consultando os astros...</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input 
          className="chat-input"
          placeholder="Pergunte ao Oráculo..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={typing}
          autoFocus
        />
        <button type="submit" className="btn-send" disabled={typing || !input.trim()}>
          ENVIAR
        </button>
      </form>
    </div>
  );
}

// --- Componente da Lista (Grimório) ---
function GrimoireList({ currentPath, onNavigate }) {
  const [query, setQuery] = useState("");
  const [suggestOnly, setSuggestOnly] = useState(true);
  
  const suggested = useMemo(() => getSuggestedArticles(currentPath, 8), [currentPath]);

  // Garante que HELP_ARTICLES existe
  const articlesSource = window.HELP_ARTICLES || (Array.isArray(HELP_ARTICLES) ? HELP_ARTICLES : []);

  const articles = useMemo(() => {
    let base = articlesSource;
    
    if (suggestOnly && suggested.length > 0) {
      const ids = new Set(suggested.map((x) => x.id));
      base = base.filter((a) => ids.has(a.id));
    }

    const q = query.trim().toLowerCase();
    if (!q) return base;

    return base.filter((a) => 
      (a.title || "").toLowerCase().includes(q) || 
      (a.summary || "").toLowerCase().includes(q)
    );
  }, [query, suggestOnly, suggested, articlesSource]);

  return (
    <div className="grimorio-layout">
      {/* Coluna Esquerda: Lista */}
      <div className="col-list">
        <div className="filter-area">
          <input 
            className="search-input" 
            placeholder="🔍 Buscar no grimório..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="toggle-row" onClick={() => setSuggestOnly(!suggestOnly)}>
            <span>Sugestões desta tela</span>
            <div className={`switch ${suggestOnly ? "active" : ""}`}>
              <div className="switch-dot" />
            </div>
          </div>
        </div>

        <div className="article-scroll">
          {articles.length === 0 ? (
            <div style={{padding: 20, textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
              Nenhum pergaminho encontrado.
            </div>
          ) : (
            articles.map(a => (
              <div 
                key={a.id} 
                className="list-item"
                style={{marginBottom: 8}}
              >
                <span className="item-title">{a.title}</span>
                <span className="item-desc">{a.summary}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Coluna Direita: Placeholder de Leitura */}
      <div className="col-viewer">
        <div style={{display:'flex', height: '100%', alignItems:'center', justifyContent:'center', color: '#666'}}>
          Selecione um tópico para ler os detalhes.
        </div>
      </div>
    </div>
  );
}