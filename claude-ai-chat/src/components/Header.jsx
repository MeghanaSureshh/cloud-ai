import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Header.css';

const CloudLogo = () => (
  <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="cloud-logo-svg">
    <defs>
      <linearGradient id="hCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#60a5fa"/>
      </linearGradient>
      <linearGradient id="hGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7c3aed"/>
        <stop offset="100%" stopColor="#2563eb"/>
      </linearGradient>
    </defs>
    <circle cx="22" cy="22" r="20" fill="url(#hGlow)" opacity="0.2"/>
    <path d="M32 28H14a8 8 0 01-1.5-15.83A10 10 0 0131 18h1a6 6 0 010 12z" fill="url(#hCloudGrad)" opacity="0.95"/>
    <path d="M23 13l-5 8h5l-3 8 8-11h-5l4-5z" fill="white" opacity="0.95"/>
  </svg>
);

const Header = ({ onClearChat, onToggleSidebar, chatTitle, onOpenProject }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="chat-header">
      <div className="header-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar} title="Toggle sidebar">
          <span/><span/><span/>
        </button>
        <div className="header-brand">
          <div className="header-logo"><CloudLogo /></div>
          <div className="header-info">
            <h1>Cloud AI</h1>
            <p className="status">
              <span className="status-dot"/>
              {chatTitle !== 'New Chat' ? chatTitle : 'Developed by Meghana'}
            </p>
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button className="header-action-btn clear-btn" onClick={() => onClearChat()} title="Clear Chat">
           Clear
        </button>
        <button className="header-action-btn signout-btn" onClick={() => { logout(); navigate('/login'); }} title="Sign Out">
           Sign Out
        </button>
      </div>
    </div>
  );
};

export default Header;
