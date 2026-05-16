import React, { useState } from 'react';
import '../styles/ProjectCreator.css';
import { generateProjectPdf } from '../utils/generateProjectPdf';

// Step 1: Category
const CATEGORIES = [
  { value: 'web', label: '🌐 Web Application', desc: 'Browser-based app or website' },
  { value: 'mobile', label: '📱 Mobile App UI', desc: 'Mobile-first responsive UI' },
  { value: 'backend', label: '⚙️ Backend / API', desc: 'Server, REST API, database' },
  { value: 'fullstack', label: '🔗 Full Stack', desc: 'Frontend + Backend together' },
  { value: 'tool', label: '🛠️ Dev Tool / Utility', desc: 'CLI tool, script, utility' },
  { value: 'game', label: '🎮 Game', desc: 'Browser-based game' },
];

// Step 2: Type based on category
const TYPES_BY_CATEGORY = {
  web: [
    { value: 'landing', label: '🎯 Landing Page', desc: 'Marketing / product page' },
    { value: 'portfolio', label: '💼 Portfolio', desc: 'Personal showcase site' },
    { value: 'dashboard', label: '📊 Dashboard', desc: 'Admin / analytics panel' },
    { value: 'blog', label: '📝 Blog', desc: 'Articles and posts' },
    { value: 'ecommerce', label: '🛒 E-Commerce', desc: 'Product listing & cart' },
    { value: 'saas', label: '☁️ SaaS App', desc: 'Software as a service UI' },
  ],
  mobile: [
    { value: 'todo', label: '✅ Todo App', desc: 'Task management' },
    { value: 'chat', label: '💬 Chat UI', desc: 'Messaging interface' },
    { value: 'social', label: '👥 Social Feed', desc: 'Posts and profiles' },
    { value: 'fitness', label: '💪 Fitness Tracker', desc: 'Health & workout app' },
  ],
  backend: [
    { value: 'rest-api', label: '🔌 REST API', desc: 'Express or FastAPI endpoints' },
    { value: 'auth-server', label: '🔐 Auth Server', desc: 'Login / JWT / OAuth' },
    { value: 'crud-api', label: '📦 CRUD API', desc: 'Create, Read, Update, Delete' },
    { value: 'django-app', label: '🎸 Django Backend', desc: 'Django + REST Framework' },
    { value: 'flask-app', label: '🧪 Flask Backend', desc: 'Lightweight Python API' },
  ],
  fullstack: [
    { value: 'react-node', label: '⚛️ React + Node.js', desc: 'MERN / React + Express' },
    { value: 'next-app', label: '▲ Next.js App', desc: 'Full stack Next.js' },
    { value: 'todo-fullstack', label: '✅ Todo Full Stack', desc: 'Complete todo with backend' },
    { value: 'python-react', label: '🐍 Python + React', desc: 'React frontend + Python backend' },
    { value: 'django-app', label: '🎸 Django App', desc: 'Full Django web app' },
    { value: 'flask-app', label: '🧪 Flask App', desc: 'Lightweight Flask web app' },
  ],
  tool: [
    { value: 'cli', label: '💻 CLI Tool', desc: 'Command line utility' },
    { value: 'converter', label: '🔄 Converter', desc: 'File / data converter' },
    { value: 'scraper', label: '🕷️ Web Scraper', desc: 'Data extraction tool' },
  ],
  game: [
    { value: 'puzzle', label: '🧩 Puzzle Game', desc: 'Logic / puzzle game' },
    { value: 'arcade', label: '👾 Arcade Game', desc: 'Classic arcade style' },
    { value: 'quiz', label: '❓ Quiz Game', desc: 'Trivia / quiz app' },
  ],
};

// Step 3: Stack based on type
const STACKS_BY_TYPE = {
  // ── Web ──
  landing:    ['HTML + CSS + JS', 'HTML + Tailwind CSS', 'React + Tailwind', 'React + CSS'],
  portfolio:  ['HTML + CSS + JS', 'HTML + Tailwind CSS', 'React + CSS', 'React + Tailwind'],
  dashboard:  ['React + Tailwind + Recharts', 'React + CSS + Chart.js', 'HTML + CSS + Chart.js', 'MERN Stack'],
  blog:       ['HTML + CSS + JS', 'React + CSS', 'React + Tailwind', 'Django + HTML + CSS'],
  ecommerce:  ['MERN Stack (React + Node + MongoDB)', 'React + Django + Python', 'React + Tailwind', 'HTML + CSS + JS'],
  saas:       ['MERN Stack', 'React + Django + Python', 'React + FastAPI + Python', 'React + Node.js + Express'],
  // ── Mobile ──
  todo:       ['React + CSS', 'React + Tailwind', 'HTML + CSS + JS'],
  chat:       ['MERN Stack + Socket.io', 'React + Node.js + Socket.io', 'React + CSS'],
  social:     ['MERN Stack', 'React + Django + Python', 'React + CSS'],
  fitness:    ['React + Tailwind', 'React + CSS', 'HTML + CSS + JS'],
  // ── Backend ──
  'rest-api':    ['Node.js + Express', 'Node.js + Express + MongoDB', 'Python + FastAPI', 'Python + Django REST Framework', 'Python + Flask'],
  'auth-server': ['Node.js + Express + JWT', 'Python + Django + JWT', 'Python + FastAPI + JWT', 'Node.js + Express + OAuth'],
  'crud-api':    ['Node.js + Express + MongoDB', 'Python + Django + SQLite', 'Python + FastAPI + SQLite', 'Node.js + Express + MySQL'],
  // ── Full Stack ──
  'react-node':     ['MERN Stack (React + Node + Express + MongoDB)', 'React + Express + MySQL', 'React + Express + PostgreSQL'],
  'next-app':       ['Next.js + Tailwind', 'Next.js + CSS', 'Next.js + MongoDB', 'Next.js + PostgreSQL'],
  'todo-fullstack': ['MERN Stack', 'React + Django + Python', 'React + Flask + Python', 'React + FastAPI + Python'],
  'python-react':   ['React + Django + Python', 'React + FastAPI + Python', 'React + Flask + Python'],
  'django-app':     ['Django + HTML + CSS', 'Django REST Framework + React', 'Django + Tailwind CSS'],
  'flask-app':      ['Flask + HTML + CSS', 'Flask REST API + React', 'Flask + Tailwind CSS'],
  // ── Tools ──
  cli:        ['Node.js + Commander', 'Python + Click', 'Python', 'Node.js'],
  converter:  ['Python + Flask', 'Node.js + Express', 'HTML + CSS + JS'],
  scraper:    ['Python + BeautifulSoup', 'Python + Scrapy', 'Node.js + Cheerio', 'Node.js + Puppeteer'],
  // ── Games ──
  puzzle:     ['HTML + Canvas + JS', 'HTML + CSS + JS', 'React + CSS'],
  arcade:     ['HTML + Canvas + JS', 'HTML + CSS + JS'],
  quiz:       ['HTML + CSS + JS', 'React + CSS', 'React + Tailwind'],
};

const DEFAULT_STACK = ['HTML + CSS + JS', 'React + CSS', 'Node.js + Express', 'MERN Stack', 'Python + Django'];

const ProjectCreator = ({ onClose }) => {
  const [step, setStep] = useState(0); // 0=name,1=category,2=type,3=stack,4=details,5=generating,6=result
  const [form, setForm] = useState({ name: '', category: '', type: '', stack: '', description: '', features: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [vercelToken, setVercelToken] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [showFiles, setShowFiles] = useState(false);
  const [projectFiles, setProjectFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const types = TYPES_BY_CATEGORY[form.category] || [];
  const stacks = STACKS_BY_TYPE[form.type] || DEFAULT_STACK;

  const next = () => setStep(s => s + 1);
  const back = () => { setStep(s => s - 1); setError(''); };

  const handleGenerate = async () => {
    setStep(5); // generating
    setError('');
    // Ensure stack has a value — fall back to first option if user didn't pick
    const resolvedStack = form.stack || stacks[0] || 'HTML + CSS + JS';
    try {
      const res = await fetch('http://localhost:5000/api/project/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          category: form.category,
          stack: resolvedStack,
          description: form.description,
          features: form.features,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStep(6); // result
    } catch (err) {
      setError(err.message);
      setStep(4); // back to details
    }
  };

  const handleDownload = () => {
    window.open(`http://localhost:5000/api/project/download/${result.projectId}`, '_blank');
  };

  const handleDownloadDocs = async () => {
    setGeneratingPdf(true);
    try {
      await generateProjectPdf(result.projectId, result.name, {
        type: form.type,
        stack: form.stack || stacks[0],
        fileCount: result.fileCount,
        description: result.description,
        runInstructions: result.runInstructions,
        files: result.files || [],
      });
    } catch (err) {
      setError('Failed to generate PDF: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleViewFiles = async () => {
    if (projectFiles.length > 0) { setShowFiles(v => !v); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/project/files/${result.projectId}`);
      const data = await res.json();
      setProjectFiles(data.files);
      setSelectedFile(data.files[0]);
      setShowFiles(true);
    } catch {}
  };

  const handleDeploy = async () => {
    setDeploying(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/project/deploy/${result.projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vercelToken: vercelToken.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeployResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeploying(false);
    }
  };

  const reset = () => {
    setStep(0); setForm({ name: '', category: '', type: '', stack: '', description: '', features: '' });
    setResult(null); setDeployResult(null); setShowFiles(false); setProjectFiles([]); setError('');
  };

  // Progress bar (only for steps 0-4)
  const progressSteps = ['Name', 'Category', 'Type', 'Stack', 'Details'];

  return (
    <div className="project-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="project-modal">

        {/* Header */}
        <div className="project-modal-header">
          <div className="project-modal-title">
            <span className="project-modal-icon">🏗️</span>
            <div>
              <h2>Project Creator</h2>
              <p>{step < 5 ? `Step ${step + 1} of 5` : step === 5 ? 'Generating...' : 'Your project is ready!'}</p>
            </div>
          </div>
          <button className="project-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Progress bar */}
        {step < 5 && (
          <div className="wizard-progress">
            {progressSteps.map((s, i) => (
              <div key={s} className={`wizard-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                <div className="wizard-dot">{i < step ? '✓' : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 0: Name ── */}
        {step === 0 && (
          <div className="wizard-body">
            <div className="wizard-question">What's your project called?</div>
            <input
              className="project-input big-input"
              placeholder="e.g. My Portfolio, Task Manager, Shop App..."
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && form.name.trim() && next()}
              autoFocus
            />
            {error && <div className="project-error">⚠️ {error}</div>}
            <div className="wizard-actions">
              <button className="wizard-next-btn" onClick={() => { if (!form.name.trim()) { setError('Please enter a project name.'); return; } setError(''); next(); }} disabled={!form.name.trim()}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Category ── */}
        {step === 1 && (
          <div className="wizard-body">
            <div className="wizard-question">What are you building?</div>
            <div className="option-grid">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  className={`option-card ${form.category === c.value ? 'selected' : ''}`}
                  onClick={() => { setForm(f => ({ ...f, category: c.value, type: '', stack: '' })); }}
                >
                  <span className="option-label">{c.label}</span>
                  <span className="option-desc">{c.desc}</span>
                </button>
              ))}
            </div>
            <div className="wizard-actions">
              <button className="wizard-back-btn" onClick={back}>← Back</button>
              <button className="wizard-next-btn" onClick={() => { if (!form.category) { setError('Please select a category.'); return; } setError(''); next(); }} disabled={!form.category}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Type ── */}
        {step === 2 && (
          <div className="wizard-body">
            <div className="wizard-question">What type of {form.category === 'web' ? 'web app' : form.category} is it?</div>
            <div className="option-grid">
              {types.map(t => (
                <button
                  key={t.value}
                  className={`option-card ${form.type === t.value ? 'selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, type: t.value, stack: '' }))}
                >
                  <span className="option-label">{t.label}</span>
                  <span className="option-desc">{t.desc}</span>
                </button>
              ))}
            </div>
            <div className="wizard-actions">
              <button className="wizard-back-btn" onClick={back}>← Back</button>
              <button className="wizard-next-btn" onClick={() => { if (!form.type) { setError('Please select a type.'); return; } setError(''); next(); }} disabled={!form.type}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Stack ── */}
        {step === 3 && (
          <div className="wizard-body">
            <div className="wizard-question">Which tech stack?</div>
            <div className="stack-list">
              {stacks.map(s => (
                <button
                  key={s}
                  className={`stack-option ${(form.stack || stacks[0]) === s ? 'selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, stack: s }))}
                >
                  <span className="stack-check">{(form.stack || stacks[0]) === s ? '✓' : ''}</span>
                  {s}
                </button>
              ))}
            </div>
            <div className="wizard-actions">
              <button className="wizard-back-btn" onClick={back}>← Back</button>
              <button className="wizard-next-btn" onClick={() => { setForm(f => ({ ...f, stack: f.stack || stacks[0] })); next(); }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Details ── */}
        {step === 4 && (
          <div className="wizard-body">
            <div className="wizard-question">Any extra details? <span className="optional-tag">(optional)</span></div>
            <div className="details-form">
              <div className="detail-row">
                <label>Description</label>
                <textarea
                  className="project-textarea"
                  placeholder={`Describe your ${form.name}... e.g. A dark-themed portfolio with animations`}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="detail-row">
                <label>Features</label>
                <input
                  className="project-input"
                  placeholder="e.g. dark mode, animations, contact form, charts..."
                  value={form.features}
                  onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="project-summary">
              <div className="summary-row"><span>Name</span><strong>{form.name}</strong></div>
              <div className="summary-row"><span>Category</span><strong>{CATEGORIES.find(c => c.value === form.category)?.label}</strong></div>
              <div className="summary-row"><span>Type</span><strong>{types.find(t => t.value === form.type)?.label}</strong></div>
              <div className="summary-row"><span>Stack</span><strong>{form.stack || stacks[0]}</strong></div>
            </div>

            {error && <div className="project-error">⚠️ {error}</div>}
            <div className="wizard-actions">
              <button className="wizard-back-btn" onClick={back}>← Back</button>
              <button className="wizard-generate-btn" onClick={handleGenerate}>
                ✨ Generate Project
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Generating ── */}
        {step === 5 && (
          <div className="project-generating">
            <div className="generating-animation">
              <div className="gen-orb" />
              <div className="gen-icon">🏗️</div>
            </div>
            <h3>Building <span className="gen-name">"{form.name}"</span></h3>
            <p>AI is writing all the code for your {form.type} project</p>
            <div className="gen-steps">
              <div className="gen-step active">📋 Planning file structure</div>
              <div className="gen-step active">💻 Writing code</div>
              <div className="gen-step active">🎨 Styling UI</div>
              <div className="gen-step">📦 Packaging files</div>
            </div>
          </div>
        )}

        {/* ── Step 6: Result ── */}
        {step === 6 && result && (
          <div className="project-result">
            {error && <div className="project-error">⚠️ {error}</div>}

            <div className="result-header">
              <div className="result-icon">✅</div>
              <div>
                <h3>{result.name}</h3>
                <p>{result.description}</p>
              </div>
            </div>

            <div className="result-stats">
              <div className="stat-item"><span className="stat-num">{result.fileCount}</span><span className="stat-label">Files</span></div>
              <div className="stat-item"><span className="stat-num">{form.stack?.split('+')[0]?.trim()}</span><span className="stat-label">Stack</span></div>
              <div className="stat-item"><span className="stat-num">Ready</span><span className="stat-label">Status</span></div>
            </div>

            {result.runInstructions && (
              <div className="run-instructions"><span>▶ How to run:</span> {result.runInstructions}</div>
            )}

            <div className="result-actions">
              <button className="action-btn download-btn" onClick={handleDownload}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download ZIP
              </button>
              <button className="action-btn view-btn" onClick={handleViewFiles}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {showFiles ? 'Hide Files' : 'View Files'}
              </button>
              <button className="action-btn docs-btn" onClick={handleDownloadDocs} disabled={generatingPdf}>
                {generatingPdf
                  ? <><span className="mini-spinner" /> Generating...</>
                  : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Docs PDF</>
                }
              </button>
            </div>

            {showFiles && projectFiles.length > 0 && (
              <div className="file-viewer">
                <div className="file-tabs">
                  {projectFiles.map(f => (
                    <button key={f.name} className={`file-tab ${selectedFile?.name === f.name ? 'active' : ''}`} onClick={() => setSelectedFile(f)}>
                      {f.name.split('/').pop()}
                    </button>
                  ))}
                </div>
                <div className="file-content"><pre><code>{selectedFile?.content}</code></pre></div>
              </div>
            )}

            {!deployResult ? (
              <div className="deploy-section">
                <div className="deploy-header">
                  <span>🚀 Deploy to Vercel</span>
                  <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="get-token-link">Get free token ↗</a>
                </div>
                <div className="deploy-input-row">
                  <input type="password" placeholder="Vercel token (optional if set in .env)" value={vercelToken} onChange={e => setVercelToken(e.target.value)} className="project-input" />
                  <button className="deploy-btn" onClick={handleDeploy} disabled={deploying}>
                    {deploying ? <><span className="mini-spinner" /> Deploying...</> : '🚀 Deploy'}
                  </button>
                </div>
                <p className="deploy-hint">Token is read from backend/.env automatically.</p>
              </div>
            ) : (
              <div className="deploy-success">
                <div className="deploy-success-icon">🎉</div>
                <div>
                  <p>Deployed successfully!</p>
                  <a href={deployResult.url} target="_blank" rel="noopener noreferrer" className="deploy-url">{deployResult.url} ↗</a>
                </div>
              </div>
            )}

            <button className="new-project-btn" onClick={reset}>+ Create Another Project</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCreator;
