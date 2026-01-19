// frontend/src/help/helpContent.js

export const PRODUCT_NAME = "UmbralTable";

export const PROFILES = [
  { id: "gm", label: "Mestre (GM)" },
  { id: "player", label: "Jogador" },
];

export const TRAILS = [
  { id: "start", label: "Primeiros Passos" },
  { id: "campaign", label: "Campanhas e Mesas" },
  { id: "sheet", label: "Fichas e Personagens" },
  { id: "session", label: "Sessão de Jogo" },
];

// Lista de Artigos do Grimório
export const HELP_ARTICLES = [
  {
    id: "guide-start",
    title: "Guia rápido do UmbralTable",
    summary: "Primeiros passos para começar a usar o VTT em poucos minutos.",
    trail: "start",
    category: "onboarding",
    profiles: ["gm", "player"],
    tags: ["onboarding", "guia", "primeiros passos"],
    steps: [
      {
        title: "Bem-vindo ao UmbralTable",
        body: [
          "UmbralTable é uma mesa virtual (VTT) focada em imersão e facilidade.",
          "Você pode criar campanhas como Mestre (GM) ou participar como Jogador.",
        ],
        cta: { label: "Ir para Início", to: "/" },
      },
      {
        title: "Criando seu Personagem",
        body: [
          "Vá até a aba 'Personagens' e clique em '+ Novo'.",
          "Preencha os atributos, classe e faça o upload do seu avatar.",
        ],
        cta: { label: "Criar Personagem", to: "/personagem" },
      },
    ],
  },
  {
    id: "create-campaign",
    title: "Como criar uma campanha",
    summary: "Crie sua mesa, configure o sistema e convide jogadores.",
    trail: "campaign",
    category: "mesa",
    profiles: ["gm"],
    tags: ["campanha", "mesa", "criar"],
    steps: [
      {
        title: "Criando a Mesa",
        body: [
          "No menu 'Campanhas', clique no botão de criar.",
          "Defina um nome épico e uma descrição para seus jogadores.",
        ],
      },
      {
        title: "Convidando Jogadores",
        body: [
          "Dentro da campanha, use o botão 'Convidar' para buscar usuários pelo nome.",
          "Eles receberão uma notificação para aceitar o convite.",
        ],
      },
    ],
  },
  {
    id: "join-campaign",
    title: "Como entrar em uma campanha",
    summary: "Entre via convite, campanha pública ou solicitação.",
    trail: "campaign",
    category: "entrar",
    profiles: ["player"],
    tags: ["campanha", "entrar", "convite"],
    steps: [
      {
        title: "Aceitando Convites",
        body: [
          "Se um mestre te convidou, o convite aparecerá na tela 'Campanhas' ou em 'Amigos'.",
          "Clique em 'Aceitar' para ter acesso à sessão.",
        ],
      },
    ],
  },
];

// Função auxiliar usada pelo Modal e pelo App.jsx
export function getSuggestedArticles(path, limit = 3) {
  // Normaliza o path (ex: "/session/123" vira "/session")
  const cleanPath = path === "/" ? "home" : path.split("/")[1];

  // Mapa de sugestões por rota
  const map = {
    home: ["guide-start", "create-campaign"],
    personagem: ["guide-start"],
    campanhas: ["create-campaign", "join-campaign"],
    session: ["guide-start"],
  };

  const ids = map[cleanPath] || [];
  
  // Retorna os objetos completos dos artigos sugeridos
  return HELP_ARTICLES.filter((a) => ids.includes(a.id)).slice(0, limit);
}