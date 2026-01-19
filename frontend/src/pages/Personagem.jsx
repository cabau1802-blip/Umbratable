import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import "./Personagem.css"; // <--- IMPORTA O ARQUIVO CSS EXTERNO

/**
 * UmbralTable - Tela de Personagens
 */

const SPELL_SUGGESTIONS = [
  { name: "Mísseis Mágicos", level: 1, description: "Dispara dardos de energia arcana que acertam automaticamente alvos à vista." },
  { name: "Bola de Fogo", level: 3, description: "Explosão ardente em área. Ótima para controle de multidões." },
  { name: "Cura pelas Mãos", level: 1, description: "Canaliza energia curativa, restaurando pontos de vida." },
];

const FEATURE_SUGGESTIONS = [
  { name: "Ataque Furtivo", minLevel: 1, description: "Causa dano adicional ao acertar com vantagem ou quando aliado ameaça o alvo." },
  { name: "Fúria", minLevel: 1, description: "Entra em fúria, ganhando bônus de dano e resistência a certos tipos de dano." },
  { name: "Inspiração Bárdica", minLevel: 1, description: "Concede um dado de inspiração a um aliado, que pode ser usado em testes/ataques." },
];

const MOCK_CLASSES = [
  { id: "barbarian", nome: "Bárbaro", dadoVida: "d12" },
  { id: "bard", nome: "Bardo", dadoVida: "d8" },
  { id: "cleric", nome: "Clérigo", dadoVida: "d8" },
  { id: "druid", nome: "Druida", dadoVida: "d8" },
  { id: "fighter", nome: "Guerreiro", dadoVida: "d10" },
  { id: "monk", nome: "Monge", dadoVida: "d8" },
  { id: "paladin", nome: "Paladino", dadoVida: "d10" },
  { id: "ranger", nome: "Patrulheiro", dadoVida: "d10" },
  { id: "rogue", nome: "Ladino", dadoVida: "d8" },
  { id: "sorcerer", nome: "Feiticeiro", dadoVida: "d6" },
  { id: "warlock", nome: "Bruxo", dadoVida: "d8" },
  { id: "wizard", nome: "Mago", dadoVida: "d6" },
];

const MOCK_RACES = [
  { id: "human", nome: "Humano" },
  { id: "elf", nome: "Elfo" },
  { id: "dwarf", nome: "Anão" },
  { id: "halfling", nome: "Halfling" },
  { id: "gnome", nome: "Gnomo" },
  { id: "halfelf", nome: "Meio-Elfo" },
  { id: "halforc", nome: "Meio-Orc" },
  { id: "tiefling", nome: "Tiefling" },
  { id: "dragonborn", nome: "Draconato" },
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function getLevelFromXP(xp) {
  const n = Number(xp || 0);
  if (n < 300) return 1;
  if (n < 900) return 2;
  if (n < 2700) return 3;
  if (n < 6500) return 4;
  if (n < 14000) return 5;
  if (n < 23000) return 6;
  if (n < 34000) return 7;
  if (n < 48000) return 8;
  if (n < 64000) return 9;
  if (n < 85000) return 10;
  if (n < 100000) return 11;
  if (n < 120000) return 12;
  if (n < 140000) return 13;
  if (n < 165000) return 14;
  if (n < 195000) return 15;
  if (n < 225000) return 16;
  if (n < 265000) return 17;
  if (n < 305000) return 18;
  if (n < 355000) return 19;
  return 20;
}

function getProficiencyBonus(level) {
  const lv = Number(level || 1);
  if (lv <= 4) return 2;
  if (lv <= 8) return 3;
  if (lv <= 12) return 4;
  if (lv <= 16) return 5;
  return 6;
}

function abilityMod(score) {
  return Math.floor((Number(score || 0) - 10) / 2);
}

const defaultSheet = {
  avatar: "",
  notes: "",
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  hpMax: 10,
  hpCurrent: 10,
  tempHp: 0,
  ac: 10,
  speed: 9,
  xp: 0,
  proficiencyBonus: 2,
  skills: [],
  features: [],
  spells: [],
  inventory: [],
};

function normalizeSpell(s) {
  if (!s) return null;
  if (typeof s === "string") return { id: uid("spell"), name: s, level: 0, description: "", notes: "" };
  return {
    id: s.id || uid("spell"),
    name: String(s.name || "Magia"),
    level: Number(s.level || 0),
    description: String(s.description || s.desc || ""),
    notes: String(s.notes || ""),
    icon: s.icon || "✨",
  };
}

function normalizeFeature(f) {
  if (!f) return null;
  if (typeof f === "string") return { id: uid("feat"), name: f, description: "" };
  return {
    id: f.id || uid("feat"),
    name: String(f.name || "Habilidade"),
    description: String(f.description || f.desc || ""),
    icon: f.icon || "🜂",
  };
}

function normalizeItem(it) {
  if (!it) return null;
  if (typeof it === "string") return { id: uid("item"), name: it, description: "", qty: 1, icon: "🎒" };
  return {
    id: it.id || uid("item"),
    name: String(it.name || "Item"),
    description: String(it.description || it.desc || ""),
    qty: clampInt(it.qty ?? 1, 1, 999, 1),
    weight: Number(it.weight || 0),
    icon: it.icon || "🎒",
    rarity: it.rarity || "",
    slot: it.slot || "",
  };
}

function mergeSheet(existing) {
  const base = { ...defaultSheet };
  if (!existing || typeof existing !== "object") return base;

  const merged = {
    ...base,
    ...existing,
    abilities: { ...base.abilities, ...(existing.abilities || {}) },
    skills: Array.isArray(existing.skills) ? existing.skills : base.skills,
    features: Array.isArray(existing.features) ? existing.features.map(normalizeFeature).filter(Boolean) : base.features,
    spells: Array.isArray(existing.spells) ? existing.spells.map(normalizeSpell).filter(Boolean) : base.spells,
    inventory: Array.isArray(existing.inventory) ? existing.inventory.map(normalizeItem).filter(Boolean) : base.inventory,
    xp: existing.xp !== undefined ? existing.xp : base.xp,
    proficiencyBonus: existing.proficiencyBonus !== undefined ? existing.proficiencyBonus : base.proficiencyBonus,
    avatar: existing.avatar || base.avatar,
    notes: existing.notes || base.notes,
  };
  const lv = getLevelFromXP(merged.xp);
  merged.proficiencyBonus = getProficiencyBonus(lv);
  return merged;
}

export function CharacterSheetWorkspace({ embedded = false, initialCharacters = null, hideTopbar = false, hideCreate = false, hideCampaignLink = false } = {}) {
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState([]); 
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  
  const selectedCharacter = useMemo(
    () => characters.find((c) => String(c.id) === String(selectedId)) || null,
    [characters, selectedId]
  );

  const [generatingImage, setGeneratingImage] = useState(false); 
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const [sheet, setSheet] = useState(defaultSheet);
  const sheetRef = useRef(sheet);
  useEffect(() => { sheetRef.current = sheet; }, [sheet]);

  const [activeTab, setActiveTab] = useState("character"); 
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState("");
  const [legacy, setLegacy] = useState(null);

  const [selectedFeatureId, setSelectedFeatureId] = useState("");
  const [selectedSpellId, setSelectedSpellId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", classId: "", raceId: "", campaignId: "" });
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemDraft, setItemDraft] = useState({ name: "", description: "", qty: 1, icon: "🎒", weight: 0, rarity: "" });

  const toastTimer = useRef(null);
  const showToast = (message, type = "ok") => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/characters");
      const list = Array.isArray(res.data) ? res.data : (res.data?.characters || []);
      setCharacters(list);
      if (list.length) {
        const first = String(list[0].id);
        setSelectedId((prev) => prev || first);
      }
    } catch (e) {
      console.error(e);
      showToast("Falha ao carregar personagens.", "err");
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const res = await api.get("/campaigns");
      const list = Array.isArray(res.data) ? res.data : (res.data?.campaigns || []);
      setCampaigns(list);
    } catch (e) {
      console.warn("Falha ao carregar campanhas:", e);
      setCampaigns([]);
    }
  };

  const loadLegacy = async (characterId) => {
    if (!characterId) return;
    setLegacyLoading(true);
    setLegacyError("");
    try {
      const res = await api.get(`/characters/${characterId}/legacy`);
      setLegacy(res.data?.legacy || res.data || null);
    } catch (e) {
      console.error(e);
      setLegacy(null);
      setLegacyError("Não foi possível carregar o legado.");
    } finally {
      setLegacyLoading(false);
    }
  };

  useEffect(() => {
    if (embedded && Array.isArray(initialCharacters)) {
      setCharacters(initialCharacters);
      if (initialCharacters.length) setSelectedId(String(initialCharacters[0].id));
      return;
    }
    load();
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (!selectedCharacter) return;
    const s = mergeSheet(selectedCharacter.sheet_data);
    setSheet(s);
    setSelectedFeatureId("");
    setSelectedSpellId("");
    setSelectedItemId("");
    setActiveTab("character");
    loadLegacy(selectedCharacter.id);
  }, [selectedCharacter?.id]);

  const updateSheet = (key, value) => setSheet((p) => ({ ...p, [key]: value }));
  const updateAbility = (k, v) => setSheet((p) => ({ ...p, abilities: { ...p.abilities, [k]: clampInt(v, 1, 30, 10) } }));

  const saveSheet = async () => {
    if (!selectedCharacter) return;
    setSaving(true);
    try {
      const newLevel = getLevelFromXP(sheet.xp);
      const payload = {
        level: newLevel,
        sheet_data: { ...sheet, proficiencyBonus: getProficiencyBonus(newLevel) },
      };
      await api.put(`/characters/${selectedCharacter.id}`, payload);
      showToast("Alterações salvas.", "ok");
      await load();
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar alterações.", "err");
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    if (!selectedCharacter) return;
    setSheet(mergeSheet(selectedCharacter.sheet_data));
    showToast("Alterações descartadas.", "ok");
  };

  const removeCharacter = async (id) => {
    if (!id) return;
    if (!confirm("Remover personagem?")) return;
    try {
      await api.delete(`/characters/${id}`);
      showToast("Personagem removido.", "ok");
      setSelectedId("");
      await load();
    } catch (e) {
      console.error(e);
      showToast("Erro ao remover.", "err");
    }
  };

  const openCreate = () => {
    setCreateForm({ name: "", classId: "", raceId: "", campaignId: "" });
    setCreateOpen(true);
  };

  const createCharacter = async () => {
    const name = createForm.name.trim();
    const classId = createForm.classId;
    const raceId = createForm.raceId;
    const cObj = MOCK_CLASSES.find((c) => c.id === classId) || null;
    const rObj = MOCK_RACES.find((r) => r.id === raceId) || null;

    if (!name || !cObj || !rObj) return showToast("Preencha Nome, Classe e Raça.", "err");

    setSaving(true);
    try {
      const startXp = 0;
      const level = 1;
      const dv = String(cObj.dadoVida || "d8");
      const baseHp = dv === "d12" ? 12 : dv === "d10" ? 10 : dv === "d6" ? 6 : 8;

      const sheet_data = {
        ...defaultSheet,
        xp: startXp,
        proficiencyBonus: getProficiencyBonus(level),
        hpMax: baseHp,
        hpCurrent: baseHp,
      };

      const campaignId = createForm.campaignId ? String(createForm.campaignId) : null;

      const res = await api.post("/characters", {
        name,
        class: cObj.nome,
        race: rObj.nome,
        level,
        sheet_data,
        campaignId,
      });

      const created = res.data?.character || res.data;
      showToast("Personagem criado.", "ok");
      setCreateOpen(false);
      await load();
      if (created?.id) setSelectedId(String(created.id));
    } catch (e) {
      console.error(e);
      showToast("Erro ao criar personagem.", "err");
    } finally {
      setSaving(false);
    }
  };

  // ===== Habilidades =====
  const selectedFeature = useMemo(() => (sheet.features || []).find((f) => f.id === selectedFeatureId) || null, [sheet.features, selectedFeatureId]);
  const addFeature = (draft) => {
    const name = String(draft?.name || "").trim();
    const description = String(draft?.description || "").trim();
    if (!name) return showToast("Informe o nome da habilidade.", "err");
    const feat = normalizeFeature({ id: uid("feat"), name, description, icon: draft?.icon || "🜂" });
    setSheet((p) => ({ ...p, features: [...(p.features || []), feat] }));
    setSelectedFeatureId(feat.id);
    showToast("Habilidade adicionada.", "ok");
  };
  const removeFeature = (id) => setSheet((p) => ({ ...p, features: (p.features || []).filter((f) => f.id !== id) }));

  // ===== Magias =====
  const selectedSpell = useMemo(() => (sheet.spells || []).find((s) => s.id === selectedSpellId) || null, [sheet.spells, selectedSpellId]);
  const addSpell = (draft) => {
    const name = String(draft?.name || "").trim();
    const description = String(draft?.description || "").trim();
    if (!name) return showToast("Informe o nome da magia.", "err");
    const sp = normalizeSpell({ id: uid("spell"), name, level: clampInt(draft?.level ?? 0, 0, 9, 0), description, notes: draft?.notes || "", icon: draft?.icon || "✨" });
    setSheet((p) => ({ ...p, spells: [...(p.spells || []), sp] }));
    setSelectedSpellId(sp.id);
    showToast("Magia adicionada.", "ok");
  };
  const removeSpell = (id) => setSheet((p) => ({ ...p, spells: (p.spells || []).filter((s) => s.id !== id) }));

  // ===== Inventário =====
  const selectedItem = useMemo(() => (sheet.inventory || []).find((i) => i.id === selectedItemId) || null, [sheet.inventory, selectedItemId]);
  const addItemFromModal = () => {
    const name = itemDraft.name.trim();
    if (!name) return showToast("Informe o nome do item.", "err");
    const it = normalizeItem({ ...itemDraft, id: uid("item") });
    setSheet((p) => ({ ...p, inventory: [...(p.inventory || []), it] }));
    setSelectedItemId(it.id);
    setItemModalOpen(false);
    setItemDraft({ name: "", description: "", qty: 1, icon: "🎒", weight: 0, rarity: "" });
    showToast("Item adicionado.", "ok");
  };
  const removeItem = (id) => setSheet((p) => ({ ...p, inventory: (p.inventory || []).filter((i) => i.id !== id) }));

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateSheet("avatar", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  // ====== IA GENERATOR (Desativado/Em manutenção) ======
  const openAiModal = () => {
    if (!selectedCharacter) return;
    const suggestion = sheet.notes || `Um ${selectedCharacter.race || "aventureiro"} ${selectedCharacter.class || "guerreiro"} com aparência épica, estilo fantasia...`;
    setAiPrompt(suggestion);
    setAiModalOpen(true);
  };

  const confirmAiGeneration = async () => {
    setAiModalOpen(false);
    showToast("⚠️ Recurso em manutenção. Voltaremos em breve!", "err");
  };

  // ====== Render ======
  return (
    <div className="umbral-page">
      
      {toast && (
        <div className={`toast ${toast.type === "err" ? "err" : "ok"}`}>
          {toast.type === "err" ? "⚠️ " : "✅ "} {toast.message}
        </div>
      )}

      <div className="umbral-shell">
        {!hideTopbar && (
        <div className="umbral-topbar">
          <div className="brand" style={{display: "flex", gap: "10px", alignItems: "center", color: "white"}}>
            {/* Espaço para logo se quiser */}
            <h1 style={{margin:0, fontFamily: 'Cinzel', letterSpacing: '2px'}}>UmbraTable</h1>
          </div>

          <div className="toolbar">
            {!hideCreate && (
            <button className="btn primary" onClick={openCreate} disabled={saving}>
              + Novo Personagem
            </button>
            )}
            <button className="btn" onClick={embedded ? () => {} : load} disabled={embedded ? true : (loading || saving)}>
              Recarregar
            </button>
          </div>
        </div>
        )}

        <div className="umbral-body">
          {/* LEFT */}
          <aside className="left">
            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 10 }}>
                <div>
                  <div className="sectionTitle">Meus Heróis</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {loading ? "Carregando..." : `${characters.length} personagem(ns)`}
                  </div>
                </div>
              </div>

              <div className="char-list" style={{ marginTop: 12 }}>
                {characters.map((c) => (
                  <div
                    key={c.id}
                    className={`char-card ${String(c.id) === String(selectedId) ? "active" : ""}`}
                    onClick={() => setSelectedId(String(c.id))}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="char-meta">
                      <b>{c.name || "Sem nome"}</b>
                      <span>{c.class || "Classe"} • {c.race || "Raça"} • Nv {c.level ?? getLevelFromXP(c.sheet_data?.xp)}</span>
                    </div>

                    <div className="char-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="iconbtn danger" title="Remover" onClick={() => removeCharacter(c.id)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
                {!loading && characters.length === 0 && (
                  <div style={{ padding: 10, color: "var(--muted)", fontSize: 13 }}>
                    Nenhum personagem. Crie um novo.
                  </div>
                )}
              </div>
            </div>

            {/* Portrait */}
            <div className="portrait">
              <div className="portrait-frame">
                <div className="portrait-inner">
                  {sheet.avatar ? <img src={sheet.avatar} alt="avatar" /> : <div className="placeholder">Selecione um personagem e envie uma imagem.</div>}
                </div>
              </div>

              <div className="portrait-btns">
                <div>
                  <label className="btn small" style={{ cursor: "pointer" }}>
                    Upload
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
                  </label>

                  <button
                    className="btn small"
                    onClick={() => setActiveTab("diary")}
                    disabled={!selectedCharacter}
                  >
                    Editar diário
                  </button>
                </div>
                
                {/* --- BOTÃO DA IA --- */}
                  <button 
                    className="btn primary small" 
                    onClick={openAiModal} 
                    disabled={!selectedCharacter || generatingImage || saving}
                    style={{ background: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)", border: "none", color: "white" }}
                  >
                    {generatingImage ? "🎨 Pintando..." : "✨ Gerar Retrato com IA"}
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT */}
          <section className="right">
            <div className="tabs">
              {[
                { id: "character", label: "Personagem" },
                { id: "equipment", label: "Equipamento" },
                { id: "magic", label: "Magia" },
                { id: "diary", label: "Diário" },
                { id: "legacy", label: "Legado" },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`tab ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                  disabled={!selectedCharacter}
                  title={!selectedCharacter ? "Selecione um personagem" : ""}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="content">
              {!selectedCharacter ? (
                <div className="panel">
                  <div className="sectionTitle">Seleção</div>
                  <div style={{ color: "var(--muted)" }}>Selecione um personagem à esquerda para abrir a ficha.</div>
                </div>
              ) : (
                <>
                  {/* PERSONAGEM */}
                  {activeTab === "character" && (
                    <div className="grid2">
                      <div className="panel">
                        <div className="sectionTitle">Atributos</div>
                        {[
                          ["str", "Força"],
                          ["dex", "Destreza"],
                          ["con", "Constituição"],
                          ["int", "Inteligência"],
                          ["wis", "Sabedoria"],
                          ["cha", "Carisma"],
                        ].map(([k, label]) => (
                          <div className="statRow" key={k}>
                            <b style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <span style={{ width: 18, display: "inline-block", color: "var(--gold)" }}>◈</span>
                              {label}
                            </b>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                                Mod {abilityMod(sheet.abilities[k]) >= 0 ? "+" : ""}{abilityMod(sheet.abilities[k])}
                              </span>
                              <input value={sheet.abilities[k]} onChange={(e) => updateAbility(k, e.target.value)} />
                            </div>
                          </div>
                        ))}

                        <div className="footerActions">
                          <button className="btn primary" onClick={saveSheet} disabled={saving}>
                            {saving ? "Salvando..." : "Salvar alterações"}
                          </button>
                          <button className="btn" onClick={cancelChanges} disabled={saving}>
                            Cancelar
                          </button>
                        </div>
                      </div>

                      <div className="panel">
                        <div className="sectionTitle">Combate</div>
                        <div className="statRow">
                          <b>PV</b>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              value={sheet.hpCurrent}
                              onChange={(e) => updateSheet("hpCurrent", clampInt(e.target.value, 0, 999, 10))}
                              title="PV atual"
                            />
                            <span style={{ color: "var(--muted)", fontSize: 12, alignSelf: "center" }}>/</span>
                            <input
                              value={sheet.hpMax}
                              onChange={(e) => updateSheet("hpMax", clampInt(e.target.value, 1, 999, 10))}
                              title="PV máximo"
                            />
                          </div>
                        </div>

                        <div className="statRow">
                          <b>CA</b>
                          <input value={sheet.ac} onChange={(e) => updateSheet("ac", clampInt(e.target.value, 0, 99, 10))} />
                        </div>

                        <div className="statRow">
                          <b>Deslocamento</b>
                          <input value={sheet.speed} onChange={(e) => updateSheet("speed", clampInt(e.target.value, 0, 99, 9))} />
                        </div>

                        <div className="statRow">
                          <b>XP</b>
                          <input
                            value={sheet.xp}
                            onChange={(e) => {
                              const xp = clampInt(e.target.value, 0, 999999, 0);
                              const lv = getLevelFromXP(xp);
                              setSheet((p) => ({ ...p, xp, proficiencyBonus: getProficiencyBonus(lv) }));
                            }}
                          />
                        </div>

                        <div className="statRow">
                          <b>Bônus Prof.</b>
                          <input value={sheet.proficiencyBonus} disabled />
                        </div>

                        <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                          <div className="sectionTitle">Proficiências</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {["Furtividade", "História", "Investigação", "Sobrevivência", "Arcanismo"].map((s) => (
                              <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)" }}>
                                <input
                                  type="checkbox"
                                  checked={(sheet.skills || []).includes(s)}
                                  onChange={() => {
                                    setSheet((p) => {
                                      const has = (p.skills || []).includes(s);
                                      return { ...p, skills: has ? p.skills.filter((x) => x !== s) : [...p.skills, s] };
                                    });
                                  }}
                                />
                                <span style={{ color: "var(--muted)" }}>{s}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Habilidades */}
                      <div className="panel" style={{ gridColumn: "1 / -1" }}>
                        <div className="sectionTitle">Habilidades</div>

                        <div className="split">
                          <div>
                            <ul className="list">
                              {(sheet.features || []).map((f) => (
                                <li
                                  key={f.id}
                                  className={`li ${selectedFeatureId === f.id ? "active" : ""}`}
                                  onClick={() => setSelectedFeatureId(f.id)}
                                >
                                  <div className="leftcell">
                                    <div className="badge">{f.icon || "🜂"}</div>
                                    <div>
                                      <div style={{ fontWeight: 900 }}>{f.name}</div>
                                      <small>{f.description ? (f.description.length > 70 ? `${f.description.slice(0, 70)}...` : f.description) : "Sem descrição"}</small>
                                    </div>
                                  </div>
                                  <button className="iconbtn danger" title="Remover" onClick={(e) => { e.stopPropagation(); removeFeature(f.id); }}>
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>

                            {(sheet.features || []).length === 0 && (
                              <div style={{ marginTop: 10, color: "var(--muted)" }}>Sem habilidades registradas.</div>
                            )}
                          </div>

                          <div className="detail">
                            <h4>{selectedFeature ? selectedFeature.name : "Selecione uma habilidade"}</h4>
                            <p>{selectedFeature ? (selectedFeature.description || "Sem descrição.") : "Ao clicar em uma habilidade, a descrição aparece aqui."}</p>

                            <div className="meta">Adicionar habilidade</div>
                            <div className="field">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  const name = e.target.value;
                                  if (!name) return;
                                  const sug = FEATURE_SUGGESTIONS.find((x) => x.name === name);
                                  if (sug) addFeature({ name: sug.name, description: sug.description, icon: "🜂" });
                                  e.target.value = "";
                                }}
                              >
                                <option value="">Selecionar sugestão...</option>
                                {FEATURE_SUGGESTIONS.map((f) => (
                                  <option key={f.name} value={f.name}>
                                    {f.name} (Nv {f.minLevel})
                                  </option>
                                ))}
                              </select>

                              <button
                                className="btn primary"
                                style={{ width: "100%", marginTop: 10 }}
                                onClick={() => addFeature({ name: "Nova habilidade", description: "Edite a descrição no painel de detalhe.", icon: "🜂" })}
                              >
                                + Adicionar rápida
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EQUIPAMENTO */}
                  {activeTab === "equipment" && (
                    <div className="panel">
                      <div className="sectionTitle">Inventário</div>

                      <div className="split">
                        <div>
                          <div className="invGrid">
                            {(sheet.inventory || []).map((it) => (
                              <div
                                key={it.id}
                                className={`slot ${selectedItemId === it.id ? "active" : ""}`}
                                onClick={() => setSelectedItemId(it.id)}
                                title={it.name}
                              >
                                <div className="ico">{it.icon || "🎒"}</div>
                                <div className="qty">{it.qty ?? 1}</div>
                              </div>
                            ))}
                            {Array.from({ length: Math.max(0, 24 - (sheet.inventory || []).length) }).map((_, i) => (
                              <div key={`empty_${i}`} className="slot" style={{ opacity: 0.35, cursor: "default" }} />
                            ))}
                          </div>

                          <div className="footerActions">
                            <button className="btn primary" onClick={() => setItemModalOpen(true)} disabled={saving}>
                              + Adicionar item
                            </button>
                            <button className="btn" onClick={saveSheet} disabled={saving}>
                              {saving ? "Salvando..." : "Salvar alterações"}
                            </button>
                            <button className="btn" onClick={cancelChanges} disabled={saving}>
                              Cancelar
                            </button>
                          </div>
                        </div>

                        <div className="detail">
                          <h4>{selectedItem ? selectedItem.name : "Selecione um item"}</h4>
                          <p>{selectedItem ? (selectedItem.description || "Sem descrição.") : "Clique em um ícone para ver os detalhes aqui."}</p>

                          {selectedItem && (
                            <>
                              <div className="meta">
                                {selectedItem.rarity ? `Raridade: ${selectedItem.rarity}` : "Detalhes"} • Qtd: {selectedItem.qty ?? 1}
                                {selectedItem.weight ? ` • Peso: ${selectedItem.weight}` : ""}
                              </div>

                              <div className="field">
                                <label style={{ fontSize: 12, color: "var(--muted)" }}>Descrição</label>
                                <textarea
                                  rows={6}
                                  value={selectedItem.description || ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setSheet((p) => ({
                                      ...p,
                                      inventory: (p.inventory || []).map((x) => (x.id === selectedItem.id ? { ...x, description: v } : x)),
                                    }));
                                  }}
                                />
                              </div>

                              <div className="footerActions" style={{ justifyContent: "space-between" }}>
                                <button className="btn danger" onClick={() => removeItem(selectedItem.id)} disabled={saving}>
                                  Remover
                                </button>
                                <button className="btn primary" onClick={saveSheet} disabled={saving}>
                                  {saving ? "Salvando..." : "Salvar"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MAGIA */}
                  {activeTab === "magic" && (
                    <div className="panel">
                      <div className="sectionTitle">Magias</div>

                      <div className="split">
                        <div>
                          <ul className="list">
                            {(sheet.spells || []).map((s) => (
                              <li
                                key={s.id}
                                className={`li ${selectedSpellId === s.id ? "active" : ""}`}
                                onClick={() => setSelectedSpellId(s.id)}
                              >
                                <div className="leftcell">
                                  <div className="badge">{s.icon || "✨"}</div>
                                  <div>
                                    <div style={{ fontWeight: 900 }}>{s.name}</div>
                                    <small>Nv {s.level ?? 0}{s.notes ? ` • ${s.notes}` : ""}</small>
                                  </div>
                                </div>
                                <button className="iconbtn danger" title="Remover" onClick={(e) => { e.stopPropagation(); removeSpell(s.id); }}>
                                  ×
                                </button>
                              </li>
                            ))}
                          </ul>

                          {(sheet.spells || []).length === 0 && (
                            <div style={{ marginTop: 10, color: "var(--muted)" }}>Sem magias registradas.</div>
                          )}
                        </div>

                        <div className="detail">
                          <h4>{selectedSpell ? selectedSpell.name : "Selecione uma magia"}</h4>
                          <p>{selectedSpell ? (selectedSpell.description || "Sem descrição.") : "Ao clicar em uma magia, a descrição aparece aqui."}</p>

                          <div className="meta">Adicionar magia</div>
                          <div className="field">
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                const name = e.target.value;
                                if (!name) return;
                                const sug = SPELL_SUGGESTIONS.find((x) => x.name === name);
                                if (sug) addSpell({ name: sug.name, level: sug.level, description: sug.description, icon: "✨" });
                                e.target.value = "";
                              }}
                            >
                              <option value="">Selecionar sugestão...</option>
                              {SPELL_SUGGESTIONS.map((s) => (
                                <option key={s.name} value={s.name}>
                                  {s.name} (Nv {s.level})
                                </option>
                              ))}
                            </select>

                            <button
                              className="btn primary"
                              style={{ width: "100%", marginTop: 10 }}
                              onClick={() => addSpell({ name: "Nova magia", level: 0, description: "Edite a descrição no painel de detalhe.", icon: "✨" })}
                            >
                              + Adicionar rápida
                            </button>
                          </div>

                          {selectedSpell && (
                            <>
                              <div className="field">
                                <label style={{ fontSize: 12, color: "var(--muted)" }}>Descrição</label>
                                <textarea
                                  rows={7}
                                  value={selectedSpell.description || ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setSheet((p) => ({
                                      ...p,
                                      spells: (p.spells || []).map((x) => (x.id === selectedSpell.id ? { ...x, description: v } : x)),
                                    }));
                                  }}
                                />
                              </div>

                              <div className="footerActions" style={{ justifyContent: "space-between" }}>
                                <button className="btn" onClick={cancelChanges} disabled={saving}>
                                  Cancelar
                                </button>
                                <button className="btn primary" onClick={saveSheet} disabled={saving}>
                                  {saving ? "Salvando..." : "Salvar"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DIÁRIO */}
                  {activeTab === "diary" && (
                    <div className="panel">
                      <div className="sectionTitle">Diário</div>
                      <div style={{ display: "grid", gap: 12 }}>
                        <textarea
                          rows={16}
                          value={sheet.notes || ""}
                          onChange={(e) => updateSheet("notes", e.target.value)}
                          placeholder="Anotações, objetivos, pistas, aliados, inimigos..."
                          style={{
                            width: "100%",
                            padding: 12,
                            borderRadius: 16,
                            border: "1px solid rgba(148,163,184,.18)",
                            background: "rgba(2,6,23,.55)",
                            color: "var(--text)",
                            resize: "vertical",
                          }}
                        />

                        <div className="footerActions">
                          <button className="btn primary" onClick={saveSheet} disabled={saving}>
                            {saving ? "Salvando..." : "Salvar alterações"}
                          </button>
                          <button className="btn" onClick={cancelChanges} disabled={saving}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LEGADO */}
                  {activeTab === "legacy" && (
                    <div className="panel">
                      <div className="sectionTitle">Legado</div>

                      {legacyLoading && <div style={{ color: "var(--muted)" }}>Carregando legado...</div>}
                      {legacyError && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(239,68,68,.35)",
                            background: "rgba(239,68,68,.08)",
                            color: "#fecaca",
                            fontSize: 13,
                          }}
                        >
                          {legacyError}
                        </div>
                      )}

                      {!legacyLoading && !legacyError && !legacy && (
                        <div style={{ color: "var(--muted)" }}>
                          Nenhum legado disponível. Assim que o Mestre adicionar, ele aparecerá aqui.
                        </div>
                      )}

                      {!legacyLoading && legacy && (
                        <div className="grid2" style={{ marginTop: 12 }}>
                          <div className="panel">
                            <div className="sectionTitle">Marcas</div>
                            {(legacy.marks || []).length === 0 ? (
                              <div style={{ color: "var(--muted)" }}>Sem marcas.</div>
                            ) : (
                              <ul className="list">
                                {(legacy.marks || []).map((m) => (
                                  <li key={m.id || m.name} className="li" style={{ cursor: "default" }}>
                                    <div className="leftcell">
                                      <div className="badge">🏷️</div>
                                      <div>
                                        <div style={{ fontWeight: 900 }}>{m.name || "Marca"}</div>
                                        <small>{m.desc || m.description || ""}</small>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="panel">
                            <div className="sectionTitle">Títulos</div>
                            {(legacy.titles || []).length === 0 ? (
                              <div style={{ color: "var(--muted)" }}>Sem títulos.</div>
                            ) : (
                              <ul className="list">
                                {(legacy.titles || []).map((t) => (
                                  <li key={t.id || t.name} className="li" style={{ cursor: "default" }}>
                                    <div className="leftcell">
                                      <div className="badge">🎖️</div>
                                      <div>
                                        <div style={{ fontWeight: 900 }}>{t.name || "Título"}</div>
                                        <small>{t.granted_by ? `Concedido por: ${t.granted_by}` : ""}</small>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="panel" style={{ gridColumn: "1 / -1" }}>
                            <div className="sectionTitle">Ganchos</div>
                            {(legacy.hooks || []).length === 0 ? (
                              <div style={{ color: "var(--muted)" }}>Sem ganchos.</div>
                            ) : (
                              <ul className="list">
                                {(legacy.hooks || []).map((h, idx) => (
                                  <li key={h.id || idx} className="li" style={{ cursor: "default" }}>
                                    <div className="leftcell">
                                      <div className="badge">🧷</div>
                                      <div>
                                        <div style={{ fontWeight: 900 }}>{h.title || "Gancho"}</div>
                                        <small>{h.prompt || h.desc || ""}</small>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="footerActions" style={{ justifyContent: "flex-end" }}>
                            <button className="btn" onClick={() => loadLegacy(selectedCharacter.id)} disabled={legacyLoading}>
                              {legacyLoading ? "Recarregando..." : "Recarregar Legado"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* MODAL: Criar */}
      {createOpen && (
        <div className="modalOverlay" onClick={(e) => { if (e.target === e.currentTarget) setCreateOpen(false); }}>
          <div className="modal">
            <header>
              <h3>Novo Personagem</h3>
              <button className="iconbtn" onClick={() => setCreateOpen(false)}>✕</button>
            </header>


            <div className="row">
              <div>
                <label>Nome</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Kael"
                />
              </div>

              <div>
                <label>Classe</label>
                <select
                  value={createForm.classId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, classId: e.target.value }))}
                >
                  <option value="">Selecionar...</option>
                  {MOCK_CLASSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.dadoVida})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row">
              <div>
                <label>Raça</label>
                <select
                  value={createForm.raceId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, raceId: e.target.value }))}
                >
                  <option value="">Selecionar...</option>
                  {MOCK_RACES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </div>

              {!hideCampaignLink && (
              <div>
                <label>Vincular a Campanha</label>
                <select
                  value={createForm.campaignId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, campaignId: e.target.value }))}
                >
                  <option value="">Nenhuma</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.title || `Campanha #${c.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            </div>

            <div className="footerActions">
              <button className="btn" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</button>
              <button className="btn primary" onClick={createCharacter} disabled={saving}>{saving ? "Criando..." : "Criar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Item */}
      {itemModalOpen && (
        <div className="modalOverlay" onClick={(e) => { if (e.target === e.currentTarget) setItemModalOpen(false); }}>
          <div className="modal">
            <header>
              <h3>Novo Item</h3>
              <button className="iconbtn" onClick={() => setItemModalOpen(false)}>✕</button>
            </header>

            <div className="row">
              <div>
                <label>Nome</label>
                <input value={itemDraft.name} onChange={(e) => setItemDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Poção de Cura" />
              </div>
              <div>
                <label>Ícone</label>
                <select value={itemDraft.icon} onChange={(e) => setItemDraft((p) => ({ ...p, icon: e.target.value }))}>
                  {["🎒", "🗡️", "🛡️", "🏹", "🧪", "📜", "💎", "🔑", "🍖", "🕯️"].map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row">
              <div>
                <label>Quantidade</label>
                <input type="number" min="1" max="999" value={itemDraft.qty} onChange={(e) => setItemDraft((p) => ({ ...p, qty: clampInt(e.target.value, 1, 999, 1) }))} />
              </div>
              <div>
                <label>Peso</label>
                <input type="number" min="0" step="0.1" value={itemDraft.weight} onChange={(e) => setItemDraft((p) => ({ ...p, weight: Number(e.target.value || 0) }))} />
              </div>
            </div>

            <div>
              <label>Raridade</label>
              <input value={itemDraft.rarity} onChange={(e) => setItemDraft((p) => ({ ...p, rarity: e.target.value }))} placeholder="Comum, Raro, Lendário..." />
            </div>

            <div>
              <label>Descrição</label>
              <textarea rows={5} value={itemDraft.description} onChange={(e) => setItemDraft((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="footerActions">
              <button className="btn" onClick={() => setItemModalOpen(false)} disabled={saving}>Cancelar</button>
              <button className="btn primary" onClick={addItemFromModal} disabled={saving}>Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IA Generator */}
      {aiModalOpen && (
        <div className="modalOverlay" onClick={(e) => { if (e.target === e.currentTarget) setAiModalOpen(false); }}>
          <div className="modal">
            <header>
              <h3>Gerar Retrato com IA</h3>
              <button className="iconbtn" onClick={() => setAiModalOpen(false)}>✕</button>
            </header>

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.4 }}>
                Descreva como é o seu personagem. Fale sobre cabelo, olhos, roupas, cicatrizes e o clima da cena.
              </p>
            </div>

            <div>
              <label>Descrição Visual (Prompt)</label>
              <textarea 
                rows={6} 
                value={aiPrompt} 
                onChange={(e) => setAiPrompt(e.target.value)} 
                placeholder="Ex: Um elfo mago com túnica azul escura, segurando um cajado de cristal brilhante, em uma biblioteca antiga..."
                autoFocus
              />
            </div>

            <div className="footerActions">
              <button className="btn" onClick={() => setAiModalOpen(false)}>Cancelar</button>
              <button 
                className="btn primary" 
                onClick={confirmAiGeneration}
                style={{ background: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)", border: "none", color: "white" }}
              >
                🎨 Gerar Imagem
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function PersonagemPage() {
  return <CharacterSheetWorkspace />;
}