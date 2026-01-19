const axios = require("axios");

// --- CONFIGURAÇÃO DAS URLS DO N8N ---
// Se estiver rodando em Docker, tente usar o nome do serviço "n8n" primeiro.
// Caso contrário, usa a URL externa definida no .env ou o fallback.

const getN8nUrl = (endpoint) => {
  // Tente priorizar a URL interna do Docker se estiverem na mesma rede
  return process.env.N8N_ORACLE_URL || `http://n8n:5678/webhook/${endpoint}`;
};

exports.askOracle = async (req, res) => {
  try {
    const { message, context } = req.body;
    
    // Define a URL para o endpoint "oracle"
    // Tenta conectar via nome do serviço Docker (mais rápido e seguro)
    // Se preferir a URL externa, mude no arquivo .env
    const n8nUrl = getN8nUrl("oracle");

    console.log(`[ORACLE] Tentando conectar em: ${n8nUrl}`);
    console.log(`[ORACLE] Mensagem do usuário: ${message}`);

    const response = await axios.post(n8nUrl, {
      chatInput: message, // O n8n espera "chatInput"
      context: context || "dashboard"
    });

    console.log("[ORACLE] Resposta recebida com sucesso!");

    // Retorna a resposta da IA
    return res.json({ response: response.data.output });

  } catch (error) {
    console.error("========================================");
    console.error("[ORACLE] ERRO DE CONEXÃO:");
    console.error(`Mensagem: ${error.message}`);
    if (error.code) console.error(`Código: ${error.code}`);
    if (error.response) console.error(`Status n8n: ${error.response.status}`);
    console.error("========================================");

    // Resposta amigável para o frontend
    return res.json({ 
      response: "🔮 Os ventos da magia estão agitados e não consigo ouvir os planos superiores agora. (Verifique se o Workflow do n8n está ATIVO e se a URL está correta)" 
    });
  }
};

exports.generateCharacterImage = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "O prompt é obrigatório." });
    }

    // Define a URL para o endpoint de imagem
    // Ajuste "gerar-personagem" conforme o nome da URL no seu n8n
    const n8nImageUrl = getN8nUrl("gerar-personagem");

    console.log(`[IA] Enviando prompt para n8n (${n8nImageUrl}): ${prompt.substring(0, 50)}...`);

    // 1. Chama o n8n
    const response = await axios.post(n8nImageUrl, { prompt });

    // 2. Valida o retorno
    const imageUrl = response.data.url;

    if (!imageUrl) {
      throw new Error("O n8n não retornou uma URL de imagem válida. Verifique o nó de resposta no n8n.");
    }

    console.log("[IA] Sucesso! URL recebida.");

    // 3. Devolve para o Frontend
    return res.json({ url: imageUrl });

  } catch (error) {
    console.error("[IA] Erro na geração de imagem:", error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(502).json({ message: "O n8n parece estar offline ou inacessível." });
    }
    if (error.code === 'ENOTFOUND') {
      return res.status(502).json({ message: "Não foi possível encontrar o servidor do n8n (DNS Error)." });
    }
    
    return res.status(500).json({ message: "Falha ao gerar imagem." });
  }
};