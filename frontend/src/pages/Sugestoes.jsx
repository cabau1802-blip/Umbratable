import React, { useEffect, useMemo, useState } from "react";
import { submitFeedback } from "../services/feedbackService";
import "./Sugestoes.css"; // <--- Importando o visual Dark Fantasy

const LS_COOLDOWN_KEY = "umbraltable:feedback_cooldown_until:v1";
const COOLDOWN_SECONDS = 30;

const TYPES = ["Bug", "Ideia", "Melhoria", "Experiência/UX", "Outro"];

function isValidEmail(email) {
  const v = String(email || "").trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function clampInt(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

function readCooldownLeftSeconds() {
  try {
    const until = Number(localStorage.getItem(LS_COOLDOWN_KEY) || "0");
    const leftMs = until - Date.now();
    return leftMs > 0 ? Math.ceil(leftMs / 1000) : 0;
  } catch {
    return 0;
  }
}

function setCooldown(seconds) {
  try {
    const until = Date.now() + seconds * 1000;
    localStorage.setItem(LS_COOLDOWN_KEY, String(until));
  } catch {}
}

export default function Sugestoes() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("Ideia");
  const [area, setArea] = useState("");
  const [message, setMessage] = useState("");
  const [canContact, setCanContact] = useState(false);

  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [uiMsg, setUiMsg] = useState(null); // {kind:"success"|"error", text:string}
  const [cooldownLeft, setCooldownLeft] = useState(() => readCooldownLeftSeconds());

  const messageLen = message.length;
  const messageTooLong = messageLen > 2000;
  const messageTooShort = messageLen > 0 && messageLen < 10;

  const emailOk = useMemo(() => isValidEmail(email), [email]);

  const formErrors = useMemo(() => {
    const errs = {};
    if (!message.trim()) errs.message = "A mensagem é obrigatória.";
    else if (messageTooShort) errs.message = "A mensagem deve ter pelo menos 10 caracteres.";
    else if (messageTooLong) errs.message = "A mensagem excedeu 2000 caracteres.";

    if (email && !emailOk) errs.email = "E-mail inválido. Verifique o formato.";

    if (type && !TYPES.includes(type)) errs.type = "Tipo inválido.";
    return errs;
  }, [message, messageTooLong, messageTooShort, email, emailOk, type]);

  const hasErrors = Object.keys(formErrors).length > 0;

  useEffect(() => {
    const t = setInterval(() => {
      setCooldownLeft(readCooldownLeftSeconds());
    }, 250);
    return () => clearInterval(t);
  }, []);

  const cooldownActive = cooldownLeft > 0;
  const disableSubmit = submitting || cooldownActive || hasErrors;

  const markTouched = (k) => setTouched((p) => ({ ...p, [k]: true }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setUiMsg(null);

    setTouched((p) => ({ ...p, message: true, email: true }));

    if (cooldownActive) {
      setUiMsg({ kind: "error", text: `Aguarde ${cooldownLeft}s para enviar novamente.` });
      return;
    }

    if (hasErrors) {
      setUiMsg({ kind: "error", text: "Revise os campos destacados antes de enviar." });
      return;
    }

    try {
      setSubmitting(true);

      await submitFeedback({
        name,
        email,
        type,
        area,
        message: message.trim(),
        canContact,
      });

      setUiMsg({ kind: "success", text: "Sugestão enviada com sucesso. Obrigado!" });

      setCooldown(COOLDOWN_SECONDS);
      setCooldownLeft(COOLDOWN_SECONDS);

      setMessage("");
      setName("");
      setEmail("");
      setCanContact(false);
      setTouched({});
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Falha ao enviar. Tente novamente.";
      setUiMsg({ kind: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="umbral-sugestoes">
      <div className="sugestoes-container">
        
        <div className="sugestoes-header">
          <h1 className="page-title">Sugestões do UmbralTable</h1>
          <p className="page-subtitle">
            Seu feedback nos ajuda a evoluir o VTT com mais estabilidade, performance e melhor experiência de jogo.
          </p>
        </div>

        <div className="glass-card">
          <form onSubmit={onSubmit} noValidate>
            
            {/* Nome / Email */}
            <div className="form-row">
              <div className="form-group">
                <label className="label">
                  Nome <span className="optional">(opcional)</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => markTouched("name")}
                  placeholder="Como você gostaria de ser chamado"
                  className="input"
                  maxLength={80}
                />
              </div>

              <div className="form-group">
                <label className="label">
                  E-mail <span className="optional">(opcional)</span>
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched("email")}
                  placeholder="voce@exemplo.com"
                  className={`input ${touched.email && formErrors.email ? "input-error" : ""}`}
                  maxLength={120}
                />
                {touched.email && formErrors.email && <div className="error-text">{formErrors.email}</div>}
              </div>
            </div>

            {/* Tipo / Área */}
            <div className="form-row">
              <div className="form-group">
                <label className="label">Tipo de sugestão</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="select"
                  onBlur={() => markTouched("type")}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">
                  Página/Área <span className="optional">(opcional)</span>
                </label>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  onBlur={() => markTouched("area")}
                  placeholder="Ex.: Login, Campanhas, Sessão, Personagem..."
                  className="input"
                  maxLength={120}
                />
              </div>
            </div>

            {/* Mensagem */}
            <div className="form-group">
              <label className="label">
                Mensagem <span className="required-mark">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onBlur={() => markTouched("message")}
                placeholder="Descreva sua sugestão com o máximo de detalhes possível..."
                className={`textarea ${touched.message && formErrors.message ? "input-error" : ""}`}
                maxLength={2000}
              />
              <div className="msg-meta">
                <div>
                  {touched.message && formErrors.message && <div className="error-text">{formErrors.message}</div>}
                </div>
                <div className="counter">
                  {clampInt(messageLen, 0, 2000)}/2000
                </div>
              </div>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={canContact}
                onChange={(e) => setCanContact(e.target.checked)}
                className="checkbox"
              />
              <span>Posso ser contatado por e-mail</span>
            </label>

            {/* Status Messages */}
            {uiMsg && (
              <div className={`status-banner ${uiMsg.kind === "success" ? "banner-success" : "banner-error"}`}>
                {uiMsg.kind === "success" ? "✅ " : "⚠️ "} {uiMsg.text}
              </div>
            )}

            {cooldownActive && (
              <div className="cooldown-msg">
                Anti-spam ativo: aguarde <b>{cooldownLeft}s</b> para enviar novamente.
              </div>
            )}

            <div className="actions">
              <button
                type="submit"
                disabled={disableSubmit}
                className="btn-submit"
              >
                {submitting ? "Enviando..." : "Enviar sugestão"}
              </button>

              <div className="hint">
                O envio é limitado para evitar abuso.
              </div>
            </div>
          </form>
        </div>

        <div className="footer-note">
          Ao enviar, você concorda que a mensagem poderá ser usada para melhorar o UmbralTable. Não envie senhas ou dados sensíveis.
        </div>
      </div>
    </div>
  );
}