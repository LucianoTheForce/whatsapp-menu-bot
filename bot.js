const axios = require('axios');
const express = require('express');
const crypto = require('crypto');

// Configurações via variáveis de ambiente
const API_BASE = process.env.OPENWA_API_URL || 'http://localhost:2785/api';
const API_KEY = process.env.OPENWA_API_KEY || 'dev-admin-key';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'webhook-secret-123';
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : `http://localhost:${PORT}`;

const app = express();

// Middleware
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

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

// Verificar assinatura do webhook
function verifyWebhookSignature(payload, signature) {
  // Temporariamente desabilitado para debug
  console.log('📨 Webhook recebido:', {
    signature: signature,
    event: payload.event,
    hasData: !!payload.data
  });
  return true; // Aceitar todos por enquanto
  
  /*
  if (!signature || !WEBHOOK_SECRET) return true; // Skip if no secret configured
  
  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
  */
}

// Processar evento do webhook
async function processarEvento(event) {
  console.log('🎯 Processando evento:', event.event);
  
  if (event.event === 'message.received') {
    const msg = event.data;
    console.log('📩 Mensagem recebida:', {
      id: msg.id,
      from: msg.from,
      body: msg.body,
      type: msg.type,
      fromMe: msg.fromMe
    });
    
    // Evitar duplicatas
    if (processedMessages.has(msg.id)) {
      console.log('⚠️  Mensagem duplicada, ignorando');
      return;
    }
    processedMessages.add(msg.id);
    
    // Processar mensagens de texto ou chat não enviadas por nós
    if ((msg.type === 'text' || msg.type === 'chat') && msg.body && !msg.fromMe) {
      await processarMensagem(msg);
    } else {
      console.log('⚠️  Mensagem ignorada:', {
        type: msg.type,
        hasBody: !!msg.body,
        fromMe: msg.fromMe
      });
    }
  }
}

// Processar mensagem
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
      // Corrigir formato do chatId
      let chatId = from;
      if (!from.includes('@')) {
        chatId = `${from}@c.us`;
      } else if (from.includes('@lid')) {
        // Manter como está para grupos/listas
        chatId = from;
      }
      
      console.log(`📤 Enviando resposta para: ${chatId}`);
      await enviarMensagem(msg.sessionId, chatId, resposta);
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
}

// Enviar mensagem
async function enviarMensagem(sessionId, to, text) {
  try {
    const response = await axios.post(
      `${API_BASE}/sessions/${sessionId}/messages/send-text`,
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

// Rota do webhook
app.post('/webhook', (req, res) => {
  try {
    const signature = req.headers['x-openwa-signature'];
    
    // Verificar assinatura
    if (!verifyWebhookSignature(req.body, signature)) {
      console.log('❌ Assinatura inválida do webhook');
      return res.status(401).send('Invalid signature');
    }
    
    // Processar evento
    processarEvento(req.body).catch(error => {
      console.error('Erro ao processar evento:', error);
    });
    
    // Responder rapidamente
    res.status(200).json({ status: 'received' });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Internal server error');
  }
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    webhook_url: `${PUBLIC_URL}/webhook`
  });
});

// Rota root
app.get('/', (req, res) => {
  res.json({
    service: 'WhatsApp Menu Bot',
    status: 'running',
    webhook_endpoint: '/webhook',
    health_endpoint: '/health'
  });
});

// Registrar webhook nas sessões ativas
async function registrarWebhooks() {
  try {
    const response = await axios.get(`${API_BASE}/sessions`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    const sessions = response.data;
    const activeSessions = sessions.filter(s => s.status === 'ready' || s.status === 'CONNECTED');
    
    for (const session of activeSessions) {
      try {
        console.log(`📡 Registrando webhook para sessão: ${session.id}`);
        
        await axios.post(
          `${API_BASE}/sessions/${session.id}/webhooks`,
          {
            url: `${PUBLIC_URL}/webhook`,
            events: [
              'message.received',
              'session.status'
            ],
            secret: WEBHOOK_SECRET,
            headers: {
              'X-Bot-Name': 'menu-bot'
            }
          },
          {
            headers: {
              'X-API-Key': API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✅ Webhook registrado para sessão: ${session.id}`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`ℹ️  Webhook já existe para sessão: ${session.id}`);
        } else {
          console.error(`❌ Erro ao registrar webhook para ${session.id}:`, error.response?.data || error.message);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao buscar sessões:', error.response?.data || error.message);
  }
}

// Iniciar servidor
async function iniciarBot() {
  console.log('🤖 Iniciando WhatsApp Menu Bot...');
  console.log(`🔗 API: ${API_BASE}`);
  console.log(`🌍 Public URL: ${PUBLIC_URL}`);
  console.log(`🔐 Webhook Secret: ${WEBHOOK_SECRET ? 'Configurado' : 'Não configurado'}`);
  
  // Iniciar servidor HTTP
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 Webhook endpoint: ${PUBLIC_URL}/webhook`);
    
    // Registrar webhooks após o servidor iniciar
    // setTimeout(registrarWebhooks, 5000); // Desabilitado temporariamente
  });
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