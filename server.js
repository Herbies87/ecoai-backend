// server.js (ESM, Express 5-safe)
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

// Trust Render/Proxy headers for correct IPs, HTTPS, etc.
app.set('trust proxy', 1);

// ---- CORS ----
// Set CORS_ORIGINS="https://www.aquavita.io,http://localhost:8080" in Render env
const allowList = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // allow no-origin (curl, health checks) and allowList matches
    if (!origin || allowList.length === 0 || allowList.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked for origin: ' + origin));
  },
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  credentials: false,
  maxAge: 86400
};

// Always vary on Origin so caches don’t poison
app.use((req, res, next) => { res.setHeader('Vary', 'Origin'); next(); });
app.use(cors(corsOptions));
app.options('/api/*', cors(corsOptions)); // preflight for API

// ---- Body parsing ----
app.use(express.json({ limit: '1mb' }));

// ---- Health ----
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ---- Chat proxy to OpenAI ----
app.post('/api/openai/chat', async (req, res) => {
  try {
    const {
      OPENAI_API_KEY,
      OPENAI_CHAT_MODEL = 'gpt-4o-mini',
      OPENAI_TEMPERATURE = '0.7'
    } = process.env;

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'missing_openai_key',
        detail: 'Set OPENAI_API_KEY in your environment.'
      });
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
    res.json({ reply });
  } catch (err) {
    console.error('OpenAI proxy error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// ---- Static files (optional) ----
app.use(express.static(path.join(__dirname, 'public')));

// ---- SPA fallback WITHOUT '*' wildcard (Express 5 safe) ----
// Serve index.html for any GET that isn't an API or a real file.
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/')) return next();
  // If you only want to fallback for “unknown” paths, you can check file existence here.
  return res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) next(); // if index.html missing, continue to 404
  });
});

// ---- 404 for everything else ----
app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.listen(PORT, () => {
  console.log(`Eco-AI server listening on :${PORT}`);
});
