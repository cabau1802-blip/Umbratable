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

export function createSnowRenderer(canvas, initialOptions = {}) {
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });

  let w = 1;
  let h = 1;
  let running = false;
  let raf = 0;
  let lastTs = 0;

  let options = {
    intensity: 0.5, // 0 a 1
    seed: undefined,
    // Configurações de Vento
    windSpeed: 0.5,      // 0 = calmo, 2 = ventania
    windDirection: 60,   // Graus. 90 = caindo reto.
    ...initialOptions,
  };

  const seedBase = Number.isFinite(options.seed) ? options.seed : Math.floor(Math.random() * 1e9);
  const rand = mulberry32(seedBase);

  let flakes = [];
  let windX = 0;
  let windY = 0;

  function updateWindVectors() {
    const rad = (options.windDirection * Math.PI) / 180;
    windX = Math.cos(rad);
    windY = Math.sin(rad);
  }

  function rebuild() {
    updateWindVectors();
    const intensity = clamp01(options.intensity);
    const areaFactor = (w * h) / (1280 * 720);
    
    // Neve precisa de MUITAS partículas para ficar bonito, mas partículas simples.
    // Camadas:
    // 0 = Fundo (Muitos, pequenos, lentos)
    // 1 = Meio (Normal)
    // 2 = Frente (Poucos, grandes, rápidos, translúcidos - Efeito Bokeh)
    
    const count = Math.floor((200 + intensity * 600) * areaFactor);
    flakes = new Array(count).fill(0).map(() => spawn(true));
    
    // Ordenar para desenhar os grandes por cima dos pequenos (z-index visual)
    flakes.sort((a, b) => a.z - b.z);
  }

  function spawn(randomPos = false) {
    // Definimos uma "profundidade" Z (0 a 1)
    // 0 = longe, 1 = colado na tela
    const z = rand(); 
    
    // Tamanho baseado na profundidade.
    // Flocos longe = 1px a 2px
    // Flocos perto = 3px a 6px (Bokeh)
    const size = 1.0 + z * (1.5 + rand() * 3);

    // Velocidade
    // Flocos perto parecem cair mais rápido (Parallax)
    const baseSpeed = 40 + rand() * 40;
    const speed = baseSpeed * (0.5 + z * 1.5);

    // Posição
    const x = randomPos ? rand() * w : -50 + rand() * (w + 100);
    const y = randomPos ? rand() * h : -50 - rand() * 100;

    return {
      x, 
      y, 
      z,
      size,
      speed,
      // Fase aleatória para a oscilação não ser sincronizada
      phase: rand() * Math.PI * 2,
      // Frequencia da oscilação (turbulência)
      oscillateSpeed: 1 + rand() * 3,
      // Amplitude da oscilação
      oscillateAmp: (10 + rand() * 20) * (1 - z * 0.5) // Flocos longe balançam mais visualmente relativo ao tamanho
    };
  }

  function resize(nextW, nextH) {
    w = Math.max(1, nextW | 0);
    h = Math.max(1, nextH | 0);
    rebuild();
  }

  function setOptions(next = {}) {
    options = { ...options, ...next };
    if (next.windDirection !== undefined) updateWindVectors();
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

    // 1. Atmosfera "Gélida"
    // Limpamos a tela
    ctx.clearRect(0, 0, w, h);
    
    const intensity = clamp01(options.intensity);
    
    // Tint Azulado (Frost Overlay)
    // Isso aumenta o contraste. Neve branca em mapa claro não aparece.
    // Com esse overlay, o mapa fica levemente escuro/azul e a neve brilha.
    ctx.fillStyle = `rgba(200, 220, 255, ${(0.05 + intensity * 0.15).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);

    // Vento Global
    const currentWindSpeed = options.windSpeed * (1 + intensity);

    // 2. Renderização dos Flocos
    // "lighter" faz com que flocos que se sobrepõem fiquem mais brancos brilhantes
    ctx.globalCompositeOperation = 'lighter'; 
    ctx.fillStyle = "white"; // Base, ajustaremos alpha no loop se necessário

    ctx.beginPath(); // Batch drawing para performance extrema

    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];

      // Movimento:
      // Vetor do Vento + Gravidade (sempre puxa um pouco pra baixo no Y relativo à profundidade) + Oscilação
      
      const oscillation = Math.sin(t * 0.002 * f.oscillateSpeed + f.phase) * f.oscillateAmp;
      
      // Aplicar movimento
      // O vento afeta mais os flocos pequenos/leves (z menor) ou grandes? 
      // Visualmente, tudo se move junto, mas com parallax.
      f.x += (windX * f.speed * currentWindSpeed + oscillation) * dt;
      f.y += (windY * f.speed * currentWindSpeed + f.speed) * dt; // +f.speed garante queda constante

      // Wrap (Loop Infinito)
      // Margem larga para permitir ventos diagonais fortes
      const margin = 50;
      let wrapped = false;

      if (f.y > h + margin) { f.y = -margin; wrapped = true; }
      else if (f.y < -margin) { f.y = h + margin; wrapped = true; }
      
      if (f.x > w + margin) { f.x = -margin; wrapped = true; }
      else if (f.x < -margin) { f.x = w + margin; wrapped = true; }

      if (wrapped) {
        // Se resetou, randomiza a posição perpendicular pra não ficar repetitivo
        if (Math.abs(windX) > Math.abs(windY)) f.y = rand() * h;
        else f.x = rand() * w;
      }

      // Desenho
      // Calculamos alpha baseada na profundidade (Z).
      // Z alto (perto) = mais transparente (bokeh).
      // Z baixo (longe) = mais opaco/nítido.
      
      // Pequeno "brilho" aleatório (Glitter)
      const sparkle = Math.random() > 0.98 ? 0.3 : 0;
      const alpha = Math.min(1, (0.4 + sparkle) + (1 - f.z) * 0.4); 

      // Mover para posição e desenhar
      ctx.moveTo(f.x, f.y);
      // Desenhamos círculos. Para neve "perto", o círculo é grande.
      // O truque de performance: usar rect pequeno para longe e arc para perto? 
      // Arc é rápido o suficiente hoje em dia para <1000 particulas.
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
    }
    
    // Cor final da neve (Branco levemente azulado)
    ctx.fillStyle = `rgba(240, 250, 255, ${0.7})`; 
    ctx.fill();

    // Resetar composite
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
    flakes = [];
  }

  return { start, stop, destroy, resize, setOptions };
}