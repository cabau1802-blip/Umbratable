import React, { useEffect } from "react";

const PingMarker = ({ x, y, color = "#facc15", onComplete }) => {
  useEffect(() => {
    // O ping dura 1.5s e depois avisa para se deletar
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Estilo base para centralizar no clique
  const baseStyle = {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    pointerEvents: "none", // O mouse passa direto
    zIndex: 999, // Fica acima de tudo
  };

  return (
    <>
      {/* Ponto central */}
      <div
        style={{
          ...baseStyle,
          width: "10px",
          height: "10px",
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}`,
          animation: "pingFade 1.5s ease-out forwards",
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
          animation: "pingRipple 1.5s cubic-bezier(0, 0.2, 0.8, 1) forwards",
        }}
      />
    </>
  );
};

export default PingMarker;