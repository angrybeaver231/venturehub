import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const outputPath = path.join(process.cwd(), 'docs', 'Technical_Data_Processing.pdf');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 60, bottom: 60, left: 55, right: 55 },
  info: {
    Title: 'Ventorix Platform — Technical Data Processing Document',
    Author: 'Ventorix',
    Subject: 'Technical documentation on personal data collection, storage, and processing',
    CreationDate: new Date(),
  },
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

const COLORS = {
  title: '#1a1a2e',
  heading: '#16213e',
  subheading: '#0f3460',
  body: '#2c2c2c',
  muted: '#666666',
  accent: '#2563eb',
  tableHeader: '#f1f5f9',
  tableHeaderText: '#1e293b',
  tableBorder: '#cbd5e1',
  tableAlt: '#f8fafc',
  link: '#2563eb',
};

const PAGE_WIDTH = 595.28 - 55 - 55;

let currentY = doc.y;

function ensureSpace(needed: number) {
  if (currentY + needed > 780) {
    doc.addPage();
    currentY = 60;
  }
}

function title(text: string) {
  ensureSpace(60);
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.title);
  doc.text(text, 55, currentY, { width: PAGE_WIDTH, align: 'center' });
  currentY = doc.y + 8;
}

function subtitle(text: string) {
  ensureSpace(30);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted);
  doc.text(text, 55, currentY, { width: PAGE_WIDTH, align: 'center' });
  currentY = doc.y + 20;
}

function h1(text: string) {
  ensureSpace(40);
  currentY += 16;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.heading);
  doc.text(text, 55, currentY, { width: PAGE_WIDTH });
  currentY = doc.y + 4;
  doc.moveTo(55, currentY).lineTo(55 + PAGE_WIDTH, currentY).strokeColor(COLORS.accent).lineWidth(1.5).stroke();
  currentY += 10;
}

function h2(text: string) {
  ensureSpace(35);
  currentY += 10;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.subheading);
  doc.text(text, 55, currentY, { width: PAGE_WIDTH });
  currentY = doc.y + 6;
}

function h3(text: string) {
  ensureSpace(25);
  currentY += 6;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.subheading);
  doc.text(text, 55, currentY, { width: PAGE_WIDTH });
  currentY = doc.y + 4;
}

function para(text: string, indent: number = 0) {
  ensureSpace(20);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.body);
  doc.text(text, 55 + indent, currentY, { width: PAGE_WIDTH - indent, lineGap: 3 });
  currentY = doc.y + 6;
}

function bold(text: string, indent: number = 0) {
  ensureSpace(20);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.body);
  doc.text(text, 55 + indent, currentY, { width: PAGE_WIDTH - indent, lineGap: 3 });
  currentY = doc.y + 4;
}

function bullet(text: string, indent: number = 15) {
  ensureSpace(16);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.body);
  doc.text('•', 55 + indent - 12, currentY);
  doc.text(text, 55 + indent, currentY, { width: PAGE_WIDTH - indent, lineGap: 2 });
  currentY = doc.y + 3;
}

function table(headers: string[], rows: string[][], colWidths: number[]) {
  const rowHeight = 22;
  const fontSize = 8.5;
  const padding = 6;
  const totalRows = rows.length + 1;

  ensureSpace(rowHeight * Math.min(totalRows, 4));

  let x = 55;
  let y = currentY;

  doc.rect(x, y, PAGE_WIDTH, rowHeight).fill(COLORS.tableHeader);
  headers.forEach((h, i) => {
    doc.font('Helvetica-Bold').fontSize(fontSize).fillColor(COLORS.tableHeaderText);
    doc.text(h, x + padding, y + 6, { width: colWidths[i] - padding * 2 });
    x += colWidths[i];
  });
  y += rowHeight;

  rows.forEach((row, rowIdx) => {
    ensureSpace(rowHeight);
    if (y + rowHeight > 780) {
      doc.addPage();
      y = 60;
    }

    x = 55;
    if (rowIdx % 2 === 1) {
      doc.rect(x, y, PAGE_WIDTH, rowHeight).fill(COLORS.tableAlt);
    }

    row.forEach((cell, i) => {
      doc.font('Helvetica').fontSize(fontSize).fillColor(COLORS.body);
      doc.text(cell, x + padding, y + 5, { width: colWidths[i] - padding * 2 });
      x += colWidths[i];
    });
    y += rowHeight;
  });

  doc.rect(55, currentY, PAGE_WIDTH, y - currentY).strokeColor(COLORS.tableBorder).lineWidth(0.5).stroke();
  currentY = y + 8;
}

function wideTable(headers: string[], rows: string[][]) {
  const colWidth = PAGE_WIDTH / headers.length;
  const colWidths = headers.map(() => colWidth);
  table(headers, rows, colWidths);
}

function separator() {
  currentY += 4;
}

// ===== BUILD THE DOCUMENT =====

title('Ventorix Platform');
subtitle('Technical Data Processing Document');

doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
doc.text('Document version: 1.0', 55, currentY, { width: PAGE_WIDTH, align: 'center' });
currentY = doc.y;
doc.text('Last updated: February 16, 2026', 55, currentY, { width: PAGE_WIDTH, align: 'center' });
currentY = doc.y;
doc.text('Platform: Ventorix (Business Club — Financial University)', 55, currentY, { width: PAGE_WIDTH, align: 'center' });
currentY = doc.y + 20;

// --- Section 1: Overview ---
h1('1. Overview');
para('This document describes the technical infrastructure used by the Ventorix platform to collect, process, store, and transmit personal data. It covers all third-party services, internal systems, data flows, and security measures.');

// --- Section 2: Services ---
h1('2. Services That Collect and Store Personal Data');

h2('2.1 Neon Serverless PostgreSQL (Primary Database)');
bold('Purpose: Central storage for all structured personal data.');
bullet('Provider: Neon (neon.tech)');
bullet('Connection: Encrypted via DATABASE_URL environment variable over TLS');
separator();

bold('Personal data stored in the database:');
const dbCols = [PAGE_WIDTH * 0.2, PAGE_WIDTH * 0.45, PAGE_WIDTH * 0.35];
table(
  ['Table', 'Data Fields', 'Purpose'],
  [
    ['users', 'email, name, patronymic, password (bcrypt hash), profile image, organization, faculty, city, company, position, interests, skills', 'User accounts and profiles'],
    ['sessions', 'session ID, session data (JSON), expiry', 'Active login sessions'],
    ['event_registrations', 'user ID, event ID, guest name/email, attendance time', 'Event participation tracking'],
    ['event_form_answers', 'user responses to custom questions', 'Custom form data collection'],
    ['chat_sessions / chat_messages', 'user ID, message content, extracted data', 'AI chat interaction history'],
    ['chat_messages_private', 'sender/receiver IDs, message content', 'Direct messaging'],
    ['job_applications', 'applicant name, email, phone, cover letter, resume URL', 'Career portal applications'],
    ['course_enrollments', 'user ID, course ID, enrollment date', 'Learning activity'],
    ['course_submissions', 'user ID, responses, grades, feedback', 'Academic work'],
    ['password_reset_tokens', 'email, 6-digit code, expiry', 'Password recovery'],
    ['startup_members', 'user ID, startup ID, role', 'Startup team membership'],
    ['company_users', 'user ID, company ID, role', 'Corporate workspace membership'],
    ['evaluations', 'evaluator user ID, scores, recommendations', 'Startup evaluation data'],
  ],
  dbCols,
);

para('Security: All connections use TLS encryption. Passwords are hashed with bcrypt (cost factor 10). Database credentials are stored as environment secrets, never in code.');

h2('2.2 S3-compatible object storage (File Storage)');
bold('Purpose: Persistent storage for uploaded files.');
bullet('Provider: the platform, backed by Google Cloud Storage (GCS)');
bullet('Connection: Authenticated via service account tokens');
separator();

bold('Personal data stored:');
bullet('Profile images — user-uploaded profile photos');
bullet('Event images — photos associated with events');
bullet('Email images — images embedded in bulk newsletters');
bullet('Resume files (PDF) — job applicant resumes');
bullet('Chat file uploads — documents shared during AI chat registration');
bullet('Lesson videos — course content uploaded by teachers');
separator();

bold('Storage structure:');
bullet('public/ directory — publicly accessible assets (event images, email images)');
bullet('.private/ directory — access-controlled files (resumes, chat uploads)');
para('Access control: Private files require authentication and permission checks. Public files are served via signed GCS URLs with 7-day expiration for email compatibility.');

h2('2.3 session-based authenticationentication (OpenID Connect)');
bold('Purpose: OAuth-based user login via the platform accounts.');
bullet('Provider: the platform (the OIDC provider)');
bullet('Protocol: OpenID Connect (OIDC)');
separator();

bold('Data received from the platform:');
bullet('sub (unique user identifier)');
bullet('email');
bullet('first_name, last_name');
bullet('profile_image_url');
separator();

bold('Data flow:');
bullet('1. User clicks "Log in with the platform" → redirected to the OIDC provider');
bullet('2. User authenticates on the host\'s side');
bullet('3. the platform returns an authorization code to our callback URL');
bullet('4. Platform exchanges the code for tokens (access, refresh, ID token)');
bullet('5. User claims are extracted and stored/updated in the users table');
bullet('6. A server-side session is created in PostgreSQL (7-day TTL)');
para('Tokens stored: Access token and refresh token are held in the server-side session (PostgreSQL), never exposed to the browser.');

h2('2.4 Local Email/Password Authentication');
bold('Purpose: Alternative login for users without the platform accounts.');
bullet('Library: Passport.js with passport-local strategy');
separator();

bold('Data collected at registration:');
bullet('Email (normalized to lowercase, unique identifier)');
bullet('Password (immediately hashed with bcrypt, plaintext never stored)');
bullet('First name, last name, patronymic (optional)');
bullet('Organization type and name (optional)');
bullet('Faculty (optional, for Financial University students)');
para('Session management: PostgreSQL-backed session store with httpOnly cookies, SameSite=Lax, Secure flag in production (HTTPS only).');

h2('2.5 Resend (Email Service)');
bold('Purpose: Sending transactional and bulk emails.');
bullet('Provider: Resend (resend.com) — Pro plan');
bullet('Connection: Direct API key (RESEND_API_KEY) over HTTPS');
separator();

bold('Personal data transmitted to Resend:');
bullet('Recipient email addresses');
bullet('Recipient names (for personalized greetings)');
bullet('Email content (HTML body, subject line)');
bullet('File attachments (non-image files as base64)');
separator();

bold('Sending domains:');
bullet('events@ecfinuni.com — bulk newsletters');
bullet('no-reply@ecfinuni.com — transactional emails (password resets, notifications)');
para('Rate limiting: 600ms delay between sends, exponential backoff retry on rate limit errors, automatic stop on daily quota exceeded.');

h2('2.6 GigaChat (Sber AI)');
bold('Purpose: AI-powered chat for event registration and onboarding.');
bullet('Provider: Sberbank (Sber) — GigaChat API');
bullet('Connection: API key (GIGACHAT_API_KEY) over HTTPS');
separator();

bold('Personal data transmitted to GigaChat:');
bullet('User chat messages (free-text input during event registration)');
bullet('Context about the event (event name, required fields)');
bullet('Extracted structured data (name, email, organization) from conversation');
separator();

para('Important: User messages are sent to Sber\'s servers for AI processing. GigaChat\'s data retention and processing policies are governed by Sber\'s terms of service.');

// --- Section 3: Data Flow ---
h1('3. Data Flow Overview');
para('The platform\'s data flow centers around the Express.js server (Node.js/TypeScript) running on port 5000 via the hosting platform. All external communication uses HTTPS/TLS encryption.');
separator();

bold('Connection map:');
bullet('User Browser → Express Server: HTTPS (TLS)');
bullet('Express Server → the platform OIDC: OAuth authentication tokens');
bullet('Express Server → Neon PostgreSQL: User profiles, sessions, registrations, chat history, applications, course data, startup/company data (TLS)');
bullet('Express Server → S3-compatible object storage (GCS): Profile images, event photos, resumes, chat file uploads, email images (signed URLs)');
bullet('Express Server → Resend API: Recipient emails/names, email HTML content, file attachments (HTTPS)');
bullet('Express Server → GigaChat API (Sber): User messages, extracted registration data (HTTPS)');

// --- Section 4: How Services Are Connected ---
h1('4. How Services Are Connected');

h3('Authentication → Database');
para('When a user logs in (via OAuth or email/password), their profile data is upserted into the users table. The session is stored in the sessions table with a 7-day TTL. Session cookies reference the session ID.');

h3('Database → Email Service');
para('When an admin sends a bulk newsletter, user emails and names are read from the users table, filtered by newsletterOptOut preference. Each email is personalized and sent individually via Resend. Users can opt out via a cryptographically signed unsubscribe link (HMAC-SHA256).');

h3('File Uploads → Object Storage → Email');
para('Images attached to emails are uploaded to Object Storage (GCS). Signed URLs with 7-day expiration are generated and embedded as <img> tags in the email HTML for Gmail/Yandex compatibility.');

h3('AI Chat → Database');
para('During AI event registration, messages are sent to GigaChat for processing. The AI extracts structured data (name, email, organization) from the conversation. Both raw messages and extracted data are stored in chat_sessions and chat_messages tables.');

h3('Job Applications → Object Storage');
para('Applicant resumes (PDF) are uploaded to the private directory in Object Storage. The file path is stored in job_applications.resume_url. Access requires authentication and is restricted to the applicant and admin users.');

// --- Section 5: Security ---
h1('5. Security Measures');

h3('5.1 Data at Rest');
bullet('Passwords: Hashed with bcrypt (10 salt rounds), plaintext never stored');
bullet('Database: Neon PostgreSQL with TLS encryption');
bullet('Files: Google Cloud Storage with access-controlled paths');
bullet('Secrets: All API keys stored as environment secrets, never in code');

h3('5.2 Data in Transit');
bullet('All HTTP traffic: TLS/HTTPS enforced in production');
bullet('Session cookies: httpOnly, Secure flag (HTTPS only), SameSite=Lax');
bullet('Database connections: TLS-encrypted connection strings');
bullet('API calls: All external services use HTTPS');

h3('5.3 Access Control');
bullet('RBAC: Multi-tiered hierarchy — member, teacher, expert, admin, lmsAdmin, eventAdmin, innoLabsAdmin, Head Admin');
bullet('Middleware enforcement: Every protected route uses authentication and authorization middleware');
bullet('File access: Private objects require user ID matching or admin role');
bullet('Email unsubscribe: Cryptographically signed tokens (HMAC-SHA256)');

h3('5.4 Data Minimization');
bullet('Profile fields beyond email and name are optional');
bullet('Newsletter opt-out is respected for all bulk communications');
bullet('Password reset codes expire after a set time period');

// --- Section 6: Third-Party Summary ---
h1('6. Third-Party Data Processors Summary');

const procCols = [PAGE_WIDTH * 0.18, PAGE_WIDTH * 0.15, PAGE_WIDTH * 0.27, PAGE_WIDTH * 0.2, PAGE_WIDTH * 0.2];
table(
  ['Service', 'Provider', 'Data Shared', 'Purpose', 'Data Location'],
  [
    ['Neon PostgreSQL', 'Neon Inc.', 'All structured personal data', 'Primary database', 'Cloud (Neon)'],
    ['Object Storage', 'the platform / GCS', 'Files (images, resumes, docs)', 'File storage', 'Google Cloud'],
    ['session-based authentication', 'the hosting provider', 'Email, name, profile image', 'OAuth login', 'the hosting provider'],
    ['Resend', 'Resend Inc.', 'Emails, names, content', 'Email delivery', 'Resend infra'],
    ['GigaChat', 'Sberbank', 'Chat messages, extracted data', 'AI processing', 'Sber servers (RU)'],
  ],
  procCols,
);

// --- Section 7: Env Vars ---
h1('7. Environment Variables Containing Sensitive Data');

const envCols = [PAGE_WIDTH * 0.3, PAGE_WIDTH * 0.45, PAGE_WIDTH * 0.25];
table(
  ['Variable', 'Purpose', 'Contains PD?'],
  [
    ['DATABASE_URL', 'PostgreSQL connection string', 'No (credential)'],
    ['SESSION_SECRET', 'Session cookie signing key', 'No (key only)'],
    ['RESEND_API_KEY', 'Resend email API authentication', 'No (key only)'],
    ['GIGACHAT_API_KEY', 'GigaChat AI API authentication', 'No (key only)'],
    ['APP_ID', 'the platform application identifier', 'No'],
    ['APP_DOMAINS', 'Allowed callback domains', 'No'],
  ],
  envCols,
);

para('All sensitive variables are stored as encrypted environment secrets and are never exposed in client-side code or logs.');

// --- Section 8: Data Retention ---
h1('8. Data Retention');

const retCols = [PAGE_WIDTH * 0.25, PAGE_WIDTH * 0.35, PAGE_WIDTH * 0.4];
table(
  ['Data Type', 'Retention Period', 'Deletion Method'],
  [
    ['User sessions', '7 days (TTL)', 'Automatic expiry in PostgreSQL'],
    ['Password reset codes', 'Time-limited expiry', 'Automatic expiry'],
    ['User accounts', 'Until deletion request', 'Manual via admin panel'],
    ['Event registrations', 'Indefinite (tied to events)', 'Cascade delete with event'],
    ['Chat messages', 'Indefinite', 'Cascade delete with session'],
    ['Uploaded files', 'Indefinite', 'Manual deletion via admin'],
    ['Email logs (Resend)', 'Per Resend policy', 'Managed by Resend'],
    ['AI logs (GigaChat)', 'Per Sber policy', 'Managed by Sber'],
  ],
  retCols,
);

separator();
doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORS.muted);
doc.text('This document should be updated whenever new services are integrated or data handling practices change.', 55, currentY, { width: PAGE_WIDTH, align: 'center' });

doc.end();

stream.on('finish', () => {
  console.log(`PDF generated successfully: ${outputPath}`);
});
