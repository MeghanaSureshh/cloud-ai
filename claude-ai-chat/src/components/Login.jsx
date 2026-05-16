import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TypeWriter from './TypeWriter';
import '../styles/Auth.css';

const CloudLogo = () => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="auth-logo-svg">
    <defs>
      <linearGradient id="lgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#60a5fa"/>
      </linearGradient>
      <radialGradient id="lgGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4"/>
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="38" fill="url(#lgGlow)"/>
    <path d="M58 52H24a14 14 0 01-2.5-27.75A18 18 0 0156 34h2a10 10 0 010 20z" fill="url(#lgGrad)" opacity="0.95"/>
    <path d="M43 22l-9 14h9l-5 14 14-19h-9l7-9z" fill="white" opacity="0.95"/>
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/chat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-orb orb-1" />
      <div className="auth-orb orb-2" />
      <div className="auth-orb orb-3" />

      <div className="auth-card">
        <div className="auth-logo-wrap">
          <CloudLogo />
          <div className="auth-brand">
            <h1 className="auth-brand-name">Cloud AI</h1>
            <p className="auth-brand-sub">by Meghana</p>
          </div>
        </div>

        <div className="auth-header">
          <h2 className="auth-typewriter-heading">
            <TypeWriter
              texts={['WELCOME BACK!', 'GOOD TO SEE YOU!', 'SIGN IN TO CONTINUE!', 'HELLO AGAIN!']}
              speed={70}
              pause={2000}
            />
          </h2>
          <p className="auth-sub-animated">Your AI assistant is waiting for you ✨</p>
        </div>

        {error && <div className="auth-error"><span>⚠️</span> {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email address</label>
            <div className="input-wrap">
              <span className="input-icon">✉️</span>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} disabled={loading} autoComplete="email" />
            </div>
          </div>

          <div className="form-group">
            <label>
              Password
              <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
            </label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)}
                disabled={loading} autoComplete="current-password" />
              <button type="button" className="toggle-password"
                onClick={() => setShowPassword(s => !s)} tabIndex={-1}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : <>Sign In <span className="btn-arrow">→</span></>}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>
        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-link">Create one free</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
