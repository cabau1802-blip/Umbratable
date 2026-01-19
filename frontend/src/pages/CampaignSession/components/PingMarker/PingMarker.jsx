import React, { useEffect } from "react";

const PingMarker = ({ x, y, color = "#facc15", onComplete }) => {
  useEffect(() => {
    // O ping dura 1.5s e depois avisa para se deletar
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Estilo base para centralizar no clique
  const baseStyle = {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    pointerEvents: "none", // O mouse passa direto
    zIndex: 999, // Fica acima de tudo

    // NOVO: melhora performance e “punch” visual
    willChange: "transform, opacity",
    filter: "drop-shadow(0 16px 30px rgba(0,0,0,0.55))",
  };

  const dur = reduceMotion ? "1ms" : "1.5s";

  return (
    <>
      {/* Ponto central */}
      <div
        style={{
          ...baseStyle,
          width: "10px",
          height: "10px",
          backgroundColor: color,
          boxShadow: `0 0 14px ${color}, 0 0 34px rgba(250,204,21,0.12)`,
          animation: reduceMotion ? "none" : `pingFade ${dur} ease-out forwards`,
          opacity: 0.98,
          transform: "translate(-50%, -50%) scale(1)",
        }}
      />

      {/* Halo extra (sutil) */}
      <div
        style={{
          ...baseStyle,
          width: "26px",
          height: "26px",
          border: `1px solid rgba(255,255,255,0.10)`,
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.10), rgba(255,255,255,0) 65%)",
          mixBlendMode: "screen",
          opacity: 0.9,
          animation: reduceMotion ? "none" : `pingFade ${dur} cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
        }}
      />

      {/* Onda de expansão */}
      <div
        style={{
          ...baseStyle,
          width: "10px",
          height: "10px",
          border: `2px solid ${color}`,
          backgroundColor: "transparent",
          boxShadow: `0 0 26px rgba(0,0,0,0.35)`,
          animation: reduceMotion
            ? "none"
            : `pingRipple ${dur} cubic-bezier(0, 0.2, 0.8, 1) forwards`,
        }}
      />
    </>
  );
};

export default PingMarker;
