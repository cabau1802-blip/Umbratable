import React, { useState, useEffect, useRef } from "react";
import {api} from "../services/api";

// --- DADOS DE REFERÊNCIA ---
const ALL_SKILLS = [
  "Acrobacia", "Adestrar Animais", "Arcanismo", "Atletismo", "Atuação",
  "Enganação", "Furtividade", "História", "Intimidação", "Intuição",
  "Investigação", "Medicina", "Natureza", "Percepção", "Persuasão",
  "Prestidigitação", "Religião", "Sobrevivência",
];

const DEFAULT_SHEET = {
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  hpMax: 10, hpCurrent: 10, tempHp: 0, ac: 10, xp: 0, proficiencyBonus: 2,
  notes: "",
  skills: [],
  skillValues: {},
  inventory: [], features: [], spells: [],
  avatar: ""
};

// --- HELPERS ---
function abilityMod(score) {
  return Math.floor((Number(score || 0) - 10) / 2);
}

function mergeSheet(existing) {
  if (!existing || typeof existing !== "object") return { ...DEFAULT_SHEET };
  return {
    ...DEFAULT_SHEET,
    ...existing,
    abilities: { ...DEFAULT_SHEET.abilities, ...(existing.abilities || {}) },
    skills: Array.isArray(existing.skills) ? existing.skills : [],
    skillValues: existing.skillValues || {},
    inventory: existing.inventory || [],
    features: existing.features || [],
    spells: existing.spells || [],
  };
}

// --- CSS ---
const CSS_STYLES = `
  :root{
    --sheet-bg: rgba(9, 9, 11, 0.96);
    --sheet-surface: rgba(24, 24, 27, 0.85);
    --sheet-border: rgba(255,255,255,0.14);
    --sheet-border-strong: rgba(255,255,255,0.18);
    --sheet-text: #e5e7eb;
    --sheet-muted: #94a3b8;
    --sheet-accent: #facc15;
    --sheet-danger: #ef4444;
    --sheet-radius: 16px;
    --sheet-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
    --sheet-shadow: 0 25px 80px rgba(0,0,0,0.75);
  }

  .sheet-modal-overlay {
    position: fixed; inset: 0;
    background: radial-gradient(1200px 700px at 25% 10%, rgba(250,204,21,0.08), rgba(0,0,0,0) 55%),
                rgba(0,0,0,0.78);
    z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px);
    animation: uiOverlayIn 160ms var(--sheet-ease) both;
  }

  .sheet-modal-content {
    width: 95%; height: 90%; max-width: 1200px;
    background: linear-gradient(180deg, rgba(10,10,14,0.96), rgba(6,8,12,0.96));
    border: 1px solid var(--sheet-border);
    border-radius: var(--sheet-radius);
    display: flex; overflow: hidden;
    box-shadow: var(--sheet-shadow);
    transform-origin: top center;
    animation: uiModalIn 180ms var(--sheet-ease) both;
  }

  /* Sidebar */
  .char-btn {
    width: 100%;
    padding: 12px 15px;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: transparent;
    color: var(--sheet-muted);
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: transform 120ms var(--sheet-ease), background 180ms var(--sheet-ease), color 180ms var(--sheet-ease);
    outline: none;
  }
  .char-btn:hover { background: rgba(255,255,255,0.04); color: var(--sheet-accent); transform: translateY(-1px); }
  .char-btn.active {
    background: rgba(255,255,255,0.05);
    color: var(--sheet-accent);
    border-left: 3px solid var(--sheet-accent);
  }
  .char-btn:focus-visible{
    box-shadow: 0 0 0 4px rgba(250,204,21,0.14);
  }

  /* Tabs */
  .modal-tab {
    padding: 12px 20px;
    cursor: pointer;
    color: var(--sheet-muted);
    border-bottom: 2px solid transparent;
    font-weight: 800;
    font-size: 0.9rem;
    transition: color 180ms var(--sheet-ease), border-color 180ms var(--sheet-ease), transform 120ms var(--sheet-ease);
    white-space: nowrap;
    user-select: none;
  }
  .modal-tab:hover { color: var(--sheet-text); transform: translateY(-1px); }
  .modal-tab.active { color: var(--sheet-accent); border-bottom: 2px solid var(--sheet-accent); }

  /* Inputs */
  .modal-input {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.14);
    color: var(--sheet-text);
    padding: 9px 10px;
    border-radius: 12px;
    outline: none;
    font-size: 0.95rem;
    transition: box-shadow 180ms var(--sheet-ease), border-color 180ms var(--sheet-ease), background 180ms var(--sheet-ease);
  }
  .modal-input:focus {
    border-color: rgba(250,204,21,0.45);
    box-shadow: 0 0 0 4px rgba(250,204,21,0.12);
    background: rgba(255,255,255,0.06);
  }
  .modal-input:disabled { opacity: 0.55; cursor: not-allowed; }

  .skill-val-input {
    width: 44px;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.18);
    color: var(--sheet-accent);
    font-weight: 900;
    text-align: center;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 180ms var(--sheet-ease);
  }
  .skill-val-input:focus { border-bottom-color: rgba(250,204,21,0.85); }

  /* Scrollbar (mantém compatibilidade com o original) */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: rgba(0,0,0,0.35); }
  ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.35); border-radius: 999px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.55); }

  @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }

  @keyframes uiOverlayIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes uiModalIn { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }

  @media (prefers-reduced-motion: reduce){
    .sheet-modal-overlay, .sheet-modal-content { animation: none !important; }
    .char-btn, .modal-tab, .modal-input { transition: none !important; }
  }
`;

export default function CampaignSheetsModal({ isOpen, onClose, campaignCharacters = [], onSaveCharacter, isOwner, currentUserId }) {
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [editingChar, setEditingChar] = useState(null); // Buffer local de edição
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Inicializa com o primeiro personagem (COM PROTEÇÃO)
  useEffect(() => {
    if (isOpen && Array.isArray(campaignCharacters) && campaignCharacters.length > 0 && !selectedCharId) {
      handleSelectChar(campaignCharacters[0]);
    }
  }, [isOpen, campaignCharacters]);

  if (!isOpen) return null;

  // === LÓGICA DE PERMISSÃO ===
  const canEdit = editingChar && (isOwner || editingChar.user_id === currentUserId);

  function handleSelectChar(char) {
    if (!char) return;
    const id = char.character_id || char.id;
    setSelectedCharId(id);

    // Cria uma cópia profunda para edição local
    const safeSheet = mergeSheet(char.sheet_data);
    setEditingChar({ ...char, sheet_data: safeSheet });
    setActiveTab("general");
  }

  // --- UPDATERS ---
  function updateSheet(field, value) {
    if (!canEdit) return;
    setEditingChar(prev => ({
      ...prev,
      sheet_data: { ...prev.sheet_data, [field]: value }
    }));
  }

  function updateAbility(key, value) {
    if (!canEdit) return;
    setEditingChar(prev => ({
      ...prev,
      sheet_data: {
        ...prev.sheet_data,
        abilities: { ...prev.sheet_data.abilities, [key]: Number(value) }
      }
    }));
  }

  function toggleSkill(skill) {
    if (!canEdit) return;
    setEditingChar(prev => {
      const skills = prev.sheet_data.skills || [];
      const newSkills = skills.includes(skill)
        ? skills.filter(s => s !== skill)
        : [...skills, skill];
      return {
        ...prev,
        sheet_data: { ...prev.sheet_data, skills: newSkills }
      };
    });
  }

  function updateSkillValue(skill, value) {
    if (!canEdit) return;
    setEditingChar(prev => ({
      ...prev,
      sheet_data: {
        ...prev.sheet_data,
        skillValues: {
           ...(prev.sheet_data.skillValues || {}),
           [skill]: Number(value)
        }
      }
    }));
  }

  // --- UPLOAD DE IMAGEM ---
  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !canEdit) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Faz o upload para a rota que criamos
      const response = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const newUrl = response.data.url;
      updateSheet('avatar', newUrl); // Atualiza o estado local com a nova URL

    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao enviar imagem. Verifique se o arquivo é válido.");
    }
  }

  // --- SALVAR ---
  async function handleSave() {
    if (!editingChar || !canEdit) return;
    setIsSaving(true);
    try {
      const idToSave = editingChar.character_id || editingChar.id;

      await onSaveCharacter({
        id: idToSave,
        level: editingChar.level,
        sheet_data: editingChar.sheet_data,
        // Também salvamos o nome se tiver sido editado na ficha (embora não tenhamos input pra isso aqui ainda)
        name: editingChar.name
      });

      alert("Ficha salva com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  // Dados para render
  const sheet = editingChar?.sheet_data || DEFAULT_SHEET;
  const abilities = sheet.abilities || DEFAULT_SHEET.abilities;
  const skillValues = sheet.skillValues || {};

  return (
    <div className="sheet-modal-overlay" role="dialog" aria-modal="true" aria-label="Fichas da mesa">
      <style>{CSS_STYLES}</style>
      <div className="sheet-modal-content">

        {/* SIDEBAR */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span>Fichas da Mesa</span>
            <button onClick={onClose} style={styles.closeIcon} type="button" aria-label="Fechar">✕</button>
          </div>
          <div style={styles.charList}>
            {/* PROTEÇÃO: Verifica se é array antes de mapear */}
            {Array.isArray(campaignCharacters) && campaignCharacters.map(c => {
                const cId = c.character_id || c.id;
                const isActive = selectedCharId === cId;
                // PROTEÇÃO: Garante que nome exista para pegar a inicial
                const charName = c.name || "?";

                return (
                  <button
                    key={cId}
                    onClick={() => handleSelectChar(c)}
                    className={`char-btn ${isActive ? 'active' : ''}`}
                    type="button"
                    title={charName}
                  >
                    <div style={styles.avatarSmall}>
                       {c.sheet_data?.avatar ?
                         <img src={c.sheet_data.avatar} style={styles.imgFit} alt="" /> : charName[0]}
                    </div>
                    <div style={{minWidth:0}}>
                        <div style={{fontWeight:'bold', fontSize:14, color:'#e5e7eb', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{charName}</div>
                        <div style={{fontSize:11, opacity:0.7, color:'#94a3b8'}}>{c.class} Nv.{c.level}</div>
                    </div>
                  </button>
                )
            })}
            {(!campaignCharacters || campaignCharacters.length === 0) && (
                <div style={{padding:20, textAlign:'center', color:'#94a3b8'}}>
                    Nenhum personagem na mesa.
                </div>
            )}
          </div>
        </aside>

        {/* MAIN */}
        <main style={styles.main}>
          {editingChar ? (
            <>
              <header style={styles.sheetHeader}>
                 <div style={{display:'flex', alignItems:'center', gap:15}}>

                    {/* AVATAR COM UPLOAD */}
                    <div
                        style={{...styles.avatarLarge, cursor: canEdit ? 'pointer' : 'default', position: 'relative'}}
                        onClick={() => canEdit && fileInputRef.current.click()}
                        title={canEdit ? "Clique para alterar a foto" : ""}
                    >
                        {/* PROTEÇÃO: Garante inicial do nome */}
                        {sheet.avatar ? (
                            <img src={sheet.avatar} style={styles.imgFit} alt="Avatar" />
                        ) : (
                            (editingChar.name || "?")[0]
                        )}

                        {/* Ícone de câmera hover (opcional) */}
                        {canEdit && (
                            <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', opacity:0, transition:'0.18s', display:'flex', alignItems:'center', justifyContent:'center', borderRadius: 14}}
                                 onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                 onMouseLeave={e => e.currentTarget.style.opacity = 0}
                            >
                                📷
                            </div>
                        )}
                    </div>

                    {/* INPUT OCULTO - Indispensável */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{display:'none'}}
                        onChange={handleImageUpload}
                        accept="image/*"
                    />

                    <div style={{minWidth:0}}>
                        <h2 style={styles.charName}>{editingChar.name}</h2>
                        <div style={{color:'#94a3b8', fontSize:13}}>
                             {editingChar.race} {editingChar.class} • Nível {editingChar.level}
                        </div>
                        {!canEdit && (
                            <span style={{
                                fontSize:11, color:'#fecaca',
                                border:'1px solid rgba(239,68,68,0.45)', padding:'3px 8px',
                                borderRadius:999, marginTop:8, display:'inline-block',
                                background:'rgba(239,68,68,0.10)', fontWeight:900
                            }}>
                                🔒 Somente Leitura
                            </span>
                        )}
                    </div>
                 </div>
                 <div style={{display:'flex', gap:10}}>
                     {canEdit && (
                         <button onClick={handleSave} disabled={isSaving} style={styles.btnSave} type="button">
                            {isSaving ? "Salvando..." : "💾 Salvar Alterações"}
                         </button>
                     )}
                 </div>
              </header>

              <div style={styles.tabsContainer}>
                 {[
                    {id: 'general', label: 'Geral'},
                    {id: 'combat', label: 'Combate'},
                    {id: 'inventory', label: 'Inventário'},
                    {id: 'spells', label: 'Magias'},
                    {id: 'features', label: 'Habilidades'}
                 ].map(t => (
                    <div
                        key={t.id}
                        className={`modal-tab ${activeTab === t.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setActiveTab(t.id);
                        }}
                    >
                        {t.label}
                    </div>
                 ))}
              </div>

              <div style={styles.body}>

                  {/* --- ABA GERAL --- */}
                  {activeTab === 'general' && (
                      <div style={styles.grid2Col}>
                          <div style={{display:'flex', flexDirection:'column', gap:20}}>
                              <div>
                                  <h4 style={styles.sectionTitle}>Atributos</h4>
                                  <div style={styles.attrGrid}>
                                      {Object.entries(abilities).map(([key, val]) => (
                                          <div key={key} style={styles.attrCard}>
                                              <label style={{fontSize:10, fontWeight:'bold', color:'#71717a'}}>{key.toUpperCase()}</label>
                                              <input
                                                type="number"
                                                value={val}
                                                onChange={(e) => updateAbility(key, e.target.value)}
                                                className="modal-input"
                                                disabled={!canEdit}
                                                style={{textAlign:'center', fontSize:18, fontWeight:'bold', background:'transparent', border:'none'}}
                                              />
                                              <div style={{fontSize:12, color:'#facc15', borderTop:'1px solid rgba(255,255,255,0.10)', marginTop:6, paddingTop:6, fontWeight:900}}>
                                                {abilityMod(val) >= 0 ? '+' : ''}{abilityMod(val)}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <div style={{flex:1}}>
                                <h4 style={styles.sectionTitle}>Anotações</h4>
                                <textarea
                                    value={sheet.notes || ""}
                                    onChange={(e) => updateSheet('notes', e.target.value)}
                                    style={styles.textarea}
                                    disabled={!canEdit}
                                    placeholder="Escreva aqui..."
                                />
                              </div>
                          </div>

                          <div style={styles.panel}>
                              <h4 style={styles.sectionTitle}>Perícias</h4>
                              <div style={{display:'flex', flexDirection:'column', gap:0}}>
                                  {ALL_SKILLS.map(skill => {
                                      const isProficient = (sheet.skills || []).includes(skill);
                                      const skillVal = skillValues[skill] || 0;

                                      return (
                                          <div key={skill} style={styles.skillRow}>
                                              <label style={{display:'flex', alignItems:'center', gap:8, fontSize:13, cursor: canEdit ? 'pointer' : 'default', flex:1}}>
                                                  <input
                                                    type="checkbox"
                                                    checked={isProficient}
                                                    onChange={() => toggleSkill(skill)}
                                                    disabled={!canEdit}
                                                    style={{accentColor:'#facc15'}}
                                                  />
                                                  <span style={{color: isProficient ? '#facc15' : '#cbd5e1', fontWeight: isProficient ? 900 : 700}}>
                                                    {skill}
                                                  </span>
                                              </label>
                                              <input
                                                type="number"
                                                value={skillVal}
                                                onChange={(e) => updateSkillValue(skill, e.target.value)}
                                                disabled={!canEdit}
                                                className="skill-val-input"
                                                placeholder="0"
                                              />
                                          </div>
                                      )
                                  })}
                              </div>
                          </div>
                      </div>
                  )}

                  {/* --- ABA COMBATE --- */}
                  {activeTab === 'combat' && (
                      <div style={styles.gridCombat}>
                          <div style={styles.statCard}>
                              <label>CA</label>
                              <input type="number" value={sheet.ac} onChange={(e) => updateSheet('ac', e.target.value)} disabled={!canEdit} className="modal-input" style={{fontSize:24, textAlign:'center'}} />
                          </div>
                          <div style={styles.statCard}>
                              <label>Vida Máx</label>
                              <input type="number" value={sheet.hpMax} onChange={(e) => updateSheet('hpMax', e.target.value)} disabled={!canEdit} className="modal-input" style={{fontSize:24, textAlign:'center'}} />
                          </div>
                          <div style={styles.statCard}>
                              <label>Vida Atual</label>
                              <input type="number" value={sheet.hpCurrent} onChange={(e) => updateSheet('hpCurrent', e.target.value)} disabled={!canEdit} className="modal-input" style={{fontSize:24, textAlign:'center', color:'#fecaca'}} />
                          </div>
                          <div style={styles.statCard}>
                              <label>HP Temp</label>
                              <input type="number" value={sheet.tempHp} onChange={(e) => updateSheet('tempHp', e.target.value)} disabled={!canEdit} className="modal-input" style={{fontSize:24, textAlign:'center', color:'#facc15'}} />
                          </div>
                          <div style={{...styles.statCard, gridColumn:'1 / -1'}}>
                              <label>Experiência (XP)</label>
                              <input type="number" value={sheet.xp} onChange={(e) => updateSheet('xp', Number(e.target.value))} disabled={!canEdit} className="modal-input" style={{fontSize:20}} />
                          </div>
                          <div style={styles.statCard}>
                               <label>Bônus Proficiência</label>
                               <input
                                   type="number"
                                   value={sheet.proficiencyBonus}
                                   onChange={(e) => updateSheet('proficiencyBonus', Number(e.target.value))}
                                   disabled={!canEdit}
                                   className="modal-input"
                                   style={{fontSize:20, textAlign:'center', color:'#facc15', fontWeight: 900}}
                               />
                          </div>
                      </div>
                  )}

                  {/* --- ABA INVENTÁRIO --- */}
                  {activeTab === 'inventory' && (
                      <div>
                          <h4 style={styles.sectionTitle}>Inventário</h4>
                          <div style={{background:'rgba(255,255,255,0.03)', padding:15, borderRadius:14, border:'1px solid rgba(255,255,255,0.12)', boxShadow:'0 18px 55px rgba(0,0,0,0.35)'}}>
                              <div style={{display:'grid', gap:8}}>
                                 {(sheet.inventory || []).map((item, idx) => (
                                     <div key={idx} style={{display:'flex', justifyContent:'space-between', padding:10, background:'rgba(0,0,0,0.22)', borderRadius:12, alignItems:'center', border:'1px solid rgba(255,255,255,0.10)'}}>
                                         <strong style={{color:'#e5e7eb'}}>{item.name || item}</strong>
                                         {canEdit && (
                                           <button
                                              onClick={() => {
                                                  const newInv = sheet.inventory.filter((_, i) => i !== idx);
                                                  updateSheet('inventory', newInv);
                                              }}
                                              style={{color:'#fecaca', background:'transparent', border:'1px solid rgba(239,68,68,0.30)', cursor:'pointer', fontSize:14, borderRadius:10, width:34, height:34}}
                                              type="button"
                                              title="Remover"
                                           >×</button>
                                         )}
                                     </div>
                                 ))}
                                 {(sheet.inventory || []).length === 0 && <p style={{color:'#94a3b8', textAlign:'center'}}>Vazio.</p>}
                              </div>

                              {canEdit && (
                                <div style={{marginTop:15, display:'flex', gap:10}}>
                                    <input id="modal-new-item" placeholder="Novo item..." className="modal-input" />
                                    <button
                                      onClick={() => {
                                          const val = document.getElementById('modal-new-item').value;
                                          if(val) {
                                              updateSheet('inventory', [...(sheet.inventory||[]), {id:Date.now(), name:val}]);
                                              document.getElementById('modal-new-item').value = "";
                                          }
                                      }}
                                      style={styles.btnPrimary}
                                      type="button"
                                    >Adicionar</button>
                                </div>
                              )}
                          </div>
                      </div>
                  )}

                  {/* --- ABA MAGIAS --- */}
                  {activeTab === 'spells' && (
                      <div>
                          <h4 style={styles.sectionTitle}>Grimório</h4>
                          <div style={{display:'grid', gap:10}}>
                              {(sheet.spells || []).map((spell, idx) => (
                                  <div key={idx} style={{background:'rgba(255,255,255,0.03)', padding:12, borderRadius:14, border:'1px solid rgba(255,255,255,0.12)'}}>
                                      <div style={{display:'flex', gap:10, marginBottom:8}}>
                                          <input
                                            className="modal-input"
                                            value={spell.name}
                                            placeholder="Nome da Magia"
                                            disabled={!canEdit}
                                            style={{fontWeight:'bold', color:'#a78bfa'}}
                                            onChange={(e) => {
                                                const newSpells = [...sheet.spells];
                                                newSpells[idx].name = e.target.value;
                                                updateSheet('spells', newSpells);
                                            }}
                                          />
                                          <input
                                            className="modal-input"
                                            type="number"
                                            placeholder="Círculo"
                                            value={spell.level || 0}
                                            disabled={!canEdit}
                                            style={{width:80, textAlign:'center'}}
                                            onChange={(e) => {
                                                const newSpells = [...sheet.spells];
                                                newSpells[idx].level = e.target.value;
                                                updateSheet('spells', newSpells);
                                            }}
                                          />
                                          {canEdit && (
                                              <button
                                                onClick={() => {
                                                    const newSpells = sheet.spells.filter((_, i) => i !== idx);
                                                    updateSheet('spells', newSpells);
                                                }}
                                                style={{...styles.btnPrimary, background:'rgba(239,68,68,0.14)', border:'1px solid rgba(239,68,68,0.35)', color:'#fecaca'}}
                                                type="button"
                                                title="Remover"
                                              >×</button>
                                          )}
                                      </div>
                                      <textarea
                                          className="modal-input"
                                          placeholder="Descrição..."
                                          value={spell.desc || ""}
                                          disabled={!canEdit}
                                          style={{minHeight:70, resize:'vertical', fontSize:13}}
                                          onChange={(e) => {
                                              const newSpells = [...sheet.spells];
                                              newSpells[idx].desc = e.target.value;
                                              updateSheet('spells', newSpells);
                                          }}
                                      />
                                  </div>
                              ))}

                              {canEdit && (
                                  <button
                                    onClick={() => updateSheet('spells', [...(sheet.spells||[]), {id:Date.now(), name:"", level:0, desc:""}])}
                                    style={styles.btnPrimary}
                                    type="button"
                                  >
                                    + Nova Magia
                                  </button>
                              )}
                          </div>
                      </div>
                  )}

                  {/* --- ABA HABILIDADES --- */}
                  {activeTab === 'features' && (
                      <div>
                          <h4 style={styles.sectionTitle}>Habilidades & Talentos</h4>
                          <div style={{display:'grid', gap:10}}>
                              {(sheet.features || []).map((feat, idx) => (
                                  <div key={idx} style={{background:'rgba(255,255,255,0.03)', padding:12, borderRadius:14, border:'1px solid rgba(255,255,255,0.12)'}}>
                                      <div style={{display:'flex', gap:10, marginBottom:8}}>
                                          <input
                                            className="modal-input"
                                            value={feat.name}
                                            placeholder="Nome da Habilidade"
                                            disabled={!canEdit}
                                            style={{fontWeight:'bold', color:'#facc15'}}
                                            onChange={(e) => {
                                                const newFeats = [...sheet.features];
                                                newFeats[idx].name = e.target.value;
                                                updateSheet('features', newFeats);
                                            }}
                                          />
                                          {canEdit && (
                                              <button
                                                onClick={() => {
                                                    const newFeats = sheet.features.filter((_, i) => i !== idx);
                                                    updateSheet('features', newFeats);
                                                }}
                                                style={{...styles.btnPrimary, background:'rgba(239,68,68,0.14)', border:'1px solid rgba(239,68,68,0.35)', color:'#fecaca'}}
                                                type="button"
                                                title="Remover"
                                              >×</button>
                                          )}
                                      </div>
                                      <textarea
                                          className="modal-input"
                                          placeholder="Descrição..."
                                          value={feat.desc || ""}
                                          disabled={!canEdit}
                                          style={{minHeight:70, resize:'vertical', fontSize:13}}
                                          onChange={(e) => {
                                              const newFeats = [...sheet.features];
                                              newFeats[idx].desc = e.target.value;
                                              updateSheet('features', newFeats);
                                          }}
                                      />
                                  </div>
                              ))}

                              {canEdit && (
                                  <button
                                    onClick={() => updateSheet('features', [...(sheet.features||[]), {id:Date.now(), name:"", desc:""}])}
                                    style={styles.btnPrimary}
                                    type="button"
                                  >
                                    + Nova Habilidade
                                  </button>
                              )}
                          </div>
                      </div>
                  )}

              </div>
            </>
          ) : (
            <div style={{flex:1, display:'flex', justifyContent:'center', alignItems:'center', color:'#94a3b8'}}>
                Selecione um personagem para visualizar.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// === ESTILOS VISUAIS ===
const styles = {
    sidebar: {
      width: 280,
      background: 'rgba(19,19,21,0.85)',
      borderRight: '1px solid rgba(255,255,255,0.10)',
      display: 'flex',
      flexDirection: 'column'
    },
    sidebarHeader: {
      padding: '14px 18px',
      borderBottom: '1px solid rgba(255,255,255,0.10)',
      display:'flex',
      justifyContent:'space-between',
      alignItems:'center',
      background:'rgba(24,24,27,0.70)',
      color:'#facc15',
      fontWeight:'bold'
    },
    closeIcon: {
      background:'rgba(255,255,255,0.04)',
      border:'1px solid rgba(255,255,255,0.14)',
      color:'#e5e7eb',
      cursor:'pointer',
      borderRadius: 12,
      width: 34,
      height: 34
    },
    avatarSmall: {
      width: 36,
      height: 36,
      borderRadius: 12,
      background: 'rgba(148,163,184,0.20)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 900,
      overflow:'hidden',
      border:'1px solid rgba(255,255,255,0.12)'
    },
    imgFit: { width:'100%', height:'100%', objectFit:'cover' },
    charList: { flex:1, overflowY:'auto' },

    main: { flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(11,11,13,0.92)', overflow: 'hidden' },
    sheetHeader: {
      padding: '18px 22px',
      background: 'rgba(24,24,27,0.70)',
      borderBottom: '1px solid rgba(255,255,255,0.10)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    avatarLarge: {
      width: 72,
      height: 72,
      borderRadius: 14,
      background: 'rgba(148,163,184,0.20)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: 26,
      overflow:'hidden',
      border:'1px solid rgba(255,255,255,0.14)',
      boxShadow:'0 18px 55px rgba(0,0,0,0.45)'
    },
    charName: { margin: 0, color: '#facc15', fontSize: '1.55rem', fontFamily: '"Cinzel", serif' },
    btnSave: {
      background: 'rgba(22,163,74,0.14)',
      color: '#bbf7d0',
      border: '1px solid rgba(22,163,74,0.35)',
      padding: '10px 16px',
      borderRadius: 14,
      cursor: 'pointer',
      fontWeight: 900,
      fontSize:'0.9rem'
    },

    tabsContainer: {
      display: 'flex',
      borderBottom: '1px solid rgba(255,255,255,0.10)',
      background: 'rgba(19,19,21,0.70)',
      padding: '0 16px',
      overflowX:'auto'
    },
    body: { flex: 1, overflowY: 'auto', padding: '22px' },
    sectionTitle: {
      color: '#f1f5f9',
      marginTop: 0,
      marginBottom: 12,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      borderBottom:'1px solid rgba(255,255,255,0.08)',
      paddingBottom:8
    },

    grid2Col: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 },
    attrGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 10 },
    attrCard: {
      background: 'rgba(255,255,255,0.03)',
      padding: 10,
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.12)',
      textAlign: 'center',
      boxShadow:'0 16px 45px rgba(0,0,0,0.25)'
    },

    textarea: {
      width: '100%',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.14)',
      color: '#e2e8f0',
      borderRadius: 14,
      padding: 12,
      minHeight: 140,
      resize: 'vertical',
      fontFamily:'sans-serif',
      outline:'none',
      boxShadow:'0 12px 30px rgba(0,0,0,0.22)'
    },
    panel: {
      background: 'rgba(255,255,255,0.03)',
      padding: 14,
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.12)',
      maxHeight:'560px',
      overflowY:'auto',
      boxShadow:'0 18px 55px rgba(0,0,0,0.30)'
    },
    skillRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)'
    },

    gridCombat: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 },
    statCard: {
      background: 'rgba(30,41,59,0.35)',
      padding: 14,
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.12)',
      display:'flex',
      flexDirection:'column',
      gap:8,
      boxShadow:'0 18px 55px rgba(0,0,0,0.30)',
      color:'#e5e7eb'
    },

    btnPrimary: {
      background: "rgba(37,99,235,0.18)",
      color: "#dbeafe",
      border: "1px solid rgba(37,99,235,0.35)",
      padding: "10px 14px",
      borderRadius: 14,
      cursor: 'pointer',
      fontWeight: 900
    },
};
