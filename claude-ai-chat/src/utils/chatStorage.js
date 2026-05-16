/**
 * Chat history storage using localStorage.
 * Data persists across page refreshes and browser restarts.
 * Stored per user: key = "cloudai_chats_{userId}"
 */

const getKey = (userId) => `cloudai_chats_${userId}`;

// Load all chats for a user
export const loadChats = (userId) => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getKey(userId));
    if (!raw) return null;
    const chats = JSON.parse(raw);
    // Restore Date objects from ISO strings
    return chats.map(chat => ({
      ...chat,
      messages: chat.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }));
  } catch {
    return null;
  }
};

// Save all chats for a user
export const saveChats = (userId, chats) => {
  if (!userId) return;
  try {
    localStorage.setItem(getKey(userId), JSON.stringify(chats));
  } catch (e) {
    // localStorage full — remove oldest chat and retry
    console.warn('localStorage full, clearing oldest chat');
    try {
      const trimmed = chats.slice(-20); // keep last 20 chats
      localStorage.setItem(getKey(userId), JSON.stringify(trimmed));
    } catch {}
  }
};

// Clear all chats for a user (on logout)
export const clearChats = (userId) => {
  if (!userId) return;
  localStorage.removeItem(getKey(userId));
};

// Get storage usage info
export const getStorageInfo = (userId) => {
  if (!userId) return { used: 0, chats: 0, messages: 0 };
  try {
    const raw = localStorage.getItem(getKey(userId)) || '[]';
    const chats = JSON.parse(raw);
    const messages = chats.reduce((sum, c) => sum + (c.messages?.length || 0), 0);
    return {
      used: (raw.length / 1024).toFixed(1) + ' KB',
      chats: chats.length,
      messages,
    };
  } catch {
    return { used: '0 KB', chats: 0, messages: 0 };
  }
};
