import React from 'react';
import styles from './WeatherControls.module.css';

// Dicionário de nomes bonitos
const WEATHER_TYPES = [
  { id: 'none', label: 'Limpar', icon: '❌' },
  { id: 'rain', label: 'Chuva', icon: '🌧️' },
  { id: 'snow', label: 'Neve', icon: '❄️' },
  { id: 'fog',  label: 'Nevoeiro', icon: '🌫️' },
];

export default function WeatherControls({ 
  currentType, 
  currentIntensity, 
  onChangeType, 
  onChangeIntensity 
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>Clima Atmosférico</div>
      
      {/* Botões de Seleção */}
      <div className={styles.buttonGroup}>
        {WEATHER_TYPES.map((w) => (
          <button
            key={w.id}
            onClick={() => onChangeType(w.id)}
            className={`${styles.btn} ${currentType === w.id ? styles.active : ''}`}
            title={w.label}
          >
            <span className={styles.icon}>{w.icon}</span>
            <span className={styles.label}>{w.label}</span>
          </button>
        ))}
      </div>

      {/* Slider de Intensidade (Só aparece se tiver clima ativo) */}
      {currentType !== 'none' && (
        <div className={styles.sliderContainer}>
          <div className={styles.sliderHeader}>
            <span>Intensidade</span>
            <span>{Math.round(currentIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={currentIntensity}
            onChange={(e) => onChangeIntensity(parseFloat(e.target.value))}
            className={styles.slider}
          />
        </div>
      )}
    </div>
  );
}
