import React, { useMemo } from "react";

/**
 * GridOverlay
 * Grid visual do mapa
 * Renderização idêntica ao original
 */
export default function GridOverlay({ map, zoom, offset }) {
  if (!map || !map.gridSize) return null;

  const size = map.gridSize * zoom;

  const style = useMemo(
    () => ({
      backgroundSize: `${size}px ${size}px`,
      transform: `translate(${offset.x}px, ${offset.y}px)`,
      pointerEvents: "none",
      position: "absolute",
      inset: 0,
      opacity: 0.85,
      mixBlendMode: "overlay",
      backgroundImage:
        "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
      filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.35))",
    }),
    [size, offset.x, offset.y]
  );

  return <div className="campaign-map-grid" style={style} />;
}
