import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';

// Load environment variables from .env
config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const port = process.env.PORT || 3000;

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve root page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Optional routes
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// OpenAI client initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting for OpenAI endpoint
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: 'Too many requests, please try again later to help save the planet 🌍'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Track total chats for dashboard
let totalChatsToday = 0;

// OpenAI chat API
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

    totalChatsToday++;
    io.emit('chatStatsUpdated', totalChatsToday);

    res.json({ reply });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'OpenAI API error' });
  }
});

// --- Live user tracking using Set ---
const activeConnections = new Set();

io.on('connection', (socket) => {
  activeConnections.add(socket.id);
  console.log(`🔌 User connected: ${socket.id} | Active: ${activeConnections.size}`);
  io.emit('usersUpdated', activeConnections.size);

  socket.on('disconnect', () => {
    activeConnections.delete(socket.id);
    console.log(`❌ User disconnected: ${socket.id} | Active: ${activeConnections.size}`);
    io.emit('usersUpdated', activeConnections.size);
  });
});

// Start HTTP server
server.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
