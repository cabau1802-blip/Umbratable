import React, { useMemo } from "react";
import styles from "../../styles";

/**
 * EventModal
 * Modal de criação/edição de eventos
 * Código extraído 1:1 do CampaignSession original
 *
 * Ajustes incrementais (visuais + correções de markup):
 * - Corrigido fechamento de <div> quebrado (bug de JSX)
 * - Padronizado overlay/card/header/body/footer com styles.js
 * - Clique fora fecha (sem quebrar handlers)
 * - Melhor hierarquia visual e estados de inputs/botões
 */
export default function EventModal({ open, session }) {
  if (!open) return null;

  const { eventForm, setEventForm, saveEvent, closeEventModal } = session;

  // Motion respeitando reduced-motion (sem libs)
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
      className="campaign-modal-backdrop"
      style={{ ...styles.modalOverlay, zIndex: 20000 }}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeEventModal();
      }}
    >
      <div className="campaign-modal" style={cardStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTitle}>Evento</div>
            <div style={styles.modalSubtitle}>Crie ou edite um registro narrativo para a campanha.</div>
          </div>

          <button
            style={styles.iconBtnDanger}
            type="button"
            onClick={closeEventModal}
            title="Fechar"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div style={styles.modalBody}>
          <input
            type="text"
            placeholder="Título"
            value={eventForm.title}
            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            style={styles.input}
          />

          <div style={{ height: 10 }} />

          <textarea
            placeholder="Descrição"
            value={eventForm.description}
            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
            style={{ ...styles.textarea, minHeight: 140 }}
            rows={6}
          />
        </div>

        <div style={styles.modalFooter}>
          <button onClick={closeEventModal} style={styles.btnGhost} type="button">
            Cancelar
          </button>
          <button onClick={saveEvent} style={styles.btnPrimary} type="button">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
