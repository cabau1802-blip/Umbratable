// Referências simplificadas, inspiradas em D&D 5e (resumidas para não copiar texto oficial).

// CLASSES
export const CLASSES = {
  artifice: {
    id: "artifice",
    nome: "Artífice",
    papel: "Suporte mágico e técnico, focado em itens mágicos e invenções.",
    descricao:
      "Artífices combinam ciência e magia para criar itens, infusões e engenhocas que fortalecem o grupo.",
    dadoVida: "d8 por nível",
    atributosPrincipais: ["Inteligência", "Constituição"],
    proficienciasResumo:
      "Armaduras leves e médias; escudos; armas simples; algumas ferramentas (ferreiro, artesão etc.).",
    equipamentosIniciais: [
      "Arma simples (por exemplo, besta de mão ou martelo)",
      "Armadura leve ou média",
      "Ferramentas de artesão",
      "Pacote de aventureiro"
    ],
    tipoMagia: "Magia artificial (infusões em itens e magias preparadas)",
    magiasResumo:
      "Consegue infundir itens com efeitos mágicos e conjurar magias de suporte, controle e dano moderado."
  },

  barbaro: {
    id: "barbaro",
    nome: "Bárbaro",
    papel: "Frontliner extremamente resistente e com alto dano corpo a corpo.",
    descricao:
      "Bárbaros canalizam fúria primal para causar dano pesado e aguentar punição.",
    dadoVida: "d12 por nível",
    atributosPrincipais: ["Força", "Constituição"],
    proficienciasResumo:
      "Armaduras leves e médias; escudos; armas simples e marciais.",
    equipamentosIniciais: [
      "Arma marcial pesada (ex.: machado grande) ou duas armas simples",
      "Armadura leve ou sem armadura (aproveitando defesa sem armadura)",
      "Pacote de aventureiro"
    ],
    tipoMagia: null,
    magiasResumo:
      "Não é um conjurador tradicional — o foco é fúria, resistência e dano físico."
  },

  bardo: {
    id: "bardo",
    nome: "Bardo",
    papel: "Suporte versátil, conjurador e especialista em perícias.",
    descricao:
      "Bardos usam música, performance e magia para inspirar aliados, confundir inimigos e lidar com qualquer situação social.",
    dadoVida: "d8 por nível",
    atributosPrincipais: ["Carisma", "Destreza"],
    proficienciasResumo:
      "Armaduras leves; armas simples, bestas leves, espadas curtas, rapieiras, espadas longas; instrumentos musicais.",
    equipamentosIniciais: [
      "Uma rapieira, espada longa ou arma simples",
      "Instrumento musical",
      "Armadura leve",
      "Pacote de artista ou aventureiro"
    ],
    tipoMagia: "Magia arcana baseada em Carisma (magias conhecidas)",
    magiasResumo:
      "Conjura magias de charme, ilusão, suporte e cura leve; conhece poucas magias, mas tem boa flexibilidade."
  },

  bruxo: {
    id: "bruxo",
    nome: "Bruxo",
    papel: "Conjurador arcano com poderes vindos de um pacto.",
    descricao:
      "Bruxos fazem pactos com entidades poderosas e ganham magias e invocações únicas.",
    dadoVida: "d8 por nível",
    atributosPrincipais: ["Carisma"],
    proficienciasResumo:
      "Armaduras leves; armas simples.",
    equipamentosIniciais: [
      "Arma simples (ex.: cajado ou adaga)",
      "Foco arcano ou componentes",
      "Pacote de estudioso ou aventureiro"
    ],
    tipoMagia: "Magia de pacto (slots limitados que se recuperam em descansos curtos)",
    magiasResumo:
      "Conjura poucas magias, mas muito fortes, além de invocações místicas que personalizam o personagem."
  },

  clerigo: {
    id: "clerigo",
    nome: "Clérigo",
    papel: "Conjurador divino, curandeiro e suporte, com boa presença em combate.",
    descricao:
      "Clérigos canalizam poder de uma divindade, curam aliados, enfrentam mortos-vivos e protegem o grupo.",
    dadoVida: "d8 por nível",
    atributosPrincipais: ["Sabedoria", "Constituição"],
    proficienciasResumo:
      "Armaduras leves e médias; escudos; armas simples (algumas tradições permitem armas marciais).",
    equipamentosIniciais: [
      "Maça ou martelo de guerra",
      "Escudo com símbolo sagrado",
      "Armadura leve ou média",
      "Símbolo sagrado",
      "Pacote de sacerdote ou aventureiro"
    ],
    tipoMagia: "Magia divina preparada (baseada em Sabedoria)",
    magiasResumo:
      "Acesso a cura, proteção e magias de suporte e dano divino; escolhe magias diariamente."
  },

  druida: {
    id: "druida",
    nome: "Druida",
    papel: "Conjurador divino focado em natureza, cura e transformação.",
    descricao:
      "Druidas protegem a natureza, conjuram magias elementais e podem assumir formas animais.",
    dadoVida: "d8 por nível",
    atributosPrincipais: ["Sabedoria"],
    proficienciasResumo:
      "Armaduras leves e médias não metálicas; escudos não metálicos; armas simples (algumas específicas como cimitarra).",
    equipamentosIniciais: [
      "Cajado ou cimitarra",
      "Escudo de madeira (opcional)",
      "Foco druídico",
      "Pacote de explorador"
    ],
    tipoMagia: "Magia divina da natureza (preparada, baseada em Sabedoria)",
    magiasResumo:
      "Magias de cura, controle de campos de batalha, invocação de animais e manipulação de elementos."
  },

  feiticeiro: {
    id: "feiticeiro",
    nome: "Feiticeiro",
    papel: "Conjurador arcano com magia inata e altamente personalizável.",
    descricao:
      "Feiticeiros têm poder mágico no sangue ou na alma, capaz de distorcer magias com metamagia.",
    dadoVida: "d6 por nível",
    atributosPrincipais: ["Carisma"],
    proficienciasResumo:
      "Armas simples; sem armaduras por padrão.",
    equipamentosIniciais: [
      "Dardo, bordão ou adaga",
      "Foco arcano ou componentes",
      "Pacote de explorador ou estudioso"
    ],
    tipoMagia: "Magia inata baseada em Carisma (magias conhecidas)",
    magiasResumo:
      "Poucas magias conhecidas, mas com recursos de metamagia para modificar alcance, duração, área, etc."
  },

  guardian: {
    id: "guardian",
    nome: "Patrulheiro",
    papel: "Combatente híbrido com foco em exploração, rastreio e combate em ambientes selvagens.",
    descricao:
      "Patrulheiros são caçadores e exploradores especialistas em terrenos específicos e inimigos preferidos.",
    dadoVida: "d10 por nível",
    atributosPrincipais: ["Destreza", "Sabedoria"],
    proficienciasResumo:
      "Armaduras leves e médias; escudos; armas simples e marciais.",
    equipamentosIniciais: [
      "Duas espadas curtas ou uma arma marcial",
      "Armadura leve ou média",
      "Arco longo e aljava de flechas (opcional)",
      "Pacote de explorador"
    ],
    tipoMagia: "Magia primal limitada (baseada em Sabedoria)",
    magiasResumo:
      "Magias de rastreio, marcação de inimigos, suporte à exploração e controle leve de campo."
  },

  guerreiro: {
    id: "guerreiro",
    nome: "Guerreiro",
    papel: "Combatente corpo a corpo ou à distância, extremamente versátil.",
    descricao:
      "Guerreiros são mestres em combate com armas, podendo se especializar em diferentes estilos.",
    dadoVida: "d10 por nível",
    atributosPrincipais: ["Força", "Constituição", "Destreza (builds à distância)"],
    proficienciasResumo:
      "Armaduras leves, médias e pesadas; escudos; armas simples e marciais.",
    equipamentosIniciais: [
      "Uma arma marcial e escudo OU duas armas marciais",
      "Armadura pesada ou média",
      "Pacote de aventureiro"
    ],
    tipoMagia: null,
    magiasResumo:
      "Não é conjurador por padrão (exceto arquétipos específicos em níveis mais altos)."
  },

  ladino: {
    id: "ladino",
    nome: "Ladino",
    papel: "Especialista em furtividade, truques, perícias e ataques precisos.",
    descricao:
      "Ladinos brilham em ataques surpresa, infiltração, armadilhas e situações sociais delicadas.",
    dadoVida: "d8 por nível",
    atributosPrincipais: ["Destreza"],
    proficienciasResumo:
      "Armaduras leves; armas simples, bestas de mão, espadas curtas, rapieiras.",
    equipamentosIniciais: [
      "Rapieira ou espada curta",
      "Armadura de couro",
      "Ferramentas de ladrão (comuns)",
      "Pacote de criminoso ou aventureiro"
    ],
    tipoMagia: null,
    magiasResumo:
      "Alguns arquétipos ganham magias, mas o ladino base é não-conjurador."
  },

  mago: {
    id: "mago",
    nome: "Mago",
    papel: "Conjurador arcano puro, com o maior acesso a magias.",
    descricao:
      "Magos estudam intensamente magia arcana e podem aprender um vasto repertório de feitiços.",
    dadoVida: "d6 por nível",
    atributosPrincipais: ["Inteligência"],
    proficienciasResumo:
      "Armas simples (bordão, adaga, dardo, funda); sem proficiência em armaduras.",
    equipamentosIniciais: [
      "Cajado ou adaga",
      "Grimório (livro de magias)",
      "Foco arcano ou componentes",
      "Pacote de estudioso ou explorador"
    ],
    tipoMagia: "Magia arcana preparada (baseada em Inteligência)",
    magiasResumo:
      "Grande quantidade de magias disponíveis, preparadas diariamente a partir do grimório."
  },

  monge: {
    id: "monge",
    nome: "Monge",
    papel: "Artista marcial ágil com habilidades físicas e espirituais.",
    descricao:
      "Monges canalizam energia interior (ki) para realizar golpes rápidos, movimentos ágeis e feitos sobrenaturais.",
    dadoVida: "d8 por nível",
    atributosPrincipais: ["Destreza", "Sabedoria"],
    proficienciasResumo:
      "Armas simples e algumas armas de monge (bastões, nunchaku, etc. dependendo da mesa).",
    equipamentosIniciais: [
      "Bordão ou espada curta",
      "Kit de explorador ou de artista marcial simples",
      "Roupas simples"
    ],
    tipoMagia: null,
    magiasResumo:
      "Não tem magias tradicionais; usa pontos de ki para habilidades especiais (golpes, passos, defesa)."
  },

  paladino: {
    id: "paladino",
    nome: "Paladino",
    papel: "Guerreiro sagrado, tanque e suporte com cura e auras.",
    descricao:
      "Paladinos juram um ideal ou divindade, ganhando poder para smites, cura e proteção.",
    dadoVida: "d10 por nível",
    atributosPrincipais: ["Força", "Carisma", "Constituição"],
    proficienciasResumo:
      "Armaduras leves, médias e pesadas; escudos; armas simples e marciais.",
    equipamentosIniciais: [
      "Espada longa ou outra arma marcial",
      "Escudo com símbolo sagrado",
      "Armadura pesada",
      "Símbolo sagrado",
      "Pacote de sacerdote ou aventureiro"
    ],
    tipoMagia: "Magia divina limitada (baseada em Carisma)",
    magiasResumo:
      "Magias de cura, proteção, punição sagrada e suporte; foco em combate corpo a corpo."
  }
};

// RAÇAS (cada sub-raça vem como entrada separada para facilitar o select)
export const RACES = {
  // ANÕES
  anao_colina: {
    id: "anao_colina",
    nome: "Anão da Colina",
    descricao:
      "Anões da colina são sábios e extremamente resistentes, habituados a uma vida de trabalho duro e tradição.",
    bonusAtributos: "+2 Constituição, +1 Sabedoria (varia conforme regras exatas da edição).",
    tamanho: "Médio (baixo e robusto)",
    deslocamento: "7,5m (25 pés)",
    habilidadesRaciais: [
      "Visão no escuro",
      "Resistência a venenos (testes e dano)",
      "Resiliência anã (mais pontos de vida em algumas variantes)"
    ],
    proficienciasResumo:
      "Treinamento com armas anãs (machados, martelos) e proficiência em ferramentas de artesão (depende da origem)."
  },

  anao_montanha: {
    id: "anao_montanha",
    nome: "Anão da Montanha",
    descricao:
      "Anões da montanha são mais fortes e acostumados a forjas e fortalezas em locais elevados.",
    bonusAtributos: "+2 Constituição, +2 Força (varia conforme regras exatas da edição).",
    tamanho: "Médio (baixo e robusto)",
    deslocamento: "7,5m (25 pés)",
    habilidadesRaciais: [
      "Visão no escuro",
      "Resistência a venenos",
      "Proficiência em armaduras leves e médias (em algumas regras)"
    ],
    proficienciasResumo:
      "Treinamento com armas anãs e ferramentas de artesão apropriadas."
  },

  // ELFOS
  elfo_alto: {
    id: "elfo_alto",
    nome: "Alto Elfo",
    descricao:
      "Altos elfos são refinados e fortemente ligados à magia arcana.",
    bonusAtributos: "+2 Destreza, +1 Inteligência (em muitas variantes).",
    tamanho: "Médio",
    deslocamento: "9m (30 pés)",
    habilidadesRaciais: [
      "Visão no escuro",
      "Percepção apurada",
      "Resistência a encantamentos e magias de sono",
      "Conhecimento de um truque arcano simples (em algumas regras)"
    ],
    proficienciasResumo:
      "Proficiência com espadas longas, espadas curtas, arcos longos e arcos curtos (em muitas tabelas)."
  },

  elfo_floresta: {
    id: "elfo_floresta",
    nome: "Elfo da Floresta",
    descricao:
      "Elfos da floresta são ágeis, furtivos e muito conectados a ambientes selvagens.",
    bonusAtributos: "+2 Destreza, +1 Sabedoria (varia com a edição).",
    tamanho: "Médio",
    deslocamento: "10,5m (35 pés) em algumas regras",
    habilidadesRaciais: [
      "Visão no escuro",
      "Percepção apurada",
      "Capacidade de se esconder mesmo com pouca cobertura",
      "Afinidade com a natureza"
    ],
    proficienciasResumo:
      "Arcos e espadas élficas; habilidades ligadas a furtividade e sobrevivência na floresta."
  },

  elfo_drow: {
    id: "elfo_drow",
    nome: "Drow (Elfo Negro)",
    descricao:
      "Drows vivem em regiões subterrâneas, com forte ligação a magia e intrigas sombrias.",
    bonusAtributos: "+2 Destreza, +1 Carisma (em muitas variantes).",
    tamanho: "Médio",
    deslocamento: "9m (30 pés)",
    habilidadesRaciais: [
      "Visão no escuro superior",
      "Sensibilidade à luz solar",
      "Magias raciais (truques e magias de escuridão/charme conforme nível)"
    ],
    proficienciasResumo:
      "Proficiência com algumas armas finas (rapieiras, bestas de mão, espadas curtas)."
  },

  // HALFLINGS
  halfling_pes_leves: {
    id: "halfling_pes_leves",
    nome: "Halfling Pés-Leves",
    descricao:
      "Pés-leves são discretos, sociáveis e incrivelmente sortudos.",
    bonusAtributos: "+2 Destreza, +1 Carisma (em muitas variantes).",
    tamanho: "Pequeno",
    deslocamento: "7,5m (25 pés)",
    habilidadesRaciais: [
      "Sorte (re-rolar alguns resultados 1 em d20, dependendo da regra)",
      "Corajoso (vantagem contra medo)",
      "Facilidade em se esconder atrás de criaturas maiores"
    ],
    proficienciasResumo:
      "Não costumam ganhar proficiências de armas pela raça; isso vem da classe."
  },

  halfling_robusto: {
    id: "halfling_robusto",
    nome: "Halfling Robusto",
    descricao:
      "Robustos são mais resistentes que outros halflings, sobrevivendo bem a venenos e doenças.",
    bonusAtributos: "+2 Destreza, +1 Constituição (em muitas variantes).",
    tamanho: "Pequeno",
    deslocamento: "7,5m (25 pés)",
    habilidadesRaciais: [
      "Sorte",
      "Corajoso",
      "Resistência melhorada a venenos"
    ],
    proficienciasResumo:
      "Mesma base dos halflings, com foco em resistência."
  },

  // HUMANOS
  humano: {
    id: "humano",
    nome: "Humano",
    descricao:
      "Humanos são adaptáveis, ambiciosos e encontrados em praticamente todos os lugares.",
    bonusAtributos:
      "Pequenos bônus em vários atributos (depende da variação utilizada).",
    tamanho: "Médio",
    deslocamento: "9m (30 pés)",
    habilidadesRaciais: [
      "Versatilidade em atributos",
      "Culturas variadas trazem diferentes proficiências"
    ],
    proficienciasResumo:
      "Podem receber proficiências extras dependendo da origem/cultura."
  },

  humano_variante: {
    id: "humano_variante",
    nome: "Humano (Variante)",
    descricao:
      "A variante humana troca bônus mais espalhados por um talento adicional em níveis iniciais.",
    bonusAtributos:
      "Bônus menores em dois atributos, mais um talento (feat) inicial, conforme regras da mesa.",
    tamanho: "Médio",
    deslocamento: "9m (30 pés)",
    habilidadesRaciais: [
      "Escolha de talento extra",
      "Ajustes flexíveis de atributos",
      "Proficiências extras em perícias, dependendo da mesa"
    ],
    proficienciasResumo:
      "Forte foco em talentos e personalização em vez de bônus fixos."
  },

  // DRACONATO
  draconato: {
    id: "draconato",
    nome: "Draconato",
    descricao:
      "Draconatos descendem de dragões, exibindo traços dracônicos e um sopro elemental.",
    bonusAtributos: "+2 Força e +1 Carisma (em muitas variantes).",
    tamanho: "Médio",
    deslocamento: "9m (30 pés)",
    habilidadesRaciais: [
      "Sopro de energia elemental (tipo varia pelo ancestral dracônico)",
      "Resistência ao tipo de dano do ancestral"
    ],
    proficienciasResumo:
      "Normalmente não ganham proficiência extra em armas pela raça; isso vem da classe."
  },

  // GNOMOS
  gnomo_floresta: {
    id: "gnomo_floresta",
    nome: "Gnomo da Floresta",
    descricao:
      "Gnomos da floresta são curiosos, ágeis e afinados com ilusão e natureza.",
    bonusAtributos: "+2 Inteligência, +1 Destreza ou Sabedoria (varia).",
    tamanho: "Pequeno",
    deslocamento: "7,5m (25 pés)",
    habilidadesRaciais: [
      "Visão no escuro",
      "Astúcia gnômica (vantagem contra magias mentais em algumas regras)",
      "Pequenas magias ilusionistas ou de comunicação com animais"
    ],
    proficienciasResumo:
      "Foco em magia, truques e ofícios finos; proficiências extras via classe ou background."
  },

  gnomo_rochedo: {
    id: "gnomo_rochedo",
    nome: "Gnomo do Rochedo",
    descricao:
      "Gnomos do rochedo são inventores e artesãos, especialistas em engenhocas.",
    bonusAtributos: "+2 Inteligência, +1 Constituição (em muitas variantes).",
    tamanho: "Pequeno",
    deslocamento: "7,5m (25 pés)",
    habilidadesRaciais: [
      "Visão no escuro",
      "Astúcia gnômica",
      "Talento em ofícios e pequenas invenções mecânicas"
    ],
    proficienciasResumo:
      "Ferramentas de artesão, especialmente voltadas a mecânica e engenharia."
  },

  // MEIO-ELFO
  meio_elfo: {
    id: "meio_elfo",
    nome: "Meio-Elfo",
    descricao:
      "Meio-elfos unem herança humana e élfica, equilibrando adaptabilidade e graça.",
    bonusAtributos:
      "+2 Carisma e bônus menores em dois outros atributos (varia conforme regras).",
    tamanho: "Médio",
    deslocamento: "9m (30 pés)",
    habilidadesRaciais: [
      "Visão no escuro",
      "Resistência a encantamentos",
      "Profic. adicionais em perícias em algumas regras"
    ],
    proficienciasResumo:
      "Tendem a ser socialmente fortes; recebem proficiências em perícias conforme a variante."
  },

  // MEIO-ORC
  meio_orc: {
    id: "meio_orc",
    nome: "Meio-Orc",
    descricao:
      "Meio-orcs combinam a força bruta orc com a adaptabilidade humana.",
    bonusAtributos: "+2 Força, +1 Constituição (em muitas variantes).",
    tamanho: "Médio",
    deslocamento: "9m (30 pés)",
    habilidadesRaciais: [
      "Visão no escuro",
      "Capacidade de continuar lutando mesmo após chegar a 0 PV (em certas regras)",
      "Intimidação natural elevada"
    ],
    proficienciasResumo:
      "Geralmente não ganham proficiências adicionais de armas além das da classe."
  },

  // TIEFLING
  tiefling: {
    id: "tiefling",
    nome: "Tiefling",
    descricao:
      "Tieflings têm traços infernais em sua linhagem, o que lhes dá resistência e magia sombria.",
    bonusAtributos: "+2 Carisma, +1 Inteligência (em muitas variantes).",
    tamanho: "Médio",
    deslocamento: "9m (30 pés)",
    habilidadesRaciais: [
      "Resistência a dano de fogo (em muitas variantes)",
      "Magias inatas ligadas a escuridão e fogo, conforme nível",
      "Aparência marcante (chifres, cauda, olhos brilhantes etc.)"
    ],
    proficienciasResumo:
      "Foco maior em características mágicas que em proficiências de armas; o resto vem da classe."
  }
};

