import React, { useMemo } from "react";
import MapImage from "./MapImage";
import GridOverlay from "./GridOverlay";

/**
 * MapStage
 * Container principal do mapa
 * JSX e props preservados exatamente como no CampaignSession original
 */
export default function MapStage({
  session,
  mapHandlers,
  tokenHandlers,
  fogHandlers,
}) {
  const {
    currentMap,
    showGrid,
    mapZoom,
    mapOffset,
  } = session;

  const stageStyle = useMemo(
    () => ({
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.10)",
      background:
        "radial-gradient(1200px 700px at 30% 10%, rgba(250,204,21,0.06), rgba(0,0,0,0) 55%), linear-gradient(180deg, rgba(2,6,23,0.75), rgba(0,0,0,0.85))",
      boxShadow: "0 25px 90px rgba(0,0,0,0.55)",
      touchAction: "none",
    }),
    []
  );

  return (
    <div
      className="campaign-map-stage"
      onMouseDown={mapHandlers.onMapMouseDown}
      onMouseMove={mapHandlers.onMapMouseMove}
      onMouseUp={mapHandlers.onMapMouseUp}
      onWheel={mapHandlers.onMapWheel}
      style={stageStyle}
      tabIndex={0}
      aria-label="Área do mapa"
    >
      {/* MAP IMAGE */}
      <MapImage
        map={currentMap}
        zoom={mapZoom}
        offset={mapOffset}
      />

      {/* GRID */}
      {showGrid && (
        <GridOverlay
          map={currentMap}
          zoom={mapZoom}
          offset={mapOffset}
        />
      )}

      {/* FOG OF WAR */}
      {fogHandlers.renderFog()}

      {/* TOKENS */}
      {tokenHandlers.renderTokens()}
    </div>
  );
}
