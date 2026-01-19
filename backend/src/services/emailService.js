// backend/src/services/emailService.js
const nodemailer = require("nodemailer");

/**
 * Helpers seguros para env
 */
function envBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return ["true", "1", "yes", "y"].includes(String(value).toLowerCase());
}

function envInt(value, defaultValue) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

/**
 * Cria transporter SMTP (Locaweb)
 */
function buildTransporter() {
  const host = process.env.MAIL_HOST || "smtplw.com.br";
  const port = envInt(process.env.MAIL_PORT, 587);

  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASSWORD;

  if (!user || !pass) {
    console.warn("⚠️ [MAIL] Credenciais SMTP não configuradas. Modo MOCK ativo.");
    return null;
  }

  // 587 = STARTTLS | 465 = TLS direto
  const secure =
    process.env.MAIL_SECURE !== undefined
      ? envBool(process.env.MAIL_SECURE, false)
      : port === 465;

  const rejectUnauthorized = envBool(
    process.env.MAIL_TLS_REJECT_UNAUTHORIZED,
    true
  );

  const ciphers =
    process.env.MAIL_TLS_CIPHERS && process.env.MAIL_TLS_CIPHERS.trim() !== ""
      ? process.env.MAIL_TLS_CIPHERS
      : undefined;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized,
      ciphers,
    },
  });

  transporter.verify((err) => {
    if (err) {
      console.error("❌ [MAIL] Falha SMTP:", err.message);
    } else {
      console.log(
        `✅ [MAIL] SMTP conectado (${host}:${port}, secure=${secure})`
      );
    }
  });

  return transporter;
}

let transporterSingleton = null;

function getTransporter() {
  if (!transporterSingleton) {
    transporterSingleton = buildTransporter();
  }
  return transporterSingleton;
}

function getFromAddress() {
  const from = process.env.MAIL_FROM || process.env.MAIL_USER;
  return from
    ? `"UmbraTable" <${from}>`
    : `"UmbraTable" <admin@umbratable.com.br>`;
}

/**
 * API pública
 */
async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();

  // Ambiente sem SMTP configurado (dev)
  if (!transporter) {
    console.log("[MAIL MOCK]", { to, subject });
    return { mocked: true };
  }

  return transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendMail,
};
