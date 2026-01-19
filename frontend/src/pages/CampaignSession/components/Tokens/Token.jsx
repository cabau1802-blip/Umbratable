import React from "react";

/**
 * Token
 * Representa um token individual no mapa
 * JSX, estilos e eventos preservados
 */
export default function Token({
  token,
  tokenHandlers,
}) {
  const {
    id,
    x,
    y,
    size,
    imageUrl,
    isSelected,
  } = token;

  const style = {
    left: x,
    top: y,
    width: size,
    height: size,
  };

  return (
    <div
      className={`campaign-token ${isSelected ? "selected" : ""}`}
      style={style}
      onMouseDown={(e) => tokenHandlers.onTokenMouseDown(e, token)}
      onContextMenu={(e) => tokenHandlers.onTokenContextMenu(e, token)}
    >
      <img
        src={imageUrl}
        alt=""
        draggable={false}
      />
    </div>
  );
}

