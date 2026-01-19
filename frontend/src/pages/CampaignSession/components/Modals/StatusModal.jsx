import React, { useMemo } from "react";
import styles from "../../styles";

/**
 * StatusModal
 * JSX preservado do CampaignSession, apenas extraído para componente.
 *
 * Melhorias incrementais:
 * - Padronização de header/body/footer (antes estava “solto”)
 * - Motion e foco visual consistentes
 */
export default function StatusModal({
  STATUS_LIBRARY,
  markers,
  statusModalOpen,
  statusModalIndex,
  statusModalSelected,
  toggleStatusKey,
  closeStatusModal,
  saveStatusModal,
}) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cardStyle = useMemo(
    () => ({
      ...styles.modalCard,
      width: "min(620px, calc(100% - 24px))",
      transformOrigin: "top center",
      animation: reduceMotion ? "none" : "uiModalIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
    }),
    [reduceMotion]
  );

  return (
    <>
      {statusModalOpen && statusModalIndex != null && markers?.[statusModalIndex] && (
        <div
          style={{ ...styles.modalOverlay, zIndex: 20000 }}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeStatusModal();
          }}
        >
          <div style={cardStyle} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalTitle}>Status do Token</div>
                <div style={styles.modalSubtitle}>
                  {markers?.[statusModalIndex]?.label || "Marcador"} — selecione condições. (CTRL+Enter para salvar | ESC para fechar)
                </div>
              </div>

              <button style={styles.iconBtnDanger} type="button" onClick={closeStatusModal} aria-label="Fechar" title="Fechar">
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {(STATUS_LIBRARY || []).map((s) => {
                  const active = (statusModalSelected || []).includes(s.key);

                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleStatusKey(s.key)}
                      style={{
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 14,
                        border: active ? "1px solid rgba(250,204,21,0.55)" : "1px solid rgba(255,255,255,0.14)",
                        background: active ? "rgba(250,204,21,0.08)" : "rgba(255,255,255,0.03)",
                        color: "#e5e7eb",
                        cursor: "pointer",
                        fontWeight: 900,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        transition: reduceMotion
                          ? "none"
                          : "transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1), background 180ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                        transform: active ? "translateY(-1px)" : "translateY(0px)",
                      }}
                      title={s.label}
                      aria-pressed={active}
                    >
                      <span style={{ fontSize: 18 }}>{s.icon}</span>
                      <span style={{ fontSize: 13 }}>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={closeStatusModal} style={{ ...styles.btnGhost, flex: "1 1 180px" }} type="button">
                Cancelar
              </button>
              <button onClick={saveStatusModal} style={{ ...styles.btnSuccess, flex: "1 1 180px" }} type="button">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
