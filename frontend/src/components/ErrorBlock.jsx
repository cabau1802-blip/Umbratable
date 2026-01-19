export default function ErrorBlock({ title = "Erro", message, onRetry }) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid rgba(239, 68, 68, 0.35)",
        borderRadius: 16,
        background: "rgba(239, 68, 68, 0.08)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.30)",
        color: "#fecaca",
      }}
      role="alert"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 6, color: "#fee2e2" }}>
          {title}
        </div>
        <div style={{ opacity: 0.8, fontWeight: 900 }}>!</div>
      </div>

      <div style={{ marginBottom: 12, opacity: 0.95, color: "#fee2e2" }}>
        {message}
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          type="button"
          style={{
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.22)",
            color: "#e5e7eb",
            fontWeight: 900,
            cursor: "pointer",
            transition: reduceMotion
              ? "none"
              : "transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1), background 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
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
          Tentar novamente
        </button>
      )}
    </div>
  );
}
