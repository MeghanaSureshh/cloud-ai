import React, { useState, useCallback, useEffect, useMemo } from 'react';
import API_URL from '../config';
import '../styles/ChatApp.css';
import MessageList from './MessageList';
import InputArea from './InputArea';
import Header from './Header';
import Sidebar from './Sidebar';
import ProjectCreator from './ProjectCreator';
import { useAuth } from '../context/AuthContext';
import { loadChats, saveChats } from '../utils/chatStorage';

const WELCOME_MSG = (id) => ({
  id,
  text: "Hi! I'm Cloud AI, developed by Meghana 👋 I'm here to help you with anything — ask me questions, have a conversation, or explore ideas. What can I help you with today?",
  sender: 'bot',
  timestamp: new Date(),
  status: 'sent',
});

const formatDate = () => {
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (now.toDateString() === new Date().toDateString()) return 'Today';
  if (now.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return now.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const createChat = (id, title = 'New Chat') => ({
  id, title, date: formatDate(), pinned: false,
  messages: [WELCOME_MSG(1)],
  sessionId: `session_${id}`,
});

const initialChatId = Date.now();

const ChatApp = () => {
  const { user } = useAuth();
  const userId = user?.id;

  // Load chats from localStorage on mount, fall back to a fresh chat
  const getInitialChats = () => {
    const saved = loadChats(userId);
    if (saved && saved.length > 0) return saved;
    return [createChat(initialChatId)];
  };

  const [chats, setChats] = useState(getInitialChats);
  const [activeChatId, setActiveChatId] = useState(() => {
    const saved = loadChats(userId);
    return saved && saved.length > 0 ? saved[0].id : initialChatId;
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProjectCreator, setShowProjectCreator] = useState(false);

  // Debounced save — only saves 800ms after the last change, prevents re-render flicker
  const saveTimerRef = React.useRef(null);
  useEffect(() => {
    if (!userId || chats.length === 0) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveChats(userId, chats);
    }, 800);
    return () => clearTimeout(saveTimerRef.current);
  }, [chats, userId]);

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat?.messages || [];
  const autoTitle = (text) => text.length > 30 ? text.substring(0, 30) + '…' : text;

  const addMessage = useCallback((chatId, msg) => {
    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, messages: [...c.messages, msg] } : c
    ));
  }, []);

  const updateMessages = useCallback((chatId, updater) => {
    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, messages: updater(c.messages) } : c
    ));
  }, []);

  // ── Text chat ──
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userInput = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    const userMsg = { id: Date.now(), text: userInput, sender: 'user', timestamp: new Date(), status: 'sent' };

    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      const isFirst = c.messages.filter(m => m.sender === 'user').length === 0;
      return { ...c, title: isFirst ? autoTitle(userInput) : c.title, messages: [...c.messages, userMsg] };
    }));

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput, sessionId: activeChat.sessionId, userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      addMessage(activeChatId, {
        id: Date.now() + 1, text: data.reply, sender: 'bot', timestamp: new Date(), status: 'sent',
      });
    } catch (err) {
      addMessage(activeChatId, {
        id: Date.now() + 1, text: err.message || 'Sorry, an error occurred.', sender: 'bot', timestamp: new Date(), status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── PDF Upload ──
  const handleFileUpload = async (file, question) => {
    setIsLoading(true);

    // Show user message with file info + question
    addMessage(activeChatId, {
      id: Date.now(),
      text: question || null,
      type: 'pdf',
      fileName: file.name,
      fileSize: (file.size / 1024).toFixed(1) + ' KB',
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
    });

    // Auto-title
    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      const isFirst = c.messages.filter(m => m.sender === 'user').length === 0;
      return { ...c, title: isFirst ? `PDF: ${file.name.substring(0, 20)}` : c.title };
    }));

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('sessionId', activeChat.sessionId);
    formData.append('question', question || 'Please summarize this document and highlight the key points.');

    try {
      const res = await fetch(`${API_URL}/api/upload/pdf`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addMessage(activeChatId, {
        id: Date.now() + 1,
        text: data.reply,
        type: 'pdf-reply',
        pages: data.pages,
        sender: 'bot',
        timestamp: new Date(),
        status: 'sent',
      });
    } catch (err) {
      addMessage(activeChatId, {
        id: Date.now() + 1, text: err.message || 'Failed to process PDF.', sender: 'bot', timestamp: new Date(), status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Image Generation ──
  const handleImageGenerate = async (prompt) => {
    setIsLoading(true);

    addMessage(activeChatId, {
      id: Date.now(), text: `🎨 Generate image: "${prompt}"`, sender: 'user', timestamp: new Date(), status: 'sent',
    });

    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      const isFirst = c.messages.filter(m => m.sender === 'user').length === 0;
      return { ...c, title: isFirst ? `Image: ${prompt.substring(0, 20)}` : c.title };
    }));

    try {
      const res = await fetch(`${API_URL}/api/generate/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sessionId: activeChat.sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addMessage(activeChatId, {
        id: Date.now() + 1,
        text: `Here's your image for: "${prompt}" ✨`,
        type: 'image',
        imageUrl: data.imageUrl,
        enhancedPrompt: data.enhancedPrompt,
        sender: 'bot',
        timestamp: new Date(),
        status: 'sent',
      });
    } catch (err) {
      addMessage(activeChatId, {
        id: Date.now() + 1, text: err.message || 'Failed to generate image.', sender: 'bot', timestamp: new Date(), status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Web Search ──
  const handleWebSearch = async (query) => {
    setIsLoading(true);
    addMessage(activeChatId, {
      id: Date.now(), text: `🔍 "${query}"`, sender: 'user', timestamp: new Date(), status: 'sent',
    });
    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      const isFirst = c.messages.filter(m => m.sender === 'user').length === 0;
      return { ...c, title: isFirst ? `Search: ${query.substring(0, 22)}` : c.title };
    }));
    try {
      const res = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sessionId: activeChat.sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addMessage(activeChatId, {
        id: Date.now() + 1,
        type: 'search',
        query: data.query,
        answer: data.answer,
        results: data.results,
        sender: 'bot',
        timestamp: new Date(),
        status: 'sent',
      });
    } catch (err) {
      addMessage(activeChatId, {
        id: Date.now() + 1, text: err.message || 'Search failed.', sender: 'bot', timestamp: new Date(), status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };
  // ── Camera / Vision ──
  const handleCameraCapture = async (imageBase64, message) => {
    setIsLoading(true);

    // Show user message with photo preview
    addMessage(activeChatId, {
      id: Date.now(),
      type: 'photo',
      imageBase64,
      text: message || null,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
    });

    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      const isFirst = c.messages.filter(m => m.sender === 'user').length === 0;
      return { ...c, title: isFirst ? '📷 Photo Chat' : c.title };
    }));

    try {
      const res = await fetch(`${API_URL}/api/vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          message: message || 'What do you see in this image?',
          sessionId: activeChat.sessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addMessage(activeChatId, {
        id: Date.now() + 1,
        text: data.reply,
        sender: 'bot',
        timestamp: new Date(),
        status: 'sent',
      });
    } catch (err) {
      addMessage(activeChatId, {
        id: Date.now() + 1,
        text: err.message || 'Failed to analyze image.',
        sender: 'bot',
        timestamp: new Date(),
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sidebar actions ──
  const handleNewChat = () => {
    const id = Date.now();
    setChats(prev => [createChat(id), ...prev]);
    setActiveChatId(id);
    setSidebarOpen(false);
  };

  const handleSelectChat = (id) => { setActiveChatId(id); setIsLoading(false); };

  const handleDeleteChat = (id) => {
    setChats(prev => {
      const remaining = prev.filter(c => c.id !== id);
      if (remaining.length === 0) {
        const newId = Date.now();
        setActiveChatId(newId);
        return [createChat(newId)];
      }
      if (id === activeChatId) setActiveChatId(remaining[0].id);
      return remaining;
    });
  };

  const handleRenameChat = (id, title) =>
    setChats(prev => prev.map(c => c.id === id ? { ...c, title } : c));

  const handlePinChat = (id) =>
    setChats(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));

  const handleClearChat = async () => {
    try {
      await fetch(`${API_URL}/api/chat/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeChat.sessionId, userId }),
      });
    } catch (err) { console.error(err); }
    updateMessages(activeChatId, () => [WELCOME_MSG(Date.now())]);
  };

  const sidebarEl = useMemo(() => (
    <Sidebar
      chats={chats}
      activeChatId={activeChatId}
      onSelectChat={handleSelectChat}
      onNewChat={handleNewChat}
      onDeleteChat={handleDeleteChat}
      onRenameChat={handleRenameChat}
      onPinChat={handlePinChat}
      isOpen={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
    />
  // eslint-disable-next-line
  ), [chats, activeChatId, sidebarOpen]);

  return (
    <div className="app-layout">
      {showProjectCreator && <ProjectCreator onClose={() => setShowProjectCreator(false)} />}
      {sidebarEl}
      <div className="chat-area">
        <Header
          onClearChat={handleClearChat}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          chatTitle={activeChat?.title || 'New Chat'}
          onOpenProject={() => setShowProjectCreator(true)}
        />
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onSuggestionClick={(text) => setInputValue(text)}
        />
        <InputArea
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          onImageGenerate={handleImageGenerate}
          onWebSearch={handleWebSearch}
          onCameraCapture={handleCameraCapture}
          onOpenProject={() => setShowProjectCreator(true)}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default ChatApp;
