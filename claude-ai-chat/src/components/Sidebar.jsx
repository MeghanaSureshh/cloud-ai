import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Sidebar.css';

const Sidebar = ({ chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, onRenameChat, onPinChat, isOpen, onClose }) => {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const { user } = useAuth();

  const pinnedChats = chats.filter(c => c.pinned);
  const recentChats = chats.filter(c => !c.pinned);

  const startRename = (chat, e) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  };

  const submitRename = (id) => {
    if (renameValue.trim()) onRenameChat(id, renameValue.trim());
    setRenamingId(null);
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') submitRename(id);
    if (e.key === 'Escape') setRenamingId(null);
  };

  const ChatItem = ({ chat }) => (
    <div
      className={`chat-item ${chat.id === activeChatId ? 'active' : ''} ${chat.pinned ? 'pinned' : ''}`}
      onClick={() => { onSelectChat(chat.id); onClose(); }}
    >
      <div className="chat-item-icon">
        {chat.pinned ? '' : ''}
      </div>

      <div className="chat-item-body">
        {renamingId === chat.id ? (
          <input
            className="rename-input"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={() => submitRename(chat.id)}
            onKeyDown={e => handleKeyDown(e, chat.id)}
            autoFocus
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="chat-title">{chat.title}</span>
            <span className="chat-date">{chat.date}</span>
          </>
        )}
      </div>

      <div className="chat-item-actions" onClick={e => e.stopPropagation()}>
        <button
          className="chat-action-btn"
          onClick={() => setMenuOpenId(menuOpenId === chat.id ? null : chat.id)}
        >⋯</button>

        {menuOpenId === chat.id && (
          <>
            <div className="chat-menu-overlay" onClick={() => setMenuOpenId(null)} />
            <div className="chat-context-menu">
              <button onClick={(e) => { onPinChat(chat.id); setMenuOpenId(null); }}>
                {chat.pinned ? ' Unpin' : ' Pin'}
              </button>
              <button onClick={(e) => startRename(chat, e)}>
                 Rename
              </button>
              <button className="delete-btn" onClick={() => { onDeleteChat(chat.id); setMenuOpenId(null); }}>
                 Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a78bfa"/>
                  <stop offset="100%" stopColor="#60a5fa"/>
                </linearGradient>
              </defs>
              {/* Cloud shape */}
              <path d="M30 26H12a7 7 0 01-1.5-13.83A9 9 0 0128.5 18H30a5 5 0 010 10z"
                fill="url(#cloudGrad)" opacity="0.9"/>
              {/* Lightning bolt */}
              <path d="M21 14l-4 7h4l-2 7 6-9h-4l3-5z" fill="white" opacity="0.95"/>
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-name">Cloud AI</span>
            <span className="logo-sub">by Meghana</span>
          </div>
        </div>

        {/* New Chat Button */}
        <button className="new-chat-btn" onClick={onNewChat}>
          <span className="new-chat-icon">+</span>
          New Chat
        </button>

        {/* Chat List */}
        <div className="chat-list-container">
          {pinnedChats.length > 0 && (
            <div className="chat-section">
              <div className="section-label"> Pinned</div>
              {pinnedChats.map(chat => <ChatItem key={chat.id} chat={chat} />)}
            </div>
          )}

          <div className="chat-section">
            {recentChats.length > 0 && (
              <div className="section-label"> Recent</div>
            )}
            {recentChats.length === 0 && pinnedChats.length === 0 && (
              <div className="empty-chats">
                <span>No chats yet</span>
                <p>Start a new conversation!</p>
              </div>
            )}
            {recentChats.map(chat => <ChatItem key={chat.id} chat={chat} />)}
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'M'}</div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'Meghana'}</span>
              <span className="user-plan">{user?.email || 'Developer'}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
