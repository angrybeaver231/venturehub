const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'exports');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'ventorix-platform-overview.pdf');

const doc = new PDFDocument({ size: 'A4', margin: 56 });
doc.pipe(fs.createWriteStream(outPath));

const COLORS = {
  bg: '#0a0a0f',
  card: '#11121a',
  cyan: '#22d3ee',
  cyanDim: '#0e7490',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  border: '#1f2230',
  navy: '#1e3a8a',
  mint: '#10b981',
  amber: '#f59e0b',
  purple: '#a855f7',
  pink: '#ec4899',
};

const PAGE_W = doc.page.width;
const PAGE_H = doc.page.height;
const M = doc.page.margins.left;
const CONTENT_W = PAGE_W - M * 2;

function paintBg() {
  doc.save();
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(COLORS.bg);
  doc.restore();
}

doc.on('pageAdded', () => {
  paintBg();
});

paintBg();

function h1(text) {
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(26).text(text, { width: CONTENT_W });
  doc.moveDown(0.3);
}
function h2(text) {
  ensureSpace(60);
  doc.moveDown(0.6);
  doc.fillColor(COLORS.cyan).font('Helvetica-Bold').fontSize(16).text(text, { width: CONTENT_W });
  const y = doc.y + 2;
  doc.moveTo(M, y).lineTo(M + 40, y).lineWidth(2).strokeColor(COLORS.cyan).stroke();
  doc.moveDown(0.5);
}
function h3(text) {
  ensureSpace(40);
  doc.moveDown(0.3);
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(12).text(text, { width: CONTENT_W });
  doc.moveDown(0.15);
}
function p(text) {
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(10.5).text(text, {
    width: CONTENT_W,
    align: 'left',
    lineGap: 2,
  });
  doc.moveDown(0.3);
}
function muted(text) {
  doc.fillColor(COLORS.textMuted).font('Helvetica-Oblique').fontSize(9.5).text(text, { width: CONTENT_W });
  doc.moveDown(0.3);
}
function bullet(text) {
  ensureSpace(30);
  const x = M + 12;
  const startY = doc.y;
  doc.circle(M + 4, startY + 6, 2).fill(COLORS.cyan);
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(10.5)
    .text(text, x, startY, { width: CONTENT_W - 12, lineGap: 2 });
  doc.moveDown(0.15);
}
function ensureSpace(n) {
  if (doc.y + n > PAGE_H - doc.page.margins.bottom) doc.addPage();
}

function colorSwatch(label, hex, x, y, w) {
  doc.roundedRect(x, y, w, 56, 6).fill(hex);
  doc.roundedRect(x, y, w, 56, 6).lineWidth(0.5).strokeColor(COLORS.border).stroke();
  const textColor = isLight(hex) ? '#0a0a0f' : '#ffffff';
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9).text(label, x + 8, y + 8, { width: w - 16 });
  doc.fillColor(textColor).font('Helvetica').fontSize(8).text(hex.toUpperCase(), x + 8, y + 40, { width: w - 16 });
}
function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

// ===== COVER =====
doc.save();
const grad = doc.linearGradient(0, 0, PAGE_W, PAGE_H);
grad.stop(0, '#0a0a0f').stop(0.5, '#0f1729').stop(1, '#082f3a');
doc.rect(0, 0, PAGE_W, PAGE_H).fill(grad);
doc.restore();

doc.circle(PAGE_W - 80, 120, 60).fillOpacity(0.15).fill(COLORS.cyan);
doc.circle(60, PAGE_H - 140, 90).fillOpacity(0.10).fill(COLORS.cyan);
doc.fillOpacity(1);

doc.fillColor(COLORS.cyan).font('Helvetica-Bold').fontSize(11).text('VENTORIX', M, 80, { characterSpacing: 4 });
doc.fillColor(COLORS.textMuted).font('Helvetica').fontSize(10).text('Business Club Platform', M, 96);

doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(38)
  .text('Platform Overview', M, PAGE_H / 2 - 80, { width: CONTENT_W });
doc.fillColor(COLORS.cyan).font('Helvetica').fontSize(14)
  .text('Features, Design Language & Visual System', M, doc.y + 4, { width: CONTENT_W });

doc.moveTo(M, PAGE_H / 2 + 20).lineTo(M + 80, PAGE_H / 2 + 20).lineWidth(3).strokeColor(COLORS.cyan).stroke();

doc.fillColor(COLORS.textMuted).font('Helvetica').fontSize(10)
  .text('A bilingual innovation & business club platform connecting students, universities,\nclubs, corporations, and startups in one unified ecosystem.',
    M, PAGE_H / 2 + 40, { width: CONTENT_W, lineGap: 3 });

doc.fillColor(COLORS.textMuted).font('Helvetica').fontSize(9)
  .text('Generated ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    M, PAGE_H - 80);

doc.addPage();

// ===== WHAT IT IS =====
h1('What it is');
p('Ventorix (formerly the Financial University Business Club platform) is a bilingual English/Russian platform that combines event management, a learning management system, a video library, a hiring portal, and a complete corporate-innovation pipeline into one product. It serves multiple constituencies — students, faculty, club leaders, corporate scouts, and startup founders — under a unified role and permission model.');

// ===== FEATURE AREAS =====
h2('Major Feature Areas');

h3('1. Events');
p('Full event lifecycle: drafts to publish, custom registration form builder, AI-assisted chat registration powered by GigaChat (Sber AI), file uploads inside chat, attendance tracking (manual or QR scan), auto-generated tickets and certificates, and Excel reporting for organizers.');

h3('2. Learning Management System (LMS)');
p('Courses with modules and lessons (text or video), enrollment, progress tracking, downloadable materials, quizzes, assignments with grading rubrics, course announcements, discussion forums, lesson comments, and private messaging. A dedicated Teacher role can grade and manage course content.');

h3('3. Video Library & Livestreams');
p('Video content hosted via RuTube integration, plus livestream scheduling and playback.');

h3('4. Career Portal');
p('A tbank.ru-style job portal: public listings with rich-text descriptions, application submission with PDF resume upload, recruiter pipeline (new -> reviewing -> interview -> offered -> rejected -> hired), candidate accounts auto-created on application, and a candidate portal with recruiter chat.');

h3('5. Startup & Innovation Platform');
p('The largest layer of the product:');
bullet('Startup Profiles with team members, metrics (MRR, users, pilots), stage and vertical tags');
bullet('Corporate Workspace with KPI dashboard, scouting briefs, and a kanban pipeline (discovered -> evaluation -> pilot -> scale-up -> archived)');
bullet('Briefs system: corporates publish requests, startups apply with fit descriptions');
bullet('Accelerator Programs: accelerator, incubator, hackathon, workshop, mentorship');
bullet('Multi-criteria Evaluations across team, product, market, traction, fit, risk');
bullet('Reviewer Assignments with a dedicated "My Reviews" page');
bullet('Activity audit log and plan/usage tracking (pilot, business, enterprise tiers)');
bullet('Multi-institution layer: universities, clubs, slug-based public pages, startup affiliations');

h3('6. Debate Challenges');
p('AI-judged debate challenges with custom outcomes, info-for-users blocks, and AI-only attachment context (Excel, PDF, CSV) with a leaderboard sortable by score or numeric outcome.');

h3('7. Auth & Roles');
p('OAuth and local email/password (bcrypt). Sessions in PostgreSQL with a 7-day TTL. Tier-based role hierarchies for universities, clubs, corporations, and programs. An Account Freeze system lets platform admins lock compromised admin accounts. Three-step password reset via 6-digit emailed codes (Resend).');

h3('8. Other');
p('Interactive platform tour for new users, full PWA with offline cache and auto-update, comprehensive SEO, bilingual EN/RU throughout, certificate and ticket PDF generation, and a unique circular/radial main menu for navigation.');

// ===== DESIGN =====
doc.addPage();
h1('Current Visual Design');
muted('Overall direction: dark, glassmorphic, "fintech-meets-startup-studio" aesthetic. Heavy use of Framer Motion (parallax hero, fade-up reveals, count-up stats, smooth page transitions).');

// ===== COLORS =====
h2('Color System');

h3('Dark Mode (default look)');
p('Near-black surfaces with electric cyan as the signature accent color.');
{
  const y = doc.y + 4;
  const swatches = [
    ['Background', '#0a0a0f'],
    ['Card', '#11121a'],
    ['Primary / Cyan', '#22d3ee'],
    ['Accent (deep teal)', '#0e3a45'],
    ['Foreground', '#f1f5f9'],
    ['Muted text', '#94a3b8'],
  ];
  const cols = 3;
  const gap = 10;
  const w = (CONTENT_W - gap * (cols - 1)) / cols;
  swatches.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    colorSwatch(s[0], s[1], M + col * (w + gap), y + row * 66, w);
  });
  doc.y = y + Math.ceil(swatches.length / cols) * 66 + 8;
}

h3('Light Mode');
p('Clean, near-white surfaces with deep royal-blue primary.');
{
  const y = doc.y + 4;
  const swatches = [
    ['Background', '#fafafa'],
    ['Card', '#ffffff'],
    ['Primary / Navy', '#1e40af'],
    ['Accent (mint tint)', '#e6f0ea'],
    ['Foreground', '#0f172a'],
    ['Border', '#dadde2'],
  ];
  const cols = 3;
  const gap = 10;
  const w = (CONTENT_W - gap * (cols - 1)) / cols;
  swatches.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    colorSwatch(s[0], s[1], M + col * (w + gap), y + row * 66, w);
  });
  doc.y = y + Math.ceil(swatches.length / cols) * 66 + 8;
}

h3('Chart / Data Viz Palette');
{
  const y = doc.y + 4;
  const charts = [
    ['Chart 1', '#22d3ee'],
    ['Chart 2', '#10b981'],
    ['Chart 3', '#f59e0b'],
    ['Chart 4', '#a855f7'],
    ['Chart 5', '#ec4899'],
  ];
  const gap = 8;
  const w = (CONTENT_W - gap * (charts.length - 1)) / charts.length;
  charts.forEach((s, i) => colorSwatch(s[0], s[1], M + i * (w + gap), y, w));
  doc.y = y + 66;
}

// ===== LANDING PAGE =====
doc.addPage();
h2('Landing Page Structure');
p('The current landing page is approximately 840 lines of code, fully animated, and dark-mode-first. It scrolls through these sections in order:');
bullet('Hero — full-screen, parallax fade-out on scroll, large bold white headline, subtitle, primary CTA "Join the club", animated gradient mesh and glow-pulse effects in the background');
bullet('Animated stats — count-up numbers (members, events) that trigger when scrolled into view');
bullet('Featured event — current/upcoming event card pulled from the API');
bullet('About section — mission of the club');
bullet('Programs section — 4 illustrated program cards (uses generated AI imagery)');
bullet('Events grid — showcasing event imagery');
bullet('Closing / CTA section');
bullet('Contact section at the bottom');
p('Throughout, the page uses scroll-triggered fade-up motion, the cyan glow accent for highlights, and a horizontally scrolling marquee effect — a classic SaaS landing rhythm.');

// ===== BRANDING =====
h2('Branding & UX Signature');
bullet('Logo: Ventorix mark with a "Powered by Ventorix" footer label in the sidebar (gradual transition away from the original Financial University branding)');
bullet('Bilingual EN/RU toggle in the header');
bullet('Iconography: lucide-react throughout; brand logos from react-icons/si when needed');
bullet('Circular / radial navigation menu for the 6 main areas: Dashboard, Events, Courses, Video Library, Messages, Profile');
bullet('Glassmorphism on overlays (blur + translucency)');
bullet('Slowly animating gradient meshes in the background');
bullet('Glow-pulse on key CTA elements (cyan halo at ~20–40px blur)');
bullet('Smooth page transitions on route changes');

// ===== TAKEAWAY =====
h2('Quick Takeaway');
{
  ensureSpace(120);
  const y = doc.y;
  const h = 100;
  doc.roundedRect(M, y, CONTENT_W, h, 8).fill(COLORS.card);
  doc.roundedRect(M, y, CONTENT_W, h, 8).lineWidth(1).strokeColor(COLORS.border).stroke();
  doc.roundedRect(M, y, 4, h, 2).fill(COLORS.cyan);
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(11)
    .text('Ventorix currently reads as a modern dark fintech / innovation hub — deep navy-black surfaces, electric cyan as the single energetic accent color, lots of motion, and large illustrated hero imagery. The light mode exists but is more conservative (royal-blue primary on near-white). This makes it a natural fit for a Finovate-style onboarding wizard — the dark cyan aesthetic and glassmorphic vocabulary already match.',
      M + 16, y + 14, { width: CONTENT_W - 28, lineGap: 3 });
  doc.y = y + h + 10;
}

doc.end();
console.log('Wrote', outPath);
