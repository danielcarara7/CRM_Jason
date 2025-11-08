require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Muitas requisicoes deste IP, tente novamente em 1 minuto'
});

app.use('/webhook/', limiter);

let webhooks = [];

// Webhook especifico para MENSAGENS
app.post('/webhook/mensagens', async (req, res) => {
  try {
    console.log('[WEBHOOK] Mensagem recebida!');
    console.log('Nome:', req.body.name);
    console.log('Numero:', req.body.number);
    
    req.body.eventID = 'messages';
    webhooks.push({
      ...req.body,
      receivedAt: new Date()
    });
    
    return res.status(200).json({
      success: true,
      message: 'Webhook de mensagem processado',
      tipo: 'mensagens'
    });
    
  } catch (error) {
    console.error('[ERRO]', error);
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

// Webhook especifico para CRM
app.post('/webhook/crm', async (req, res) => {
  try {
    console.log('[WEBHOOK] CRM recebido!');
    console.log('Nome:', req.body.name);
    console.log('Acao:', req.body.eventDetails?.type);
    
    req.body.eventID = 'crm';
    webhooks.push({
      ...req.body,
      receivedAt: new Date()
    });
    
    return res.status(200).json({
      success: true,
      message: 'Webhook de CRM processado',
      tipo: 'crm'
    });
    
  } catch (error) {
    console.error('[ERRO]', error);
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

// Webhook generico
app.post('/webhook/waspeed', async (req, res) => {
  try {
    console.log('[WEBHOOK] Generico recebido!');
    webhooks.push({
      ...req.body,
      receivedAt: new Date()
    });
    
    return res.status(200).json({
      success: true,
      message: 'Webhook processado'
    });
    
  } catch (error) {
    console.error('[ERRO]', error);
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

// Listar webhooks
app.get('/webhooks', (req, res) => {
  res.json({
    total: webhooks.length,
    dados: webhooks
  });
});

// Rota de teste
app.get('/webhook/test', (req, res) => {
  res.json({
    status: 'online',
    message: 'Servidor de webhooks funcionando!',
    timestamp: new Date().toISOString(),
    endpoints: {
      mensagens: '/webhook/mensagens',
      crm: '/webhook/crm',
      generico: '/webhook/waspeed',
      listar: '/webhooks'
    }
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CRM Jason Webhook System</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #4285f4; }
        .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #4285f4; }
        code { background: #e8eaed; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        .success { color: #0f9d58; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>CRM Jason Webhook System</h1>
        <p class="success">✅ Sistema online e funcionando!</p>
        <h2>Endpoints:</h2>
        <div class="endpoint"><strong>Mensagens:</strong><br><code>POST /webhook/mensagens</code></div>
        <div class="endpoint"><strong>CRM:</strong><br><code>POST /webhook/crm</code></div>
        <div class="endpoint"><strong>Listar dados:</strong><br><code>GET /webhooks</code></div>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log('================================');
  console.log('[OK] Servidor rodando na porta', PORT);
  console.log('[ENDPOINTS]');
  console.log('  POST /webhook/mensagens');
  console.log('  POST /webhook/crm');
  console.log('  GET  /webhooks');
  console.log('================================');
});
