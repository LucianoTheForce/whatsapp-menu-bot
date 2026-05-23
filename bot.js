const axios = require('axios');

// Configurações via variáveis de ambiente
const API_BASE = process.env.OPENWA_API_URL || 'http://localhost:2785/api';
const API_KEY = process.env.OPENWA_API_KEY || 'dev-admin-key';

// Menu principal
const MENU_PRINCIPAL = `🤖 *Menu de Opções*

Digite o número da opção desejada:

1️⃣ - Informações da empresa
2️⃣ - Nossos produtos/serviços  
3️⃣ - Horário de funcionamento
4️⃣ - Falar com atendente
5️⃣ - Localização

_Digite apenas o número (ex: 1)_`;

// Respostas para cada opção
const RESPOSTAS = {
  '1': `ℹ️ *Informações da Empresa*
  
Somos uma empresa especializada em soluções digitais e atendimento automatizado.
Oferecemos serviços de qualidade com tecnologia de ponta.

Digite *menu* para voltar ao menu principal.`,

  '2': `🛍️ *Nossos Produtos/Serviços*

• Chatbot WhatsApp - R$ 299/mês
• Automação de processos - R$ 599/mês  
• Integração de sistemas - R$ 899/mês
• Consultoria digital - R$ 150/hora

Para mais detalhes digite *menu* para voltar.`,

  '3': `🕒 *Horário de Funcionamento*

Segunda a Sexta: 8h às 18h
Sábado: 8h às 12h
Domingo: Fechado

Nosso bot funciona 24h por dia! 🤖

Digite *menu* para voltar ao menu principal.`,

  '4': `👥 *Atendimento Humano*

Um de nossos atendentes entrará em contato em breve!
Horário de atendimento: Segunda a Sexta, 8h às 18h

Enquanto isso, posso te ajudar com informações básicas.

Digite *menu* para voltar ao menu principal.`,

  '5': `📍 *Nossa Localização*

Endereço Virtual
Atendimento Online
Brasil

💻 Atendemos todo território nacional via WhatsApp!

Digite *menu* para voltar ao menu principal.`
};

let processedMessages = new Set();
let currentSessionId = null;

// Função para buscar mensagens
async function buscarMensagens() {
  if (!currentSessionId) {
    await encontrarSessaoAtiva();
    return;
  }

  try {
    const response = await axios.get(
      `${API_BASE}/sessions/${currentSessionId}/messages`,
      {
        headers: {
          'X-API-Key': API_KEY
        },
        params: {
          limit: 10
        }
      }
    );

    const messages = response.data.messages || response.data;
    
    // Processar apenas mensagens novas recebidas (não enviadas por nós)  
    for (const msg of messages) {
      if (
        !processedMessages.has(msg.id) && 
        !msg.fromMe && 
        msg.type === 'text' &&
        msg.body
      ) {
        processedMessages.add(msg.id);
        await processarMensagem(msg);
      }
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`⚠️  Sessão "${currentSessionId}" não encontrada. Buscando nova sessão...`);
      currentSessionId = null;
    } else if (error.response?.status === 429) {
      console.log('⚠️  Rate limit atingido, aguardando...');
    } else {
      console.error('Erro ao buscar mensagens:', error.response?.data || error.message);
    }
  }
}

// Função para encontrar sessão ativa
async function encontrarSessaoAtiva() {
  try {
    const response = await axios.get(
      `${API_BASE}/sessions`,
      {
        headers: {
          'X-API-Key': API_KEY
        }
      }
    );
    
    const sessions = response.data;
    const activeSessions = sessions.filter(s => s.status === 'ready' || s.status === 'CONNECTED');
    
    if (activeSessions.length > 0) {
      currentSessionId = activeSessions[0].id;
      console.log(`✅ Sessão ativa encontrada: ${currentSessionId}`);
      return true;
    } else {
      console.log('❌ Nenhuma sessão ativa encontrada');
      console.log('📋 Sessões disponíveis:', sessions.map(s => `${s.id} (${s.status})`));
      return false;
    }
  } catch (error) {
    console.error('Erro ao buscar sessões:', error.response?.data || error.message);
    return false;
  }
}

// Função para processar mensagem
async function processarMensagem(msg) {
  try {
    const from = msg.from;
    const message = msg.body.toLowerCase().trim();
    
    console.log(`📨 Mensagem de ${from}: ${msg.body}`);
    
    let resposta = '';
    
    // Verificar o conteúdo da mensagem
    if (['1', '2', '3', '4', '5'].includes(message)) {
      resposta = RESPOSTAS[message];
    } else {
      // Para qualquer outra mensagem, mostrar o menu
      resposta = MENU_PRINCIPAL;
    }
    
    // Enviar resposta
    if (resposta) {
      const chatId = from.includes('@') ? from : `${from}@c.us`;
      await enviarMensagem(chatId, resposta);
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
}

// Função para enviar mensagem
async function enviarMensagem(to, text) {
  try {
    const response = await axios.post(
      `${API_BASE}/sessions/${currentSessionId}/messages/send-text`,
      { chatId: to, text },
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Enviado para ${to}: ${text.substring(0, 50)}...`);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao enviar:', error.response?.data || error.message);
    throw error;
  }
}

// Iniciar bot
async function iniciarBot() {
  console.log('🤖 Iniciando WhatsApp Menu Bot...');
  console.log(`🔗 API: ${API_BASE}`);
  
  // Buscar sessão ativa
  const sessaoEncontrada = await encontrarSessaoAtiva();
  
  if (!sessaoEncontrada) {
    console.log('⚠️  Nenhuma sessão WhatsApp conectada. Aguardando...');
  }
  
  console.log('🚀 Bot iniciado! Aguardando mensagens...');
  
  // Polling a cada 15 segundos
  setInterval(buscarMensagens, 15000);
}

// Tratar encerramento
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando bot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Encerrando bot...');
  process.exit(0);
});

// Iniciar
iniciarBot();