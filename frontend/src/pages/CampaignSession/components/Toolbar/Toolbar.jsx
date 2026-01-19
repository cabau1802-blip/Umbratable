import React from "react";
import ToolButton from "./ToolButton";

/**
 * Toolbar
 * Barra superior de ferramentas do mapa
 * JSX, handlers e regras exatamente iguais ao CampaignSession original
 */
export default function Toolbar({
  session,
  mapHandlers,
  fogHandlers,
  tokenHandlers,
}) {
  const {
    activeTool,
    isGM,
    showGrid,
    setShowGrid,
  } = session;

  return (
    <div
      className="campaign-toolbar"
      role="toolbar"
      aria-label="Ferramentas do mapa"
      style={{
        // NOVO (incremental): visual premium sem depender de CSS externo
        background: "rgba(12,12,16,0.92)",
        border: "1px solid rgba(255,255,255,0.16)",
        borderRadius: 14,
        boxShadow: "0 18px 55px rgba(0,0,0,0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* MOVE */}
      <ToolButton
        active={activeTool === "move"}
        title="Mover mapa"
        onClick={() => session.setActiveTool("move")}
      >
        🖐️
      </ToolButton>

      {/* TOKEN */}
      <ToolButton
        active={activeTool === "token"}
        title="Mover tokens"
        onClick={() => session.setActiveTool("token")}
      >
        🎲
      </ToolButton>

      {/* RULER */}
      <ToolButton
        active={activeTool === "ruler"}
        title="Régua"
        onClick={() => session.setActiveTool("ruler")}
      >
        📏
      </ToolButton>

      {/* GRID */}
      <ToolButton
        active={showGrid}
        title="Exibir grid"
        onClick={() => setShowGrid(!showGrid)}
      >
        #️⃣
      </ToolButton>

      {/* FOG (GM ONLY) */}
      {isGM && (
        <ToolButton
          active={activeTool === "fog"}
          title="Fog of War"
          onClick={() => session.setActiveTool("fog")}
        >
          ☁️
        </ToolButton>
      )}

      {/* CLEAR FOG */}
      {isGM && (
        <ToolButton
          title="Limpar Fog"
          onClick={fogHandlers.clearFog}
        >
          🧹
        </ToolButton>
      )}
    </div>
  );
}
