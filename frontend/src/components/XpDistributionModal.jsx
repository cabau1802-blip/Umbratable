import React, { useState } from "react";

export default function XpDistributionModal({ isOpen, onClose, characters, onConfirm }) {
  const [amount, setAmount] = useState("");
  // Inicialmente marca todos os personagens
  const [selectedIds, setSelectedIds] = useState(characters.map(c => c.id));

  if (!isOpen) return null;

  const toggleChar = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const xpValue = parseInt(amount);
    if (!xpValue || xpValue <= 0) return alert("Digite um valor válido de XP.");
    if (selectedIds.length === 0) return alert("Selecione pelo menos um personagem.");
    
    onConfirm(xpValue, selectedIds);
    setAmount("");
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={{color: '#facc15', marginTop:0}}>✨ Conceder Experiência</h2>
        
        <div style={{marginBottom: 15}}>
          <label style={{display:'block', color:'#ccc', marginBottom:5}}>Quantidade de XP</label>
          <input 
            type="number" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            placeholder="Ex: 500"
            style={styles.input}
            autoFocus
          />
        </div>

        <div style={styles.list}>
          <label style={{color:'#94a3b8', fontSize: 12, display:'block', marginBottom:5}}>QUEM VAI RECEBER?</label>
          {characters.map(char => (
            <div key={char.id} onClick={() => toggleChar(char.id)} style={{
                ...styles.charItem,
                borderColor: selectedIds.includes(char.id) ? '#22c55e' : '#334155',
                background: selectedIds.includes(char.id) ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
            }}>
              <input type="checkbox" checked={selectedIds.includes(char.id)} readOnly />
              <span style={{marginLeft: 10, fontWeight: 'bold'}}>{char.name}</span>
              <span style={{marginLeft: 'auto', fontSize: 12, color: '#aaa'}}>Lvl {char.level}</span>
            </div>
          ))}
        </div>

        <div style={styles.actions}>
          <button onClick={onClose} style={styles.btnCancel}>Cancelar</button>
          <button onClick={handleConfirm} style={styles.btnConfirm}>Distribuir ✨</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  card: { background: '#18181b', padding: 25, borderRadius: 12, border: '1px solid #334155', width: 400, maxWidth: '90%' },
  input: { width: '100%', padding: 10, background: '#27272a', border: '1px solid #52525b', color: 'white', borderRadius: 6, fontSize: 18, textAlign: 'center' },
  list: { maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  charItem: { display: 'flex', alignItems: 'center', padding: 10, borderRadius: 6, border: '1px solid', cursor: 'pointer', transition: '0.2s' },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  btnCancel: { background: 'transparent', border: '1px solid #52525b', color: '#ccc', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' },
  btnConfirm: { background: '#8b5cf6', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }
};
