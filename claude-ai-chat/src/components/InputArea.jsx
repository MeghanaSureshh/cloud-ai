import React, { useState, useRef, useEffect } from 'react';
import '../styles/InputArea.css';
import { convertToWav } from '../utils/audioUtils';
import AudioPlayer from './AudioPlayer';
import CameraCapture from './CameraCapture';

const InputArea = ({ inputValue, setInputValue, onSendMessage, onFileUpload, onImageGenerate, onWebSearch, onCameraCapture, onOpenProject, isLoading }) => {
  const [rows, setRows] = useState(1);
  const [recState, setRecState] = useState('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showSearchPrompt, setShowSearchPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingPdf, setPendingPdf] = useState(null);
  const [pdfQuestion, setPdfQuestion] = useState('');
  const [showCamera, setShowCamera] = useState(false);

  // Text-to-Audio state
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const [audioText, setAudioText] = useState('');       // actual summary/text to speak
  const [audioStatus, setAudioStatus] = useState('');   // status message shown during loading
  const [audioReady, setAudioReady] = useState(false);  // true only when real text is ready
  const [isExtractingText, setIsExtractingText] = useState(false);
  const audioFileRef = useRef(null);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const toolbarRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Close toolbar dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setShowToolbar(false);
      }
    };
    if (showToolbar) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showToolbar]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setRows(Math.min(Math.max(val.split('\n').length, 1), 5));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(e);
      setRows(1);
    }
  };

  // ── PDF ──
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Please select a PDF file.'); return; }
    if (file.size > 20 * 1024 * 1024) { alert('File too large. Max 20MB.'); return; }
    setPendingPdf(file);
    setPdfQuestion('');
    e.target.value = '';
  };

  const handlePdfSend = () => {
    if (!pendingPdf) return;
    onFileUpload(pendingPdf, pdfQuestion.trim() || 'Please summarize this document and highlight the key points.');
    setPendingPdf(null);
    setPdfQuestion('');
  };

  // ── Voice ──
  const getSupportedMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current);
        setRecordingTime(0);

        if (audioChunksRef.current.length === 0) {
          setRecState('idle');
          alert('No audio recorded. Please try again.');
          return;
        }

        const mimeUsed = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeUsed });
        setRecState('transcribing');
        await transcribeAudio(blob);
      };

      mediaRecorder.start(100);
      setRecState('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error('Mic error:', err);
      alert('Microphone access denied. Please allow microphone access in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const transcribeAudio = async (blob) => {
    try {
      // Convert to WAV — Groq Whisper doesn't accept webm/opus
      const wavBlob = await convertToWav(blob);

      const formData = new FormData();
      formData.append('audio', wavBlob, 'voice.wav');

      const res = await fetch('http://localhost:5000/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcription failed');
      setInputValue(data.text);
      setRows(Math.min(Math.max(data.text.split('\n').length, 1), 5));
    } catch (err) {
      console.error('Transcription error:', err);
      alert('Transcription failed: ' + err.message);
    } finally {
      setRecState('idle');
    }
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Image ──
  const handleImageGenerate = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    await onImageGenerate(imagePrompt.trim());
    setIsGeneratingImage(false);
    setImagePrompt('');
    setShowImagePrompt(false);
  };

  // ── Web Search ──
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setShowSearchPrompt(false);
    await onWebSearch(searchQuery.trim());
    setSearchQuery('');
  };

  // ── Text to Audio: read file, summarize with AI, then play ──
  const handleAudioFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setIsExtractingText(true);
    setAudioReady(false);
    setAudioText('');
    setAudioStatus('Extracting text from file...');

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let rawText = '';

      if (ext === 'txt') {
        rawText = await file.text();
      } else if (ext === 'pdf') {
        // Extract text via backend
        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('sessionId', 'audio_extract');
        formData.append('question', 'Extract the full text content of this document.');
        const res = await fetch('http://localhost:5000/api/upload/pdf', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        rawText = data.reply;
      } else if (ext === 'docx') {
        const text = await file.text();
        rawText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      } else {
        alert('Unsupported file. Please use PDF, TXT, or DOCX.');
        setAudioText('');
        return;
      }

      if (!rawText.trim()) throw new Error('No text found in file.');

      // Summarize using AI
      setAudioStatus('Summarizing with AI...');
      const res = await fetch('http://localhost:5000/api/summarize-for-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAudioText(data.summary);
      setAudioStatus('');
      setAudioReady(true);
    } catch (err) {
      alert('Failed: ' + err.message);
      setAudioText('');
      setAudioStatus('');
      setAudioReady(false);
    } finally {
      setIsExtractingText(false);
    }
  };

  const isRecording = recState === 'recording';
  const isTranscribing = recState === 'transcribing';

  return (
    <div className="input-container">

      {/* Camera modal */}
      {showCamera && (
        <CameraCapture
          onCapture={(imageBase64, message) => {
            setShowCamera(false);
            onCameraCapture(imageBase64, message);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Text to Audio panel */}
      {showAudioPanel && (
        <div className="audio-panel">
          <div className="audio-panel-header">
            <span>🔊 Text to Audio</span>
            <button onClick={() => { setShowAudioPanel(false); setAudioText(''); setAudioStatus(''); setAudioReady(false); }}>✕</button>
          </div>
          <div className="audio-panel-body">
            <textarea
              className="audio-text-input"
              placeholder="Type or paste text here, or upload a file below..."
              value={audioText}
              onChange={e => { setAudioText(e.target.value); setAudioStatus(''); setAudioReady(!!e.target.value.trim()); }}
              rows={3}
            />
            <div className="audio-panel-actions">
              {/* File upload */}
              <input
                ref={audioFileRef}
                type="file"
                accept=".pdf,.txt,.docx"
                style={{ display: 'none' }}
                onChange={handleAudioFileChange}
              />
              <button
                className="audio-upload-btn"
                onClick={() => audioFileRef.current?.click()}
                disabled={isExtractingText}
              >
                {isExtractingText ? <span className="mini-spinner" /> : '📁 Upload File'}
              </button>
              <span className="audio-file-hint">PDF, TXT, DOCX</span>
            </div>
            {/* Audio player appears only when real summary is ready */}
            {audioReady && audioText.trim() && (
              <div className="audio-player-wrap">
                <div className="audio-summary-label">📝 AI Summary — ready to play</div>
                <div className="audio-summary-text">{audioText}</div>
                <AudioPlayer text={audioText.trim()} />
              </div>
            )}
            {/* Loading status */}
            {isExtractingText && audioStatus && (
              <div className="audio-extracting">
                <span className="mini-spinner" />
                <span>{audioStatus}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search panel */}
      {showSearchPrompt && (
        <div className="search-prompt-panel">
          <div className="search-prompt-header">
            <span>🔍 Web Search</span>
            <button onClick={() => setShowSearchPrompt(false)}>✕</button>
          </div>
          <div className="search-prompt-body">
            <input
              type="text"
              placeholder="Search the web..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              autoFocus
            />
            <button className="search-go-btn" onClick={handleSearch} disabled={!searchQuery.trim() || isLoading}>
              {isLoading ? <span className="mini-spinner" /> : '🔍 Search'}
            </button>
          </div>
        </div>
      )}

      {/* Image prompt panel */}
      {showImagePrompt && (
        <div className="image-prompt-panel">
          <div className="image-prompt-header">
            <span>🎨 Generate Image</span>
            <button onClick={() => setShowImagePrompt(false)}>✕</button>
          </div>
          <div className="image-prompt-body">
            <input
              type="text"
              placeholder="Describe the image you want to create..."
              value={imagePrompt}
              onChange={e => setImagePrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleImageGenerate()}
              autoFocus
            />
            <button className="image-gen-btn" onClick={handleImageGenerate}
              disabled={!imagePrompt.trim() || isGeneratingImage}>
              {isGeneratingImage ? <span className="mini-spinner" /> : '✨ Generate'}
            </button>
          </div>
        </div>
      )}

      {/* PDF panel */}
      {pendingPdf && (
        <div className="pdf-prompt-panel">
          <div className="pdf-prompt-header">
            <div className="pdf-prompt-file">
              <span className="pdf-prompt-icon">📄</span>
              <span className="pdf-prompt-name">{pendingPdf.name}</span>
              <span className="pdf-prompt-size">({(pendingPdf.size / 1024).toFixed(0)} KB)</span>
            </div>
            <button className="pdf-cancel-btn" onClick={() => { setPendingPdf(null); setPdfQuestion(''); }}>✕</button>
          </div>
          <div className="pdf-prompt-body">
            <input
              type="text"
              placeholder="Ask something about this PDF... (or leave blank to summarize)"
              value={pdfQuestion}
              onChange={e => setPdfQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePdfSend()}
              autoFocus
            />
            <button className="pdf-send-btn" onClick={handlePdfSend} disabled={isLoading}>
              {isLoading ? <span className="mini-spinner" /> : '📤 Send'}
            </button>
          </div>
        </div>
      )}

      {/* Recording bar */}
      {isRecording && (
        <div className="recording-bar">
          <span className="rec-dot" />
          <span className="rec-label">Recording {formatTime(recordingTime)}</span>
          <button className="rec-stop-btn" onClick={stopRecording}>■ Stop</button>
        </div>
      )}

      {/* Transcribing bar */}
      {isTranscribing && (
        <div className="transcribing-bar">
          <span className="mini-spinner" />
          <span>Transcribing your voice...</span>
        </div>
      )}

      {/* Main input */}
      <form onSubmit={onSendMessage} className="input-form">
        <div className="input-wrapper">
          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" accept=".pdf"
            style={{ display: 'none' }} onChange={handleFileChange} />

          {/* + Dropdown toolbar */}
          <div className="toolbar-dropdown-wrap" ref={toolbarRef}>
            <button
              type="button"
              className={`tool-plus-btn ${showToolbar ? 'active' : ''}`}
              onClick={() => setShowToolbar(s => !s)}
              disabled={isLoading || isRecording || isTranscribing}
              title="More options"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>

            {showToolbar && (
              <div className="toolbar-dropdown">
                <button type="button" className="toolbar-drop-item"
                  onClick={() => { fileInputRef.current?.click(); setShowToolbar(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  Upload PDF
                </button>

                <button type="button" className="toolbar-drop-item"
                  onClick={() => { setShowImagePrompt(s => !s); setShowToolbar(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Generate Image
                </button>

                <button type="button" className="toolbar-drop-item"
                  onClick={() => { setShowSearchPrompt(s => !s); setShowToolbar(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Web Search
                </button>

                <button type="button" className="toolbar-drop-item"
                  onClick={() => { setShowAudioPanel(s => !s); setShowToolbar(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M19.07 4.93a10 10 0 010 14.14"/>
                    <path d="M15.54 8.46a5 5 0 010 7.07"/>
                  </svg>
                  Text to Audio
                </button>

                <button type="button" className="toolbar-drop-item"
                  onClick={() => { setShowCamera(true); setShowToolbar(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Camera
                </button>

                <button type="button" className="toolbar-drop-item"
                  onClick={() => { if (onOpenProject) onOpenProject(); setShowToolbar(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  New Project
                </button>
              </div>
            )}
          </div>

          <textarea
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording ? '🔴 Recording... click ■ Stop when done' :
              isTranscribing ? '⏳ Transcribing...' :
              'Message Cloud AI... (Shift+Enter for new line)'
            }
            className="chat-input"
            disabled={isLoading || isRecording || isTranscribing}
            rows={rows}
            maxLength={4000}
          />

          <div className="input-actions">
            {/* Voice button */}
            <button
              type="button"
              className={`tool-btn voice-btn ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}
              title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Voice message'}
              onClick={isRecording ? stopRecording : isTranscribing ? undefined : startRecording}
              disabled={isLoading || isTranscribing}
            >
              {isTranscribing ? (
                <span className="mini-spinner" style={{ width: 16, height: 16 }} />
              ) : isRecording ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>

            {/* Send */}
            <button type="submit" className="send-btn"
              disabled={isLoading || isRecording || isTranscribing || !inputValue.trim()}
              title="Send (Enter)">
              {isLoading ? <span className="mini-spinner" /> : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="input-footer">
        <p>Cloud AI can make mistakes. Verify important information.</p>
      </div>
    </div>
  );
};

export default InputArea;
