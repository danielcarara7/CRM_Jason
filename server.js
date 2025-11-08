require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Conexão com Supabase PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Testar conexão ao iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro ao conectar ao Supabase:', err);
  } else {
    console.log('✅ Conectado ao Supabase PostgreSQL!');
    release();
  }
});

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

let webhooks = []; // Array temporário mantido para compatibilidade

// Função auxiliar para salvar mensagem no banco
async function salvarMensagem(dados) {
  const msg = dados.eventDetails;
  
  await pool.query(`
    INSERT INTO mensagens (
      message_id, numero_contato, nome_contato, 
      texto_mensagem, tipo_mensagem, timestamp_mensagem,
      is_from_me, usuario_crm, dados_completos
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (message_id) DO NOTHING
  `, [
    msg.id?._serialized || msg.id || `msg_${Date.now()}`,
    dados.number,
    dados.name,
    msg.body || '',
    msg.type,
    msg.t,
    msg.id?.fromMe || false,
    dados.user,
    JSON.stringify(dados)
  ]);
}

// Função auxiliar para salvar evento CRM no banco
async function salvarEventoCRM(dados) {
  const crm = dados.eventDetails;
  
  await pool.query(`
    INSERT INTO eventos_crm (
      numero_contato, nome_contato, evento_id,
      evento_tipo, evento_nome, labels,
      usuario_crm, dados_completos
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    dados.number,
    dados.name,
    crm.id,
    crm.type,
    crm.name,
    JSON.stringify(dados.labels || []),
    dados.user,
    JSON.stringify(dados)
  ]);
}

// Webhook especifico para MENSAGENS
app.post('/webhook/mensagens', async (req, res) => {
  try {
    console.log('[WEBHOOK] Mensagem recebida!');
    console.log('Nome:', req.body.name);
    console.log('Numero:', req.body.number);
    
    req.body.eventID = 'messages';
    const dadosCompletos = {
      ...req.body,
      receivedAt: new Date()
    };
    
    webhooks.push(dadosCompletos);
    
    // Salvar no banco de dados
    try {
      await salvarMensagem(dadosCompletos);
      console
