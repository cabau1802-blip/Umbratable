// backend/src/routes/upload.routes.js
const express = require("express");
const router = express.Router();
const upload = require("../config/multer");

/**
 * Upload de arquivos (imagens)
 * Retorna sempre { url: "http(s)://host/uploads/arquivo.ext" }
 *
 * Observações importantes (sem remover sua lógica):
 * - Usa headers de proxy (X-Forwarded-Proto / X-Forwarded-Host) quando existir
 *   para gerar URL correta atrás de Nginx/Proxy.
 * - Normaliza o host caso venha com múltiplos valores.
 * - Sanitiza filename para evitar caminhos inesperados (defensivo).
 */
router.post("/", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    // 1) Protocolo: prioriza proxy (nginx) se existir
    const forwardedProto = (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim();
    const protocol = forwardedProto || req.protocol || "http";

    // 2) Host: prioriza proxy (nginx) se existir
    const forwardedHost = (req.headers["x-forwarded-host"] || "").toString().split(",")[0].trim();
    const hostHeader = (req.get("host") || "").toString().split(",")[0].trim();
    const host = forwardedHost || hostHeader;

    if (!host) {
      return res.status(500).json({ error: "Não foi possível determinar o host para gerar a URL." });
    }

    // 3) Nome do arquivo (defensivo)
    const filename = String(req.file.filename || "").replace(/\\/g, "/").split("/").pop();
    if (!filename) {
      return res.status(500).json({ error: "Nome do arquivo inválido." });
    }

    // 4) URL final
    const fileUrl = `${protocol}://${host}/uploads/${filename}`;

    console.log("Arquivo salvo:", req.file.path);
    console.log("URL gerada:", fileUrl);

    return res.json({ url: fileUrl, filename });
  } catch (err) {
    console.error("Erro no upload:", err);
    return res.status(500).json({ error: "Erro ao processar upload." });
  }
});

module.exports = router;
