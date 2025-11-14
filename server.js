require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '50mb' }));

// Pool de conexões otimizado
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Teste de conexão inicial
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erro ao conectar:', err);
  } else {
    console.log('Supabase Conectado:', res.rows[0].now);
  }
});

// Health check endpoint (para keep-alive)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Página inicial
app.get('/', (req, res) => {
  res.send(`
    <h1>Webhook WaSpeed Ativo</h1>
    <p>Status: Supabase Conectado</p>
    <p>Uptime: ${process.uptime().toFixed(0)}s</p>
    <p>Endpoints:</p>
    <ul>
      <li>POST /webhook/mensagens - Recebe mensagens WhatsApp</li>
      <li>POST /webhook/crm - Recebe eventos CRM</li>
      <li>GET /health - Health check</li>
    </ul>
  `);
});

// Webhook de mensagens - RESPOSTA RÁPIDA
app.post('/webhook/mensagens', async (req, res) => {
  const dados = req.body;
  
  // RESPONDE IMEDIATAMENTE (200ms)
  res.status(200).json({ status: 'received', timestamp: new Date().toISOString() });
  
  // Processa em background
  setImmediate(async () => {
    try {
      console.log('[WEBHOOK] Mensagem recebida!');
      console.log('[DEBUG] Body:', JSON.stringify(dados).substring(0, 200) + '...');

      const message_id = dados.eventDetails?.id?.id || null;
      const message_serialized = dados.eventDetails?.id?._serialized || null;
      const timestamp_unix = dados.eventDetails?.t || dados.eventDetails?.timestamp || 0;
      const received_at = new Date().toISOString();
      const contact_name = dados.name || null;
      const contact_number = dados.number || null;
      const from_number = dados.eventDetails?.from || null;
      const to_number = dados.eventDetails?.to || null;
      const is_group = (dados.number || '').includes('@g.us');
      const group_id = is_group ? dados.number : null;
      const author_number = dados.eventDetails?.author?._serialized || null;
      const notify_name = dados.eventDetails?.notifyName || null;
      const message_type = dados.eventDetails?.type || dados.lastMessage?.type || 'text';
      const body_text = dados.eventDetails?.body || null;
      const body_size = body_text ? body_text.length : 0;
      const ack_status = dados.eventDetails?.ack || 0;
      const from_me = dados.eventDetails?.id?.fromMe || false;
      const is_new_msg = dados.eventDetails?.isNewMsg || false;
      const viewed = dados.eventDetails?.viewed || false;
      const starred = dados.eventDetails?.star || false;
      const media_mimetype = dados.eventDetails?.mimetype || null;
      const media_size = dados.eventDetails?.size || null;
      const media_width = dados.eventDetails?.width || null;
      const media_height = dados.eventDetails?.height || null;
      const media_url = dados.eventDetails?.deprecatedMms3Url || null;
      const media_direct_path = dados.eventDetails?.directPath || null;
      const media_key = dados.eventDetails?.mediaKey || null;
      const file_hash = dados.eventDetails?.filehash || null;
      const is_reply = dados.eventDetails?.parentMsgKey?.id ? true : false;
      const parent_msg_id = dados.eventDetails?.parentMsgKey?.id || null;
      const parent_msg_serialized = dados.eventDetails?.parentMsgKey?._serialized || null;
      const has_reaction = dados.eventDetails?.hasReaction || false;
      const is_forwarded = dados.eventDetails?.isForwarded || false;
      const mentioned_users = dados.eventDetails?.mentionedJidList || [];
      const is_view_once = dados.eventDetails?.isViewOnce || false;
      const is_avatar = dados.eventDetails?.isAvatar || false;
      const is_video_call = dados.eventDetails?.isVideoCall || false;
      const call_duration = dados.eventDetails?.callDuration || null;
      const labels = dados.labels || [];
      const unread_count = dados.unreadMessages || 0;
      const user_assigned = dados.user || null;
      const perfil_contato = dados.perfilContato || null;
      const event_id = dados.eventID || null;
      const client_received_ts = dados.eventDetails?.clientReceivedTsMillis || null;
      const last_update_ts = dados.eventDetails?.lastUpdateFromServerTs || null;

      await pool.query(`INSERT INTO mensagens (message_id, message_serialized, timestamp_unix, received_at, contact_name, contact_number, from_number, to_number, is_group, group_id, author_number, notify_name, message_type, body_text, body_size, ack_status, from_me, is_new_msg, viewed, starred, media_mimetype, media_size, media_width, media_height, media_url, media_direct_path, media_key, file_hash, is_reply, parent_msg_id, parent_msg_serialized, has_reaction, is_forwarded, mentioned_users, is_view_once, is_avatar, is_video_call, call_duration, labels, unread_count, user_assigned, perfil_contato, event_id, client_received_ts, last_update_ts, dados_completos) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46) ON CONFLICT (message_serialized) DO UPDATE SET ack_status = EXCLUDED.ack_status, viewed = EXCLUDED.viewed, starred = EXCLUDED.starred, has_reaction = EXCLUDED.has_reaction`, [message_id, message_serialized, timestamp_unix, received_at, contact_name, contact_number, from_number, to_number, is_group, group_id, author_number, notify_name, message_type, body_text, body_size, ack_status, from_me, is_new_msg, viewed, starred, media_mimetype, media_size, media_width, media_height, media_url, media_direct_path, media_key, file_hash, is_reply, parent_msg_id, parent_msg_serialized, has_reaction, is_forwarded, mentioned_users, is_view_once, is_avatar, is_video_call, call_duration, JSON.stringify(labels), unread_count, user_assigned, JSON.stringify(perfil_contato), event_id, client_received_ts, last_update_ts, JSON.stringify(dados)]);

      await pool.query(`INSERT INTO contatos (numero, nome, is_group, user_assigned, labels, perfil, ultima_mensagem, ultima_interacao) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) ON CONFLICT (numero) DO UPDATE SET nome = COALESCE(EXCLUDED.nome, contatos.nome), user_assigned = COALESCE(EXCLUDED.user_assigned, contatos.user_assigned), labels = EXCLUDED.labels, ultima_mensagem = NOW(), ultima_interacao = NOW(), total_mensagens = contatos.total_mensagens + 1, mensagens_enviadas = contatos.mensagens_enviadas + CASE WHEN $7 THEN 1 ELSE 0 END, mensagens_recebidas = contatos.mensagens_recebidas + CASE WHEN $7 THEN 0 ELSE 1 END, atualizado_em = NOW()`, [contact_number, contact_name, is_group, user_assigned, JSON.stringify(labels), JSON.stringify(perfil_contato), from_me]);

      console.log('[SUCESSO] Mensagem salva:', message_serialized);
    } catch (error) {
      console.error('[ERRO]', error.message);
    }
  });
});

// Webhook CRM - RESPOSTA RÁPIDA
app.post('/webhook/crm', async (req, res) => {
  const dados = req.body;
  
  // RESPONDE IMEDIATAMENTE
  res.status(200).json({ status: 'received', timestamp: new Date().toISOString() });
  
  // Processa em background
  setImmediate(async () => {
    try {
      console.log('[WEBHOOK] CRM recebido!');
      
      const event_id = dados.eventDetails?.id || null;
      const event_type = dados.eventDetails?.type || null;
      const received_at = new Date().toISOString();
      const contact_name = dados.name || null;
      const contact_number = dados.number || null;
      const user_assigned = dados.user || null;
      const labels = dados.labels || [];
      const label_names = labels.map(l => l.name);
      const label_count = labels.length;
      const unread_messages = dados.unreadMessages || 0;
      const last_message_type = dados.lastMessage?.type || null;
      const last_message_timestamp = dados.lastMessage?.timestamp || null;
      const perfil_contato = dados.perfilContato || null;

      await pool.query(`INSERT INTO eventos_crm (event_id, event_type, received_at, contact_name, contact_number, user_assigned, labels, label_names, label_count, unread_messages, last_message_type, last_message_timestamp, perfil_contato, dados_completos) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [event_id, event_type, received_at, contact_name, contact_number, user_assigned, JSON.stringify(labels), label_names, label_count, unread_messages, last_message_type, last_message_timestamp, JSON.stringify(perfil_contato), JSON.stringify(dados)]);

      if (contact_number) {
        await pool.query(`INSERT INTO contatos (numero, nome, user_assigned, labels, perfil, ultima_interacao) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (numero) DO UPDATE SET nome = COALESCE(EXCLUDED.nome, contatos.nome), user_assigned = COALESCE(EXCLUDED.user_assigned, contatos.user_assigned), labels = EXCLUDED.labels, perfil = EXCLUDED.perfil, ultima_interacao = NOW(), atualizado_em = NOW()`, [contact_number, contact_name, user_assigned, JSON.stringify(labels), JSON.stringify(perfil_contato)]);
      }

      console.log('[SUCESSO] Evento CRM salvo:', event_type);
    } catch (error) {
      console.error('[ERRO CRM]', error.message);
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
