import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';

config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiter: max 10 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // limit each IP to 10 requests per window
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
