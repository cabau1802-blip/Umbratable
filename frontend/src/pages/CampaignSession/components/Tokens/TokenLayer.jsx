import React from "react";
import Token from "./Token";

/**
 * TokenLayer
 * Camada responsável por renderizar todos os tokens do mapa
 * Código extraído 1:1 do CampaignSession original
 */
export default function TokenLayer({
  tokens,
  tokenHandlers,
}) {
  if (!tokens || tokens.length === 0) return null;

  return (
    <div className="campaign-token-layer">
      {tokens.map((token) => (
        <Token
          key={token.id}
          token={token}
          tokenHandlers={tokenHandlers}
        />
      ))}
    </div>
  );
}

