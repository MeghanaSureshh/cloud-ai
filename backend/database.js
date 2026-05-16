const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Database file stored in backend folder
const DB_PATH = path.join(__dirname, 'cloudai.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─────────────────────────────────────────
// Create tables
// ─────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL UNIQUE,
    password  TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chats (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    title      TEXT DEFAULT 'New Chat',
    pinned     INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    chat_id    TEXT NOT NULL,
    session_id TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content    TEXT NOT NULL,
    type       TEXT DEFAULT 'text',
    metadata   TEXT DEFAULT '{}',
    deleted    INTEGER DEFAULT 0,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
`);

console.log('✅ SQLite database ready:', DB_PATH);

// ─────────────────────────────────────────
// User operations
// ─────────────────────────────────────────
const userOps = {
  create: db.prepare(`
    INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)
  `),
  findByEmail: db.prepare(`SELECT * FROM users WHERE email = ?`),
  findById:    db.prepare(`SELECT * FROM users WHERE id = ?`),
};

// ─────────────────────────────────────────
// Chat operations
// ─────────────────────────────────────────
const chatOps = {
  upsert: db.prepare(`
    INSERT INTO chats (id, user_id, session_id, title, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(session_id) DO UPDATE SET
      title = excluded.title,
      updated_at = CURRENT_TIMESTAMP
  `),

  updateMeta: db.prepare(`
    UPDATE chats SET title = ?, pinned = ?, updated_at = CURRENT_TIMESTAMP
    WHERE session_id = ? AND user_id = ?
  `),

  getByUser: db.prepare(`
    SELECT id, session_id, title, pinned, created_at, updated_at
    FROM chats WHERE user_id = ?
    ORDER BY pinned DESC, updated_at DESC
  `),

  getBySession: db.prepare(`
    SELECT * FROM chats WHERE session_id = ? AND user_id = ?
  `),

  delete: db.prepare(`DELETE FROM chats WHERE session_id = ? AND user_id = ?`),
};

// ─────────────────────────────────────────
// Message operations
// ─────────────────────────────────────────
const msgOps = {
  insert: db.prepare(`
    INSERT INTO messages (id, chat_id, session_id, user_id, role, content, type, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getBySession: db.prepare(`
    SELECT * FROM messages
    WHERE session_id = ? AND user_id = ? AND deleted = 0
    ORDER BY created_at ASC
  `),

  getAllBySession: db.prepare(`
    SELECT * FROM messages
    WHERE session_id = ? AND user_id = ?
    ORDER BY created_at ASC
  `),

  softDelete: db.prepare(`
    UPDATE messages SET deleted = 1, deleted_at = CURRENT_TIMESTAMP
    WHERE session_id = ? AND user_id = ?
  `),

  getStats: db.prepare(`
    SELECT
      COUNT(*) as total_messages,
      COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
      COUNT(CASE WHEN role = 'assistant' THEN 1 END) as ai_messages,
      COUNT(CASE WHEN deleted = 1 THEN 1 END) as deleted_messages
    FROM messages WHERE user_id = ?
  `),
};

// ─────────────────────────────────────────
// Helper: save a message pair (user + AI)
// ─────────────────────────────────────────
const saveMessagePair = (userId, sessionId, userContent, aiContent, type = 'text', metadata = {}) => {
  try {
    // Ensure chat exists
    const chatId = crypto.randomUUID();
    const title = userContent.substring(0, 40);
    chatOps.upsert.run(chatId, userId, sessionId, title);

    // Get actual chat id
    const chat = chatOps.getBySession.get(sessionId, userId);
    if (!chat) return;

    // Insert user message
    msgOps.insert.run(
      crypto.randomUUID(), chat.id, sessionId, userId,
      'user', userContent, type, JSON.stringify(metadata)
    );

    // Insert AI message
    msgOps.insert.run(
      crypto.randomUUID(), chat.id, sessionId, userId,
      'assistant', aiContent, 'text', '{}'
    );
  } catch (err) {
    console.error('DB save error:', err.message);
  }
};

module.exports = { db, userOps, chatOps, msgOps, saveMessagePair };
