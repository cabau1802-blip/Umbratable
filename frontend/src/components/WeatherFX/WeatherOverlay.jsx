import React, { useEffect, useMemo, useRef } from "react";
import styles from "./WeatherOverlay.module.css";

// Importe seus renderers aqui
import { createRainRenderer } from "./renderers/rain";
import { createSnowRenderer } from "./renderers/snow";
import { createFogRenderer } from "./renderers/fog";

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export default function WeatherOverlay({
  active = false,
  type = "none",
  intensity = 0.5,
  seed,
  zIndex = 30000,
  forceAnimate = true,
}) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);

  const reducedMotion = useMemo(() => {
    if (!forceAnimate) {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  }, [forceAnimate]);

  const enabled = Boolean(active) && type !== "none";

  const rendererFactory = useMemo(() => {
    switch (type) {
      case "rain": return createRainRenderer;
      case "snow": return createSnowRenderer;
      case "fog":  return createFogRenderer;
      default:     return null;
    }
  }, [type]);

  // 1. Efeito de CRIAÇÃO/DESTRUIÇÃO (Roda apenas se mudar o TIPO ou ENABLED)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Limpa renderer anterior
    if (rendererRef.current) {
      rendererRef.current.stop?.();
      rendererRef.current.destroy?.();
      rendererRef.current = null;
    }

    if (!enabled || !rendererFactory) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const parent = canvas.parentElement;
    let w = 1;
    let h = 1;

    // Inicializa o renderer com a intensidade ATUAL
    const r = rendererFactory(canvas, {
      intensity: clamp01(intensity),
      seed,
      reducedMotion,
    });
    rendererRef.current = r;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      // Limita DPR para performance
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d", { alpha: true });
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      rendererRef.current?.resize?.(w, h);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(parent);

    r.start?.();

    return () => {
      ro.disconnect();
      r.stop?.();
      r.destroy?.();
      rendererRef.current = null;
    };
    // NOTA: Removi 'intensity' e 'seed' daqui para não recriar o canvas toda vez
  }, [enabled, rendererFactory, reducedMotion]); 

  // 2. Efeito de ATUALIZAÇÃO (Roda quando muda INTENSIDADE ou SEED)
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setOptions({
        intensity: clamp01(intensity),
        seed,
        reducedMotion
      });
    }
  }, [intensity, seed, reducedMotion]);

  return (
    <div
      className={`${styles.layer} ${enabled ? styles.on : styles.off}`}
      style={{ zIndex }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}