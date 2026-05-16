import React, { useEffect, useRef } from 'react';
import Message from './Message';
import '../styles/MessageList.css';

const CloudSVG = () => (
  <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#60a5fa"/>
      </linearGradient>
    </defs>
    <path d="M32 28H14a8 8 0 01-1.5-15.83A10 10 0 0131 18h1a6 6 0 010 12z"
      fill="url(#tCloudGrad)" opacity="0.95"/>
    <path d="M23 13l-5 8h5l-3 8 8-11h-5l4-5z" fill="white" opacity="0.95"/>
  </svg>
);

const SUGGESTIONS = [
  '✨ What can you do?',
  '🌍 Tell me a fun fact',
  '💡 Give me a creative idea',
  '🧠 Explain AI in simple terms',
];

const MessageList = ({ messages, isLoading, onSuggestionClick }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const showEmpty = messages.length === 0;

  return (
    <div className="messages-container">
      <div className="messages-wrapper">
        {showEmpty && (
          <div className="empty-state">
            <div className="empty-logo">
              <CloudSVG />
            </div>
            <h2>How can I help you?</h2>
            <p>Ask me anything — I'm Cloud AI, developed by Meghana.</p>
            <div className="empty-suggestions">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  className="suggestion-chip"
                  onClick={() => onSuggestionClick && onSuggestionClick(s.replace(/^.{2}/, '').trim())}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="typing-wrapper">
            <div className="typing-avatar"><CloudSVG /></div>
            <div className="typing-bubble">
              <div className="typing-indicator">
                <span/><span/><span/>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default MessageList;
