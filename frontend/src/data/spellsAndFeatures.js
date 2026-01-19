// Sugestões de magias e habilidades por classe.
// Isso aqui é uma base simplificada, inspirada na progressão de D&D,
// mas não é uma cópia completa do livro. Serve como guia para iniciantes.

// Cada sugestão de magia:
//  - name: nome da magia
//  - minLevel: nível mínimo do PERSONAGEM em que faz sentido pegar
//  - spellLevel: nível da magia (0 = truque)

// Cada sugestão de habilidade:
//  - name: nome/descrição curta
//  - minLevel: nível mínimo do personagem em que a habilidade entra

export const CLASS_SPELL_SUGGESTIONS = {
  mago: [
    { name: "Mão Mágica", minLevel: 1, spellLevel: 0 },
    { name: "Raio de Fogo", minLevel: 1, spellLevel: 0 },
    { name: "Luz", minLevel: 1, spellLevel: 0 },

    { name: "Mísseis Mágicos", minLevel: 1, spellLevel: 1 },
    { name: "Escudo", minLevel: 1, spellLevel: 1 },
    { name: "Armadura Arcana", minLevel: 1, spellLevel: 1 },
    { name: "Detectar Magia", minLevel: 2, spellLevel: 1 },

    { name: "Raio Ardente", minLevel: 3, spellLevel: 2 },
    { name: "Sugestão", minLevel: 5, spellLevel: 3 },

    { name: "Bola de Fogo", minLevel: 5, spellLevel: 3 },
    { name: "Relâmpago", minLevel: 7, spellLevel: 4 },

    { name: "Porta Dimensional", minLevel: 9, spellLevel: 4 },
    { name: "Círculo de Teletransporte", minLevel: 13, spellLevel: 7 },
    { name: "Parar o Tempo", minLevel: 17, spellLevel: 9 },
  ],

  clerigo: [
    { name: "Luz", minLevel: 1, spellLevel: 0 },
    { name: "Chama Sagrada", minLevel: 1, spellLevel: 0 },
    { name: "Orientação", minLevel: 1, spellLevel: 0 },

    { name: "Curar Ferimentos", minLevel: 1, spellLevel: 1 },
    { name: "Bênção", minLevel: 1, spellLevel: 1 },
    { name: "Escudo da Fé", minLevel: 1, spellLevel: 1 },
    { name: "Detectar Magia", minLevel: 3, spellLevel: 2 },

    { name: "Arma Espiritual", minLevel: 5, spellLevel: 3 },
    { name: "Guardião Espiritual", minLevel: 7, spellLevel: 4 },

    { name: "Reviver os Mortos", minLevel: 9, spellLevel: 5 },
    { name: "Ressurreição Verdadeira", minLevel: 17, spellLevel: 9 },
  ],

  druida: [
    { name: "Rajadas de Chamas", minLevel: 1, spellLevel: 0 },
    { name: "Chicote de Espinhos", minLevel: 1, spellLevel: 0 },
    { name: "Orientação", minLevel: 1, spellLevel: 0 },

    { name: "Curar Ferimentos", minLevel: 1, spellLevel: 1 },
    { name: "Enredar", minLevel: 1, spellLevel: 1 },
    { name: "Falar com Animais", minLevel: 2, spellLevel: 1 },

    { name: "Invocar Animal", minLevel: 5, spellLevel: 3 },
    { name: "Tempestade de Gelo", minLevel: 7, spellLevel: 4 },

    { name: "Muralha de Pedra", minLevel: 11, spellLevel: 5 },
    { name: "Tempestade de Vingança", minLevel: 17, spellLevel: 9 },
  ],

  bardo: [
    { name: "Zombaria Viciosa", minLevel: 1, spellLevel: 0 },
    { name: "Amizade", minLevel: 1, spellLevel: 0 },

    { name: "Cura pelas Mãos", minLevel: 1, spellLevel: 1 },
    { name: "Sono", minLevel: 1, spellLevel: 1 },
    { name: "Encantar Pessoa", minLevel: 2, spellLevel: 1 },

    { name: "Sugestão", minLevel: 5, spellLevel: 3 },
    { name: "Imagem Maior", minLevel: 9, spellLevel: 5 },
    { name: "Palavra de Poder: Atordoar", minLevel: 17, spellLevel: 8 },
  ],

  bruxo: [
    { name: "Rajada Mística", minLevel: 1, spellLevel: 0 },
    { name: "Mão Mágica", minLevel: 1, spellLevel: 0 },

    { name: "Armadura de Agathys", minLevel: 1, spellLevel: 1 },
    { name: "Comando", minLevel: 1, spellLevel: 1 },

    { name: "Escuridão", minLevel: 5, spellLevel: 2 },
    { name: "Fome de Hadar", minLevel: 7, spellLevel: 3 },
    { name: "Passo Dimensional", minLevel: 11, spellLevel: 4 },
  ],

  feiticeiro: [
    { name: "Raio de Fogo", minLevel: 1, spellLevel: 0 },
    { name: "Luz", minLevel: 1, spellLevel: 0 },

    { name: "Projétil Mágico", minLevel: 1, spellLevel: 1 },
    { name: "Escudo", minLevel: 1, spellLevel: 1 },

    { name: "Raio Ardente", minLevel: 5, spellLevel: 2 },
    { name: "Bola de Fogo", minLevel: 7, spellLevel: 3 },
    { name: "Relâmpago", minLevel: 9, spellLevel: 3 },

    { name: "Desintegrar", minLevel: 13, spellLevel: 6 },
    { name: "Palavra de Poder: Matar", minLevel: 17, spellLevel: 9 },
  ],

  artifice: [
    { name: "Consertar", minLevel: 1, spellLevel: 0 },
    { name: "Luz", minLevel: 1, spellLevel: 0 },

    { name: "Armadura Arcana", minLevel: 1, spellLevel: 1 },
    { name: "Criar ou Destruir Água", minLevel: 2, spellLevel: 1 },

    { name: "Arma Mágica", minLevel: 5, spellLevel: 2 },
    { name: "Arma Elemental", minLevel: 9, spellLevel: 3 },
  ],

  guardian: [
    { name: "Falar com Animais", minLevel: 2, spellLevel: 1 },
    { name: "Marca do Caçador", minLevel: 2, spellLevel: 1 },
    { name: "Névoa Obscurecente", minLevel: 3, spellLevel: 1 },

    { name: "Localizar Criatura", minLevel: 9, spellLevel: 4 },
  ],

  paladino: [
    { name: "Curar Ferimentos", minLevel: 2, spellLevel: 1 },
    { name: "Comando", minLevel: 2, spellLevel: 1 },
    { name: "Escudo da Fé", minLevel: 2, spellLevel: 1 },

    { name: "Arma Espiritual", minLevel: 9, spellLevel: 4 },
  ],
};

export const CLASS_FEATURE_SUGGESTIONS = {
  barbaro: [
    { name: "Fúria", minLevel: 1 },
    { name: "Defesa sem Armadura (BARBARO)", minLevel: 1 },
    { name: "Ataque Imprudente", minLevel: 2 },
    { name: "Sentido de Perigo", minLevel: 2 },
    { name: "Ataque Extra", minLevel: 5 },
  ],

  guerreiro: [
    { name: "Estilo de Luta", minLevel: 1 },
    { name: "Segundo Fôlego", minLevel: 1 },
    { name: "Surto de Ação", minLevel: 2 },
    { name: "Ataque Extra", minLevel: 5 },
  ],

  ladino: [
    { name: "Ataque Furtivo", minLevel: 1 },
    { name: "Ação Ardilosa", minLevel: 2 },
    { name: "Esquiva Sobrenatural", minLevel: 5 },
    { name: "Evasão", minLevel: 7 },
  ],

  mago: [
    { name: "Recuperação Arcana", minLevel: 1 },
    {
      name: "Tradição Arcana (escola de magia escolhida na campanha)",
      minLevel: 2,
    },
  ],

  clerigo: [
    { name: "Domínio Divino (domínio da sua campanha)", minLevel: 1 },
    { name: "Canalizar Divindade (1 uso)", minLevel: 2 },
  ],

  druida: [
    { name: "Forma Selvagem (transformar em animais)", minLevel: 2 },
    { name: "Círculo Druídico (subclasse escolhida)", minLevel: 2 },
  ],

  bardo: [
    { name: "Inspiração de Bardo (dados de bônus)", minLevel: 1 },
    { name: "Canção de Descanso", minLevel: 2 },
    { name: "Colégio de Bardo (subclasse)", minLevel: 3 },
  ],

  bruxo: [
    { name: "Patrono (entidade do pacto)", minLevel: 1 },
    { name: "Invocações Místicas", minLevel: 2 },
  ],

  feiticeiro: [
    { name: "Origem da Magia (linhagem)", minLevel: 1 },
    { name: "Pontos de Feitiçaria", minLevel: 2 },
    { name: "Metamagia", minLevel: 3 },
  ],

  artifice: [
    { name: "Infusões em Itens", minLevel: 2 },
    { name: "Especialização de Artífice", minLevel: 3 },
  ],

  guardian: [
    { name: "Inimigo Favorito", minLevel: 1 },
    { name: "Explorador Nascido", minLevel: 1 },
  ],

  paladino: [
    { name: "Imposição de Mãos", minLevel: 1 },
    { name: "Sentido Divino", minLevel: 1 },
    { name: "Castigo Divino (Smite)", minLevel: 2 },
    { name: "Juramento Sagrado (subclasse)", minLevel: 3 },
  ],

  monge: [
    { name: "Defesa sem Armadura (MONGE)", minLevel: 1 },
    { name: "Rajada de Golpes", minLevel: 2 },
    { name: "Passo do Vento", minLevel: 2 },
    { name: "Ataques Extras (Ataque Extra)", minLevel: 5 },
  ],
};

