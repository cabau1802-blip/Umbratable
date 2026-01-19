function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// Rain Renderer com Raios
export function createRainRenderer(canvas, initialOptions = {}) {
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });

  let w = 1;
  let h = 1;
  let running = false;
  let raf = 0;
  let lastTs = 0;

  let options = {
    intensity: 0.65,
    seed: undefined,
    color: { r: 170, g: 190, b: 255 },
    lightningColor: { r: 255, g: 255, b: 255 }, // Cor do clarão
    ...initialOptions,
  };

  const seedBase = Number.isFinite(options.seed) ? options.seed : Math.floor(Math.random() * 1e9);
  const rand = mulberry32(seedBase);

  let drops = [];
  let ripples = [];

  // Variáveis do Raio
  let lightningTimer = 0;     // Contador para o próximo raio
  let nextLightningTime = 0;  // Quando o próximo raio vai cair
  let flashOpacity = 0;       // Opacidade atual do clarão (0 a 1)

  function scheduleNextLightning() {
    // Raios acontecem aleatoriamente entre 2 a 10 segundos
    // Quanto maior a intensidade, mais frequente
    const intensity = clamp01(options.intensity);
    // Se intensidade baixa, demora muito (ou nunca)
    const baseDelay = 15 - (intensity * 12); 
    nextLightningTime = (baseDelay + rand() * 5); 
    lightningTimer = 0;
  }

  function rebuild() {
    const intensity = clamp01(options.intensity);
    const areaFactor = (w * h) / (1280 * 720);
    const count = Math.floor((100 + intensity * 400) * areaFactor);

    drops = new Array(count).fill(0).map(() => spawnDrop(true));
    ripples = [];
    
    scheduleNextLightning();
  }

  function spawnDrop(randomY = false) {
    const intensity = clamp01(options.intensity);
    const x = rand() * w;
    const y = randomY ? rand() * h : -50 - rand() * 100;
    const z = 0.2 + rand() * 0.8; 
    
    const speed = (600 + rand() * 400) * z * (1 + intensity * 0.2);
    const len = (15 + rand() * 20) * z;
    
    return {
      x, y, z, speed, len,
      width: Math.max(0.5, 2 * z),
      alpha: (0.1 + rand() * 0.2) * z * intensity
    };
  }

  function spawnRipple() {
    const x = rand() * w;
    const y = rand() * h;
    ripples.push({
      x, y,
      age: 0,
      life: 0.3 + rand() * 0.2,
      sizeMax: 5 + rand() * 10
    });
    if (ripples.length > 200) ripples.shift();
  }

  function triggerLightning() {
    // Inicia o flash
    flashOpacity = 0.6 + rand() * 0.3; // Brilho entre 0.6 e 0.9
    
    // Opcional: Tocar som aqui se você implementar áudio no futuro
  }

  function resize(nextW, nextH) {
    w = Math.max(1, nextW | 0);
    h = Math.max(1, nextH | 0);
    rebuild();
  }

  function setOptions(next = {}) {
    options = { ...options, ...next };
    rebuild();
  }

  function clear() {
    ctx.clearRect(0, 0, w, h);
  }

  function tick(ts) {
    if (!running) return;

    const t = ts || performance.now();
    const dt = lastTs ? Math.min(0.05, (t - lastTs) / 1000) : 0.016;
    lastTs = t;

    ctx.clearRect(0, 0, w, h);
    
    const intensity = clamp01(options.intensity);
    const { r, g, b } = options.color;

    // --- LÓGICA DO RAIO ---
    // 1. Decaimento do Flash (Fade out)
    if (flashOpacity > 0) {
        // Tremulação: o flash não desce linearmente, ele "vibra"
        // Isso cria aquele efeito estroboscópico de raio real
        const flicker = Math.random() > 0.5 ? 0.1 : -0.05;
        flashOpacity -= (2.5 * dt) + flicker; 
        if (flashOpacity < 0) flashOpacity = 0;
    }

    // 2. Agendar próximo Raio (Só se intensidade > 0.7)
    if (intensity > 0.7) {
        lightningTimer += dt;
        if (lightningTimer >= nextLightningTime) {
            triggerLightning();
            scheduleNextLightning();
        }
    } else {
        flashOpacity = 0; // Garante que para se baixar a barra
    }

    // 3. Desenhar Fundo (Atmosfera)
    // Se tiver flash, o fundo clareia, senão fica escuro
    if (flashOpacity > 0.1) {
        // COR DO FLASH (Branco estourado)
        const lr = options.lightningColor.r;
        const lg = options.lightningColor.g;
        const lb = options.lightningColor.b;
        ctx.fillStyle = `rgba(${lr}, ${lg}, ${lb}, ${flashOpacity})`;
        ctx.fillRect(0, 0, w, h);
    } else {
        // ESCURIDÃO DA TEMPESTADE (Darkening)
        // Só desenha o escuro se não tiver raio iluminando
        ctx.fillStyle = `rgba(10, 15, 30, ${0.1 + intensity * 0.3})`;
        ctx.fillRect(0, 0, w, h);
    }

    // --- FIM LÓGICA DO RAIO ---

    const wind = Math.sin(t * 0.001) * (0.5 + intensity);

    ctx.globalCompositeOperation = 'screen'; 

    // Render Gotas
    ctx.beginPath();
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y += d.speed * dt;
      d.x += wind * d.speed * 0.002 * dt * 60;

      if (d.y > h + 50 || d.x < -100 || d.x > w + 100) {
        Object.assign(drops[i], spawnDrop(false));
        continue;
      }

      const tiltX = wind * 10; 
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + tiltX, d.y - d.len);
    }
    
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.15 + intensity * 0.2})`;
    ctx.stroke();

    // Render Ripples
    if (Math.random() < intensity * 0.8) {
        spawnRipple();
        if (intensity > 0.7) spawnRipple();
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rip = ripples[i];
      rip.age += dt;
      if (rip.age >= rip.life) {
        ripples.splice(i, 1);
        continue;
      }
      const lifePct = rip.age / rip.life;
      const size = rip.sizeMax * Math.sin(lifePct * Math.PI / 2);
      const alpha = (1 - lifePct) * (0.3 + intensity * 0.3);

      ctx.beginPath();
      ctx.ellipse(rip.x, rip.y, size, size * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    lastTs = 0;
    rebuild();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clear();
  }

  function destroy() {
    stop();
    drops = [];
    ripples = [];
  }

  return { start, stop, destroy, resize, setOptions };
}