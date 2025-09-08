// server.js (ESM)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

/* ---------------- CORS ---------------- */
const DEFAULT_ORIGINS = [
  'https://www.aquavita.io',
  'https://aquavita.io',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000'
];

const ALLOWLIST = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOWED = ALLOWLIST.length ? ALLOWLIST : DEFAULT_ORIGINS;

// optional: allow any subdomain of aquavita.io
const SUBDOMAIN_RX = /^https?:\/\/([a-z0-9-]+\.)*aquavita\.io(:\d+)?$/i;

const corsOptions = {
  origin(origin, cb) {
    // non-browser or same-origin/curl: allow
    if (!origin) return cb(null, true);
    if (ALLOWED.includes(origin) || SUBDOMAIN_RX.test(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Eco-Mode'],
  maxAge: 86400
};

app.use(cors(corsOptions));
// handle preflight for everything (important!)
app.options('*', cors(corsOptions));

/* ---------------- Parsers ---------------- */
app.use(express.json({ limit: '1mb' }));

/* ---------------- Health ---------------- */
app.get('/healthz', (_req, res) => res.json({ ok: true }));

/* ---------------- Debug (see CORS hits) ---------------- */
app.use('/api/openai', (req, _res, next) => {
  console.log(`[hit] ${req.method} ${req.originalUrl} from ${req.headers.origin || 'no-origin'}`);
  next();
});

/* ---------------- Chat proxy to OpenAI ---------------- */
app.post('/api/openai/chat', async (req, res) => {
  try {
    const {
      OPENAI_API_KEY,
      OPENAI_CHAT_MODEL = 'gpt-4o-mini',
      OPENAI_TEMPERATURE = '0.7'
    } = process.env;

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'missing_openai_key', detail: 'Set OPENAI_API_KEY in your environment.' });
    }

    const { messages = [], eco = true, max_tokens = 800 } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'bad_request', detail: 'messages must be an array' });
    }

    const system = {
      role: 'system',
      content:
        'You are Eco-AI, a helpful assistant focused on sustainability. ' +
        'Explain clearly, highlight benefits of decentralized / renewable-powered AI when relevant, and be concise.' +
        (eco ? ' Prefer greener compute metaphors and briefly explain trade-offs.' : '')
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        temperature: Number(OPENAI_TEMPERATURE) || 0.7,
        max_tokens,
        messages: [system, ...messages]
      })
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({ error: 'openai_error', detail: text || `${r.status} ${r.statusText}` });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? '(no content)';
    res.setHeader('Vary', 'Origin'); // good practice with CORS
    res.json({ reply });
  } catch (err) {
    console.error('OpenAI proxy error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

/* ---------------- Static (optional) ---------------- */
app.use(express.static(path.join(__dirname, 'public')));

// Optional SPA fallback
// app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

/* ---------------- Start ---------------- */
app.listen(PORT, () => {
  console.log(`Eco-AI server listening on :${PORT}`);
});
