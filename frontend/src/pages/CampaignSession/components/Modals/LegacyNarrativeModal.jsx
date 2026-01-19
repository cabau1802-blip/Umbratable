import React, { useMemo } from "react";
import styles from "../../styles";

/**
 * LegacyNarrativeModal
 * JSX preservado do CampaignSession, extraído para reduzir o arquivo principal.
 *
 * Correções incrementais:
 * - styles.modalBox / styles.closeBtn podem não existir: fallback seguro inline (não quebra)
 * - Padronização para modalOverlay/modalCard + header/body/footer
 */
export default function LegacyNarrativeModal({
  isLegacyModalOpen,
  setIsLegacyModalOpen,
  legacyDraft,
  setLegacyDraft,
  legacyTargets,
  toggleLegacyTarget,
  characters,
  legacyApplying,
  applyLegacyToTargets,
}) {
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

  const sectionBox = {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
  };

  const titlePill = {
    fontSize: 11,
    fontWeight: 900,
    color: "#94a3b8",
    letterSpacing: 1,
    textTransform: "uppercase",
  };

  return (
    <>
      {isLegacyModalOpen && (
        <div
          style={{ ...styles.modalOverlay, zIndex: 20000 }}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsLegacyModalOpen(false);
          }}
        >
          <div style={cardStyle} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalTitle}>Aplicar Legado Narrativo</div>
                <div style={styles.modalSubtitle}>
                  Adiciona Marcas/Títulos/Ganchos aos personagens selecionados. Ideal para encerrar arcos com impacto.
                </div>
              </div>

              <button onClick={() => setIsLegacyModalOpen(false)} style={styles.iconBtnDanger} type="button" aria-label="Fechar" title="Fechar">
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={sectionBox}>
                  <div style={titlePill}>Marca</div>
                  <div style={{ height: 8 }} />
                  <input
                    value={legacyDraft?.markName || ""}
                    onChange={(e) => setLegacyDraft((p) => ({ ...(p || {}), markName: e.target.value }))}
                    placeholder="Ex: Sobrevivente da Queda de Valenreach"
                    style={styles.input}
                  />
                  <div style={{ height: 8 }} />
                  <textarea
                    value={legacyDraft?.markDesc || ""}
                    onChange={(e) => setLegacyDraft((p) => ({ ...(p || {}), markDesc: e.target.value }))}
                    placeholder="Descrição curta"
                    style={styles.textarea}
                    rows={3}
                  />
                </div>

                <div style={sectionBox}>
                  <div style={titlePill}>Título</div>
                  <div style={{ height: 8 }} />
                  <input
                    value={legacyDraft?.titleName || ""}
                    onChange={(e) => setLegacyDraft((p) => ({ ...(p || {}), titleName: e.target.value }))}
                    placeholder="Ex: Quebrador de Coroas"
                    style={styles.input}
                  />
                  <div style={{ height: 8 }} />
                  <input
                    value={legacyDraft?.titleGrantedBy || ""}
                    onChange={(e) => setLegacyDraft((p) => ({ ...(p || {}), titleGrantedBy: e.target.value }))}
                    placeholder="Concedido por (ex: Campanha X)"
                    style={styles.input}
                  />
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                    Dica: títulos ativos podem ser exibidos no topo da ficha do personagem.
                  </div>
                </div>

                <div style={{ ...sectionBox, gridColumn: "1 / -1" }}>
                  <div style={titlePill}>Gancho (opcional)</div>
                  <div style={{ height: 8 }} />
                  <textarea
                    value={legacyDraft?.hookPrompt || ""}
                    onChange={(e) => setLegacyDraft((p) => ({ ...(p || {}), hookPrompt: e.target.value }))}
                    placeholder="Ex: Antigos inimigos reconhecem o personagem e reagem com medo."
                    style={styles.textarea}
                    rows={2}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#e5e7eb" }}>Personagens alvo</div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>Selecionados: {(legacyTargets || []).length}</div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {Array.isArray(characters) &&
                    characters.map((c) => (
                      <label
                        key={c.id}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          border: (legacyTargets || []).includes(c.id)
                            ? "1px solid rgba(250,204,21,0.45)"
                            : "1px solid rgba(255,255,255,0.12)",
                          background: (legacyTargets || []).includes(c.id) ? "rgba(250,204,21,0.08)" : "rgba(255,255,255,0.03)",
                          color: "#e5e7eb",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          cursor: "pointer",
                        }}
                      >
                        <input type="checkbox" checked={(legacyTargets || []).includes(c.id)} onChange={() => toggleLegacyTarget(c.id)} />
                        <span style={{ fontWeight: 800 }}>{c.name}</span>
                        <span style={{ color: "#94a3b8", marginLeft: 8 }}>
                          {c.class} • Nv {c.level}
                        </span>
                      </label>
                    ))}

                  {(!characters || characters.length === 0) && <div style={{ color: "#64748b" }}>Nenhum personagem na campanha.</div>}
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setIsLegacyModalOpen(false)} style={styles.btnGhost} type="button">
                Cancelar
              </button>
              <button onClick={applyLegacyToTargets} disabled={legacyApplying} style={styles.btnPrimary} type="button">
                {legacyApplying ? "Aplicando..." : "Aplicar Legado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
