# WhatsApp Menu Bot

Bot de menu automático para WhatsApp usando OpenWA API.

## Funcionalidades

- **Menu automático**: Responde com menu para qualquer mensagem
- **Opções numeradas**: 1-5 para diferentes informações
- **Auto-descoberta**: Encontra sessões WhatsApp conectadas automaticamente
- **Rate limiting**: Tratamento de limites de API
- **Logs detalhados**: Monitoramento em tempo real

## Deploy no Railway

### 1. Variáveis de Ambiente

```
OPENWA_API_URL=https://sua-openwa-api.railway.app/api
OPENWA_API_KEY=dev-admin-key
```

### 2. Estrutura

```
├── bot.js          # Bot principal
├── package.json    # Dependências
└── README.md       # Documentação
```

### 3. Como funciona

1. Bot busca por sessões WhatsApp conectadas
2. Monitora mensagens recebidas a cada 15 segundos
3. Responde automaticamente:
   - Números 1-5: Opções específicas
   - Qualquer outra mensagem: Menu principal

## Configuração Local

```bash
npm install
OPENWA_API_URL=http://localhost:2785/api npm start
```

## Logs

- ✅ Mensagens enviadas com sucesso
- 📨 Mensagens recebidas sendo processadas  
- ⚠️  Warnings de rate limit ou sessões
- ❌ Erros de API ou conexão

---

**Criado para integração com OpenWA API Gateway**