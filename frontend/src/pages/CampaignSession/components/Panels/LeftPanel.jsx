import React, { useMemo } from "react";

/**
 * LeftPanel
 * Painel esquerdo da sessão (chat / info)
 * JSX e comportamento preservados
 */
export default function LeftPanel({ session }) {
  const {
    showLeftPanel,
    toggleLeftPanel,
    chatMessages,
    chatInput,
    setChatInput,
    sendChatMessage,
  } = session;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const panelStyle = useMemo(
    () => ({
      position: "relative",
      display: "flex",
      flexDirection: "column",
      width: 340,
      minWidth: 300,
      maxWidth: "min(380px, 90vw)",
      height: "100%",
      background:
        "linear-gradient(180deg, rgba(10,10,14,0.92) 0%, rgba(6,8,12,0.92) 100%)",
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 16,
      boxShadow: "0 25px 80px rgba(0,0,0,0.65)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      overflow: "hidden",
    }),
    []
  );

  const headerStyle = useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.10)",
      background:
        "linear-gradient(135deg, rgba(250,204,21,0.12) 0%, rgba(255,255,255,0.03) 45%, rgba(0,0,0,0) 100%)",
    }),
    []
  );

  const titleStyle = useMemo(
    () => ({
      display: "flex",
      alignItems: "baseline",
      gap: 10,
      color: "#e5e7eb",
      fontWeight: 900,
      letterSpacing: 0.2,
    }),
    []
  );

  const closeBtnStyle = useMemo(
    () => ({
      width: 34,
      height: 34,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.04)",
      color: "#e5e7eb",
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
      transition: reduceMotion
        ? "none"
        : "transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1), background 180ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    }),
    [reduceMotion]
  );

  const collapsedStyle = useMemo(
    () => ({
      position: "absolute",
      left: 12,
      top: "50%",
      transform: "translateY(-50%)",
      width: 38,
      height: 64,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.14)",
      background:
        "linear-gradient(180deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.92) 100%)",
      boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
      color: "#e5e7eb",
      display: "grid",
      placeItems: "center",
      cursor: "pointer",
      userSelect: "none",
      transition: reduceMotion
        ? "none"
        : "transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1), background 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    }),
    [reduceMotion]
  );

  const listStyle = useMemo(
    () => ({
      flex: 1,
      padding: 12,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      background:
        "radial-gradient(900px 500px at 20% 0%, rgba(250,204,21,0.06), rgba(0,0,0,0) 60%)",
    }),
    []
  );

  const inputWrapStyle = useMemo(
    () => ({
      padding: 12,
      borderTop: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(2, 6, 23, 0.55)",
      display: "flex",
      gap: 10,
      alignItems: "center",
    }),
    []
  );

  const inputStyle = useMemo(
    () => ({
      flex: 1,
      height: 38,
      padding: "0 12px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.04)",
      color: "#e5e7eb",
      outline: "none",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    }),
    []
  );

  const sendBtnStyle = useMemo(
    () => ({
      height: 38,
      padding: "0 14px",
      borderRadius: 999,
      border: "1px solid rgba(250,204,21,0.35)",
      background: "rgba(250,204,21,0.12)",
      color: "#facc15",
      fontWeight: 900,
      cursor: "pointer",
      transition: reduceMotion
        ? "none"
        : "transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1), background 180ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    }),
    [reduceMotion]
  );

  if (!showLeftPanel) {
    return (
      <div
        className="campaign-left-panel-collapsed"
        onClick={toggleLeftPanel}
        role="button"
        tabIndex={0}
        aria-label="Abrir painel de chat"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleLeftPanel();
        }}
        style={collapsedStyle}
      >
        ▶
      </div>
    );
  }

  return (
    <div className="campaign-left-panel" style={panelStyle}>
      <div className="campaign-left-panel-header" style={headerStyle}>
        <span style={titleStyle}>
          Chat
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 900, letterSpacing: 1 }}>
            LIVE
          </span>
        </span>

        <button
          onClick={toggleLeftPanel}
          style={closeBtnStyle}
          type="button"
          aria-label="Fechar painel de chat"
          title="Fechar"
          onMouseEnter={(e) => {
            if (!reduceMotion) e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
          }}
          onMouseLeave={(e) => {
            if (!reduceMotion) e.currentTarget.style.transform = "translateY(0px)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
          }}
        >
          ×
        </button>
      </div>

      <div className="campaign-chat-messages" style={listStyle}>
        {chatMessages.map((msg) => {
          const isSystem = !!msg.system;

          return (
            <div
              key={msg.id}
              className={`campaign-chat-message ${isSystem ? "system" : ""}`}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: isSystem ? "1px solid rgba(250,204,21,0.22)" : "1px solid rgba(255,255,255,0.10)",
                background: isSystem ? "rgba(250,204,21,0.08)" : "rgba(255,255,255,0.03)",
                color: "#e5e7eb",
                boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
                animation: reduceMotion ? "none" : "uiFadeUp 160ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <strong style={{ color: isSystem ? "#facc15" : "#e5e7eb" }}>{msg.author}</strong>
                {isSystem ? (
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#facc15", opacity: 0.9 }}>
                    SISTEMA
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.35, color: isSystem ? "#fde68a" : "#e5e7eb" }}>
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="campaign-chat-input" style={inputWrapStyle}>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendChatMessage();
            }
          }}
          aria-label="Mensagem do chat"
          placeholder="Digite uma mensagem…"
          style={inputStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(250,204,21,0.45)";
            e.currentTarget.style.boxShadow = "0 0 0 4px rgba(250,204,21,0.12), 0 10px 30px rgba(0,0,0,0.25)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
            e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.25)";
          }}
        />
        <button
          onClick={sendChatMessage}
          type="button"
          style={sendBtnStyle}
          onMouseDown={(e) => {
            if (!reduceMotion) e.currentTarget.style.transform = "translateY(1px)";
          }}
          onMouseUp={(e) => {
            if (!reduceMotion) e.currentTarget.style.transform = "translateY(0px)";
          }}
          onMouseLeave={(e) => {
            if (!reduceMotion) e.currentTarget.style.transform = "translateY(0px)";
          }}
        >
          Enviar
        </button>
      </div>

      {/* Keyframes locais (seguro; não quebra se já existir global) */}
      <style>{`
        @keyframes uiFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0px); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { scroll-behavior: auto !important; }
        }
      `}</style>
    </div>
  );
}
