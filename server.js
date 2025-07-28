import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

config();

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: 'Too many requests, please try again later to help save the planet 🌍'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/chat', limiter, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 300,
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'OpenAI API error' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
