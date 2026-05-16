const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content:   { type: String, required: true },
  type:      { type: String, default: 'text' }, // text | pdf | image | search | photo | voice
  metadata:  { type: mongoose.Schema.Types.Mixed, default: {} }, // extra info (fileName, imageUrl, etc.)
  deleted:   { type: Boolean, default: false },   // soft delete — keeps record
  deletedAt: { type: Date, default: null },
  timestamp: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId: { type: String, required: true, unique: true, index: true },
  title:     { type: String, default: 'New Chat' },
  pinned:    { type: Boolean, default: false },
  messages:  [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update updatedAt on every save
chatSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
