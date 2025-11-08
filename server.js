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
    console.error('❌ Erro ao conectar ao Supabase:', err.stack);
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

let webhooks = [];

// Função para atualizar ou criar contato
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
        total
