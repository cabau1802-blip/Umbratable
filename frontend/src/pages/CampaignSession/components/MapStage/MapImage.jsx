import React, { useMemo } from "react";

/**
 * MapImage
 * Renderiza a imagem base do mapa
 * JSX preservado exatamente
 */
export default function MapImage({ map, zoom, offset }) {
  if (!map) return null;

  const style = useMemo(
    () => ({
      transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
      transformOrigin: "top left",

      // Refinos visuais seguros
      userSelect: "none",
      pointerEvents: "none",
      willChange: "transform",
      filter: "contrast(1.05) saturate(1.05)",
      imageRendering: "auto",
    }),
    [offset.x, offset.y, zoom]
  );

  return (
    <img
      src={map.url}
      alt={map.name}
      draggable={false}
      className="campaign-map-image"
      style={style}
    />
  );
}
