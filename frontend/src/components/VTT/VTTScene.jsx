import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./vtt.css";

/**
 * UmbralTable - VTTScene
 * Montagem visual "Dark Fantasy Rúnica" (baseada na referência image_8.png).
 * - Layout: Topbar / Chat à esquerda / Mapa 20x20 ao centro / Dados à direita
 * - Animações: runas pulsantes, círculo arcano girando, fog of war ondulando, tokens idle,
 *   hover no D20 e rolagem com dado 3D (CSS) atravessando o mapa e parando em 18.
 *
 * Observação: esta versão é 100% front-end (CSS + Framer Motion), sem WebGL/Three.
 */

const SAMPLE_CHAT = [
  { who: "Mestre", kind: "narrative", text: "A porta da cripta se abre rangendo, liberando um ar gélido." },
  { who: "Jogador 1 (Guerreiro)", kind: "action", text: "Eu preparo minha espada." },
  { who: "Jogador 2 (Mago)", kind: "action", text: "Conjuro Luz para revelar a sala." },
  { who: "Sistema", kind: "roll", text: "Guerreiro ataca Esqueleto: [D20+5] = 18 (Acerto!)" },
];

const HEROES = [
  { id: "h1", label: "Guerreiro", ring: "ring-blue", x: 7, y: 12, idle: "idle-heavy" },
  { id: "h2", label: "Mago", ring: "ring-violet", x: 10, y: 10, idle: "idle-sparks" },
  { id: "h3", label: "Ladino", ring: "ring-green", x: 8, y: 9, idle: "idle-shift" },
];

const ENEMIES = [
  { id: "e1", label: "Esqueleto", ring: "ring-red", x: 14, y: 11, aura: true },
  { id: "e2", label: "Esqueleto", ring: "ring-red", x: 15, y: 13, aura: true },
];

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function VTTScene({ onClose }) {
  const [mod, setMod] = useState(5);
  const [qty, setQty] = useState(1);
  const [die, setDie] = useState("d20");
  const [hoverDie, setHoverDie] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);

  const [chat, setChat] = useState(SAMPLE_CHAT);

  const mapRef = useRef(null);

  const grid = useMemo(() => Array.from({ length: 20 }, (_, y) => Array.from({ length: 20 }, (_, x) => ({ x, y }))), []);

  const roll = async () => {
    if (rolling) return;
    setRolling(true);
    setResult(null);

    // Efeito de "explosão" no painel de dados é via CSS (classe .burst-on)
    await new Promise((r) => setTimeout(r, 120));

    // Fixar em 18 como no exemplo (pode ser randomizado depois).
    const base = 18;
    const total = base + Number(mod || 0);
    setResult({ base, total });

    // Log no chat
    setChat((prev) => [
      ...prev,
      { who: "Sistema", kind: "roll", text: `Guerreiro ataca Esqueleto: [${die.toUpperCase()}+${mod}] = ${base} (Total ${total})` },
    ]);

    // Tempo de rolagem visual
    await new Promise((r) => setTimeout(r, 1650));
    setRolling(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="vtt-root" role="dialog" aria-modal="true">
      <div className="vtt-shell">
        <div className="vtt-topbar">
          <div className="vtt-brand">
            <div className="vtt-sigil" aria-hidden="true" />
            <div className="vtt-brand-text">
              <div className="vtt-title">UmbralTable</div>
              <div className="vtt-sub">Virtual Tabletop — Sessão em andamento</div>
            </div>
          </div>

          <div className="vtt-tools">
            <button className="vtt-toolbtn" type="button">🧭 Ferramentas</button>
            <button className="vtt-toolbtn" type="button">🗺️ Mapa</button>
            <button className="vtt-toolbtn" type="button">🕯️ Névoa</button>
            <button className="vtt-toolbtn" type="button">⚙️ Config</button>
            <button className="vtt-close" type="button" onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          </div>
        </div>

        <div className="vtt-body">
          {/* CHAT */}
          <aside className="vtt-left">
            <div className="panel-title">DIÁRIO / CHAT</div>
            <div className="vtt-chat">
              {chat.map((m, i) => (
                <div key={i} className={cx("chat-line", m.kind)}>
                  <span className="who">{m.who}:</span> <span className="txt">{m.text}</span>
                </div>
              ))}
            </div>

            <div className="vtt-chatbox">
              <input placeholder="Digite sua mensagem..." disabled />
              <button className="send" type="button" disabled>Enviar</button>
            </div>
          </aside>

          {/* MAPA */}
          <main className="vtt-center">
            <div className="map-frame">
              <div className="rune-frame" aria-hidden="true" />
              <div className="map-inner" ref={mapRef}>
                <div className="arcane-circle" aria-hidden="true" />
                <div className="dungeon" aria-hidden="true" />

                <div className="grid">
                  {grid.map((row, y) =>
                    row.map((cell) => <div key={`${cell.x}-${cell.y}`} className="cell" />)
                  )}
                </div>

                {/* FOG OF WAR */}
                <div className="fog" aria-hidden="true">
                  <div className="fog-mask" />
                  <div className="fog-reveal" style={{ left: "38%", top: "54%" }} />
                </div>

                {/* TOKENS */}
                {[...HEROES, ...ENEMIES].map((t) => (
                  <div
                    key={t.id}
                    className={cx("token", t.ring, t.idle, t.aura ? "enemy-aura" : "")}
                    style={{
                      left: `calc(${(t.x / 20) * 100}% - 16px)`,
                      top: `calc(${(t.y / 20) * 100}% - 16px)`,
                    }}
                    title={t.label}
                  >
                    <div className="token-face" />
                    <div className="token-label">{t.label}</div>
                  </div>
                ))}

                {/* DADO 3D ROLANDO */}
                <AnimatePresence>
                  {rolling && (
                    <motion.div
                      className="dice-fly"
                      initial={{ opacity: 0, x: -80, y: 40, rotate: -40, scale: 0.8 }}
                      animate={{ opacity: 1, x: 420, y: 120, rotate: 380, scale: 1.0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 1.45, ease: [0.2, 0.9, 0.2, 1] }}
                    >
                      <div className="d20">
                        <div className="d20-face">{result?.base ?? "?"}</div>
                      </div>
                      <div className="dice-trail" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* RESULT FLASH */}
                <AnimatePresence>
                  {result && !rolling && (
                    <motion.div
                      className="result-badge"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      Resultado: <b>{result.base}</b> (Total {result.total})
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </main>

          {/* DADOS */}
          <aside className={cx("vtt-right", rolling ? "burst-on" : "")}>
            <div className="panel-title">DADOS</div>

            <div className="dice-config">
              <div className="cfg">
                <div className="lbl">Modificador</div>
                <input value={mod} onChange={(e) => setMod(Number(e.target.value || 0))} />
              </div>
              <div className="cfg">
                <div className="lbl">Quantidade</div>
                <input value={qty} onChange={(e) => setQty(Number(e.target.value || 1))} />
              </div>
            </div>

            <div className="dice-grid">
              {["d4", "d6", "d8", "d10", "d12", "d20"].map((d) => (
                <button
                  key={d}
                  className={cx("die", die === d ? "active" : "", hoverDie === d ? "hover" : "")}
                  type="button"
                  onMouseEnter={() => setHoverDie(d)}
                  onMouseLeave={() => setHoverDie(null)}
                  onClick={() => setDie(d)}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>

            <button className="roll" type="button" onClick={roll} disabled={rolling}>
              {rolling ? "ROLANDO..." : "ROLAR"}
            </button>

            <div className="panel-title" style={{ marginTop: 14 }}>JOGADORES</div>
            <div className="players">
              <div className="p">🧙 Mago — Online</div>
              <div className="p">🛡️ Guerreiro — Online</div>
              <div className="p">🗡️ Ladino — Online</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

