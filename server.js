require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Erro ao conectar:', err.stack);
  } else {
    console.log('Conectado ao Supabase!');
    release();
  }
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Muitas requisicoes deste IP'
});

app.use('/webhook/', limiter);

let webhooks = [];

async function atualizarContato(dados) {
  try {
    await pool.query(`
      INSERT INTO contatos (numero, nome, usuario_crm, labels, ultima_interacao, dados_completos)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      ON CONFLICT (numero) 
      DO UPDATE SET
        nome = EXCLUDED.nome,
        labels = EXCLUDED.labels,
        ultima_interacao = NOW(),
        total_mensagens = contatos.total_mensagens + 1,
        updated_at = NOW()
    `, [dados.number, dados.name, dados.user, JSON.stringify(dados.labels || []), JSON.stringify(dados)]);
  } catch (error) {
    console.error('Erro ao atualizar contato:', error.message);
  }
}

async function salvarMensagem(dados) {
  try {
    const msg = dados.eventDetails;
    const timestamp = msg.t || Math.floor(Date.now() / 1000);
    const dataMensagem = new Date(timestamp * 1000);
    
    await pool.query(`
      INSERT INTO mensagens (
        message_id, numero_contato, nome_contato, texto_mensagem, tipo_mensagem, 
        timestamp_mensagem, data_mensagem, is_from_me, usuario_crm, dados_completos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (message_id) DO NOTHING
    `, [
      msg.id?._serialized || msg.id || `msg_${Date.now()}`,
      dados.number, dados.name, msg.body || '', msg.type, timestamp,
      dataMensagem, msg.id?.fromMe || false, dados.user, JSON.stringify(dados)
    ]);
    
    await atualizarContato(dados);
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error.message);
  }
}

async function salvarEventoCRM(dados) {
  try {
    const crm = dados.eventDetails;
    await pool.query(`
      INSERT INTO eventos_crm (
        numero_contato, nome_contato, evento_tipo, evento_nome, labels, usuario_crm, dados_completos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [dados.number, dados.name, crm.type, crm.name, JSON.stringify(dados.labels || []), dados.user, JSON.stringify(dados)]);
    
    await atualizarContato(dados);
  } catch (error) {
    console.error('Erro ao salvar evento CRM:', error.message);
  }
}

app.post('/webhook/mensagens', async (req, res) => {
  try {
    console.log('[WEBHOOK] Mensagem recebida!');
    req.body.eventID = 'messages';
    const dadosCompletos = { ...req.body, receivedAt: new Date() };
    webhooks.push(dadosCompletos);
    await salvarMensagem(dadosCompletos);
    return res.status(200).json({ success: true, message: 'Webhook processado' });
  } catch (error) {
    console.error('[ERRO]', error);
    return res.status(200).json({ success: false, error: error.message });
  }
});

app.post('/webhook/crm', async (req, res) => {
  try {
    console.log('[WEBHOOK] CRM recebido!');
    req.body.eventID = 'crm';
    const dadosCompletos = { ...req.body, receivedAt: new Date() };
    webhooks.push(dadosCompletos);
    await salvarEventoCRM(dadosCompletos);
    return res.status(200).json({ success: true, message: 'Webhook processado' });
  } catch (error) {
    console.error('[ERRO]', error);
    return res.status(200).json({ success: false, error: error.message });
  }
});

app.post('/webhook/waspeed', async (req, res) => {
  try {
    const dadosCompletos = { ...req.body, receivedAt: new Date() };
    webhooks.push(dadosCompletos);
    if (req.body.eventID === 'messages' && req.body.eventDetails) {
      await salvarMensagem(dadosCompletos);
    } else if (req.body.eventID === 'crm' && req.body.eventDetails) {
      await salvarEventoCRM(dadosCompletos);
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(200).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/resumo', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM vw_resumo_usuarios');
    res.json({ success: true, dados: resultado.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/metricas-30dias', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM vw_metricas_30dias');
    res.json({ success: true, dados: resultado.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/top-contatos', async (req, res) => {
  try {
    const limite = req.query.limite || 50;
    const resultado = await pool.query('SELECT * FROM vw_top_contatos LIMIT $1', [limite]);
    res.json({ success: true, dados: resultado.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/webhooks', async (req, res) => {
  try {
    const mensagens = await pool.query('SELECT * FROM mensagens ORDER BY created_at DESC LIMIT 100');
    const eventos = await pool.query('SELECT * FROM eventos_crm ORDER BY data_evento DESC LIMIT 100');
    res.json({ total: mensagens.rows.length + eventos.rows.length, mensagens: mensagens.rows, eventos_crm: eventos.rows });
  } catch (error) {
    res.json({ total: webhooks.length, dados: webhooks, fonte: 'memoria' });
  }
});

app.get('/webhook/test', (req, res) => {
  res.json({
    status: 'online',
    database: process.env.DATABASE_URL ? 'Configurado' : 'Nao configurado',
    endpoints: {
      mensagens: '/webhook/mensagens',
      crm: '/webhook/crm',
      generico: '/webhook/waspeed'
    }
  });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>CRM Jason</title></head>
    <body>
      <h1>CRM Jason - Sistema Completo</h1>
      <p>Status: ${process.env.DATABASE_URL ? 'Supabase Conectado' : 'Banco nao configurado'}</p>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log('Servidor rodando na porta', PORT);
  console.log('Database:', process.env.DATABASE_URL ? 'Conectado' : 'Nao configurado');
});
