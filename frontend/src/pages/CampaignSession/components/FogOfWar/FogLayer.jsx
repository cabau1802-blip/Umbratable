import React, { useEffect } from "react";
import FogCanvas from "./FogCanvas";

/**
 * FogLayer
 * Wrapper da fog (canvas + render loop)
 * JSX preservado
 */
export default function FogLayer({
  session,
  fogHandlers,
}) {
  const {
    fogCanvasRef,
    fogWidth,
    fogHeight,
  } = session;

  useEffect(() => {
    fogHandlers.redrawFog();
  }, [
    session.fogStrokes,
    session.currentMap,
    fogHandlers,
  ]);

  return (
    <div className="campaign-fog-layer">
      <FogCanvas
        width={fogWidth}
        height={fogHeight}
        fogCanvasRef={fogCanvasRef}
        onMouseDown={fogHandlers.onFogMouseDown}
        onMouseMove={fogHandlers.onFogMouseMove}
        onMouseUp={fogHandlers.onFogMouseUp}
      />
    </div>
  );
}

