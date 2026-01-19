import React, { useMemo } from "react";
import styles from "../../styles";

/**
 * QuarantineModal (arquivo legado com grafia diferente)
 * Modal de quarentena
 * Comportamento preservado
 *
 * Correções incrementais:
 * - Havia style duplicado e onClose indefinido (bug)
 * - Estrutura do modal padronizada e segura
 */
export default function QuarantineModal({ open, session }) {
  if (!open) return null;

  const {
    quarantineItems,
    approveQuarantineItem,
    rejectQuarantineItem,
    closeQuarantineModal,
  } = session;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cardStyle = useMemo(
    () => ({
      ...styles.modalCard,
      width: "min(720px, calc(100% - 24px))",
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
        if (e.target === e.currentTarget) closeQuarantineModal();
      }}
    >
      <div style={cardStyle} className="campaign-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTitle}>Quarentena</div>
            <div style={styles.modalSubtitle}>Aprove ou rejeite itens antes de entrarem definitivamente na campanha.</div>
          </div>

          <button
            style={styles.iconBtnDanger}
            type="button"
            onClick={closeQuarantineModal}
            title="Fechar"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div style={styles.modalBody}>
          {(quarantineItems || []).map((item) => (
            <div
              key={item.id}
              className="campaign-quarantine-item"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                marginBottom: 10,
              }}
            >
              <span style={{ fontWeight: 800, color: "#e5e7eb" }}>{item.name}</span>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={() => approveQuarantineItem(item)} style={styles.btnApprove} type="button">
                  Aprovar
                </button>
                <button onClick={() => rejectQuarantineItem(item)} style={styles.btnBlock} type="button">
                  Rejeitar
                </button>
              </div>
            </div>
          ))}

          {(!quarantineItems || quarantineItems.length === 0) && (
            <div style={styles.quarantineInfo}>Nenhum item pendente.</div>
          )}
        </div>

        <div style={styles.modalFooter} className="campaign-modal-actions">
          <button onClick={closeQuarantineModal} style={styles.btnGhost} type="button">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
