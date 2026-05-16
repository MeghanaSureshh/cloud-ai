import { jsPDF } from 'jspdf';

const safe = (v, fb = '') => (v != null ? String(v) : fb);
const PU = [109, 40, 217];
const PL = [237, 233, 254];
const DK = [17, 17, 34];
const GR = [90, 90, 110];
const LG = [245, 245, 250];
const GN = [5, 150, 105];
const BL = [37, 99, 235];
const WH = [255, 255, 255];
const RD = [220, 38, 38];

export const generateAppDocsPdf = () => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 16, CW = W - M * 2;
  let y = 0;
  let pageNum = 0;

  const newPage = (skipHeader) => {
    if (pageNum > 0) pdf.addPage();
    pageNum++;
    pdf.setFillColor(...WH);
    pdf.rect(0, 0, W, 297, 'F');
    if (!skipHeader) {
      pdf.setFillColor(...PU);
      pdf.rect(0, 0, W, 10, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(...WH);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Cloud AI — Full Application Documentation', M, 7);
      pdf.text('Developed by Meghana', W - M, 7, { align: 'right' });
      pdf.setFillColor(...LG);
      pdf.rect(0, 287, W, 10, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(...GR);
      pdf.text('Page ' + pageNum, W / 2, 293, { align: 'center' });
    }
    y = skipHeader ? 0 : 18;
  };

  const chk = (n) => { if (y + (n || 20) > 278) newPage(); };

  const sec = (title, color) => {
    chk(18);
    y += 4;
    pdf.setFillColor(...(color || PU));
    pdf.roundedRect(M, y, CW, 10, 2, 2, 'F');
    pdf.setFontSize(11);
    pdf.setTextColor(...WH);
    pdf.setFont('helvetica', 'bold');
    pdf.text(safe(title), M + 5, y + 7);
    y += 14;
  };

  const sub = (title) => {
    chk(12);
    y += 3;
    pdf.setFontSize(10);
    pdf.setTextColor(...PU);
    pdf.setFont('helvetica', 'bold');
    pdf.text(safe(title), M, y);
    y += 6;
  };

  const body = (text, indent) => {
    if (!text) return;
    pdf.setFontSize(10);
    pdf.setTextColor(...DK);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(safe(text), CW - (indent || 0));
    lines.forEach(l => { chk(6); pdf.text(safe(l), M + (indent || 0), y); y += 5.5; });
  };

  const bul = (text, col) => {
    chk(7);
    pdf.setFillColor(...(col || PU));
    pdf.circle(M + 3, y - 1.5, 1.5, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(...DK);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(safe(text), CW - 9);
    lines.forEach(l => { chk(6); pdf.text(safe(l), M + 8, y); y += 5.5; });
  };

  const row = (label, value, i) => {
    chk(12);
    pdf.setFillColor(...(i % 2 === 0 ? LG : WH));
    pdf.rect(M, y - 3, CW, 11, 'F');
    pdf.setFillColor(...PU);
    pdf.rect(M, y - 3, 3, 11, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(...BL);
    pdf.setFont('helvetica', 'bold');
    pdf.text(safe(label), M + 6, y + 4);
    pdf.setTextColor(...GR);
    pdf.setFont('helvetica', 'normal');
    const vl = pdf.splitTextToSize(safe(value), CW - 55);
    pdf.text(safe(vl[0]), M + 55, y + 4);
    y += 12;
  };

  // ══════════════════════════════════════════
  // COVER PAGE
  // ══════════════════════════════════════════
  newPage(true);
  pdf.setFillColor(...PU);
  pdf.rect(0, 0, W, 70, 'F');
  pdf.setFillColor(90, 20, 180);
  pdf.rect(0, 60, W, 10, 'F');

  pdf.setFontSize(11);
  pdf.setTextColor(200, 180, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Cloud AI — Developed by Meghana', M, 18);

  pdf.setFontSize(26);
  pdf.setTextColor(...WH);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Full Application', M, 36);
  pdf.text('Documentation', M, 50);

  pdf.setFontSize(10);
  pdf.setTextColor(200, 180, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Complete technical notes — features, technologies, architecture & workflow', M, 65);

  y = 85;
  const coverMeta = [
    ['Project', 'Cloud AI Chat Application'],
    ['Developer', 'Meghana'],
    ['Frontend', 'React.js (Create React App)'],
    ['Backend', 'Node.js + Express.js'],
    ['AI Provider', 'Groq API (LLaMA 3.1, Whisper, LLaMA 4 Vision)'],
    ['Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
  ];
  coverMeta.forEach(([l, v], i) => {
    pdf.setFillColor(...(i % 2 === 0 ? LG : WH));
    pdf.rect(M, y - 3, CW, 11, 'F');
    pdf.setFillColor(...PU);
    pdf.rect(M, y - 3, 3, 11, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(...GR);
    pdf.setFont('helvetica', 'bold');
    pdf.text(l, M + 6, y + 4);
    pdf.setTextColor(...DK);
    pdf.setFont('helvetica', 'normal');
    pdf.text(v, M + 45, y + 4);
    y += 12;
  });

  y += 10;
  pdf.setFontSize(10);
  pdf.setTextColor(...GR);
  pdf.setFont('helvetica', 'normal');
  pdf.text('This document covers all features, technologies, architecture, and workflow of the Cloud AI application.', M, y, { maxWidth: CW });

  pdf.setFillColor(...PU);
  pdf.rect(0, 285, W, 12, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(...WH);
  pdf.text('Cloud AI by Meghana', W / 2, 292, { align: 'center' });

  // ══════════════════════════════════════════
  // PAGE 2: PROJECT OVERVIEW
  // ══════════════════════════════════════════
  newPage();
  sec('1. Project Overview');
  body('Cloud AI is a full-stack AI-powered chat application developed by Meghana. It provides a modern, feature-rich conversational interface powered by Groq\'s LLaMA models. The application includes real-time AI chat, PDF analysis, image generation, voice messaging, web search, text-to-audio conversion, camera/photo analysis, and a project code generator with Vercel deployment.');
  y += 4;

  sec('2. Application Architecture');
  sub('Frontend (React.js)');
  body('The frontend is built with React.js using Create React App. It uses React Router v6 for navigation, React Context API for authentication state management, and custom CSS with a dark purple theme. The UI is fully responsive and works on desktop and mobile.');
  y += 3;
  sub('Backend (Node.js + Express)');
  body('The backend is an Express.js REST API server running on port 5000. It handles all AI API calls, file processing, authentication, and serves as a proxy for external services. All sensitive API keys are stored in a .env file and never exposed to the frontend.');
  y += 3;
  sub('Communication');
  body('The frontend communicates with the backend via HTTP REST API calls using the browser\'s native fetch() API. CORS is configured to allow requests only from localhost:3000 during development.');

  // ══════════════════════════════════════════
  // PAGE 3: TECHNOLOGIES
  // ══════════════════════════════════════════
  newPage();
  sec('3. Technologies Used');

  const techs = [
    ['React.js 19', 'Frontend UI framework — component-based architecture, hooks, state management'],
    ['React Router v6', 'Client-side routing — Login, Signup, Chat pages with protected routes'],
    ['React Context API', 'Global auth state — user login/logout persisted in localStorage'],
    ['Node.js v24', 'JavaScript runtime for the backend server'],
    ['Express.js 4', 'Web framework for building REST API endpoints'],
    ['Groq SDK', 'Official SDK to call Groq AI models (LLaMA, Whisper, Vision)'],
    ['LLaMA 3.1 8B Instant', 'Primary chat model — fast responses for conversations'],
    ['LLaMA 3.3 70B Versatile', 'Project code generation — higher quality, larger context'],
    ['LLaMA 4 Scout Vision', 'Image/photo analysis — understands images + text together'],
    ['Whisper Large v3', 'Voice transcription — converts speech to text in English'],
    ['Pollinations.ai', 'Free image generation API — no API key required'],
    ['DuckDuckGo API', 'Free web search — returns real search results with links'],
    ['pdf-parse', 'Node.js library to extract text content from PDF files'],
    ['multer', 'Node.js middleware for handling file uploads (PDF, audio)'],
    ['archiver', 'Node.js library to create ZIP files for project downloads'],
    ['axios', 'HTTP client for Vercel API deployment calls'],
    ['jsPDF', 'Client-side PDF generation library for documentation export'],
    ['Web Speech API', 'Browser built-in API for text-to-speech audio playback'],
    ['MediaRecorder API', 'Browser built-in API for recording voice messages'],
    ['Web Audio API', 'Browser built-in API for converting audio to WAV format'],
    ['getUserMedia API', 'Browser built-in API for camera and microphone access'],
    ['crypto (Node.js)', 'Built-in module for UUID generation and password hashing'],
    ['SHA-256 Hashing', 'Password security — passwords are hashed before storage'],
  ];
  techs.forEach((t, i) => row(t[0], t[1], i));

  // ══════════════════════════════════════════
  // PAGE 4: FEATURES
  // ══════════════════════════════════════════
  newPage();
  sec('4. Features — Complete List');

  const features = [
    ['Authentication', 'Login & Signup with SHA-256 hashed passwords. Session persisted in localStorage. Protected routes redirect unauthenticated users to login.'],
    ['AI Chat', 'Real-time conversation with LLaMA 3.1 8B. Maintains conversation history per session. Auto-titles chats from first message.'],
    ['Chat History Sidebar', 'All conversations listed in left sidebar. Pin, rename, delete chats. Pinned chats shown at top. Auto-scroll to latest message.'],
    ['PDF Upload & Analysis', 'Upload any PDF up to 20MB. Text extracted using pdf-parse. AI summarizes and answers questions about the document.'],
    ['Image Generation', 'Describe any image in text. Groq enhances the prompt. Pollinations.ai generates the image. View full size and download.'],
    ['Voice Messages', 'Record voice using microphone. Audio converted to WAV using Web Audio API. Groq Whisper transcribes to English text. Text fills input box.'],
    ['Web Search', 'Search the web using DuckDuckGo free API. AI summarizes results. Clickable links with source, title, and snippet shown.'],
    ['Text to Audio', 'Upload PDF/TXT/DOCX or type text. AI summarizes to natural English script. Browser reads it aloud. Downloadable as audio file.'],
    ['Camera / Photo Chat', 'Take photo with device camera or upload image. Add a text message. LLaMA 4 Vision analyzes the image and responds.'],
    ['Project Creator', 'Step-by-step wizard: name → category → type → stack → details. AI generates complete project files. Download as ZIP. Deploy to Vercel. Export documentation PDF.'],
    ['Project Documentation PDF', 'Auto-generated PDF for created projects with overview, workflow, technologies, file structure, and setup instructions.'],
    ['Dark Theme UI', 'Deep dark purple theme throughout. Glass-morphism effects. Smooth animations. Fully responsive for mobile and desktop.'],
  ];

  features.forEach(([name, desc], i) => {
    chk(20);
    pdf.setFillColor(...(i % 2 === 0 ? LG : WH));
    pdf.roundedRect(M, y - 2, CW, 16, 2, 2, 'F');
    pdf.setFillColor(...GN);
    pdf.roundedRect(M, y - 2, 4, 16, 2, 2, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(...DK);
    pdf.setFont('helvetica', 'bold');
    pdf.text(safe(name), M + 8, y + 4);
    pdf.setFontSize(9);
    pdf.setTextColor(...GR);
    pdf.setFont('helvetica', 'normal');
    const dl = pdf.splitTextToSize(safe(desc), CW - 10);
    pdf.text(safe(dl[0]), M + 8, y + 10);
    y += 18;
  });

  // ══════════════════════════════════════════
  // PAGE 5: FILE STRUCTURE
  // ══════════════════════════════════════════
  newPage();
  sec('5. Project File Structure');

  const files = [
    ['backend/server.js', 'Main Express server — all API endpoints, middleware, auth'],
    ['backend/.env', 'Environment variables — GROQ_API_KEY, PORT, VERCEL_TOKEN'],
    ['backend/package.json', 'Backend dependencies — express, groq-sdk, multer, archiver'],
    ['backend/tmp/', 'Temporary folder for voice WAV files and generated images'],
    ['src/App.jsx', 'Root component — React Router setup, auth routes, protected routes'],
    ['src/App.css', 'Global app layout styles'],
    ['src/index.css', 'Global CSS reset, scrollbar styles, dark background'],
    ['src/context/AuthContext.jsx', 'Auth state — login, signup, logout, localStorage persistence'],
    ['src/components/Login.jsx', 'Login page with email/password form and validation'],
    ['src/components/Signup.jsx', 'Signup page with password strength meter and match check'],
    ['src/components/ChatApp.jsx', 'Main chat controller — all feature handlers, state management'],
    ['src/components/Header.jsx', 'Top bar — Cloud AI logo, sidebar toggle, project button, menu'],
    ['src/components/Sidebar.jsx', 'Chat history sidebar — pin, rename, delete, user profile'],
    ['src/components/MessageList.jsx', 'Scrollable message list with typing indicator and suggestions'],
    ['src/components/Message.jsx', 'Individual message — text, PDF card, image, search results, photo'],
    ['src/components/InputArea.jsx', 'Input bar — all tool buttons, panels, voice recording'],
    ['src/components/AudioPlayer.jsx', 'TTS audio player — play, pause, stop, download'],
    ['src/components/CameraCapture.jsx', 'Camera modal — live preview, capture, flip, upload fallback'],
    ['src/components/ProjectCreator.jsx', 'Project wizard — 6-step form, generate, download, deploy'],
    ['src/utils/audioUtils.js', 'Converts webm audio to WAV for Groq Whisper compatibility'],
    ['src/utils/ttsUtils.js', 'Web Speech API helpers — speak, pause, stop, resume'],
    ['src/utils/generateProjectPdf.js', 'Generates project documentation PDF using jsPDF'],
    ['src/utils/generateAppDocsPdf.js', 'Generates this full application documentation PDF'],
    ['src/styles/*.css', 'Component-specific CSS files for each component'],
  ];
  files.forEach((f, i) => row(f[0], f[1], i));

  // ══════════════════════════════════════════
  // PAGE 6: API ENDPOINTS
  // ══════════════════════════════════════════
  newPage();
  sec('6. Backend API Endpoints');

  const apis = [
    ['POST /api/auth/signup', 'Register new user — name, email, password (SHA-256 hashed)'],
    ['POST /api/auth/login', 'Login — validates email + hashed password, returns user object'],
    ['GET  /api/health', 'Health check — returns { status: "ok" }'],
    ['POST /api/chat', 'Send message — returns AI reply, maintains session history'],
    ['POST /api/chat/clear', 'Clear conversation history for a session'],
    ['POST /api/upload/pdf', 'Upload PDF — extracts text, AI answers question about it'],
    ['POST /api/generate/image', 'Generate image — enhances prompt, fetches from Pollinations'],
    ['GET  /api/image/:id', 'Serve generated image from temp storage'],
    ['GET  /api/image/download/:id', 'Download generated image as JPEG'],
    ['POST /api/transcribe', 'Transcribe WAV audio using Groq Whisper (English)'],
    ['POST /api/search', 'Web search via DuckDuckGo + AI summary of results'],
    ['POST /api/vision', 'Analyze photo + text using LLaMA 4 Scout Vision model'],
    ['POST /api/summarize-for-audio', 'Summarize text into natural English audio script'],
    ['POST /api/project/generate', 'Generate project files using LLaMA 3.3 70B'],
    ['GET  /api/project/download/:id', 'Download project as ZIP using archiver'],
    ['POST /api/project/deploy/:id', 'Deploy project to Vercel using Vercel API'],
    ['GET  /api/project/files/:id', 'Get project file list for preview'],
    ['POST /api/project/docs/:id', 'Generate AI documentation for a project'],
  ];
  apis.forEach((a, i) => row(a[0], a[1], i));

  // ══════════════════════════════════════════
  // PAGE 7: WORKFLOW
  // ══════════════════════════════════════════
  newPage();
  sec('7. Application Workflow');

  const workflows = [
    { title: 'User Authentication Flow', steps: [
      'User visits / → redirected to /login',
      'Enters email + password → POST /api/auth/login',
      'Backend validates credentials (SHA-256 hash comparison)',
      'User object stored in React Context + localStorage',
      'Redirected to /chat — protected route now accessible',
      'On refresh — user restored from localStorage automatically',
    ]},
    { title: 'Chat Message Flow', steps: [
      'User types message and presses Enter',
      'Message added to UI immediately (optimistic update)',
      'POST /api/chat with message + sessionId',
      'Backend appends to conversation history array',
      'Groq LLaMA 3.1 8B generates response',
      'Reply added to UI, history updated for context',
    ]},
    { title: 'Voice Message Flow', steps: [
      'User clicks mic button → browser requests microphone permission',
      'MediaRecorder records audio as webm/opus',
      'On stop → Web Audio API decodes and resamples to 16kHz WAV',
      'WAV file sent to POST /api/transcribe',
      'Groq Whisper Large v3 transcribes to English text',
      'Text fills the input box — user reviews and sends',
    ]},
    { title: 'Image Generation Flow', steps: [
      'User clicks image icon → types description',
      'POST /api/generate/image with prompt',
      'Groq LLaMA enhances the prompt to be more detailed',
      'Backend fetches image from Pollinations.ai (free, no key)',
      'Image saved to temp storage, served via /api/image/:id',
      'Image displayed in chat with View Full + Download buttons',
    ]},
    { title: 'PDF Analysis Flow', steps: [
      'User clicks PDF icon → selects file + types question',
      'File sent to POST /api/upload/pdf as multipart form',
      'pdf-parse extracts all text from the PDF',
      'Text + question sent to Groq LLaMA for analysis',
      'AI response shown in chat with PDF card attachment',
    ]},
    { title: 'Camera / Vision Flow', steps: [
      'User clicks camera icon → browser requests camera permission',
      'Live video stream shown in modal using getUserMedia',
      'User captures photo → canvas.toDataURL() converts to base64',
      'User adds optional text message',
      'POST /api/vision with base64 image + message',
      'LLaMA 4 Scout Vision analyzes image and responds',
    ]},
    { title: 'Project Creation Flow', steps: [
      'User clicks "New Project" → 5-step wizard opens',
      'Steps: Name → Category → Type → Stack → Details',
      'POST /api/project/generate with all selections',
      'LLaMA 3.3 70B generates complete project files as JSON',
      'Files stored in memory, ZIP available for download',
      'Optional: Deploy to Vercel using Vercel API token',
      'Optional: Generate documentation PDF',
    ]},
  ];

  workflows.forEach(wf => {
    chk(20);
    sub(wf.title);
    wf.steps.forEach((s, i) => {
      chk(8);
      pdf.setFillColor(...PU);
      pdf.circle(M + 4, y - 1, 3.5, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(...WH);
      pdf.setFont('helvetica', 'bold');
      pdf.text(safe(i + 1), M + 4, y + 0.8, { align: 'center' });
      pdf.setFontSize(10);
      pdf.setTextColor(...DK);
      pdf.setFont('helvetica', 'normal');
      const ls = pdf.splitTextToSize(safe(s), CW - 12);
      ls.forEach(l => { chk(6); pdf.text(safe(l), M + 11, y); y += 5.5; });
      y += 2;
    });
    y += 4;
  });

  // ══════════════════════════════════════════
  // PAGE 8: HOW TO RUN
  // ══════════════════════════════════════════
  newPage();
  sec('8. How to Run the Application');

  sub('Prerequisites');
  ['Node.js v18 or higher installed', 'npm (comes with Node.js)', 'A Groq API key from console.groq.com (free)', 'A modern browser (Chrome recommended)'].forEach(p => bul(p, GN));
  y += 4;

  sub('Step 1 — Setup Backend');
  const be = [
    'Open terminal and navigate to: cd C:\\Users\\Meghana\\Desktop\\claude-ai-chat\\backend',
    'Install dependencies: npm install',
    'Open backend/.env and set your GROQ_API_KEY',
    'Start backend: npm run dev',
    'Backend runs at http://localhost:5000',
  ];
  be.forEach((s, i) => {
    chk(8);
    pdf.setFillColor(...GN);
    pdf.circle(M + 4, y - 1, 3.5, 'F');
    pdf.setFontSize(8); pdf.setTextColor(...WH); pdf.setFont('helvetica', 'bold');
    pdf.text(safe(i + 1), M + 4, y + 0.8, { align: 'center' });
    pdf.setFontSize(10); pdf.setTextColor(...DK); pdf.setFont('helvetica', 'normal');
    const ls = pdf.splitTextToSize(safe(s), CW - 12);
    ls.forEach(l => { chk(6); pdf.text(safe(l), M + 11, y); y += 5.5; });
    y += 2;
  });
  y += 4;

  sub('Step 2 — Setup Frontend');
  const fe = [
    'Open a second terminal',
    'Navigate to: cd C:\\Users\\Meghana\\Desktop\\claude-ai-chat\\claude-ai-chat',
    'Install dependencies: npm install',
    'Start frontend: npm start',
    'Browser opens automatically at http://localhost:3000',
  ];
  fe.forEach((s, i) => {
    chk(8);
    pdf.setFillColor(...BL);
    pdf.circle(M + 4, y - 1, 3.5, 'F');
    pdf.setFontSize(8); pdf.setTextColor(...WH); pdf.setFont('helvetica', 'bold');
    pdf.text(safe(i + 1), M + 4, y + 0.8, { align: 'center' });
    pdf.setFontSize(10); pdf.setTextColor(...DK); pdf.setFont('helvetica', 'normal');
    const ls = pdf.splitTextToSize(safe(s), CW - 12);
    ls.forEach(l => { chk(6); pdf.text(safe(l), M + 11, y); y += 5.5; });
    y += 2;
  });
  y += 4;

  sub('Important Notes');
  ['Both terminals must stay running at the same time', 'Backend must start before using any AI features', 'Keep your API keys private — never share the .env file', 'The backend uses in-memory storage — data resets on restart'].forEach(n => bul(n, RD));

  // ══════════════════════════════════════════
  // FINAL FOOTER
  // ══════════════════════════════════════════
  chk(20);
  y += 10;
  pdf.setDrawColor(220, 220, 235);
  pdf.setLineWidth(0.5);
  pdf.line(M, y, W - M, y);
  y += 7;
  pdf.setFontSize(10);
  pdf.setTextColor(...GR);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Cloud AI — Developed by Meghana', W / 2, y, { align: 'center' });
  y += 6;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Generated on ' + new Date().toLocaleString(), W / 2, y, { align: 'center' });

  pdf.save('CloudAI-Full-Documentation.pdf');
};
