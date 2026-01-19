import React, { useMemo } from "react";
import styles from "../../styles";
import DarkSelect from "../DarkSelect";

/**
 * EventModalGM
 * Correções incrementais:
 * - Stack/zIndex para editor ficar acima do feed
 * - Editor aninhado (não exige fechar feed)
 * - Guardas para props opcionais (não quebra contratos)
 *
 * Melhorias visuais incrementais:
 * - Header/body/footer padronizados com styles.js
 * - Motion leve e consistência de botões/inputs
 * - Acessibilidade em dialogs e botões de fechar
 */
export default function EventModalGM(props) {
  const {
    isGM,

    players = [],
    events = [],
    pinnedEvents = [],

    isEventsPopupOpen,
    setIsEventsPopupOpen,

    eventDraft,
    setEventDraft,
    eventModalOpen,
    setEventModalOpen,
    eventEditing,
    submitEventDraft,
    openEditEvent,
    deleteEvent,

    importEventsFromJson,
    importEventsFromFile,
    exportEventsAsJson,
    exportEventsAsTxt,
    exportEventsAsMarkdown,
    clearAllEvents,

    pinEvent,
    unpinEvent,

    filterType,
    setFilterType,
    filterQuery,
    setFilterQuery,

    onlyPinned,
    setOnlyPinned,

    eventError,
  } = props;

  const canTogglePinnedFilter = typeof setOnlyPinned === "function";

  const safeSetOnlyPinned = (value) => {
    if (typeof setOnlyPinned === "function") setOnlyPinned(value);
  };
  const safeSetFilterQuery = (value) => {
    if (typeof setFilterQuery === "function") setFilterQuery(value);
  };
  const safeSetFilterType = (value) => {
    if (typeof setFilterType === "function") setFilterType(value);
  };

  // Stack: feed base, editor acima
  const Z_FEED = 20000;
  const Z_EDITOR = 21000;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const animatedCard = useMemo(
    () => ({
      ...styles.modalCard,
      transformOrigin: "top center",
      animation: reduceMotion ? "none" : "uiModalIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
    }),
    [reduceMotion]
  );

  return (
    <>
      {/* FEED DE EVENTOS (base) */}
      {isEventsPopupOpen && (
        <div
          style={{ ...styles.modalOverlay, zIndex: Z_FEED }}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsEventsPopupOpen(false);
          }}
        >
          <div
            style={{
              ...animatedCard,
              width: "min(860px, 94vw)",
              maxWidth: "94vw",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalTitle}>Eventos</div>
                <div style={styles.modalSubtitle}>Feed, filtros, fixados e ferramentas do GM.</div>
              </div>

              <button
                style={styles.iconBtnDanger}
                type="button"
                onClick={() => setIsEventsPopupOpen(false)}
                title="Fechar"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 900, color: "#a1a1aa", letterSpacing: 1 }}>
                  FEED DE EVENTOS
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <input
                    value={filterQuery || ""}
                    onChange={(e) => safeSetFilterQuery(e.target.value)}
                    placeholder="Buscar..."
                    style={{ ...styles.input, width: 220 }}
                  />

                  <DarkSelect
                    value={filterType || "all"}
                    onChange={(value) => safeSetFilterType(value)}
                    options={[
                      { label: "Todos", value: "all" },
                      { label: "Rumor", value: "rumor" },
                      { label: "Evento", value: "event" },
                      { label: "NPC", value: "npc" },
                      { label: "Local", value: "place" },
                      { label: "Recompensa", value: "reward" },
                      { label: "Mistério", value: "mystery" },
                      { label: "Combate", value: "combat" },
                      { label: "Legado", value: "legacy" },
                    ]}
                    compact
                  />

                  {canTogglePinnedFilter && (
                    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#cbd5e1" }}>
                      <input type="checkbox" checked={!!onlyPinned} onChange={(e) => safeSetOnlyPinned(e.target.checked)} />
                      Só fixados
                    </label>
                  )}

                  {isGM && (
                    <>
                      <button
                        onClick={() => setEventModalOpen(true)}
                        style={styles.btnPrimary}
                        type="button"
                        title="Criar novo evento"
                      >
                        Novo
                      </button>

                      {typeof exportEventsAsJson === "function" && (
                        <button onClick={exportEventsAsJson} style={styles.btnGhost} type="button">
                          Export JSON
                        </button>
                      )}
                      {typeof exportEventsAsMarkdown === "function" && (
                        <button onClick={exportEventsAsMarkdown} style={styles.btnGhost} type="button">
                          Export MD
                        </button>
                      )}
                      {typeof exportEventsAsTxt === "function" && (
                        <button onClick={exportEventsAsTxt} style={styles.btnGhost} type="button">
                          Export TXT
                        </button>
                      )}
                      {typeof importEventsFromJson === "function" && (
                        <button onClick={importEventsFromJson} style={styles.btnGhost} type="button">
                          Import JSON
                        </button>
                      )}
                      {typeof importEventsFromFile === "function" && (
                        <input type="file" accept=".json" onChange={importEventsFromFile} style={{ fontSize: 12, color: "#cbd5e1" }} />
                      )}
                      {typeof clearAllEvents === "function" && (
                        <button onClick={clearAllEvents} style={styles.btnBlock} type="button">
                          Limpar Tudo
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(events || []).map((ev) => {
                  const isPinned = (pinnedEvents || []).includes(ev.id);

                  return (
                    <div
                      key={ev.id}
                      style={{
                        ...styles.eventCard,
                        animation: reduceMotion ? "none" : "uiFadeUp 160ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <div style={styles.eventBadge}>{(ev.event_type || "event").toUpperCase()}</div>
                            <div style={{ fontWeight: 900, color: "#e5e7eb" }}>{ev.title}</div>
                            {ev.session_number ? (
                              <div style={{ fontSize: 12, color: "#94a3b8" }}>Sessão {ev.session_number}</div>
                            ) : null}
                          </div>

                          <div style={{ fontSize: 12, color: "#a1a1aa" }}>
                            Visibilidade: {ev.visibility || "public"}
                            {ev.target_player_id ? ` | Alvo: ${ev.target_player_id}` : ""}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {typeof pinEvent === "function" && typeof unpinEvent === "function" && (
                            <button
                              type="button"
                              onClick={() => (isPinned ? unpinEvent(ev.id) : pinEvent(ev.id))}
                              style={styles.btnGhost}
                            >
                              {isPinned ? "Desfixar" : "Fixar"}
                            </button>
                          )}

                          {isGM && (
                            <>
                              {typeof openEditEvent === "function" && (
                                <button type="button" onClick={() => openEditEvent(ev)} style={styles.btnGhost}>
                                  Editar
                                </button>
                              )}
                              {typeof deleteEvent === "function" && (
                                <button type="button" onClick={() => deleteEvent(ev)} style={styles.btnBlock}>
                                  Excluir
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {ev.content ? (
                        <div style={{ marginTop: 10, color: "#e5e7eb", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.4 }}>
                          {ev.content}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* EDITOR ANINHADO */}
          {eventModalOpen && (
            <div
              style={{
                ...styles.modalOverlay,
                zIndex: Z_EDITOR,
                background: "rgba(0,0,0,0.55)",
              }}
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setEventModalOpen(false);
              }}
            >
              <div
                style={{
                  ...animatedCard,
                  width: "min(760px, 94vw)",
                  maxWidth: 760,
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div style={styles.modalHeader}>
                  <div>
                    <div style={styles.modalTitle}>{eventEditing ? "Editar Evento" : "Novo Evento"}</div>
                    <div style={styles.modalSubtitle}>Defina tipo, visibilidade e conteúdo narrativo.</div>
                  </div>

                  <button
                    onClick={() => setEventModalOpen(false)}
                    style={styles.iconBtnDanger}
                    type="button"
                    title="Fechar"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                <div style={styles.modalBody}>
                  {eventError ? (
                    <div
                      style={{
                        marginBottom: 10,
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        background: "rgba(239, 68, 68, 0.10)",
                        color: "#fecaca",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {String(eventError)}
                    </div>
                  ) : null}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {[
                      { label: "Rumor", event_type: "rumor", tags: "rumor", title: "Rumor" },
                      { label: "Evento", event_type: "event", tags: "event", title: "Evento" },
                      { label: "NPC", event_type: "npc", tags: "npc", title: "NPC" },
                      { label: "Local", event_type: "place", tags: "place", title: "Local" },
                      { label: "Recompensa", event_type: "reward", tags: "reward", title: "Recompensa" },
                      { label: "Mistério", event_type: "mystery", tags: "mystery", title: "Mistério" },
                      { label: "Combate", event_type: "combat", tags: "combat", title: "Combate" },
                      { label: "Legado", event_type: "legacy", tags: "legacy", title: "Legado" },
                    ].map((t) => {
                      const active = eventDraft?.event_type === t.event_type;
                      return (
                        <button
                          key={t.event_type}
                          type="button"
                          onClick={() =>
                            setEventDraft({ ...eventDraft, event_type: t.event_type, tags: t.tags, title: t.title })
                          }
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: active ? "1px solid rgba(250,204,21,0.45)" : "1px solid rgba(255,255,255,0.14)",
                            background: active ? "rgba(250,204,21,0.10)" : "rgba(255,255,255,0.04)",
                            color: active ? "#facc15" : "#e5e7eb",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input
                      value={eventDraft?.session_number || ""}
                      onChange={(e) => setEventDraft({ ...eventDraft, session_number: e.target.value })}
                      placeholder="Sessão (ex: 12)"
                      style={styles.input}
                    />
                    <input
                      value={eventDraft?.title || ""}
                      onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })}
                      placeholder="Título curto"
                      style={styles.input}
                    />
                  </div>

                  <div style={{ height: 10 }} />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <DarkSelect
                      value={eventDraft?.visibility || "public"}
                      onChange={(value) => setEventDraft({ ...eventDraft, visibility: value })}
                      options={[
                        { label: "Público (todos veem)", value: "public" },
                        { label: "Somente GM", value: "gm" },
                        { label: "Privado (alvos)", value: "targets" },
                      ]}
                    />

                    <DarkSelect
                      value={eventDraft?.target_player_id || ""}
                      onChange={(value) => setEventDraft({ ...eventDraft, target_player_id: value })}
                      options={[
                        { label: "Sem alvo", value: "" },
                        ...(players || []).map((p) => ({
                          label: p.name || p.nickname || `Jogador ${p.id}`,
                          value: p.id,
                        })),
                      ]}
                    />
                  </div>

                  <div style={{ height: 10 }} />

                  <textarea
                    value={eventDraft?.content || ""}
                    onChange={(e) => setEventDraft({ ...eventDraft, content: e.target.value })}
                    placeholder="Descrição / narrativa / detalhes"
                    style={{ ...styles.textarea, minHeight: 160 }}
                    rows={7}
                  />
                </div>

                <div style={styles.modalFooter}>
                  <button onClick={() => setEventModalOpen(false)} style={styles.btnGhost} type="button">
                    Cancelar
                  </button>
                  <button onClick={submitEventDraft} style={styles.btnPrimary} type="button">
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor isolado (compatibilidade) */}
      {!isEventsPopupOpen && eventModalOpen && (
        <div
          style={{ ...styles.modalOverlay, zIndex: Z_EDITOR }}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEventModalOpen(false);
          }}
        >
          <div style={{ ...animatedCard, width: "min(760px, 94vw)", maxWidth: 760 }} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>{eventEditing ? "Editar Evento" : "Novo Evento"}</div>
              <button
                onClick={() => setEventModalOpen(false)}
                style={styles.iconBtnDanger}
                type="button"
                title="Fechar"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {eventError ? (
                <div
                  style={{
                    marginBottom: 10,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    background: "rgba(239, 68, 68, 0.10)",
                    color: "#fecaca",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {String(eventError)}
                </div>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  value={eventDraft?.session_number || ""}
                  onChange={(e) => setEventDraft({ ...eventDraft, session_number: e.target.value })}
                  placeholder="Sessão (ex: 12)"
                  style={styles.input}
                />
                <input
                  value={eventDraft?.title || ""}
                  onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })}
                  placeholder="Título curto"
                  style={styles.input}
                />
              </div>

              <div style={{ height: 10 }} />

              <textarea
                value={eventDraft?.description || ""}
                onChange={(e) => setEventDraft({ ...eventDraft, description: e.target.value })}
                placeholder="Descrição / narrativa / detalhes"
                style={{ ...styles.textarea, minHeight: 160 }}
                rows={7}
              />
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setEventModalOpen(false)} style={styles.btnGhost} type="button">
                Cancelar
              </button>
              <button onClick={submitEventDraft} style={styles.btnPrimary} type="button">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
