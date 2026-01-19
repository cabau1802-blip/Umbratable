// frontend/src/components/help/OnboardingGuideModal.jsx
import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HELP_ARTICLES, PRODUCT_NAME } from "../help/helpContent";

const LS_ONBOARDING_SEEN = "umbraltable:onboarding_seen:v1";

export default function OnboardingGuideModal({ isOpen, onClose, onNavigate }) {
  const guide = useMemo(() => HELP_ARTICLES.find((a) => a.id === "quick-guide"), []);
  const steps = guide?.steps || [];

  const [idx, setIdx] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  if (!isOpen) return null;

  const step = steps[idx];

  function handleClose() {
    if (dontShow) {
      try {
        localStorage.setItem(LS_ONBOARDING_SEEN, "1");
      } catch {}
    }
    onClose?.();
  }

  function handleFinish() {
    if (dontShow) {
      try {
        localStorage.setItem(LS_ONBOARDING_SEEN, "1");
      } catch {}
    }
    onClose?.();
  }

  return (
    <AnimatePresence>
      <motion.div
        style={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <motion.div
          style={styles.modal}
          initial={{ opacity: 0, y: 20, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.99 }}
          transition={{ duration: 0.22 }}
        >
          <div style={styles.header}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={styles.title}>Guia rápido</div>
              <div style={styles.subtitle}>
                {PRODUCT_NAME} • Passo {idx + 1} de {steps.length}
              </div>
            </div>

            <button style={styles.closeBtn} onClick={handleClose} aria-label="Fechar">
              ✕
            </button>
          </div>

          <div style={styles.content}>
            <div style={styles.stepTitle}>{step?.title}</div>
            <div style={styles.stepBody}>
              {(step?.body || []).map((line, i) => (
                <div key={i} style={{ lineHeight: 1.6 }}>
                  {line}
                </div>
              ))}
            </div>

            {step?.cta?.to && (
              <button
                type="button"
                style={styles.ctaBtn}
                onClick={() => {
                  onNavigate?.(step.cta.to);
                }}
              >
                {step.cta.label || "Abrir"}
              </button>
            )}
          </div>

          <div style={styles.footer}>
            <label style={styles.checkbox}>
              <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
              <span style={{ marginLeft: 8 }}>Não mostrar novamente</span>
            </label>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                style={{ ...styles.navBtn, opacity: idx === 0 ? 0.55 : 1 }}
                disabled={idx === 0}
                onClick={() => setIdx((p) => Math.max(0, p - 1))}
              >
                Anterior
              </button>
              {idx < steps.length - 1 ? (
                <button type="button" style={styles.navBtnPrimary} onClick={() => setIdx((p) => Math.min(steps.length - 1, p + 1))}>
                  Próximo
                </button>
              ) : (
                <button type="button" style={styles.navBtnPrimary} onClick={handleFinish}>
                  Concluir
                </button>
              )}
            </div>
          </div>

          <div style={styles.hint}>Use ← → para navegar. ESC fecha.</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(8px)",
    zIndex: 47000,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    padding: 18,
  },
  modal: {
    width: "min(520px, 96vw)",
    background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 18,
    boxShadow: "0 25px 90px rgba(0,0,0,0.6)",
    overflow: "hidden",
  },
  header: { padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: 950, color: "#e2e8f0" },
  subtitle: { fontSize: 12, color: "rgba(148,163,184,0.9)", fontWeight: 800 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.55)",
    color: "#e2e8f0",
    cursor: "pointer",
  },
  content: { padding: "0 14px 14px 14px" },
  stepTitle: { marginTop: 6, fontSize: 15, fontWeight: 950, color: "#facc15" },
  stepBody: { marginTop: 10, color: "rgba(226,232,240,0.9)", fontSize: 13, display: "flex", flexDirection: "column", gap: 6 },
  ctaBtn: {
    marginTop: 12,
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(59,130,246,0.35)",
    background: "rgba(59,130,246,0.14)",
    color: "#93c5fd",
    cursor: "pointer",
    fontWeight: 950,
  },
  footer: {
    padding: 14,
    borderTop: "1px solid rgba(148,163,184,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  checkbox: { display: "flex", alignItems: "center", color: "rgba(226,232,240,0.9)", fontSize: 13 },
  navBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.35)",
    color: "#e2e8f0",
    cursor: "pointer",
    fontWeight: 900,
  },
  navBtnPrimary: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(250,204,21,0.25)",
    background: "rgba(250,204,21,0.15)",
    color: "#facc15",
    cursor: "pointer",
    fontWeight: 950,
  },
  hint: { padding: "0 14px 12px 14px", color: "rgba(148,163,184,0.8)", fontSize: 11 },
};
