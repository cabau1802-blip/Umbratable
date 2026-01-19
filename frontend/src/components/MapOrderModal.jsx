import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * MapOrderModal
 * Modal responsável por ordenar mapas da campanha.
 *
 * Incremental & seguro:
 * - Aceita `open` e `isOpen` (compatibilidade).
 * - Mantém API `maps`, `onClose`, `onSave`.
 * - Adiciona ordenação local via botões (up/down), sem libs.
 * - Visual premium (glass + depth), respeita prefers-reduced-motion.
 */
export default function MapOrderModal({
  open,
  isOpen,
  maps = [],
  onClose,
  onSave,
}) {
  const effectiveOpen = Boolean(open ?? isOpen);
  if (!effectiveOpen) return null;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [localMaps, setLocalMaps] = useState(() => maps);
  const cardRef = useRef(null);

  // Sincroniza quando a lista muda ou quando abre.
  useEffect(() => {
    setLocalMaps(maps);
  }, [maps, effectiveOpen]);

  // ESC fecha
  useEffect(() => {
    if (!effectiveOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [effectiveOpen, onClose]);

  // Foco inicial no card para acessibilidade / UX
  useEffect(() => {
    if (!effectiveOpen) return;
    const t = window.setTimeout(() => {
      cardRef.current?.focus?.();
    }, 0);
    return () => window.clearTimeout(t);
  }, [effectiveOpen]);

  const overlayStyle = useMemo(
    () => ({
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        "radial-gradient(900px 520px at 22% 10%, rgba(250,204,21,0.10), rgba(0,0,0,0) 58%), " +
        "radial-gradient(900px 520px at 78% 18%, rgba(56,189,248,0.08), rgba(0,0,0,0) 58%), " +
        "rgba(0,0,0,0.78)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      zIndex: 20000,
      padding: 14,
    }),
    []
  );

  const cardStyle = useMemo(
    () => ({
      width: "min(760px, 94vw)",
      maxHeight: "min(78vh, 720px)",
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.14)",
      background:
        "linear-gradient(180deg, rgba(10,10,14,0.965), rgba(6,8,12,0.965))",
      boxShadow:
        "0 28px 90px rgba(0,0,0,0.78), inset 0 1px 0 rgba(255,255,255,0.06)",
      overflow: "hidden",
      transformOrigin: "top center",
      animation: reduceMotion
        ? "none"
        : "uiModalIn 190ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      outline: "none",
      display: "flex",
      flexDirection: "column",
    }),
    [reduceMotion]
  );

  const headerStyle = useMemo(
    () => ({
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid rgba(255,255,255,0.10)",
      background:
        "linear-gradient(135deg, rgba(250,204,21,0.14) 0%, rgba(255,255,255,0.03) 42%, rgba(0,0,0,0) 100%)",
      color: "#e5e7eb",
      gap: 12,
    }),
    []
  );

  const titleStyle = useMemo(
    () => ({
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 0,
    }),
    []
  );

  const btnBase = useMemo(
    () => ({
      height: 38,
      padding: "0 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.04)",
      color: "#e5e7eb",
      fontWeight: 900,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }),
    []
  );

  const btnPrimary = useMemo(
    () => ({
      ...btnBase,
      border: "1px solid rgba(250,204,21,0.35)",
      background: "rgba(250,204,21,0.12)",
      color: "#facc15",
    }),
    [btnBase]
  );

  const contentStyle = useMemo(
    () => ({
      padding: 16,
      overflow: "auto",
    }),
    []
  );

  const helperStyle = useMemo(
    () => ({
      fontSize: 12,
      color: "#94a3b8",
      lineHeight: 1.35,
    }),
    []
  );

  const listStyle = useMemo(
    () => ({
      marginTop: 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }),
    []
  );

  const rowStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: "40px 1fr auto",
      gap: 10,
      alignItems: "center",
      padding: "10px 12px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.10)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.0))",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    }),
    []
  );

  const indexPillStyle = useMemo(
    () => ({
      width: 34,
      height: 28,
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      fontSize: 12,
      color: "#e5e7eb",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(0,0,0,0.25)",
    }),
    []
  );

  const nameStyle = useMemo(
    () => ({
      color: "#e5e7eb",
      fontWeight: 900,
      fontSize: 13,
      letterSpacing: 0.2,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    []
  );

  const miniBtnStyle = useMemo(
    () => ({
      height: 34,
      padding: "0 10px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.04)",
      color: "#e5e7eb",
      fontWeight: 900,
      cursor: "pointer",
    }),
    []
  );

  const move = (from, to) => {
    setLocalMaps((prev) => {
      if (!Array.isArray(prev)) return prev;
      if (from < 0 || from >= prev.length) return prev;
      if (to < 0 || to >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const getMapLabel = (map, index) =>
    map?.name || map?.title || `Mapa ${index + 1}`;

  return (
    <div
      className="campaign-modal-backdrop"
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Ordem dos mapas"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="campaign-modal"
        style={cardStyle}
        ref={cardRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={headerStyle}>
          <div style={titleStyle}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>
              Ordem dos Mapas
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Ajuste a ordem para controlar a navegação e apresentação.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={onClose}
              type="button"
              style={btnBase}
              aria-label="Fechar"
            >
              Fechar
            </button>

            {onSave && (
              <button
                onClick={() => onSave(localMaps)}
                type="button"
                style={btnPrimary}
                aria-label="Salvar ordem"
              >
                Salvar
              </button>
            )}
          </div>
        </div>

        <div style={contentStyle}>
          {localMaps.length === 0 ? (
            <div style={{ opacity: 0.9, color: "#94a3b8" }}>
              Nenhum mapa disponível.
            </div>
          ) : (
            <>
              <div style={helperStyle}>
                Use <b>Subir</b>/<b>Descer</b> para ordenar. (Drag-and-drop pode
                ser adicionado depois sem quebrar nada.)
              </div>

              <div style={listStyle}>
                {localMaps.map((map, index) => (
                  <div key={map?.id ?? index} style={rowStyle}>
                    <span style={indexPillStyle}>
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div style={{ minWidth: 0 }}>
                      <div style={nameStyle}>{getMapLabel(map, index)}</div>
                      {map?.id && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(148,163,184,0.92)",
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ID: {String(map.id)}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        style={miniBtnStyle}
                        onClick={() => move(index, index - 1)}
                        disabled={index === 0}
                        aria-label="Mover para cima"
                        title="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        style={miniBtnStyle}
                        onClick={() => move(index, index + 1)}
                        disabled={index === localMaps.length - 1}
                        aria-label="Mover para baixo"
                        title="Descer"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div
          className="campaign-modal-actions"
          style={{
            padding: 14,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            background: "rgba(0,0,0,0.22)",
          }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            Dica: pressione <b>Esc</b> para fechar.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} type="button" style={btnBase}>
              Fechar
            </button>

            {onSave && (
              <button
                onClick={() => onSave(localMaps)}
                type="button"
                style={btnPrimary}
              >
                Salvar
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes uiModalIn {
            from { opacity: 0; transform: translateY(10px) scale(0.985); }
            to   { opacity: 1; transform: translateY(0px) scale(1); }
          }
          .campaign-modal-backdrop button:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }
          .campaign-modal-backdrop button:focus-visible {
            outline: 2px solid rgba(250,204,21,0.45);
            outline-offset: 2px;
          }
        `}</style>
      </div>
    </div>
  );
}
