import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../styles/CameraCapture.css';

const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [mode, setMode] = useState('camera'); // camera | preview | upload
  const [capturedImage, setCapturedImage] = useState(null);
  const [message, setMessage] = useState('');
  const [facingMode, setFacingMode] = useState('user');
  const [cameraError, setCameraError] = useState('');

  const startCamera = useCallback(async (facing) => {
    const facingToUse = facing || facingMode;
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingToUse, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for metadata before playing — prevents the interrupted play() error
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {
            // Silently ignore — autoPlay attribute handles it
          });
        };
      }

      setCameraError('');
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Camera access denied. Please allow camera access or upload a photo instead.');
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [startCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    setMode('preview');
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const handleFlip = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setMode('camera');
    startCamera();
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target.result);
      setMode('preview');
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = () => {
    if (!capturedImage) return;
    onCapture(capturedImage, message.trim());
    onClose();
  };

  return (
    <div className="camera-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="camera-modal">
        {/* Header */}
        <div className="camera-header">
          <span className="camera-title">📷 Camera</span>
          <button className="camera-close" onClick={onClose}>✕</button>
        </div>

        {/* Camera view */}
        {mode === 'camera' && (
          <div className="camera-view">
            {cameraError ? (
              <div className="camera-error">
                <span>📷</span>
                <p>{cameraError}</p>
                <label className="upload-fallback-btn">
                  📁 Upload Photo Instead
                  <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
                </label>
              </div>
            ) : (
              <>
                <video ref={videoRef} className="camera-video" playsInline muted />
                <div className="camera-controls">
                  <button className="cam-ctrl-btn" onClick={handleFlip} title="Flip camera">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
                    </svg>
                  </button>
                  <button className="capture-btn" onClick={handleCapture}>
                    <div className="capture-inner" />
                  </button>
                  <label className="cam-ctrl-btn" title="Upload photo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </>
            )}
          </div>
        )}

        {/* Preview */}
        {mode === 'preview' && capturedImage && (
          <div className="camera-preview">
            <img src={capturedImage} alt="Captured" className="preview-img" />
            <div className="preview-message">
              <input
                type="text"
                placeholder="Add a message about this photo... (optional)"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                autoFocus
                className="preview-input"
              />
            </div>
            <div className="preview-actions">
              <button className="retake-btn" onClick={handleRetake}>🔄 Retake</button>
              <button className="send-photo-btn" onClick={handleSend}>
                Send to Cloud AI →
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default CameraCapture;
