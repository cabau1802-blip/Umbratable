import React, { useMemo } from "react";
import styles from "../../styles";

/**
 * LegacyModal
 * Modal de legado da campanha
 * JSX e lógica preservados
 *
 * Correções incrementais:
 * - onClose estava indefinido (bug). Fechamento agora usa closeLegacyModal.
 * - Estrutura de modal padronizada (overlay/card/header/body/footer).
 */
export default function LegacyModal({ open, session }) {
  if (!open) return null;

  const { legacyData, applyLegacy, closeLegacyModal } = session;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cardStyle = useMemo(
    () => ({
      ...styles.modalCard,
      width: "min(760px, calc(100% - 24px))",
      transformOrigin: "top center",
      animation: reduceMotion ? "none" : "uiModalIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
    }),
    [reduceMotion]
  );

  return (
    <div
      style={{ ...styles.modalOverlay, zIndex: 20000 }}
      className="campaign-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeLegacyModal();
      }}
    >
      <div style={cardStyle} className="campaign-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTitle}>Legado da Campanha</div>
            <div style={styles.modalSubtitle}>Revise os registros persistentes antes de aplicar.</div>
          </div>

          <button
            style={styles.iconBtnDanger}
            type="button"
            onClick={closeLegacyModal}
            title="Fechar"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div style={styles.modalBody}>
          <div className="campaign-legacy-content" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(legacyData || []).map((item) => (
              <div
                key={item.id}
                className="campaign-legacy-item"
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#e5e7eb",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
                }}
              >
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.modalFooter} className="campaign-modal-actions">
          <button onClick={closeLegacyModal} style={styles.btnGhost} type="button">
            Fechar
          </button>
          <button onClick={applyLegacy} style={styles.btnPrimary} type="button">
            Aplicar Legado
          </button>
        </div>
      </div>
    </div>
  );
}
