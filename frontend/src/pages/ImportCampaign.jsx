// frontend/src/pages/ImportCampaign.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function ImportCampaign() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const plan = String(user?.plan || "FREE").toUpperCase();
  const role = String(user?.role || "").toUpperCase();
  const canImport = role === "ADMIN" || plan === "PREMIUM";

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const hint = useMemo(() => {
    if (canImport) return null;
    return "Importação está disponível apenas no Premium.";
  }, [canImport]);

  const onPick = (e) => {
    setMsg("");
    setErr("");
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const onImport = async () => {
    setMsg("");
    setErr("");

    if (!canImport) {
      setErr("Importação disponível apenas no Premium.");
      return;
    }
    if (!file) {
      setErr("Selecione um arquivo .json exportado pelo UmbralTable.");
      return;
    }

    try {
      setLoading(true);
      const text = await file.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        setErr("Arquivo inválido. O conteúdo não é um JSON válido.");
        return;
      }

      const { data } = await api.post("/campaigns/import", payload);
      setMsg("Import concluído. Redirecionando...");

      const newId = data?.campaign?.id;
      if (newId) {
        setTimeout(() => navigate(`/session/${newId}`), 600);
      }
    } catch (e) {
      const status = e?.response?.status;
      const code = e?.response?.data?.error;
      if (status === 403 && code === "FEATURE_NOT_ALLOWED") {
        setErr("Importação disponível apenas no Premium.");
      } else {
        setErr(e?.response?.data?.message || "Falha ao importar campanha.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ margin: 0 }}>Importar Campanha (JSON)</h1>
      <p style={{ marginTop: 10, opacity: 0.8 }}>
        Selecione um arquivo exportado pelo UmbralTable para recriar campanha, personagens e eventos.
      </p>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Arquivo</div>

        <input type="file" accept="application/json,.json" onChange={onPick} disabled={loading} />

        {hint && (
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>{hint}</div>
        )}

        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <button
            onClick={onImport}
            disabled={loading || !file}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: canImport ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
              color: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 800,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Importando…" : "Importar"}
          </button>

          <button
            onClick={() => navigate("/campanhas")}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            Voltar
          </button>
        </div>

        {msg && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 10, border: "1px solid rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.12)" }}>
            {msg}
          </div>
        )}
        {err && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 10, border: "1px solid #7f1d1d", background: "#450a0a" }}>
            {err}
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          Dica: por segurança, participantes não são importados como membros. Você pode convidar depois.
        </div>
      </div>
    </div>
  );
}
