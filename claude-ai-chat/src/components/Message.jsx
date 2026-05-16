import React, { useState } from 'react';
import '../styles/Message.css';

const CloudSVG = () => (
  <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="mCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#60a5fa"/>
      </linearGradient>
    </defs>
    <path d="M32 28H14a8 8 0 01-1.5-15.83A10 10 0 0131 18h1a6 6 0 010 12z"
      fill="url(#mCloudGrad)" opacity="0.95"/>
    <path d="M23 13l-5 8h5l-3 8 8-11h-5l4-5z" fill="white" opacity="0.95"/>
  </svg>
);

// PDF attachment card (user side)
const PdfCard = ({ fileName, fileSize }) => (
  <div className="pdf-card">
    <div className="pdf-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    </div>
    <div className="pdf-info">
      <span className="pdf-name">{fileName}</span>
      <span className="pdf-size">{fileSize} · PDF</span>
    </div>
  </div>
);

// Generated image card (bot side)
const ImageCard = ({ imageUrl, enhancedPrompt }) => {
  const [status, setStatus] = useState('loading');
  const [downloading, setDownloading] = useState(false);

  // Extract imageId from URL for download
  const imageId = imageUrl.split('/').pop();

  const handleDownload = () => {
    setDownloading(true);
    const a = document.createElement('a');
    a.href = `http://localhost:5000/api/image/download/${imageId}`;
    a.download = 'cloud-ai-image.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 1000);
  };

  return (
    <div className="image-card">
      {status === 'loading' && (
        <div className="image-loading">
          <span className="image-spinner" />
          <p>Generating image... (10–20s)</p>
        </div>
      )}
      {status === 'error' && (
        <div className="image-error">
          <p>⚠️ Image failed to load</p>
          <button className="img-retry-btn" onClick={() => setStatus('loading')}>🔄 Retry</button>
        </div>
      )}
      <img
        src={imageUrl}
        alt={enhancedPrompt}
        className={`generated-image ${status === 'loaded' ? 'visible' : ''}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      {status === 'loaded' && (
        <div className="image-actions">
          <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="img-action-btn">
            🔍 View Full
          </a>
          <button className="img-action-btn" onClick={handleDownload} disabled={downloading}>
            {downloading ? '⏳ Saving...' : '⬇️ Download'}
          </button>
        </div>
      )}
    </div>
  );
};

const Message = ({ message }) => {
  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isError = message.status === 'error';
  const isPdf = message.type === 'pdf';
  const isImage = message.type === 'image';
  const isSearch = message.type === 'search';
  const isPhoto = message.type === 'photo';

  return (
    <div className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'} ${isError ? 'error-message' : ''}`}>
      {message.sender === 'bot' && (
        <div className="message-avatar"><CloudSVG /></div>
      )}

      <div className="message-bubble">
        {/* PDF card */}
        {isPdf && (
          <>
            <PdfCard fileName={message.fileName} fileSize={message.fileSize} />
            {message.text && (
              <div className="message-content" style={{ marginTop: 4 }}>
                <p>{message.text}</p>
              </div>
            )}
          </>
        )}

        {/* Generated image */}
        {isImage && (
          <>
            <div className="message-content">
              <p>{message.text}</p>
            </div>
            <ImageCard imageUrl={message.imageUrl} enhancedPrompt={message.enhancedPrompt} />
          </>
        )}

        {/* Search results */}
        {isSearch && (
          <div className="search-results-card">
            <div className="search-results-header">
              <span className="search-icon">🔍</span>
              <span>Results for <strong>"{message.query}"</strong></span>
            </div>
            {message.answer && (
              <div className="search-answer">{message.answer}</div>
            )}
            <div className="search-links">
              {message.results?.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="search-link-item">
                  <div className="search-link-top">
                    <span className="search-link-source">{r.source || 'web'}</span>
                    <span className="search-link-arrow">↗</span>
                  </div>
                  <div className="search-link-title">{r.title}</div>
                  {r.snippet && <div className="search-link-snippet">{r.snippet.substring(0, 120)}{r.snippet.length > 120 ? '...' : ''}</div>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Regular text */}
        {!isPdf && !isImage && !isSearch && !isPhoto && (
          <div className="message-content">
            <p>{message.text}</p>
          </div>
        )}

        {/* Photo message */}
        {isPhoto && (
          <div className="photo-message">
            <img src={message.imageBase64} alt="Captured" className="photo-preview" />
            {message.text && (
              <div className="message-content photo-caption">
                <p>{message.text}</p>
              </div>
            )}
          </div>
        )}

        <div className="message-meta">
          <span className="message-time">{formatTime(message.timestamp)}</span>
          {message.sender === 'user' && (
            <span className="message-status">{isError ? '✗' : '✓✓'}</span>
          )}
        </div>
      </div>

      {message.sender === 'user' && (
        <div className="message-avatar user">👤</div>
      )}
    </div>
  );
};

export default Message;
