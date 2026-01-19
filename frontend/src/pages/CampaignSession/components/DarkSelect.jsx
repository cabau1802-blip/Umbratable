import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function DarkSelect({ value, onChange, options, placeholder, style, compact = false }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0, width: 180 });

  // NOVO (incremental): controle de navegação por teclado sem alterar contratos
  const [activeIndex, setActiveIndex] = useState(-1);

  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const selected = useMemo(
    () => (options || []).find((o) => String(o.value) === String(value)),
    [options, value]
  );

  const MENU_MAX_HEIGHT = 240;
  const GAP = 8;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const updateMenuPosition = () => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenUp = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow;
    setOpenUp(shouldOpenUp);

    // largura ancorada ao trigger, com limite
    const width = Math.min(Math.max(rect.width, 140), 260);

    // tenta manter dentro da viewport horizontal
    let left = rect.left;
    if (left + width > window.innerWidth - GAP) left = window.innerWidth - GAP - width;
    if (left < GAP) left = GAP;

    // top/bottom (portal é relativo à viewport de verdade)
    let top = shouldOpenUp ? rect.top - GAP - MENU_MAX_HEIGHT : rect.bottom + GAP;

    // clamp vertical para não sair da viewport
    if (top < GAP) top = GAP;
    if (top > window.innerHeight - GAP) top = window.innerHeight - GAP;

    setMenuPos({ left, top, width });
  };

  // Fecha ao clicar fora (trigger + menu)
  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      const t = triggerRef.current;
      const m = menuRef.current;

      if (t && t.contains(e.target)) return;
      if (m && m.contains(e.target)) return;

      setOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // Reposiciona ao abrir
  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reposiciona em scroll/resize (captura scroll em containers também)
  useEffect(() => {
    if (!open) return;

    const onScroll = () => updateMenuPosition();
    const onResize = () => updateMenuPosition();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // NOVO: ao abrir, define índice ativo e tenta focar o menu para teclas
  useEffect(() => {
    if (!open) return;
    const list = options || [];
    const idx = list.findIndex((o) => String(o.value) === String(value));
    setActiveIndex(idx >= 0 ? idx : 0);

    // foca o menu sem quebrar UX (mantém clique/scroll)
    const id = window.requestAnimationFrame(() => {
      if (menuRef.current) menuRef.current.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, options, value]);

  const btnClass = compact ? "input input-inline" : "input";
  const listboxId = useMemo(
    () => `darkselect-${Math.random().toString(16).slice(2)}`,
    []
  );

  const moveActive = (delta) => {
    const list = options || [];
    if (!list.length) return;
    setActiveIndex((i) => {
      const next = (i < 0 ? 0 : i + delta + list.length) % list.length;
      return next;
    });
  };

  const commitActive = () => {
    const list = options || [];
    if (!list.length) return;
    const opt = list[Math.max(0, activeIndex)];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  };

  const onTriggerKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      if (triggerRef.current) {
        const btn = triggerRef.current.querySelector("button");
        if (btn) btn.focus();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      const list = options || [];
      setActiveIndex(Math.max(0, list.length - 1));
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commitActive();
    }
  };

  return (
    <>
      <div ref={triggerRef} style={{ display: "inline-block", ...style }}>
        <button
          type="button"
          className={btnClass}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onTriggerKeyDown}
          style={{
            width: compact ? "auto" : "100%",
            minWidth: compact ? 86 : undefined,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            textAlign: "left",

            // NOVO: acabamento premium, sem remover estilos existentes
            background: "rgba(2, 6, 23, 0.55)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 12,
            boxShadow: open ? "0 18px 55px rgba(0,0,0,0.55)" : "0 10px 30px rgba(0,0,0,0.30)",
            transition: reduceMotion
              ? "none"
              : "transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1), background 180ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 180ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              paddingRight: 10,
            }}
          >
            {selected?.label || placeholder}
          </span>
          <span
            style={{
              opacity: 0.7,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: reduceMotion ? "none" : "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
              display: "inline-block",
              willChange: "transform",
            }}
          >
            ▾
          </span>
        </button>
      </div>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            onKeyDown={onMenuKeyDown}
            style={{
              position: "fixed",
              left: menuPos.left,
              top: menuPos.top,
              width: menuPos.width,

              // Visual premium
              background:
                "linear-gradient(180deg, rgba(15,15,20,0.98) 0%, rgba(10,10,14,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 14,
              zIndex: 999999, // acima de qualquer toolbar/canvas
              maxHeight: MENU_MAX_HEIGHT,
              overflowY: "auto",
              boxShadow: "0 25px 80px rgba(0,0,0,0.75)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",

              // Motion leve (incremental)
              transformOrigin: openUp ? "bottom center" : "top center",
              animation: reduceMotion ? "none" : "uiFadeUp 160ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
              outline: "none",
            }}
          >
            {(options || []).map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              const isActive = idx === activeIndex;

              return (
                <div
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 800,
                    color: isSelected ? "#facc15" : "#e5e7eb",
                    background: isSelected
                      ? "rgba(250,204,21,0.12)"
                      : isActive
                        ? "rgba(255,255,255,0.06)"
                        : "transparent",
                    whiteSpace: "nowrap",
                    borderRadius: 10,
                    margin: "4px 6px",
                    border: isActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                    transition: reduceMotion
                      ? "none"
                      : "transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1), background 180ms cubic-bezier(0.2, 0.8, 0.2, 1), border-color 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                    transform: isActive ? "translateY(-1px)" : "translateY(0px)",
                  }}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

export default DarkSelect;
