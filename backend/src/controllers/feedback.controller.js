// backend/src/controllers/feedback.controller.js

// Sanitização simples e segura para texto puro (evita HTML/script no e-mail)
function escapePlainText(input, { maxLen = 2000 } = {}) {
  const s = String(input ?? "");

  // remove caracteres de controle (exceto \n \r \t)
  const noCtrl = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  // limita tamanho
  const clipped = noCtrl.length > maxLen ? noCtrl.slice(0, maxLen) : noCtrl;

  // remove tags HTML e escapa básico
  const noTags = clipped.replace(/<[^>]*>/g, "");

  return noTags
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isValidEmail(email) {
  const v = String(email ?? "").trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  const xr = req.headers["x-real-ip"];
  if (xr) return String(xr).trim();
  return req.ip || req.connection?.remoteAddress || "";
}

async function sendEmailCompat({ to, subject, text, html, replyTo }) {
  // Tenta usar o emailService existente do projeto (padrões comuns)
  try {
    // Ajuste de path: controllers -> services
    // eslint-disable-next-line global-require
    const emailService = require("../services/emailService");

    if (emailService && typeof emailService.sendMail === "function") {
      return await emailService.sendMail({ to, subject, text, html, replyTo });
    }
    if (emailService && typeof emailService.sendEmail === "function") {
      return await emailService.sendEmail({ to, subject, text, html, replyTo });
    }
    if (typeof emailService === "function") {
      return await emailService({ to, subject, text, html, replyTo });
    }
  } catch (e) {
    // fallback abaixo
  }

  // Fallback para nodemailer (caso o emailService não esteja disponível nesse path)
  // eslint-disable-next-line global-require
  const nodemailer = require("nodemailer");

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    throw new Error("SMTP não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS).");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter.sendMail({ from, to, subject, text, ...(html ? { html } : {}), ...(replyTo ? { replyTo } : {}) });
}

async function submitFeedback(req, res) {
  try {
    const receiver = process.env.FEEDBACK_RECEIVER_EMAIL;
    if (!receiver) {
      return res.status(500).json({ message: "FEEDBACK_RECEIVER_EMAIL não configurado no servidor." });
    }

    const name = String(req.body?.name ?? "").trim().slice(0, 80);
    const email = String(req.body?.email ?? "").trim().slice(0, 180);
    const type = String(req.body?.type ?? "Outro").trim().slice(0, 40) || "Outro";
    const area = String(req.body?.area ?? "").trim().slice(0, 120);
    const messageRaw = String(req.body?.message ?? "").trim();

    const canContact = !!req.body?.canContact;

    const allowedTypes = new Set(["Bug", "Ideia", "Melhoria", "Experiência/UX", "Outro"]);
    if (!allowedTypes.has(type)) {
      return res.status(400).json({ message: "Tipo de sugestão inválido." });
    }

    if (!messageRaw) {
      return res.status(400).json({ message: "Mensagem é obrigatória." });
    }
    if (messageRaw.length < 10) {
      return res.status(400).json({ message: "Mensagem deve ter pelo menos 10 caracteres." });
    }
    if (messageRaw.length > 2000) {
      return res.status(400).json({ message: "Mensagem excedeu 2000 caracteres." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "E-mail inválido." });
    }

    const ip = getClientIp(req);
    const userAgent = String(req.headers["user-agent"] ?? "").slice(0, 240);

    const now = new Date();
    const when = now.toLocaleString("pt-BR");

    const safeName = escapePlainText(name, { maxLen: 80 });
    const safeEmail = escapePlainText(email, { maxLen: 180 });
    const safeArea = escapePlainText(area, { maxLen: 120 });
    const safeMessage = escapePlainText(messageRaw, { maxLen: 2000 });

    const subject = `[UmbralTable] ${type.toUpperCase()} — ${safeArea || "Geral"}`;

    const textBody =
`Nova sugestão recebida

Data/Hora: ${when}
Tipo: ${type}
Área/Página: ${safeArea || "-"}

Posso ser contatado por e-mail: ${canContact ? "Sim" : "Não"}

Nome: ${safeName || "-"}
E-mail: ${safeEmail || "-"}

Mensagem:
${safeMessage}

Metadados:
IP: ${ip || "(não disponível)"}
User-Agent: ${userAgent || "(não disponível)"} 
`;

    const htmlBody = `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#0f172a; color:#e5e7eb; padding:24px">
        <div style="max-width:680px; margin:auto; background:#020617; border-radius:12px; padding:24px; border:1px solid #1e293b">

          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div>
              <h1 style="margin:0; color:#facc15; letter-spacing:0.5px;">UmbralTable</h1>
              <div style="margin-top:6px; color:#94a3b8; font-size:14px;">Nova sugestão recebida</div>
            </div>
            <div style="background:#111827; border:1px solid #1e293b; padding:8px 10px; border-radius:10px; text-align:right;">
              <div style="font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;">Tipo</div>
              <div style="font-weight:700; color:#e5e7eb; margin-top:2px;">${type}</div>
            </div>
          </div>

          <hr style="border:none; border-top:1px solid #1e293b; margin:18px 0"/>

          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:6px 0; color:#94a3b8; width:140px;"><strong>Data/Hora</strong></td>
              <td style="padding:6px 0; color:#e5e7eb;">${when}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#94a3b8;"><strong>Área/Página</strong></td>
              <td style="padding:6px 0; color:#e5e7eb;">${safeArea || "-"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#94a3b8;"><strong>Contato</strong></td>
              <td style="padding:6px 0; color:#e5e7eb;">${canContact ? "Pode contatar" : "Não contatar"}</td>
            </tr>
          </table>

          <hr style="border:none; border-top:1px solid #1e293b; margin:18px 0"/>

          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:6px 0; color:#94a3b8; width:140px;"><strong>Nome</strong></td>
              <td style="padding:6px 0; color:#e5e7eb;">${safeName || "-"}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#94a3b8;"><strong>E-mail</strong></td>
              <td style="padding:6px 0; color:#e5e7eb;">${safeEmail || "-"}</td>
            </tr>
          </table>

          <hr style="border:none; border-top:1px solid #1e293b; margin:18px 0"/>

          <h3 style="margin:0 0 10px 0; color:#facc15;">Mensagem</h3>
          <div style="white-space:pre-wrap; background:#0b1220; padding:14px; border-radius:10px; border:1px solid #1e293b; color:#e5e7eb; line-height:1.5;">
            ${safeMessage}
          </div>

          <hr style="border:none; border-top:1px solid #1e293b; margin:18px 0"/>

          <div style="font-size:12px; color:#64748b; line-height:1.5;">
            <div><strong>IP:</strong> ${ip || "-"}</div>
            <div><strong>User-Agent:</strong> ${userAgent || "-"}</div>
          </div>

        </div>
      </div>
    `;


    await sendEmailCompat({
      to: receiver,
      subject,
      text: textBody,
      html: htmlBody,
      replyTo: canContact && safeEmail ? safeEmail : undefined,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[feedback] submitFeedback error:", err);
    return res.status(500).json({ message: "Erro ao enviar feedback." });
  }
}

module.exports = { submitFeedback };
