// backend/src/services/emailService.js
const nodemailer = require("nodemailer");

function envBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function envInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

let cachedTransporter = null;

function buildTransporter() {
  const host = process.env.MAIL_HOST;
  const port = envInt(process.env.MAIL_PORT, 587);

  // Heurística segura: 465 => SMTPS (secure true), demais => STARTTLS (secure false)
  const secure = process.env.MAIL_SECURE !== undefined
    ? envBool(process.env.MAIL_SECURE, false)
    : port === 465;

  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASSWORD;

  if (!host || !port || !user || !pass) {
    throw new Error(
      "[MAIL] Variáveis ausentes. Exige MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD."
    );
  }

  const rejectUnauthorized = process.env.MAIL_TLS_REJECT_UNAUTHORIZED !== undefined
    ? envBool(process.env.MAIL_TLS_REJECT_UNAUTHORIZED, true)
    : true;

  // Para provedores com certificado emitido para hostname diferente (ex.: email-ssl.com.br),
  // permita definir explicitamente o servername do TLS.
  const tlsServername = process.env.MAIL_TLS_SERVERNAME;

  const tls = {
    rejectUnauthorized,
  };

  if (process.env.MAIL_TLS_CIPHERS) tls.ciphers = process.env.MAIL_TLS_CIPHERS;
  if (process.env.MAIL_TLS_MIN_VERSION) tls.minVersion = process.env.MAIL_TLS_MIN_VERSION;
  if (tlsServername) tls.servername = tlsServername;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls,
    // útil para diagnóstico quando precisar
    logger: envBool(process.env.MAIL_LOGGER, false),
    debug: envBool(process.env.MAIL_DEBUG, false),
  });

  return transporter;
}

function getTransporter() {
  if (!cachedTransporter) cachedTransporter = buildTransporter();
  return cachedTransporter;
}

/**
 * Envia um e-mail transacional.
 * @param {{to:string, subject:string, html?:string, text?:string, from?:string}} opts
 */
async function sendMail(opts) {
  const transporter = getTransporter();

  const fromName = process.env.MAIL_FROM_NAME || "UmbralTable";
  const fromAddress = process.env.MAIL_FROM || process.env.MAIL_USER;

  const mail = {
    from: opts.from || `"${fromName}" <${fromAddress}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  };

  try {
    const info = await transporter.sendMail(mail);
    if (envBool(process.env.MAIL_VERBOSE, false)) {
      console.log("✅ [MAIL] Enviado:", { to: opts.to, messageId: info.messageId });
    }
    return info;
  } catch (err) {
    console.error("❌ [MAIL] Falha SMTP:", err?.message || err);
    throw err;
  }
}

module.exports = { sendMail };
