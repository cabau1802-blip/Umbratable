// Definições de progresso de magia por classe.
// É uma aproximação baseada na lógica do D&D 5e,
// sem copiar tabelas literalmente do livro.

// type:
// - "prepared_full": conjurador pleno que prepara magias (mago, clérigo, druida)
// - "known_full": conjurador pleno de magias conhecidas (bardo, feiticeiro, bruxo)
// - "half_known": meio-conjurador (paladino, patrulheiro, artífice)

export const MAGIC_PROGRESSION = {
  mago: { type: "prepared_full", ability: "int" },
  clerigo: { type: "prepared_full", ability: "wis" },
  druida: { type: "prepared_full", ability: "wis" },

  bardo: { type: "known_full", ability: "cha" },
  feiticeiro: { type: "known_full", ability: "cha" },
  bruxo: { type: "known_full", ability: "cha" },

  artifice: { type: "half_known", ability: "int" },
  guardian: { type: "half_known", ability: "wis" }, // patrulheiro
  paladino: { type: "half_known", ability: "cha" },
};

// Modificador de atributo
function abilityMod(score) {
  const val = Number(score) || 0;
  return Math.floor((val - 10) / 2);
}

// Cantrips (truques) para conjuradores plenos (mago/clerigo/druida)
// Aproximação típica: 3 nos níveis baixos, depois 4, depois 5.
function fullCasterCantrips(level) {
  if (level <= 3) return 3;
  if (level <= 9) return 4;
  return 5;
}

// Cantrips para conjuradores plenos de magias conhecidas (bardo/feiticeiro/bruxo)
// Também uma aproximação: 4, 5, 6 ao longo dos níveis.
function knownCasterCantrips(level) {
  if (level <= 3) return 4;
  if (level <= 9) return 5;
  return 6;
}

// Cantrips para artífice (meio conjurador com truques) – bem simplificado.
function artificeCantrips(level) {
  if (level <= 3) return 2;
  if (level <= 9) return 3;
  return 4;
}

/**
 * Calcula limites recomendados de truques e magias conhecidas/preparadas
 * para um personagem dado (classe, nível, atributos).
 *
 * Retorna:
 *  - isCaster: boolean
 *  - maxCantrips: número máximo recomendado de truques (nível 0)
 *  - maxSpells: número máximo recomendado de magias de nível 1+
 */
export function getMagicLimits(classId, level, abilities = {}) {
  const config = MAGIC_PROGRESSION[classId];
  if (!config) {
    return {
      isCaster: false,
      maxCantrips: 0,
      maxSpells: 0,
    };
  }

  const lvl = Number(level) || 1;
  const abilityScore = abilities[config.ability] ?? 10;
  const mod = abilityMod(abilityScore);

  let maxCantrips = 0;
  let maxSpells = 0;

  if (config.type === "prepared_full") {
    // Mago / Clérigo / Druida
    maxCantrips = fullCasterCantrips(lvl);
    // Magias preparadas = nível + modificador, mínimo 1
    maxSpells = Math.max(1, lvl + mod);
  } else if (config.type === "known_full") {
    // Bardo / Feiticeiro / Bruxo
    maxCantrips = knownCasterCantrips(lvl);
    // Magias conhecidas cresce um pouco mais devagar
    maxSpells = Math.max(1, lvl + mod - 1);
  } else if (config.type === "half_known") {
    // Paladino / Patrulheiro / Artífice
    if (classId === "artifice") {
      maxCantrips = artificeCantrips(lvl);
    } else {
      // Paladino e patrulheiro normalmente não têm truques por padrão
      maxCantrips = 0;
    }

    const effective = Math.floor(lvl / 2); // meio conjurador
    maxSpells = Math.max(0, effective + mod - 1);
  }

  if (maxSpells < 0) maxSpells = 0;

  return {
    isCaster: true,
    maxCantrips,
    maxSpells,
  };
}

