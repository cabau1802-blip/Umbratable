import React, { useEffect, useRef } from "react";

/**
 * FogCanvas
 * Canvas principal da Fog of War
 * Código movido 1:1 do CampaignSession original
 */
export default function FogCanvas({
  width,
  height,
  fogCanvasRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}) {
  return (
    <canvas
      ref={fogCanvasRef}
      width={width}
      height={height}
      className="campaign-fog-canvas"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    />
  );
}

