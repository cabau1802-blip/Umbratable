import React from "react";

/**
 * ToolButton
 * Botão individual da toolbar
 * Classes e comportamento preservados
 */
export default function ToolButton({
  active,
  title,
  onClick,
  children,
}) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <button
      className={`campaign-toolbar-button ${active ? "active" : ""}`}
      title={title}
      onClick={onClick}
      type="button"
      aria-pressed={!!active}
      style={{
        // NOVO (incremental): acabamento premium, sem remover classes existentes
        background: active ? "rgba(250,204,21,0.10)" : "transparent",
        color: active ? "#facc15" : "rgba(229,231,235,0.95)",
        border: "1px solid rgba(255,255,255,0.16)",
        borderRadius: 12,
        padding: "7px 9px",
        minWidth: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: active ? "0 16px 40px rgba(250,204,21,0.12)" : "none",
        transition: reduceMotion
          ? "none"
          : "transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1), background 180ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 180ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 180ms cubic-bezier(0.2, 0.8, 0.2, 1), filter 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        willChange: "transform",
      }}
      onMouseDown={(e) => {
        // Mantém o clique normal, apenas melhora feedback tátil
        if (reduceMotion) return;
        e.currentTarget.style.transform = "translateY(1px)";
      }}
      onMouseUp={(e) => {
        if (reduceMotion) return;
        e.currentTarget.style.transform = "translateY(0px)";
      }}
      onMouseLeave={(e) => {
        if (reduceMotion) return;
        e.currentTarget.style.transform = "translateY(0px)";
      }}
    >
      {children}
    </button>
  );
}
