import React, { useState, useEffect, useRef } from 'react';
import { speakText, stopSpeech, pauseSpeech, resumeSpeech } from '../utils/ttsUtils';
import '../styles/AudioPlayer.css';

const AudioPlayer = ({ text }) => {
  const [state, setState] = useState('idle'); // idle | loading | playing | paused
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const utteranceRef = useRef(null);
  const progressRef = useRef(null);
  const startTimeRef = useRef(null);
  const estimatedDuration = useRef(0);

  // Estimate duration: ~130 words per minute at rate 0.95
  const wordCount = text.trim().split(/\s+/).length;
  estimatedDuration.current = (wordCount / 130) * 60 * 1000;

  useEffect(() => {
    return () => {
      stopSpeech();
      clearInterval(progressRef.current);
    };
  }, []);

  const handlePlay = () => {
    if (state === 'paused') {
      resumeSpeech();
      setState('playing');
      startProgressTimer();
      return;
    }

    setState('loading');
    setProgress(0);

    // Small delay to let voices load
    setTimeout(() => {
      utteranceRef.current = speakText(text, () => {
        setState('idle');
        setProgress(0);
        clearInterval(progressRef.current);
      });
      setState('playing');
      startTimeRef.current = Date.now();
      startProgressTimer();
    }, 100);
  };

  const handlePause = () => {
    pauseSpeech();
    setState('paused');
    clearInterval(progressRef.current);
  };

  const handleStop = () => {
    stopSpeech();
    setState('idle');
    setProgress(0);
    clearInterval(progressRef.current);
  };

  const startProgressTimer = () => {
    clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / estimatedDuration.current) * 100, 98);
      setProgress(pct);
    }, 200);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Use MediaRecorder to capture speech synthesis output
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
      const destination = audioCtx.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus' });
      const chunks = [];

      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cloud-ai-speech.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        audioCtx.close();
        setIsDownloading(false);
      };

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
        || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => setTimeout(() => mediaRecorder.stop(), 400);
      utterance.onerror = () => { mediaRecorder.stop(); setIsDownloading(false); };

      mediaRecorder.start(100);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: just play it
      alert('Download not supported in this browser. The audio will play instead.');
      setIsDownloading(false);
    }
  };

  return (
    <div className="audio-player">
      <div className="audio-controls">
        {/* Play/Pause/Stop */}
        {state === 'idle' || state === 'loading' ? (
          <button
            className={`audio-btn play-btn ${state === 'loading' ? 'loading' : ''}`}
            onClick={handlePlay}
            disabled={state === 'loading'}
            title="Listen to this message"
          >
            {state === 'loading' ? (
              <span className="audio-spinner" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
          </button>
        ) : (
          <>
            <button
              className="audio-btn pause-btn"
              onClick={state === 'playing' ? handlePause : handlePlay}
              title={state === 'playing' ? 'Pause' : 'Resume'}
            >
              {state === 'playing' ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/>
                  <rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>
            <button className="audio-btn stop-btn" onClick={handleStop} title="Stop">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            </button>
          </>
        )}

        {/* Progress bar */}
        <div className="audio-progress-wrap">
          <div className="audio-progress-bar">
            <div
              className="audio-progress-fill"
              style={{ width: `${progress}%`, transition: state === 'playing' ? 'width 0.2s linear' : 'none' }}
            />
          </div>
          <span className="audio-label">
            {state === 'idle' ? 'Listen' :
             state === 'loading' ? 'Loading...' :
             state === 'playing' ? 'Playing...' : 'Paused'}
          </span>
        </div>

        {/* Download */}
        <button
          className="audio-btn download-btn"
          onClick={handleDownload}
          disabled={isDownloading}
          title="Download audio"
        >
          {isDownloading ? (
            <span className="audio-spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default AudioPlayer;
