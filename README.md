# 🐉 UmbralTable - Virtual Tabletop (VTT)

> Uma plataforma de RPG de mesa virtual imersiva, focada em simplicidade e ambientação Dark Fantasy, potencializada por Inteligência Artificial.

![Project Banner](https://via.placeholder.com/1200x400?text=UmbralTable+VTT)
*(Substitua o link acima por um print da tela inicial do seu projeto)*

## 📖 Sobre o Projeto

O **UmbralTable** é um sistema VTT (Virtual Tabletop) desenvolvido para facilitar a vida de Mestres e Jogadores de RPG. Diferente de outras plataformas complexas, o foco aqui é a imersão e a facilidade de uso, com um assistente de IA integrado (**O Oráculo**) para tirar dúvidas de regras e do sistema em tempo real.

## ✨ Funcionalidades Principais

* **🎲 Sessão em Tempo Real:** Rolagem de dados 3D, chat ao vivo e movimentação de tokens sincronizada via WebSocket.
* **🔮 O Oráculo (AI Agent):** Um assistente inteligente integrado (via **n8n + OpenAI**) que atua como um mago sábio, respondendo dúvidas sobre o sistema e regras de RPG sem sair da tela.
* **🗺️ Gestão de Campanhas:** Criação de mesas, sistema de convites e gestão de jogadores.
* **📜 Fichas de Personagem:** Criação e edição de fichas com suporte a upload de avatares.
* **🎨 Geração de Imagens:** Integração com IA para gerar retratos de personagens baseados na descrição.
* **🌑 Interface Dark Fantasy:** UI moderna construída com Glassmorphism e animações fluidas.

## 🛠️ Tecnologias Utilizadas

### Frontend
* ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) **React.js (Vite)**
* ![Framer Motion](https://img.shields.io/badge/Framer-black?style=for-the-badge&logo=framer&logoColor=blue) **Framer Motion** (Animações)
* ![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101) **Socket.io Client**
* **CSS Modules** (Estilização customizada)

### Backend
* ![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white) **Node.js & Express**
* **Socket.io Server** (Comunicação Real-time)
* **Axios** (Requisições HTTP e integração com IA)

### Inteligência & Infra
* ![n8n](https://img.shields.io/badge/n8n-FF6584?style=for-the-badge&logo=n8n&logoColor=white) **n8n** (Orquestração de IA e Fluxos)
* ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) **Docker & Docker Compose**
* **OpenAI API** (Cérebro do Oráculo)

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
* Node.js (v18+)
* Docker (Opcional, mas recomendado)
* Uma instância do n8n (pode ser local via Docker ou Cloud)

### Opção 1: Rodando com Docker (Recomendado)

1.  Clone o repositório:
    ```bash
    git clone [https://github.com/seu-usuario/umbraltable.git](https://github.com/seu-usuario/umbraltable.git)
    cd umbraltable
    ```

2.  Suba os containers:
    ```bash
    docker-compose up --build
    ```

3.  Acesse:
    * Frontend: `http://localhost:5173` (ou a porta configurada)
    * Backend: `http://localhost:3000`

### Opção 2: Rodando Manualmente

**1. Backend:**
```bash
cd backend
npm install
# Crie um arquivo .env com suas chaves (veja abaixo)
npm run dev
