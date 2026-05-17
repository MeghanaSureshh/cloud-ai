import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TypeWriter from './TypeWriter';
import '../styles/Auth.css';

const CloudLogo = () => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="auth-logo-svg">
    <defs>
      <linearGradient id="sgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#60a5fa"/>
      </linearGradient>
      <radialGradient id="sgGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4"/>
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="38" fill="url(#sgGlow)"/>
    <path d="M58 52H24a14 14 0 01-2.5-27.75A18 18 0 0156 34h2a10 10 0 010 20z" fill="url(#sgGrad)" opacity="0.95"/>
    <path d="M43 22l-9 14h9l-5 14 14-19h-9l7-9z" fill="white" opacity="0.95"/>
  </svg>
);

const PasswordStrength = ({ password }) => {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };
  const score = getStrength();
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
  if (!password) return null;
  return (
    <div className="password-strength">
      <div className="strength-bars">
        {[1,2,3,4].map(i => (
          <div key={i} className="strength-bar"
            style={{ background: i <= score ? colors[score] : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <span style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
};

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
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
              texts={['JOIN CLOUD AI!', 'CREATE YOUR ACCOUNT!', 'GET STARTED FREE!', 'START CHATTING!']}
              speed={70}
              pause={2000}
            />
          </h2>
          <p className="auth-sub-animated">Your intelligent AI assistant awaits 🚀</p>
        </div>

        {error && <div className="auth-error"><span>⚠️</span> {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full name</label>
            <div className="input-wrap">
              <span className="input-icon">👤</span>
              <input type="text" placeholder="Your name" value={name}
                onChange={e => setName(e.target.value)} disabled={loading} autoComplete="name" />
            </div>
          </div>

          <div className="form-group">
            <label>Email address</label>
            <div className="input-wrap">
              <span className="input-icon"></span>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} disabled={loading} autoComplete="email" />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrap">
              <span className="input-icon"></span>
              <input type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters"
                value={password} onChange={e => setPassword(e.target.value)}
                disabled={loading} autoComplete="new-password" />
              <button type="button" className="toggle-password"
                onClick={() => setShowPassword(s => !s)} tabIndex={-1}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div className="form-group">
            <label>Confirm password</label>
            <div className="input-wrap">
              <span className="input-icon"></span>
              <input type={showPassword ? 'text' : 'password'} placeholder="Re-enter your password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                disabled={loading} autoComplete="new-password" />
              {confirm && <span className="confirm-check">{confirm === password ? '✅' : '❌'}</span>}
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : <>Create Account <span className="btn-arrow">→</span></>}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>
        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
