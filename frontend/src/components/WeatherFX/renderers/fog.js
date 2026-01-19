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

export function createFogRenderer(canvas, initialOptions = {}) {
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });

  let w = 1;
  let h = 1;
  let running = false;
  let raf = 0;
  let lastTs = 0;

  let options = {
    intensity: 0.5,
    seed: undefined,
    color: { r: 210, g: 220, b: 235 },
    // Novas opções de movimento:
    windSpeed: 0.8,       // Velocidade do deslocamento (0.5 a 3.0)
    windDirection: 45,    // Direção em graus (0 = direita, 90 = baixo, etc)
    ...initialOptions,
  };

  const seedBase = Number.isFinite(options.seed) ? options.seed : Math.floor(Math.random() * 1e9);
  const rand = mulberry32(seedBase);

  let particles = [];
  // Vetores de vento calculados
  let windX = 0;
  let windY = 0;

  function updateWindVectors() {
    // Converter graus para radianos e calcular vetores
    const rad = (options.windDirection * Math.PI) / 180;
    windX = Math.cos(rad);
    windY = Math.sin(rad);
  }

  function rebuild() {
    updateWindVectors();
    const intensity = clamp01(options.intensity);
    const areaFactor = (w * h) / (1280 * 720);
    
    // Mais partículas para garantir cobertura contínua durante o movimento
    const count = Math.max(12, Math.floor(25 * areaFactor * (0.6 + intensity * 0.4)));

    particles = [];
    for (let i = 0; i < count; i++) {
        particles.push(spawnParticle(true));
    }
    // Ordenar por tamanho ajuda no visual (maiores atrás)
    particles.sort((a, b) => b.radius - a.radius);
  }

  function spawnParticle(randomScreenPos = true) {
    const sizeBase = Math.max(w, h) * 0.35; 
    
    // Variação de aspecto (algumas mais ovais)
    const stretch = 1.0 + rand() * 0.5;

    return {
      x: randomScreenPos ? rand() * w : -sizeBase,
      y: randomScreenPos ? rand() * h : rand() * h,
      radius: sizeBase * (0.8 + rand() * 0.6),
      
      // Diferença de velocidade (Parallax): Nuvens maiores/perto movem-se mais rápido
      speedVar: 0.8 + rand() * 0.5, 
      
      stretch: stretch,
      phase: rand() * Math.PI * 2,
      rotation: rand() * Math.PI * 2,
      rotSpeed: (rand() - 0.5) * 0.001 // Rotação muito lenta
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
    // Não precisa rebuild completo se mudar só cor/velocidade, mas simplifica
    if (next.intensity !== undefined) rebuild();
  }

  function clear() {
    ctx.clearRect(0, 0, w, h);
  }

  // Gradiente radial reutilizável (simulado via parâmetros)
  function drawFogParticle(ctx, p, r, g, b, alpha) {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
    // Núcleo um pouco mais opaco
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function tick(ts) {
    if (!running) return;

    const t = ts || performance.now();
    const dt = lastTs ? Math.min(0.05, (t - lastTs) / 1000) : 0.016;
    lastTs = t;

    ctx.clearRect(0, 0, w, h);

    const intensity = clamp01(options.intensity);
    const { r, g, b } = options.color;
    
    // Velocidade base combinada com a opção
    const baseSpeed = 50 * options.windSpeed; 

    // Haze de fundo (atmosfera estática)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.03 + intensity * 0.08).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // 1. Movimento Direcional (Vento)
      // Multiplicamos por speedVar para que nuvens não andem todas na mesma velocidade exata
      const moveSpeed = baseSpeed * p.speedVar;
      p.x += windX * moveSpeed * dt;
      p.y += windY * moveSpeed * dt;

      // 2. Turbulência Secundária (Noise)
      // Adiciona um leve balanço perpendicular ao vento ou circular
      p.x += Math.sin(t * 0.0005 + p.phase) * 10 * dt;
      p.y += Math.cos(t * 0.0003 + p.phase) * 10 * dt;

      // 3. Rotação Lenta
      p.rotation += p.rotSpeed;

      // 4. Wrapping (Teleporte infinito)
      // Verifica se saiu da tela com uma margem de segurança (radius)
      const margin = p.radius * 1.5;
      
      // Lógica de loop: se sair por um lado, entra pelo outro oposto
      let wrapped = false;
      if (p.x > w + margin) { p.x = -margin; wrapped = true; }
      else if (p.x < -margin) { p.x = w + margin; wrapped = true; }
      
      if (p.y > h + margin) { p.y = -margin; wrapped = true; }
      else if (p.y < -margin) { p.y = h + margin; wrapped = true; }

      // Se deu wrap, randomizamos levemente para não criar padrões óbvios repetidos
      if (wrapped) {
         // Randomiza a coordenada ortogonal ao movimento para variar a "estrada" da nuvem
         if (Math.abs(windX) > Math.abs(windY)) p.y = rand() * h; // Movendo horizontal
         else p.x = rand() * w; // Movendo vertical
      }

      // 5. Renderização
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      // Estica levemente na direção do movimento (opcional, mas dá fluidez)
      ctx.scale(p.stretch, 1 / p.stretch); 

      // Pulsação suave
      const pulse = Math.sin(t * 0.0008 + p.phase);
      const alpha = (0.04 + intensity * 0.06) * (1 + pulse * 0.3);

      drawFogParticle(ctx, p, r, g, b, alpha);
      ctx.restore();
    }

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
    particles = [];
  }

  return { start, stop, destroy, resize, setOptions };
}