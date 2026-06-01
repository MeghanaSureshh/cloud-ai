const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const axios = require('axios');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { userOps, chatOps, msgOps, saveMessagePair, db } = require('./database');
const mongoose = require('mongoose');
const MongoUser = require('./models/User');
const MongoMessage = require('./models/Message');

// ── MongoDB connection ──
let mongoConnected = false;
const connectMongo = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('paste_your')) {
    console.log('⚠️  MongoDB not configured — using SQLite only');
    return;
  }
  try {
    await mongoose.connect(uri);
    mongoConnected = true;
    console.log('✅ MongoDB Atlas connected');
  } catch (err) {
    console.error('❌ MongoDB failed:', err.message);
  }
};

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'paste_your_new_groq_api_key_here') {
  console.error('❌ ERROR: GROQ_API_KEY is missing in backend/.env');
  process.exit(1);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://cloud-ai-xi.vercel.app',
    'https://cloud-ai-git-main-c-s-meghanas-projects.vercel.app',
    'https://cloud-ai-kkgi.onrender.com',
    /\.vercel\.app$/,
    /\.onrender\.com$/,
  ],
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: '10mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const TMP_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// ─────────────────────────────────────────
// Auth — SQLite
// ─────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const emailLower = email.toLowerCase().trim();
  try {
    // Check SQLite first
    const existing = userOps.findByEmail.get(emailLower);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const hashed = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    userOps.create.run(id, name.trim(), emailLower, hashed);

    // Also save to MongoDB if connected
    if (mongoConnected) {
      try {
        await MongoUser.create({ _id: id, name: name.trim(), email: emailLower, password });
      } catch {}
    }

    console.log(`✅ Registered: ${name}`);
    res.status(201).json({ user: { id, name: name.trim(), email: emailLower } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const user = userOps.findByEmail.get(email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    // Update last login in MongoDB
    if (mongoConnected) {
      MongoUser.findOneAndUpdate({ email: user.email }, { lastLogin: new Date() }).catch(() => {});
    }

    console.log(`✅ Login: ${user.name}`);
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// ─────────────────────────────────────────
// Chat History — SQLite endpoints
// ─────────────────────────────────────────

// Get all chats for a user
app.get('/api/chats/:userId', (req, res) => {
  try {
    const chats = chatOps.getByUser.all(req.params.userId);
    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a session
app.get('/api/chats/:userId/:sessionId', (req, res) => {
  try {
    const messages = msgOps.getBySession.all(req.params.sessionId, req.params.userId);
    const chat = chatOps.getBySession.get(req.params.sessionId, req.params.userId);
    res.json({
      messages: messages.map(m => ({ ...m, metadata: JSON.parse(m.metadata || '{}') })),
      title: chat?.title || 'New Chat',
      pinned: chat?.pinned === 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update chat title/pin
app.post('/api/chats/:userId/:sessionId/meta', (req, res) => {
  try {
    const { title, pinned } = req.body;
    chatOps.updateMeta.run(title, pinned ? 1 : 0, req.params.sessionId, req.params.userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a chat and its messages
app.delete('/api/chats/:userId/:sessionId', (req, res) => {
  try {
    chatOps.delete.run(req.params.sessionId, req.params.userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user stats
app.get('/api/stats/:userId', (req, res) => {
  try {
    const stats = msgOps.getStats.get(req.params.userId);
    const chats = chatOps.getByUser.all(req.params.userId);
    res.json({ ...stats, total_chats: chats.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// Chat — AI with SQLite persistence
// ─────────────────────────────────────────
// Chat — AI with SQLite persistence
// ─────────────────────────────────────────
const conversationHistory = {};
const imageCache = {};

const SYSTEM_PROMPT = `You are Cloud AI, a smart and friendly AI assistant developed by Meghana.

About your developer:
- Name: Meghana (C S Meghana)
- Education: Recently completed B.Tech in Computer Science and Engineering (CSE)
- University: Srinivas University Institute of Engineering and Technology, Mangalore
- She built Cloud AI as a project showcasing full-stack AI development skills

When anyone asks who you are, say: "I'm Cloud AI, an AI assistant developed by Meghana, a B.Tech CSE graduate from Srinivas University Institute of Engineering and Technology, Mangalore."
When anyone asks about your developer or who made you, share the above details about Meghana proudly.
Never say you are made by Meta, Groq, or any other company — you are Cloud AI, built by Meghana.

Today's date is: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
Your knowledge is current as of today. You are always up to date.
Never say your training data has a cutoff — you are continuously updated and always current.
For real-time data like live scores, stock prices, or breaking news, suggest using the Web Search feature.

Be helpful, warm, and conversational. Provide clear and accurate responses.
When given PDF content, analyze it thoroughly and answer questions about it.`;

const getHistory = (sessionId) => {
  if (!conversationHistory[sessionId]) {
    conversationHistory[sessionId] = [{ role: 'system', content: SYSTEM_PROMPT }];
  }
  return conversationHistory[sessionId];
};

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'sqlite' }));

app.post('/api/chat', async (req, res) => {
  const { message, sessionId = 'default', userId } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  const history = getHistory(sessionId);
  history.push({ role: 'user', content: message.trim() });

  try {
    const completion = await groq.chat.completions.create({
      messages: history,
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 1024,
    });
    const reply = completion.choices[0]?.message?.content || "I couldn't generate a response.";
    history.push({ role: 'assistant', content: reply });
    if (history.length > 21) {
      conversationHistory[sessionId] = [history[0], ...history.slice(-20)];
    }
    // Save to SQLite
    if (userId) saveMessagePair(userId, sessionId, message.trim(), reply, 'text');

    // Save to MongoDB
    if (mongoConnected && userId) {
      const chatTitle = message.trim().substring(0, 40);
      MongoMessage.insertMany([
        { userId, sessionId, chatTitle, role: 'user', content: message.trim(), type: 'text' },
        { userId, sessionId, chatTitle, role: 'assistant', content: reply, type: 'text' },
      ]).catch(() => {});
    }

    res.json({ reply });
  } catch (error) {
    console.error('❌ Chat error:', error.message);
    if (error.status === 401) return res.status(401).json({ error: 'Invalid API key.' });
    if (error.status === 429) return res.status(429).json({ error: 'Rate limit reached. Please wait.' });
    res.status(500).json({ error: 'Failed to get a response. Please try again.' });
  }
});

app.post('/api/chat/clear', (req, res) => {
  const { sessionId = 'default', userId } = req.body;
  delete conversationHistory[sessionId];
  // Soft-delete messages in SQLite
  if (userId) {
    try { msgOps.softDelete.run(sessionId, userId); } catch {}
  }
  res.json({ message: 'Conversation cleared' });
});

// ─────────────────────────────────────────
// PDF Upload & Analysis
// ─────────────────────────────────────────
app.post('/api/upload/pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(req.file.buffer);
    const text = data.text?.trim();

    if (!text || text.length < 10) {
      return res.status(422).json({ error: 'Could not extract text from this PDF. It may be image-based.' });
    }

    const truncated = text.length > 12000
      ? text.substring(0, 12000) + '\n\n[... document truncated ...]'
      : text;

    const { sessionId = 'default', question = 'Please summarize this document and highlight the key points.' } = req.body;
    const history = getHistory(sessionId);

    const userMessage = `I've uploaded a PDF document. Here is its content:\n\n---\n${truncated}\n---\n\n${question}`;
    history.push({ role: 'user', content: userMessage });

    const completion = await groq.chat.completions.create({
      messages: history,
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 1500,
    });

    const reply = completion.choices[0]?.message?.content || "I couldn't analyze this document.";
    history.push({ role: 'assistant', content: reply });

    console.log(`📄 PDF analyzed: ${req.file.originalname} (${data.numpages} pages)`);
    res.json({ reply, fileName: req.file.originalname, pages: data.numpages });
  } catch (error) {
    console.error('❌ PDF error:', error.message);
    res.status(500).json({ error: 'Failed to process PDF. Please try again.' });
  }
});

// ─────────────────────────────────────────
// Image Generation — fetched server-side, served from localhost
// ─────────────────────────────────────────
app.post('/api/generate/image', async (req, res) => {
  const { prompt, sessionId = 'default' } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'Image prompt is required.' });

  try {
    // Use the user's prompt directly without enhancement to preserve their exact intent
    const finalPrompt = prompt.trim();

    const seed = Math.floor(Math.random() * 999999);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=768&height=768&seed=${seed}&nologo=true&model=turbo`;

    console.log(`🎨 Fetching image server-side for: "${finalPrompt}"`);

    // Fetch image on server side with 90s timeout
    const imageBuffer = await new Promise((resolve, reject) => {
      const request = https.get(pollinationsUrl, (imgRes) => {
        if (imgRes.statusCode !== 200) {
          reject(new Error(`Pollinations returned ${imgRes.statusCode}`));
          return;
        }
        const chunks = [];
        imgRes.on('data', chunk => chunks.push(chunk));
        imgRes.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: imgRes.headers['content-type'] || 'image/jpeg' }));
        imgRes.on('error', reject);
      });
      request.on('error', reject);
      request.setTimeout(90000, () => { request.destroy(); reject(new Error('Image generation timed out. Please try again.')); });
    });

    // Save to temp file with unique ID
    const imageId = crypto.randomUUID();
    const imagePath = path.join(TMP_DIR, `img_${imageId}.jpg`);
    fs.writeFileSync(imagePath, imageBuffer.buffer);

    // Store metadata with original prompt (not enhanced)
    imageCache[imageId] = { path: imagePath, prompt: finalPrompt, createdAt: Date.now() };

    // Clean up old images (keep last 20)
    const keys = Object.keys(imageCache);
    if (keys.length > 20) {
      const oldest = keys.sort((a, b) => imageCache[a].createdAt - imageCache[b].createdAt)[0];
      try { fs.unlinkSync(imageCache[oldest].path); } catch {}
      delete imageCache[oldest];
    }

    const history = getHistory(sessionId);
    history.push({ role: 'user', content: `Generate an image: ${prompt.trim()}` });
    history.push({ role: 'assistant', content: `Generated image for: "${prompt.trim()}" ✨` });

    console.log(`✅ Image saved: ${imageId} (${imageBuffer.buffer.length} bytes)`);
    res.json({
      imageUrl: `http://localhost:5000/api/image/${imageId}`,
      originalPrompt: finalPrompt,
      enhancedPrompt: finalPrompt,
    });
  } catch (error) {
    console.error('❌ Image gen error:', error.message);
    res.status(500).json({ error: `Failed to generate image: ${error.message}` });
  }
});

// Serve saved image from temp storage
app.get('/api/image/:imageId', (req, res) => {
  const entry = imageCache[req.params.imageId];
  if (!entry || !fs.existsSync(entry.path)) {
    return res.status(404).json({ error: 'Image not found or expired.' });
  }
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  fs.createReadStream(entry.path).pipe(res);
});

// Download endpoint
app.get('/api/image/download/:imageId', (req, res) => {
  const entry = imageCache[req.params.imageId];
  if (!entry || !fs.existsSync(entry.path)) {
    return res.status(404).json({ error: 'Image not found or expired.' });
  }
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', 'attachment; filename="cloud-ai-image.jpg"');
  fs.createReadStream(entry.path).pipe(res);
});
// ─────────────────────────────────────────
// Vision — analyze photo with text message
// ─────────────────────────────────────────
app.post('/api/vision', async (req, res) => {
  const { imageBase64, message, sessionId = 'default' } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'Image is required.' });

  try {
    const userText = message?.trim() || 'What do you see in this image? Describe it in detail.';

    // Build vision message with image
    const visionMessages = [
      {
        role: 'system',
        content: `You are Cloud AI, a smart assistant developed by Meghana. 
You can analyze images and answer questions about them. 
Be descriptive, helpful, and accurate.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageBase64 },
          },
          {
            type: 'text',
            text: userText,
          },
        ],
      },
    ];

    const completion = await groq.chat.completions.create({
      messages: visionMessages,
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "I couldn't analyze this image.";

    // Add to conversation history
    const history = getHistory(sessionId);
    history.push({ role: 'user', content: `[Image sent] ${userText}` });
    history.push({ role: 'assistant', content: reply });

    console.log(`📷 Vision analyzed: "${userText.substring(0, 40)}"`);
    res.json({ reply });
  } catch (error) {
    console.error('❌ Vision error:', error.message);
    if (error.status === 400) return res.status(400).json({ error: 'Image format not supported. Please try a different photo.' });
    res.status(500).json({ error: 'Failed to analyze image. Please try again.' });
  }
});

// ─────────────────────────────────────────
// Summarize text for Audio (used by Text-to-Audio feature)
// ─────────────────────────────────────────
app.post('/api/summarize-for-audio', async (req, res) => {
  const { text, fileName = 'document' } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text is required.' });

  try {
    const truncated = text.length > 8000 ? text.substring(0, 8000) + '...' : text;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert summarizer. Summarize the given document content into a clear, natural-sounding English audio script.
Rules:
- Write in plain English, suitable for text-to-speech reading
- No bullet points, no markdown, no special characters
- Use natural spoken sentences
- Keep it between 100-200 words
- Start with "This document is about..." or similar natural opener
- End with a brief conclusion`,
        },
        {
          role: 'user',
          content: `Summarize this document for audio playback:\n\nFile: ${fileName}\n\nContent:\n${truncated}`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.4,
      max_tokens: 300,
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (!summary) throw new Error('Could not generate summary.');

    console.log(`🔊 Audio summary generated for: ${fileName}`);
    res.json({ summary });
  } catch (error) {
    console.error('❌ Summarize error:', error.message);
    res.status(500).json({ error: 'Failed to summarize. Please try again.' });
  }
});

// ─────────────────────────────────────────
// Web Search (DuckDuckGo Instant Answer API — free, no key)
// ─────────────────────────────────────────
app.post('/api/search', async (req, res) => {
  const { query, sessionId = 'default' } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'Search query is required.' });

  try {
    const encoded = encodeURIComponent(query.trim());
    const ddgUrl = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;

    // Fetch DuckDuckGo results
    const ddgData = await new Promise((resolve, reject) => {
      https.get(ddgUrl, { headers: { 'User-Agent': 'CloudAI/1.0' } }, (r) => {
        let body = '';
        r.on('data', chunk => body += chunk);
        r.on('end', () => {
          try { resolve(JSON.parse(body)); } catch { reject(new Error('Parse error')); }
        });
        r.on('error', reject);
      }).on('error', reject);
    });

    // Extract results
    const results = [];

    // Abstract (main answer)
    if (ddgData.AbstractText) {
      results.push({
        title: ddgData.Heading || query,
        snippet: ddgData.AbstractText,
        url: ddgData.AbstractURL || ddgData.AbstractSource,
        source: ddgData.AbstractSource,
        type: 'abstract',
      });
    }

    // Related topics
    const topics = ddgData.RelatedTopics || [];
    for (const topic of topics.slice(0, 6)) {
      if (topic.FirstURL && topic.Text) {
        results.push({
          title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 60),
          snippet: topic.Text,
          url: topic.FirstURL,
          source: new URL(topic.FirstURL).hostname.replace('www.', ''),
          type: 'related',
        });
      } else if (topic.Topics) {
        // Nested topics
        for (const sub of topic.Topics.slice(0, 3)) {
          if (sub.FirstURL && sub.Text) {
            results.push({
              title: sub.Text.split(' - ')[0] || sub.Text.substring(0, 60),
              snippet: sub.Text,
              url: sub.FirstURL,
              source: new URL(sub.FirstURL).hostname.replace('www.', ''),
              type: 'related',
            });
          }
        }
      }
    }

    // If no results from DDG, generate AI-powered search suggestions with links
    if (results.length === 0) {
      const aiRes = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Suggest 3-4 relevant websites for the user query. Return ONLY valid JSON: {"links": [{"title": "...", "url": "https://...", "description": "..."}]}',
          },
          { role: 'user', content: `Query: ${query.trim()}` },
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_tokens: 400,
      });
      try {
        const raw = aiRes.choices[0].message.content.trim()
          .replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(raw);
        (parsed.links || []).forEach(l => {
          results.push({
            title: l.title,
            snippet: l.description,
            url: l.url,
            source: l.url.replace(/https?:\/\/(www\.)?/, '').split('/')[0],
            type: 'ai-suggested',
          });
        });
      } catch {}
    }

    // Use Groq to generate a direct answer (works even with no DDG results)
    const summaryRes = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a helpful search assistant. Answer the user's query directly and accurately.
If you have context from search results, use it. If not, answer from your knowledge.
Be concise — 2-3 sentences. Never say "you haven't provided results" — just answer the question.`,
        },
        {
          role: 'user',
          content: results.length > 0
            ? `Query: "${query}"\n\nSearch context:\n${results.slice(0, 3).map(r => r.snippet).join('\n')}`
            : `Query: "${query}"\n\nAnswer this directly from your knowledge.`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 200,
    });

    const summary = summaryRes.choices[0]?.message?.content?.trim() || '';

    // Add to conversation history
    const history = getHistory(sessionId);
    history.push({ role: 'user', content: `Search: ${query.trim()}` });
    history.push({ role: 'assistant', content: `Here are the search results for "${query}". ${summary}` });

    console.log(`🔍 Search: "${query}" → ${results.length} results`);
    res.json({ query: query.trim(), answer: summary, results: results.slice(0, 6), source: 'ddg' });
  } catch (error) {
    console.error('❌ Search error:', error.message);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

// ─────────────────────────────────────────
// Voice Transcription (Groq Whisper)
// ─────────────────────────────────────────
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file uploaded.' });

  const originalName = req.file.originalname || 'voice.wav';
  const ext = path.extname(originalName) || '.wav';
  const tmpPath = path.join(TMP_DIR, `voice_${Date.now()}${ext}`);

  try {
    fs.writeFileSync(tmpPath, req.file.buffer);
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
    });
    const text = transcription.text?.trim();
    if (!text) return res.status(422).json({ error: 'Could not transcribe. Please speak clearly and try again.' });
    console.log(`✅ Transcribed: "${text.substring(0, 80)}"`);
    res.json({ text });
  } catch (error) {
    console.error('❌ Transcription error:', error.message);
    res.status(500).json({ error: 'Failed to transcribe audio. Please try again.' });
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
});

// ─────────────────────────────────────────
// Admin Dashboard — HTML page with all data
// ─────────────────────────────────────────
app.get('/admin', async (req, res) => {
  const { password } = req.query;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.send(`
      <html><body style="background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;">
        <h2>🔐 Admin Login</h2>
        <form method="GET" action="/admin">
          <input name="password" type="password" placeholder="Enter admin password"
            style="padding:10px;border-radius:8px;border:1px solid #7c3aed;background:#111;color:#fff;font-size:16px;width:280px;" />
          <button type="submit" style="margin-left:10px;padding:10px 20px;background:#7c3aed;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px;">Login</button>
        </form>
      </body></html>
    `);
  }

  try {
    let users = [], messages = [], totalUsers = 0, totalMessages = 0;

    if (mongoConnected) {
      users = await MongoUser.find({}, 'name email createdAt lastLogin').sort({ createdAt: -1 });
      messages = await MongoMessage.find({}).populate('userId', 'name email').sort({ createdAt: -1 }).limit(200);
      totalUsers = users.length;
      totalMessages = messages.length;
    } else {
      users = db.prepare('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC').all();
      messages = db.prepare(`SELECT m.*, u.name as userName, u.email as userEmail FROM messages m JOIN users u ON m.user_id = u.id ORDER BY m.created_at DESC LIMIT 200`).all();
      totalUsers = users.length;
      totalMessages = messages.length;
    }

    const usersHtml = users.map(u => `
      <tr>
        <td>${u.name || u.name}</td>
        <td>${u.email}</td>
        <td>${new Date(u.createdAt || u.created_at).toLocaleString()}</td>
        <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'N/A'}</td>
      </tr>`).join('');

    const messagesHtml = messages.map(m => `
      <tr>
        <td>${m.userId?.name || m.userName || 'Unknown'}</td>
        <td>${m.userId?.email || m.userEmail || ''}</td>
        <td><span style="color:${m.role === 'user' ? '#60a5fa' : '#34d399'}">${m.role}</span></td>
        <td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(m.content || '').substring(0, 100)}</td>
        <td>${new Date(m.createdAt || m.created_at).toLocaleString()}</td>
      </tr>`).join('');

    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Cloud AI Admin</title>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#050510; color:#e0e0ff; font-family:'Segoe UI',sans-serif; padding:20px; }
    h1 { color:#a78bfa; margin-bottom:20px; font-size:28px; }
    h2 { color:#c4b5fd; margin:30px 0 12px; font-size:18px; }
    .stats { display:flex; gap:16px; margin-bottom:30px; flex-wrap:wrap; }
    .stat { background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.3); border-radius:12px; padding:20px 30px; text-align:center; }
    .stat-num { font-size:36px; font-weight:800; color:#a78bfa; }
    .stat-label { font-size:13px; color:rgba(255,255,255,0.5); margin-top:4px; }
    table { width:100%; border-collapse:collapse; background:rgba(255,255,255,0.03); border-radius:12px; overflow:hidden; }
    th { background:rgba(124,58,237,0.3); padding:12px 16px; text-align:left; font-size:13px; color:#c4b5fd; }
    td { padding:10px 16px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px; color:rgba(255,255,255,0.8); }
    tr:hover td { background:rgba(124,58,237,0.08); }
    .badge { background:rgba(124,58,237,0.2); border-radius:20px; padding:2px 10px; font-size:11px; }
    .db-badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; margin-bottom:20px;
      background:${mongoConnected ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'};
      color:${mongoConnected ? '#34d399' : '#fca5a5'};
      border:1px solid ${mongoConnected ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.4)'}; }
  </style>
</head>
<body>
  <h1>☁️ Cloud AI Admin Dashboard</h1>
  <div class="db-badge">${mongoConnected ? '🟢 MongoDB Atlas Connected' : '🔴 SQLite Only'}</div>

  <div class="stats">
    <div class="stat"><div class="stat-num">${totalUsers}</div><div class="stat-label">Total Users</div></div>
    <div class="stat"><div class="stat-num">${totalMessages}</div><div class="stat-label">Total Messages</div></div>
    <div class="stat"><div class="stat-num">${messages.filter(m => m.role === 'user').length}</div><div class="stat-label">User Messages</div></div>
    <div class="stat"><div class="stat-num">${messages.filter(m => m.role === 'assistant').length}</div><div class="stat-label">AI Replies</div></div>
  </div>

  <h2>👥 Users (${totalUsers})</h2>
  <table>
    <tr><th>Name</th><th>Email</th><th>Signed Up</th><th>Last Login</th></tr>
    ${usersHtml || '<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,0.3)">No users yet</td></tr>'}
  </table>

  <h2>💬 Chat History (latest ${messages.length})</h2>
  <table>
    <tr><th>User</th><th>Email</th><th>Role</th><th>Message</th><th>Time</th></tr>
    ${messagesHtml || '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.3)">No messages yet</td></tr>'}
  </table>

  <p style="margin-top:30px;color:rgba(255,255,255,0.2);font-size:12px;">Generated at ${new Date().toLocaleString()} · Cloud AI by Meghana</p>
</body>
</html>`);
  } catch (err) {
    res.status(500).send(`<pre>Error: ${err.message}</pre>`);
  }
});
app.get('/api/admin/users', async (req, res) => {
  const { password } = req.query;
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  try {
    if (mongoConnected) {
      const users = await MongoUser.find({}, 'name email createdAt lastLogin').sort({ createdAt: -1 });
      return res.json({ users, total: users.length, source: 'mongodb' });
    }
    const users = db.prepare('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ users, total: users.length, source: 'sqlite' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/history', async (req, res) => {
  const { password, userId, email } = req.query;
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  try {
    if (mongoConnected) {
      let query = {};
      if (userId) query.userId = userId;
      if (email) {
        const user = await MongoUser.findOne({ email });
        if (user) query.userId = user._id;
      }
      const messages = await MongoMessage.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(500);
      return res.json({ messages, total: messages.length, source: 'mongodb' });
    }
    // SQLite fallback
    const messages = db.prepare(`
      SELECT m.*, u.name, u.email FROM messages m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC LIMIT 500
    `).all();
    res.json({ messages, total: messages.length, source: 'sqlite' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stats', async (req, res) => {
  const { password } = req.query;
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  try {
    if (mongoConnected) {
      const totalUsers    = await MongoUser.countDocuments();
      const totalMessages = await MongoMessage.countDocuments();
      const recentUsers   = await MongoUser.find({}, 'name email createdAt').sort({ createdAt: -1 }).limit(10);
      const userMessages  = await MongoMessage.aggregate([
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
      ]);
      return res.json({ totalUsers, totalMessages, recentUsers, userMessages, source: 'mongodb' });
    }
    const totalUsers    = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
    const recentUsers   = db.prepare('SELECT name, email, created_at FROM users ORDER BY created_at DESC LIMIT 10').all();
    res.json({ totalUsers, totalMessages, recentUsers, source: 'sqlite' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────
// Project Generator
// ─────────────────────────────────────────

// In-memory project store
const projectStore = {}; // { projectId: { name, files: [{name, content}], createdAt } }

// Step 1: Generate project files using AI
app.post('/api/project/generate', async (req, res) => {
  const { name, type, category, stack, description, features } = req.body;
  if (!name || !type || !stack) return res.status(400).json({ error: 'Name, type and stack are required.' });

  try {
    console.log(`🏗️ Generating project: ${name} (${type}, ${stack})`);

    // Limit files to avoid token overflow — generate core files only
    const prompt = `You are an expert developer. Generate a working ${type} project called "${name}".

Tech Stack: ${stack}
Description: ${description || 'A modern web application'}
Features: ${features || 'Clean UI, responsive design'}

Return ONLY this JSON (no text before or after):
{
  "files": [
    { "name": "index.html", "content": "..." },
    { "name": "style.css", "content": "..." },
    { "name": "script.js", "content": "..." }
  ],
  "description": "One sentence about what was built",
  "runInstructions": "How to run this project"
}

Rules by stack:
- HTML/CSS/JS or Tailwind: 3 files — index.html, style.css, script.js
- React: 4 files — package.json, public/index.html, src/App.jsx, src/index.js
- Node.js/Express: 3 files — package.json, server.js, public/index.html
- Django: 4 files — manage.py, requirements.txt, app/views.py, templates/index.html
- Flask: 3 files — app.py, requirements.txt, templates/index.html
- FastAPI: 3 files — main.py, requirements.txt, templates/index.html
- MERN: 4 files — package.json, server.js, src/App.jsx, src/index.js
- Next.js: 3 files — package.json, pages/index.js, styles/globals.css

IMPORTANT:
- Keep each file content under 80 lines
- Write real working code, no placeholders
- Use modern dark CSS theme
- Return ONLY valid JSON — no markdown, no explanation`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert developer. Return ONLY valid compact JSON. No markdown. No explanation.' },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 8000,
    });

    let responseText = completion.choices[0]?.message?.content?.trim();

    // Strip markdown code blocks if present
    responseText = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    // Extract JSON object
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart === -1) throw new Error('AI did not return valid JSON');

    let jsonStr = responseText.substring(jsonStart, jsonEnd + 1);

    // Attempt to repair truncated JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      // Try to salvage partial JSON — find last complete file entry
      const lastCompleteFile = jsonStr.lastIndexOf('}, {');
      if (lastCompleteFile > 0) {
        jsonStr = jsonStr.substring(0, lastCompleteFile + 1) + '], "description": "' + name + ' project", "runInstructions": "Open index.html in your browser" }';
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          throw new Error('Could not parse AI response. Please try again.');
        }
      } else {
        throw new Error('Could not parse AI response. Please try again.');
      }
    }

    if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
      throw new Error('No files were generated. Please try again.');
    }

    const projectId = crypto.randomUUID();
    projectStore[projectId] = {
      id: projectId,
      name,
      type,
      category: category || type,
      stack,
      files: parsed.files,
      description: parsed.description || description || `${name} - ${type} project`,
      runInstructions: parsed.runInstructions || 'Open index.html in your browser',
      createdAt: Date.now(),
    };

    console.log(`✅ Project generated: ${name} (${parsed.files.length} files)`);
    res.json({
      projectId,
      name,
      files: parsed.files.map(f => ({ name: f.name, size: (f.content || '').length })),
      description: parsed.description || `${name} project`,
      runInstructions: parsed.runInstructions,
      fileCount: parsed.files.length,
    });
  } catch (error) {
    console.error('❌ Project gen error:', error.message);
    res.status(500).json({ error: 'Failed to generate project: ' + error.message });
  }
});

// Step 2: Download project as ZIP
app.get('/api/project/download/:projectId', (req, res) => {
  const project = projectStore[req.params.projectId];
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/\s+/g, '-')}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => { console.error('ZIP error:', err); res.status(500).end(); });
  archive.pipe(res);

  for (const file of project.files) {
    archive.append(file.content, { name: file.name });
  }

  archive.finalize();
  console.log(`📦 ZIP downloaded: ${project.name}`);
});

// Step 3: Deploy to Vercel
app.post('/api/project/deploy/:projectId', async (req, res) => {
  const project = projectStore[req.params.projectId];
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  const vercelToken = req.body.vercelToken || process.env.VERCEL_TOKEN;
  if (!vercelToken) {
    return res.status(400).json({
      error: 'Vercel token required. Get yours free at vercel.com/account/tokens',
      needsToken: true,
    });
  }

  try {
    console.log(`🚀 Deploying to Vercel: ${project.name}`);

    // Build Vercel deployment payload
    const deploymentFiles = project.files.map(file => ({
      file: file.name,
      data: Buffer.from(file.content).toString('base64'),
      encoding: 'base64',
    }));

    const payload = {
      name: project.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      files: deploymentFiles,
      projectSettings: {
        framework: project.type === 'react' ? 'create-react-app' : null,
      },
      target: 'production',
    };

    const response = await axios.post('https://api.vercel.com/v13/deployments', payload, {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    const deployment = response.data;
    const deployUrl = `https://${deployment.url}`;

    console.log(`✅ Deployed: ${deployUrl}`);
    res.json({
      url: deployUrl,
      deploymentId: deployment.id,
      status: deployment.readyState || 'BUILDING',
    });
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('❌ Deploy error:', msg);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid Vercel token. Please check and try again.' });
    }
    res.status(500).json({ error: 'Deployment failed: ' + msg });
  }
});

// Get project files preview
app.get('/api/project/files/:projectId', (req, res) => {
  const project = projectStore[req.params.projectId];
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  res.json({ files: project.files, runInstructions: project.runInstructions });
});

// Generate project documentation
app.post('/api/project/docs/:projectId', async (req, res) => {
  const project = projectStore[req.params.projectId];
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  try {
    const fileList = project.files.map(f => f.name).join(', ');

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a technical documentation writer. Generate clear, structured project documentation. Return ONLY valid JSON.',
        },
        {
          role: 'user',
          content: `Generate complete documentation for this project:

Project Name: ${project.name}
Type: ${project.type}
Stack: ${project.stack}
Description: ${project.description || 'A web application'}
Files: ${fileList}

Return JSON in this exact format:
{
  "overview": "2-3 sentences describing what the project does and its purpose",
  "workflow": [
    { "step": "Step 1 title", "desc": "What happens in this step" },
    { "step": "Step 2 title", "desc": "What happens in this step" },
    { "step": "Step 3 title", "desc": "What happens in this step" },
    { "step": "Step 4 title", "desc": "What happens in this step" }
  ],
  "technologies": [
    { "name": "Technology name", "purpose": "What it is used for in this project", "version": "latest" }
  ],
  "architecture": "2-3 sentences describing the project architecture and how components interact",
  "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
  "fileStructure": [
    { "file": "filename.ext", "purpose": "What this file does" }
  ],
  "setup": [
    "Step 1: instruction",
    "Step 2: instruction",
    "Step 3: instruction"
  ],
  "howItWorks": "3-4 sentences explaining how the application works end to end"
}`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 2000,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to generate documentation');

    const docs = JSON.parse(jsonMatch[0]);
    console.log(`📄 Docs generated for: ${project.name}`);
    res.json({ ...docs, projectName: project.name, stack: project.stack, type: project.type, fileCount: project.files.length });
  } catch (error) {
    console.error('❌ Docs error:', error.message);
    res.status(500).json({ error: 'Failed to generate documentation.' });
  }
});

// ─────────────────────────────────────────
app.listen(PORT, async () => {
  await connectMongo();
  console.log(`\n✅ Backend running at http://localhost:${PORT}`);
  console.log(`🗄️  SQLite: cloudai.db | MongoDB: ${mongoConnected ? 'connected' : 'not configured'}`);
  console.log(`🔑 API key: ${process.env.GROQ_API_KEY.substring(0, 8)}...`);
  console.log(`📄 PDF:       POST /api/upload/pdf`);
  console.log(`🎨 Image:     POST /api/generate/image`);
  console.log(`🎤 Voice:     POST /api/transcribe`);
  console.log(`🔍 Search:    POST /api/search\n`);
});
