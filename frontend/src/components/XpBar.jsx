import React from 'react';

// Tabela de XP D&D 5e (Acumulativo)
export const XP_TABLE = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

export default function XpBar({ currentXp = 0, level = 1 }) {
  // Pega o XP necessário para o próximo nível
  const nextLevelXp = XP_TABLE[level] || XP_TABLE[XP_TABLE.length - 1];
  const currentLevelBase = XP_TABLE[level - 1] || 0;

  // Cálculo da porcentagem da barra (dentro do nível atual)
  const totalNeeded = nextLevelXp - currentLevelBase;
  const progress = currentXp - currentLevelBase;
  
  // Limita entre 0 e 100%
  let percent = (progress / totalNeeded) * 100;
  if (percent > 100) percent = 100;
  if (percent < 0) percent = 0;

  return (
    <div style={{width: '100%', marginTop: 5}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 2}}>
        <span>LVL {level}</span>
        <span>{currentXp} / {nextLevelXp} XP</span>
        <span>LVL {level + 1}</span>
      </div>
      <div style={{width: '100%', height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden'}}>
        <div style={{
            width: `${percent}%`, 
            height: '100%', 
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            transition: 'width 0.5s ease-out'
        }} />
      </div>
    </div>
  );
}
