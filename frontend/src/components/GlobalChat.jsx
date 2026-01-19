import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useChat } from "../context/ChatContext";
import UserProfileModal from "./modals/UserProfileModal";

const CSS_STYLES = `
  :root{
    --chat-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .chat-container-anim { transition: all 0.22s var(--chat-ease); }

  .chat-glass {
    background: rgba(10, 10, 14, 0.92);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.14);
    box-shadow: 0 -12px 60px rgba(0,0,0,0.65);
  }

  .chat-header-gradient {
    background: linear-gradient(135deg, rgba(250,204,21,0.18), rgba(37,99,235,0.25));
  }

  .toast-popup {
    animation: slideInRight 0.42s var(--chat-ease);
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(10px);
    border-left: 4px solid #facc15;
    box-shadow: 0 14px 45px rgba(0,0,0,0.55);
  }

  @keyframes slideInRight {
    from { transform: translateX(120%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  .chat-msg-me {
    background: rgba(37,99,235,0.22);
    border: 1px solid rgba(37,99,235,0.35);
    color: #dbeafe;
    border-radius: 16px 16px 4px 16px;
  }
  .chat-msg-other {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    color: #e5e7eb;
    border-radius: 16px 16px 16px 4px;
  }

  .chat-btn-action{
    transition: transform 120ms var(--chat-ease), background 180ms var(--chat-ease), border-color 180ms var(--chat-ease);
  }
  .chat-btn-action:hover{
    transform: translateY(-1px);
    background: rgba(255,255,255,0.14) !important;
  }

  .chat-input{
    transition: box-shadow 180ms var(--chat-ease), border-color 180ms var(--chat-ease), background 180ms var(--chat-ease);
  }
  .chat-input:focus{
    border-color: rgba(250,204,21,0.45) !important;
    box-shadow: 0 0 0 4px rgba(250,204,21,0.12);
    background: rgba(255,255,255,0.06) !important;
  }

  .clickable-name{
    cursor: pointer;
    transition: 160ms var(--chat-ease);
  }
  .clickable-name:hover{
    color: #facc15;
    text-shadow: 0 0 10px rgba(250,204,21,0.22);
  }

  .chat-select{
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    color: #e5e7eb;
    padding: 8px 34px 8px 12px;
    font-size: 12px;
    outline: none;
    transition: 180ms var(--chat-ease);
  }
  .chat-select:focus{
    border-color: rgba(250,204,21,0.45);
    box-shadow: 0 0 0 4px rgba(250,204,21,0.12);
  }
  .chat-select-wrap{
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .chat-select-caret{
    position: absolute;
    right: 12px;
    pointer-events: none;
    opacity: 0.85;
    font-size: 10px;
  }

  .chat-meta-line{
    font-size: 11px;
    opacity: 0.85;
    margin-bottom: 6px;
    color: rgba(226,232,240,0.95);
    letter-spacing: 0.2px;
  }
  .chat-meta-pill{
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(250,204,21,0.10);
    border: 1px solid rgba(250,204,21,0.25);
    color: rgba(250,204,21,0.95);
  }

  @media (prefers-reduced-motion: reduce) {
    .toast-popup { animation: none !important; }
    .chat-container-anim { transition: none !important; }
  }
`;

export default function GlobalChat() {
  const {
    activeChatId,
    closeChat,
    isMinimized,
    setIsMinimized,
    sendMessage,
    getActiveChatMessages,
    getActiveChatName,
    notification,
    getActiveCampaignMeta,
  } = useChat();

  const [msg, setMsg] = useState("");
  const scrollRef = useRef(null);
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);

  const isInSession = location.pathname.includes("/session");
  const isCampaignChat = typeof activeChatId === "string" && activeChatId.startsWith("campaign:");

  const messages = useMemo(() => getActiveChatMessages(), [getActiveChatMessages]);
  const activeName = getActiveChatName();

  const campaignMeta = getActiveCampaignMeta?.() || null;
  const campaignUsers = Array.isArray(campaignMeta?.users) ? campaignMeta.users : [];
  const campaignRole = campaignMeta?.role || "PLAYER";

  const [recipientId, setRecipientId] = useState("all");

  // reseta o destinatário quando trocar o chat
  useEffect(() => {
    setRecipientId("all");
  }, [activeChatId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, isMinimized]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;

    if (isCampaignChat) {
      const to = recipientId === "all" ? null : String(recipientId);
      const toName =
        to && campaignUsers.find((u) => String(u.id) === String(to))?.name
          ? campaignUsers.find((u) => String(u.id) === String(to))?.name
          : "";

      sendMessage(msg, { toUserId: to, toUserName: toName });
    } else {
      sendMessage(msg);
    }

    setMsg("");
  };

  const renderToast = () => {
    if (!notification) return null;
    return (
      <div className="toast-popup" style={styles.toast} role="status" aria-live="polite">
        <div style={{ fontSize: 22 }}>💬</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, color: "#facc15", fontSize: 12, letterSpacing: 1 }}>NOVA MENSAGEM</div>
          <div style={{ fontSize: 13, color: "#e2e8f0", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {notification}
          </div>
        </div>
      </div>
    );
  };

  if (!activeChatId) {
    return (
      <>
        <style>{CSS_STYLES}</style>
        {renderToast()}
      </>
    );
  }

  return (
    <>
      <style>{CSS_STYLES}</style>

      {renderToast()}

      <div
        className="chat-container-anim chat-glass"
        style={{
          ...styles.container,
          height: isMinimized ? "48px" : isCampaignChat ? "470px" : "420px",
          transform: isMinimized ? "translateY(0)" : "translateY(0)",
        }}
        aria-label="Chat"
      >
        <div
          className="chat-header-gradient"
          style={styles.header}
          onClick={() => setIsMinimized(!isMinimized)}
          role="button"
          tabIndex={0}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={styles.statusDot}></div>

            <span
              className={!isCampaignChat ? "clickable-name" : ""}
              style={{ fontSize: 14, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              onClick={(e) => {
                if (isCampaignChat) return;
                e.stopPropagation();
                setProfileOpen(true);
              }}
              title={!isCampaignChat ? "Ver perfil" : "Chat da sessão"}
            >
              {activeName}
            </span>

            {isInSession && isCampaignChat ? (
              <span style={{ fontSize: 11, opacity: 0.85, marginLeft: 6, color: "rgba(226,232,240,0.9)" }}>
                {campaignRole === "GM" ? "GM" : "Player"}
              </span>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="chat-btn-action"
              style={styles.btnAction}
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              title={isMinimized ? "Maximizar" : "Minimizar"}
              type="button"
              aria-label={isMinimized ? "Maximizar" : "Minimizar"}
            >
              {isMinimized ? "▲" : "−"}
            </button>

            <button
              className="chat-btn-action"
              style={styles.btnAction}
              onClick={(e) => { e.stopPropagation(); closeChat(); }}
              title="Fechar"
              type="button"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          style={{
            ...styles.bodyContainer,
            opacity: isMinimized ? 0 : 1,
            pointerEvents: isMinimized ? "none" : "auto",
          }}
        >
          {/* Se for chat da campanha, mostra seletor de destinatário */}
          {isCampaignChat ? (
            <div style={{ padding: "10px 12px 0 12px" }}>
              <div className="chat-select-wrap">
                <div style={{ fontSize: 12, color: "rgba(226,232,240,0.9)", fontWeight: 800, letterSpacing: 0.2 }}>
                  Enviar para:
                </div>
                <div className="chat-select-wrap" style={{ flex: 1 }}>
                  <select
                    className="chat-select"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    aria-label="Destino da mensagem"
                    style={{ width: "100%" }}
                  >
                    <option value="all">Geral (todos)</option>
                    <option disabled>──────────</option>
                    {campaignUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <span className="chat-select-caret">▼</span>
                </div>
              </div>
            </div>
          ) : null}

          <div style={styles.messagesArea} ref={scrollRef}>
            {messages.map((m, i) => {
              const kind = m?.meta?.kind;
              const isWhisper = kind === "whisper";

              let metaText = "";
              if (isWhisper) {
                const from = m?.meta?.fromUserName || "";
                const to = m?.meta?.toUserName || "";
                if (campaignRole === "GM") {
                  metaText = to ? `Sussurro: ${from} → ${to}` : `Sussurro: ${from}`;
                } else {
                  // player: mostra algo simples sem “vazar” contexto
                  metaText = m.sender === "me" ? (to ? `Sussurro para ${to}` : "Sussurro") : `Sussurro de ${from || "alguém"}`;
                }
              }

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: m.sender === "me" ? "flex-end" : "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ maxWidth: "80%" }}>
                    {isWhisper ? (
                      <div className="chat-meta-line">
                        <span className="chat-meta-pill">🔒 {metaText}</span>
                      </div>
                    ) : null}

                    <div className={m.sender === "me" ? "chat-msg-me" : "chat-msg-other"} style={styles.bubble}>
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSend} style={styles.footer}>
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              style={styles.input}
              className="chat-input"
              placeholder={isCampaignChat ? "Digite sua mensagem para a sessão..." : "Digite sua mensagem..."}
              autoFocus
              aria-label="Mensagem"
            />
            <button type="submit" style={styles.sendBtn} aria-label="Enviar">➤</button>
          </form>
        </div>
      </div>

      {/* Modal de perfil só faz sentido no DM */}
      {!isCampaignChat ? (
        <UserProfileModal
          userId={activeChatId}
          fallbackName={activeName}
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          onMessage={() => {
            setProfileOpen(false);
            setIsMinimized(false);
          }}
        />
      ) : null}
    </>
  );
}

const styles = {
  container: {
    position: "fixed", bottom: 0, right: 30, width: 340,
    borderRadius: "16px 16px 0 0", display: "flex", flexDirection: "column",
    zIndex: 9999, overflow: "hidden"
  },
  header: {
    padding: "12px 14px", color: "white", fontWeight: "bold",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    cursor: "pointer", height: "48px", boxSizing: "border-box"
  },
  statusDot: { width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 10px rgba(74,222,128,0.55)" },
  btnAction: { background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)", color: "white", cursor: "pointer", width: 28, height: 28, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 },

  bodyContainer: { display: "flex", flexDirection: "column", height: "100%", transition: "opacity 0.2s" },
  messagesArea: { flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column" },
  bubble: { padding: "9px 12px", maxWidth: "100%", fontSize: 13, wordBreak: "break-word", lineHeight: 1.4, boxShadow: "0 10px 30px rgba(0,0,0,0.20)" },

  footer: { padding: 12, borderTop: "1px solid rgba(255,255,255,0.10)", background: "rgba(2, 6, 23, 0.55)", display: "flex", gap: 8 },
  input: { flex: 1, padding: "9px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.04)", color: "white", outline: "none", fontSize: 13 },
  sendBtn: { background: "rgba(250,204,21,0.14)", color: "#facc15", border: "1px solid rgba(250,204,21,0.35)", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 3, fontWeight: 900 },

  toast: {
    position: "fixed", top: 90, right: 20, width: 320,
    borderRadius: 14, padding: 14, zIndex: 10000,
    display: "flex", alignItems: "center", gap: 14, color: "white"
  }
};
