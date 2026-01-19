import React, { useMemo } from "react";
import styles from "../../styles";

/**
 * QuarantineModal
 * JSX preservado do CampaignSession, extraído para reduzir o arquivo principal.
 *
 * Melhorias incrementais:
 * - Clique fora fecha apenas se clicar no overlay
 * - Motion leve e consistência visual
 */
export default function QuarantineModal({
  isQuarantineOpen,
  setIsQuarantineOpen,
  fetchQuarantine,
  quarantineLoading,
  saveQuarantineDecisions,
  quarantineError,
  quarantineData,
  quarantineDecisions,
  setDecision,
}) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cardStyle = useMemo(
    () => ({
      ...styles.quarantineCard,
      transformOrigin: "top center",
      animation: reduceMotion ? "none" : "uiModalIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
    }),
    [reduceMotion]
  );

  return (
    <>
      {isQuarantineOpen && (
        <div
          style={{ ...styles.modalOverlay, zIndex: 20000 }}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsQuarantineOpen(false);
          }}
        >
          <div style={cardStyle} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.quarantineHeader}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={styles.quarantineTitle}>Quarentena de Itens</div>
                <div style={styles.quarantineSubtitle}>
                  Itens ficam bloqueados até você aprovar. Decisões são reaproveitadas em entradas futuras.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={fetchQuarantine} style={styles.btnGhost} disabled={quarantineLoading} type="button">
                  Recarregar
                </button>
                <button onClick={saveQuarantineDecisions} style={styles.btnPrimary} disabled={quarantineLoading} type="button">
                  Salvar
                </button>
                <button onClick={() => setIsQuarantineOpen(false)} style={styles.btnGhost} type="button">
                  Fechar
                </button>
              </div>
            </div>

            {quarantineError && <div style={styles.quarantineError}>{quarantineError}</div>}
            {quarantineLoading && <div style={styles.quarantineInfo}>Carregando...</div>}

            <div style={styles.quarantineBody}>
              {(quarantineData?.characters || []).length === 0 ? (
                <div style={styles.quarantineInfo}>Nenhum personagem na campanha.</div>
              ) : (
                (quarantineData?.characters || []).map((c) => {
                  const inv = c?.sheet_data?.inventory || [];
                  const qm = c?.quarantine_map || {};
                  return (
                    <div key={c.character_id} style={styles.quarantineSection}>
                      <div style={styles.quarantineSectionTitle}>
                        {c.character_name}{" "}
                        <span style={{ color: "#64748b", fontWeight: 700 }}>({String(c.character_id).slice(0, 8)}…)</span>
                      </div>

                      {inv.length === 0 ? (
                        <div style={styles.quarantineInfo}>Inventário vazio.</div>
                      ) : (
                        <div style={styles.quarantineList}>
                          {inv.map((it) => {
                            const itemId = String(it?.id);
                            const key = `${c.character_id}:${itemId}`;
                            const status = quarantineDecisions?.[key] || qm?.[itemId] || "pending";

                            return (
                              <div key={key} style={styles.quarantineRow}>
                                <div style={styles.quarantineItemLeft}>
                                  <div style={styles.quarantineItemName}>{it?.name || "Item"}</div>
                                  {it?.desc ? <div style={styles.quarantineItemDesc}>{it.desc}</div> : null}
                                </div>

                                <div style={styles.quarantineItemRight}>
                                  <span style={styles.statusPill(status)}>{status}</span>
                                  <button
                                    onClick={() => setDecision(c.character_id, itemId, "approved")}
                                    style={styles.btnApprove}
                                    disabled={quarantineLoading}
                                    type="button"
                                  >
                                    Aprovar
                                  </button>
                                  <button
                                    onClick={() => setDecision(c.character_id, itemId, "blocked")}
                                    style={styles.btnBlock}
                                    disabled={quarantineLoading}
                                    type="button"
                                  >
                                    Vetar
                                  </button>
                                  <button
                                    onClick={() => setDecision(c.character_id, itemId, "pending")}
                                    style={styles.btnGhostSmall}
                                    disabled={quarantineLoading}
                                    title="Voltar para pendente"
                                    type="button"
                                  >
                                    Pendente
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
