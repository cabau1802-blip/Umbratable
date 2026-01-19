export default function LoadingBlock({ text = "Carregando..." }) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.03)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.25)",
        color: "#e5e7eb",
        maxWidth: 420,
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <div style={{ marginBottom: 10, fontWeight: 900, color: "#94a3b8" }}>{text}</div>

      <div
        style={{
          height: 10,
          width: 260,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: "translateX(-45%)",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(250,204,21,0.18) 45%, rgba(255,255,255,0) 100%)",
            animation: reduceMotion ? "none" : "uiShimmer 1.0s linear infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes uiShimmer {
          from { transform: translateX(-55%); }
          to   { transform: translateX(55%); }
        }
      `}</style>
    </div>
  );
}
