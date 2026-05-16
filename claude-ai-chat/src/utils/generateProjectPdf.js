import API_URL from '../config.js';
import { jsPDF } from 'jspdf';

export const generateProjectPdf = async (projectId, projectName, projectData) => {
  // Try to get AI-generated docs, fall back to basic info if unavailable
  let docs = null;
  try {
    const res = await fetch(`http://localhost:5000/api/project/docs/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) docs = await res.json();
  } catch {}

  // Build doc object — use AI docs if available, otherwise use projectData
  const d = {
    projectName: projectName || 'Project',
    type: projectData?.type || docs?.type || 'web',
    stack: projectData?.stack || docs?.stack || 'N/A',
    fileCount: projectData?.fileCount || docs?.fileCount || 0,
    overview: docs?.overview || projectData?.description || `${projectName} is a web application built with ${projectData?.stack || 'modern technologies'}.`,
    howItWorks: docs?.howItWorks || `The application is built using ${projectData?.stack || 'modern web technologies'}. Users interact with the interface to perform various operations. The code is organized into separate files for structure, styling, and functionality.`,
    architecture: docs?.architecture || `The project follows a standard ${projectData?.type || 'web'} architecture with separate concerns for UI, logic, and styling.`,
    workflow: docs?.workflow || [
      { step: 'User opens the app', desc: 'The browser loads the main HTML file and initializes the application.' },
      { step: 'UI renders', desc: 'CSS styles are applied and JavaScript initializes interactive components.' },
      { step: 'User interaction', desc: 'Users interact with the interface triggering JavaScript event handlers.' },
      { step: 'Output displayed', desc: 'Results are rendered dynamically in the browser.' },
    ],
    technologies: docs?.technologies || (projectData?.stack || '').split('+').map(t => ({
      name: t.trim(),
      purpose: `Core technology used in ${projectName}`,
      version: 'latest',
    })).filter(t => t.name),
    features: docs?.features || ['Responsive design', 'Modern UI', 'Clean code structure', 'Cross-browser compatible'],
    fileStructure: docs?.fileStructure || (projectData?.files || []).map(f => ({
      file: f.name,
      purpose: `Project file: ${f.name}`,
    })),
    setup: docs?.setup || [
      'Download the project ZIP file',
      'Extract the files to a folder',
      'Open index.html in your browser (for HTML projects)',
      'Or run: npm install && npm start (for Node/React projects)',
    ],
    runInstructions: projectData?.runInstructions || 'Open index.html in your browser',
  };

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 18; // margin
  const CW = W - M * 2; // content width
  let y = 0;

  // ── Safe text helper — never pass undefined ──
  const safe = (val, fallback = '') => (val != null ? String(val) : fallback);

  const newPage = () => {
    pdf.addPage();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, W, 297, 'F');
    // Header bar
    pdf.setFillColor(109, 40, 217);
    pdf.rect(0, 0, W, 10, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safe(d.projectName) + ' — Documentation', M, 7);
    pdf.text('Cloud AI by Meghana', W - M, 7, { align: 'right' });
    // Footer bar
    pdf.setFillColor(245, 245, 250);
    pdf.rect(0, 287, W, 10, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 120);
    pdf.text('Page ' + pdf.internal.getNumberOfPages(), W / 2, 293, { align: 'center' });
    y = 18;
  };

  const checkY = (needed) => { if (y + (needed || 20) > 278) newPage(); };

  const sectionTitle = (title) => {
    checkY(18);
    y += 5;
    pdf.setFillColor(109, 40, 217);
    pdf.roundedRect(M, y, CW, 10, 2, 2, 'F');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(safe(title), M + 5, y + 7);
    y += 15;
  };

  const bodyText = (text) => {
    if (!text) return;
    pdf.setFontSize(10);
    pdf.setTextColor(17, 17, 34);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(safe(text), CW);
    lines.forEach(line => { checkY(6); pdf.text(safe(line), M, y); y += 5.5; });
  };

  const bullet = (text) => {
    if (!text) return;
    checkY(7);
    pdf.setFillColor(5, 150, 105);
    pdf.circle(M + 3, y - 1.5, 1.5, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(17, 17, 34);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(safe(text), CW - 9);
    lines.forEach(line => { checkY(6); pdf.text(safe(line), M + 8, y); y += 5.5; });
  };

  // ════════════════════════════════════════
  // COVER PAGE
  // ════════════════════════════════════════
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, W, 297, 'F');

  // Purple top banner
  pdf.setFillColor(109, 40, 217);
  pdf.rect(0, 0, W, 60, 'F');

  pdf.setFontSize(10);
  pdf.setTextColor(200, 180, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Cloud AI by Meghana', M, 14);

  pdf.setFontSize(9);
  pdf.setTextColor(200, 180, 255);
  pdf.text('PROJECT DOCUMENTATION', M, 24);

  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  const nameLines = pdf.splitTextToSize(safe(d.projectName), CW);
  nameLines.slice(0, 2).forEach((line, i) => pdf.text(safe(line), M, 40 + i * 10));

  // Meta cards
  y = 72;
  const meta = [
    { label: 'Type', value: safe(d.type).toUpperCase() },
    { label: 'Stack', value: safe(d.stack) },
    { label: 'Files', value: safe(d.fileCount) + ' files' },
    { label: 'Date', value: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) },
  ];

  meta.forEach((item, i) => {
    const cx = M + (i % 2) * (CW / 2 + 3);
    const cy = y + Math.floor(i / 2) * 22;
    pdf.setFillColor(245, 245, 250);
    pdf.roundedRect(cx, cy, CW / 2 - 1, 18, 3, 3, 'F');
    pdf.setFillColor(109, 40, 217);
    pdf.roundedRect(cx, cy, 4, 18, 2, 2, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 120);
    pdf.setFont('helvetica', 'normal');
    pdf.text(safe(item.label).toUpperCase(), cx + 8, cy + 6);
    pdf.setFontSize(10);
    pdf.setTextColor(17, 17, 34);
    pdf.setFont('helvetica', 'bold');
    const vLines = pdf.splitTextToSize(safe(item.value), CW / 2 - 14);
    pdf.text(safe(vLines[0]), cx + 8, cy + 13);
  });

  // Overview on cover
  y = 125;
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 120);
  pdf.setFont('helvetica', 'bold');
  pdf.text('OVERVIEW', M, y);
  y += 7;
  pdf.setFontSize(10);
  pdf.setTextColor(17, 17, 34);
  pdf.setFont('helvetica', 'normal');
  const ovLines = pdf.splitTextToSize(safe(d.overview), CW);
  ovLines.forEach(line => { pdf.text(safe(line), M, y); y += 5.5; });

  // Cover footer
  pdf.setFillColor(109, 40, 217);
  pdf.rect(0, 285, W, 12, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Generated by Cloud AI', W / 2, 292, { align: 'center' });

  // ════════════════════════════════════════
  // CONTENT PAGES
  // ════════════════════════════════════════
  newPage();

  // How It Works
  sectionTitle('How It Works');
  bodyText(d.howItWorks);
  y += 4;

  // Architecture
  sectionTitle('Architecture');
  bodyText(d.architecture);
  y += 4;

  // Workflow
  sectionTitle('Workflow');
  (d.workflow || []).forEach((w, i) => {
    checkY(18);
    pdf.setFillColor(237, 233, 254);
    pdf.roundedRect(M, y - 2, CW, 14, 2, 2, 'F');
    pdf.setFillColor(109, 40, 217);
    pdf.circle(M + 6, y + 5, 5, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(safe(i + 1), M + 6, y + 7, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(17, 17, 34);
    pdf.setFont('helvetica', 'bold');
    pdf.text(safe(w.step), M + 14, y + 4);
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 110);
    pdf.setFont('helvetica', 'normal');
    const dLines = pdf.splitTextToSize(safe(w.desc), CW - 14);
    pdf.text(safe(dLines[0]), M + 14, y + 9);
    y += 17;
  });
  y += 4;

  // Technologies
  sectionTitle('Technologies Used');
  (d.technologies || []).forEach((tech, i) => {
    checkY(14);
    pdf.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 250 : 255);
    pdf.rect(M, y - 3, CW, 12, 'F');
    pdf.setFillColor(37, 99, 235);
    pdf.rect(M, y - 3, 3, 12, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(37, 99, 235);
    pdf.setFont('helvetica', 'bold');
    pdf.text(safe(tech.name), M + 7, y + 4);
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 110);
    pdf.setFont('helvetica', 'normal');
    const pLines = pdf.splitTextToSize(safe(tech.purpose), CW - 55);
    pdf.text(safe(pLines[0]), M + 52, y + 4);
    if (tech.version) {
      pdf.setFillColor(5, 150, 105);
      pdf.roundedRect(W - M - 20, y - 1, 18, 7, 2, 2, 'F');
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text('v' + safe(tech.version), W - M - 11, y + 4, { align: 'center' });
    }
    y += 13;
  });
  y += 4;

  // Features
  sectionTitle('Key Features');
  (d.features || []).forEach(f => bullet(safe(f)));
  y += 4;

  // File Structure
  sectionTitle('File Structure');
  (d.fileStructure || []).forEach((f, i) => {
    checkY(12);
    pdf.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 250 : 255);
    pdf.rect(M, y - 3, CW, 11, 'F');
    pdf.setFillColor(109, 40, 217);
    pdf.rect(M, y - 3, 3, 11, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(37, 99, 235);
    pdf.setFont('helvetica', 'bold');
    pdf.text(safe(f.file), M + 7, y + 4);
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 110);
    pdf.setFont('helvetica', 'normal');
    const pLines = pdf.splitTextToSize(safe(f.purpose), CW - 60);
    pdf.text(safe(pLines[0]), M + 62, y + 4);
    y += 12;
  });
  y += 4;

  // Setup
  sectionTitle('Setup & Installation');
  (d.setup || []).forEach((step, i) => {
    checkY(10);
    pdf.setFillColor(5, 150, 105);
    pdf.circle(M + 4, y - 1, 3.5, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(safe(i + 1), M + 4, y + 0.8, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(17, 17, 34);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(safe(step).replace(/^\d+[.:]\s*/, ''), CW - 12);
    lines.forEach(line => { checkY(6); pdf.text(safe(line), M + 11, y); y += 5.5; });
    y += 3;
  });

  // Final footer
  checkY(20);
  y += 10;
  pdf.setDrawColor(220, 220, 235);
  pdf.setLineWidth(0.5);
  pdf.line(M, y, W - M, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 120);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Generated by Cloud AI — Developed by Meghana', W / 2, y, { align: 'center' });
  y += 5;
  pdf.text(new Date().toLocaleString(), W / 2, y, { align: 'center' });

  const fileName = safe(d.projectName).replace(/\s+/g, '-') + '-documentation.pdf';
  pdf.save(fileName);
  return fileName;
};
