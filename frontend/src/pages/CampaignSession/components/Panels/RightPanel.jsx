import React, { useMemo } from "react";

/**
 * RightPanel
 * Painel direito (ferramentas GM / status / info)
 * JSX preservado exatamente
 */
export default function RightPanel({ session }) {
  const {
    showRightPanel,
    toggleRightPanel,
    isGM,
    players,
    currentTurn,
    activeTool,
  } = session;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const collapsedStyle = useMemo(
    () => ({
      position: "absolute",
      right: 12,
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

  const panelStyle = useMemo(
    () => ({
      position: "relative",
      display: "flex",
      flexDirection: "column",
      width: 320,
      minWidth: 280,
      maxWidth: "min(360px, 90vw)",
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
        "linear-gradient(135deg, rgba(148,163,184,0.10) 0%, rgba(255,255,255,0.03) 45%, rgba(0,0,0,0) 100%)",
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

  const bodyStyle = useMemo(
    () => ({
      flex: 1,
      padding: 12,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      background:
        "radial-gradient(900px 500px at 80% 0%, rgba(148,163,184,0.06), rgba(0,0,0,0) 60%)",
    }),
    []
  );

  const itemStyle = useMemo(
    () => ({
      padding: 12,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.03)",
      color: "#e5e7eb",
      boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    }),
    []
  );

  if (!showRightPanel) {
    return (
      <div
        className="campaign-right-panel-collapsed"
        onClick={toggleRightPanel}
        role="button"
        tabIndex={0}
        aria-label="Abrir painel de status"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleRightPanel();
        }}
        style={collapsedStyle}
      >
        ◀
      </div>
    );
  }

  return (
    <div className="campaign-right-panel" style={panelStyle}>
      <div className="campaign-right-panel-header" style={headerStyle}>
        <span style={{ color: "#e5e7eb", fontWeight: 900, letterSpacing: 0.2 }}>Status</span>
        <button
          onClick={toggleRightPanel}
          style={closeBtnStyle}
          type="button"
          aria-label="Fechar painel de status"
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

      <div className="campaign-right-panel-content" style={bodyStyle}>
        <div className="campaign-status-item" style={itemStyle}>
          <strong style={{ color: "#94a3b8" }}>Ferramenta ativa:</strong>{" "}
          <span style={{ fontWeight: 900 }}>{activeTool}</span>
        </div>

        <div className="campaign-status-item" style={itemStyle}>
          <strong style={{ color: "#94a3b8" }}>Turno:</strong>{" "}
          <span style={{ fontWeight: 900 }}>{currentTurn}</span>
        </div>

        <div className="campaign-status-item" style={itemStyle}>
          <strong style={{ color: "#94a3b8" }}>Jogadores:</strong>
          <ul style={{ margin: "10px 0 0 16px", color: "#e5e7eb" }}>
            {players.map((p) => (
              <li key={p.id} style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 800 }}>{p.name}</span>{" "}
                {p.isGM ? <span style={{ color: "#facc15", fontWeight: 900 }}>(GM)</span> : ""}
              </li>
            ))}
          </ul>
        </div>

        {isGM && (
          <div className="campaign-gm-tools" style={itemStyle}>
            <strong style={{ color: "#facc15" }}>Ferramentas do GM</strong>
            <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>
              Conteúdo GM adicional permanece intacto
            </div>
            {/* Conteúdo GM adicional permanece intacto */}
          </div>
        )}
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * { scroll-behavior: auto !important; }
        }
      `}</style>
    </div>
  );
}
