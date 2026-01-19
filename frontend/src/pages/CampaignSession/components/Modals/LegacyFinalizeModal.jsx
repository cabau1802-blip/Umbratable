import React, { useMemo } from "react";
import styles from "../../styles";

/**
 * LegacyFinalizeModal
 * JSX preservado do CampaignSession, extraído para reduzir o arquivo principal.
 *
 * Melhorias incrementais:
 * - Motion leve e padronização de comportamento (clique fora com loading guard)
 * - Microacabamento em cards internos sem alterar lógica
 */
export default function LegacyFinalizeModal({
  isLegacyFinalizeOpen,
  setIsLegacyFinalizeOpen,
  legacyFinalizeLoading,
  legacyFinalizeError,
  legacyFinalizeDraft,
  fetchLegacyFinalizeDraft,
  saveLegacyFinalizeDraft,
  applyLegacyFinalizeDraft,
  characters,

  addSuggestionItem,
  removeSuggestionItem,
  updateSuggestionItem,

  isItemApproved,
  toggleApprovedItem,
}) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cardStyle = useMemo(
    () => ({
      ...styles.quarantineCard,
      maxWidth: 1080,
      transformOrigin: "top center",
      animation: reduceMotion ? "none" : "uiModalIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
    }),
    [reduceMotion]
  );

  return (
    <>
      {isLegacyFinalizeOpen && (
        <div
          style={{ ...styles.modalOverlay, zIndex: 20000 }}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              if (!legacyFinalizeLoading) setIsLegacyFinalizeOpen(false);
            }
          }}
        >
          <div style={cardStyle} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.quarantineHeader}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={styles.quarantineTitle}>Rascunho de Legado — Final da Campanha</div>
                <div style={styles.quarantineSubtitle}>
                  Revise, edite e aplique as marcas/títulos/ganchos no legado persistente dos personagens.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={fetchLegacyFinalizeDraft} style={styles.btnGhost} disabled={legacyFinalizeLoading} type="button">
                  Recarregar
                </button>
                <button onClick={saveLegacyFinalizeDraft} style={styles.btnPrimary} disabled={legacyFinalizeLoading || !legacyFinalizeDraft} type="button">
                  Salvar rascunho
                </button>
                <button onClick={applyLegacyFinalizeDraft} style={styles.btnApprove} disabled={legacyFinalizeLoading || !legacyFinalizeDraft} type="button">
                  Aplicar
                </button>
                <button onClick={() => setIsLegacyFinalizeOpen(false)} style={styles.btnGhost} type="button" disabled={legacyFinalizeLoading}>
                  Fechar
                </button>
              </div>
            </div>

            {legacyFinalizeError && <div style={styles.quarantineError}>{legacyFinalizeError}</div>}
            {legacyFinalizeLoading && <div style={styles.quarantineInfo}>Carregando...</div>}

            <div style={styles.quarantineBody}>
              {!legacyFinalizeDraft ? (
                <div style={styles.quarantineInfo}>
                  Nenhum rascunho carregado. Use “🏁 Finalizar” para gerar ou “Recarregar” para buscar um existente.
                </div>
              ) : (legacyFinalizeDraft.characters || []).length === 0 ? (
                <div style={styles.quarantineInfo}>Nenhum personagem no rascunho.</div>
              ) : (
                (legacyFinalizeDraft.characters || []).map((c) => {
                  const characterId = c.characterId;
                  const charMeta = (characters || []).find((x) => String(x.id) === String(characterId));
                  const charName = charMeta?.name || c.character_name || `Personagem ${String(characterId).slice(0, 8)}…`;
                  const suggestions = c.suggestions || {};

                  const renderList = (title, key, fields) => {
                    const list = Array.isArray(suggestions[key]) ? suggestions[key] : [];

                    return (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                          <div style={{ fontWeight: 900, fontSize: 12, color: "#e5e7eb" }}>{title}</div>
                          <button
                            type="button"
                            onClick={() => addSuggestionItem(characterId, key, fields)}
                            style={{ ...styles.btnGhost, padding: "6px 10px", fontSize: 12 }}
                            disabled={legacyFinalizeLoading}
                          >
                            + Adicionar
                          </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {!list.length && (
                            <div style={{ fontSize: 12, color: "#94a3b8", padding: "8px 2px" }}>
                              Sem sugestões automáticas. Use “+ Adicionar” para criar um item.
                            </div>
                          )}

                          {list.map((it, idx2) => (
                            <div
                              key={`${characterId}:${key}:${it.id || idx2}`}
                              style={{
                                padding: 12,
                                borderRadius: 14,
                                border: "1px solid rgba(255,255,255,0.12)",
                                background: "rgba(0,0,0,0.22)",
                                boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                                display: "flex",
                                gap: 12,
                                alignItems: "flex-start",
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: "#e5e7eb" }}>
                                  <input
                                    type="checkbox"
                                    checked={isItemApproved(legacyFinalizeDraft, characterId, key, it.id)}
                                    onChange={() => toggleApprovedItem(characterId, key, it.id)}
                                    disabled={legacyFinalizeLoading}
                                  />
                                  Aprovar para aplicar
                                </label>

                                {fields.map((f) => (
                                  <div key={f.path} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div style={{ fontSize: 11, fontWeight: 900, color: "#94a3b8" }}>{f.label}</div>

                                    {f.type === "textarea" ? (
                                      <textarea
                                        value={String(it?.[f.path] ?? "")}
                                        onChange={(e) => updateSuggestionItem(characterId, key, it.id, { [f.path]: e.target.value })}
                                        style={{ ...styles.textarea, minHeight: 64 }}
                                        rows={3}
                                      />
                                    ) : (
                                      <input
                                        value={String(it?.[f.path] ?? "")}
                                        onChange={(e) => updateSuggestionItem(characterId, key, it.id, { [f.path]: e.target.value })}
                                        style={styles.input}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => removeSuggestionItem(characterId, key, it.id)}
                                style={{ ...styles.btnBlock, padding: "8px 10px", fontSize: 12 }}
                                title="Remover do rascunho"
                                disabled={legacyFinalizeLoading}
                              >
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div key={characterId} style={styles.quarantineSection}>
                      <div style={styles.quarantineSectionTitle}>{charName}</div>

                      {renderList("Marcas", "marks", [
                        { label: "Nome", path: "name", type: "text" },
                        { label: "Descrição", path: "description", type: "textarea" },
                      ])}

                      {renderList("Títulos", "titles", [
                        { label: "Nome", path: "name", type: "text" },
                        { label: "Concedido por", path: "granted_by", type: "text" },
                      ])}

                      {renderList("Ganchos", "hooks", [{ label: "Gancho", path: "prompt", type: "textarea" }])}

                      {renderList("Fardos", "burdens", [{ label: "Fardo", path: "description", type: "textarea" }])}
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
