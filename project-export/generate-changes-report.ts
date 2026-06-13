import puppeteer from 'puppeteer-core';
import fs from 'fs';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Business Club Platform - Changes Report (February 6, 2026)</title>
<style>
  @page { margin: 20mm 15mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; line-height: 1.5; color: #1a1a2e; background: #fff; }
  .cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 90vh; text-align: center; background: linear-gradient(135deg, #09090b, #0a2a2e, #09090b); color: white; padding: 40px; border-radius: 0; }
  .cover h1 { font-size: 36px; margin-bottom: 10px; letter-spacing: 2px; }
  .cover h2 { font-size: 18px; font-weight: 300; margin-bottom: 30px; opacity: 0.9; }
  .cover .meta { font-size: 13px; opacity: 0.7; margin-top: 20px; }
  .cover .badge { display: inline-block; background: rgba(0,210,211,0.15); border: 1px solid rgba(0,210,211,0.4); padding: 6px 16px; border-radius: 20px; margin: 5px; font-size: 11px; color: #00d2d3; }
  .cover .version-badge { display: inline-block; background: rgba(0,210,211,0.2); border: 2px solid rgba(0,210,211,0.5); padding: 10px 24px; border-radius: 30px; margin: 15px 0; font-size: 16px; color: #00d2d3; font-weight: 600; letter-spacing: 1px; }
  
  h1 { font-size: 22px; color: #09090b; border-bottom: 3px solid #0a8a8a; padding-bottom: 8px; margin: 25px 0 15px; }
  h2 { font-size: 16px; color: #0a6a6a; margin: 20px 0 10px; border-left: 4px solid #0a8a8a; padding-left: 10px; }
  h3 { font-size: 13px; color: #444; margin: 12px 0 6px; }
  
  .section { page-break-inside: avoid; margin-bottom: 20px; }
  .toc { page-break-after: always; }
  .toc h1 { text-align: center; border-bottom: none; }
  .toc ul { list-style: none; padding: 0; }
  .toc li { padding: 6px 0; border-bottom: 1px dotted #ccc; font-size: 13px; }
  .toc li span { float: right; color: #666; }
  
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10px; }
  th { background: #0a8a8a; color: white; padding: 6px 8px; text-align: left; font-weight: 600; }
  td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) { background: #f0fafa; }
  tr:hover { background: #e0f5f5; }
  
  .card { background: #f0fafa; border: 1px solid #d0e8e8; border-radius: 6px; padding: 12px; margin: 8px 0; }
  .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .stat-card { background: linear-gradient(135deg, #09090b, #0a2a2e); color: white; border-radius: 8px; padding: 15px; text-align: center; }
  .stat-card .number { font-size: 24px; font-weight: bold; color: #00d2d3; }
  .stat-card .label { font-size: 10px; opacity: 0.8; margin-top: 4px; }
  
  .tag { display: inline-block; background: #e0f5f5; color: #0a6a6a; padding: 2px 8px; border-radius: 12px; font-size: 9px; margin: 2px; }
  .tag-green { background: #e8f8e8; color: #2d6a2d; }
  .tag-blue { background: #e0f0f8; color: #2d4a6a; }
  .tag-orange { background: #f8f0e8; color: #6a4a2d; }
  .tag-red { background: #f8e8e8; color: #6a2d2d; }
  .tag-cyan { background: rgba(0,210,211,0.15); color: #0a8a8a; }
  
  code { background: #f0f5f5; padding: 1px 5px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 10px; }
  pre { background: #09090b; color: #00d2d3; padding: 12px; border-radius: 6px; font-size: 10px; overflow-x: auto; white-space: pre-wrap; margin: 8px 0; }
  
  .highlight { background: #e0f5f5; padding: 8px 12px; border-left: 4px solid #0a8a8a; border-radius: 0 6px 6px 0; margin: 8px 0; font-size: 11px; }
  .info-box { background: #d1ecf1; padding: 8px 12px; border-left: 4px solid #17a2b8; border-radius: 0 6px 6px 0; margin: 8px 0; }
  .warning-box { background: #fff3cd; padding: 8px 12px; border-left: 4px solid #ffc107; border-radius: 0 6px 6px 0; margin: 8px 0; }
  
  .before-after { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
  .before { background: #f8e8e8; border: 1px solid #e0c0c0; border-radius: 6px; padding: 10px; }
  .before h4 { color: #c0392b; font-size: 11px; margin-bottom: 6px; }
  .after { background: #e8f8e8; border: 1px solid #c0e0c0; border-radius: 6px; padding: 10px; }
  .after h4 { color: #27ae60; font-size: 11px; margin-bottom: 6px; }
  
  .color-swatch { display: inline-block; width: 30px; height: 18px; border-radius: 3px; vertical-align: middle; margin-right: 6px; border: 1px solid #ddd; }
  
  .footer { text-align: center; font-size: 9px; color: #999; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; }
  .pb { page-break-before: always; }
  .pba { page-break-after: always; }
  .nopb { page-break-inside: avoid; }
  
  ul { padding-left: 18px; }
  li { margin-bottom: 3px; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div style="font-size: 14px; letter-spacing: 4px; margin-bottom: 20px; opacity: 0.6;">PLATFORM CHANGES REPORT</div>
  <h1>Business Club Platform</h1>
  <h2>Financial University Business Club</h2>
  <div class="version-badge">February 6, 2026 - Development Session</div>
  <div style="margin: 30px 0;">
    <span class="badge">Dark Theme Redesign</span>
    <span class="badge">Career Portal</span>
    <span class="badge">Candidate Accounts</span>
    <span class="badge">PDF Resume Uploads</span>
    <span class="badge">Landing Page Redesign</span>
  </div>
  <div class="meta">
    <p>29 Files Modified | +3,991 Lines Added | -475 Lines Removed</p>
    <p>New Pages: 4 | New API Routes: 16 | New Database Tables: 3</p>
    <p>Platform: the platform | Runtime: Node.js 20</p>
  </div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc">
  <h1>Table of Contents</h1>
  <ul>
    <li>1. Executive Summary <span>3</span></li>
    <li>2. Landing Page Redesign <span>4</span></li>
    <li>3. Career Portal Implementation <span>6</span></li>
    <li>4. Candidate Account System <span>8</span></li>
    <li>5. PDF Resume Upload System <span>10</span></li>
    <li>6. Dark Theme System Overhaul <span>12</span></li>
    <li>7. Database Schema Changes <span>14</span></li>
    <li>8. API Routes Added <span>15</span></li>
    <li>9. New Frontend Pages <span>17</span></li>
    <li>10. Translation Updates <span>18</span></li>
    <li>11. Bug Fixes & Improvements <span>19</span></li>
    <li>12. Files Changed Summary <span>20</span></li>
  </ul>
</div>

<!-- 1. EXECUTIVE SUMMARY -->
<h1>1. Executive Summary</h1>

<div class="section">
<p>This report documents all changes made to the Business Club Platform during the February 6, 2026 development session. The session focused on three major feature areas: a complete career portal for job listings and applications, a unified dark theme system overhaul, and a redesigned landing page. Together, these changes significantly enhance the platform's visual identity and introduce professional recruitment capabilities.</p>

<h2>1.1 Change Statistics</h2>
<div class="card-grid">
  <div class="stat-card">
    <div class="number">29</div>
    <div class="label">Files Modified</div>
  </div>
  <div class="stat-card">
    <div class="number">+3,991</div>
    <div class="label">Lines Added</div>
  </div>
  <div class="stat-card">
    <div class="number">4</div>
    <div class="label">New Pages</div>
  </div>
  <div class="stat-card">
    <div class="number">3</div>
    <div class="label">New DB Tables</div>
  </div>
</div>

<h2>1.2 Major Changes Overview</h2>
<table>
  <tr><th>Change Area</th><th>Type</th><th>Impact</th></tr>
  <tr><td>Landing Page Redesign</td><td><span class="tag tag-orange">Enhancement</span></td><td>Complete visual overhaul with new typography, animations, and real-time statistics</td></tr>
  <tr><td>Career Portal</td><td><span class="tag tag-green">New Feature</span></td><td>Full job listings portal with public browsing, search, filters, and application system</td></tr>
  <tr><td>Candidate Accounts</td><td><span class="tag tag-green">New Feature</span></td><td>Auto-account creation during job application with dedicated candidate portal</td></tr>
  <tr><td>PDF Resume Uploads</td><td><span class="tag tag-green">New Feature</span></td><td>Secure PDF file upload to object storage during job application</td></tr>
  <tr><td>Admin Careers Panel</td><td><span class="tag tag-green">New Feature</span></td><td>Job opening management, application review, candidate messaging</td></tr>
  <tr><td>Dark Theme Overhaul</td><td><span class="tag tag-orange">Enhancement</span></td><td>Unified near-black theme with cyan/teal accents across all authenticated pages</td></tr>
  <tr><td>Date Display Improvements</td><td><span class="tag tag-blue">Fix</span></td><td>Better date formatting across the platform for events</td></tr>
  <tr><td>Section Dividers</td><td><span class="tag tag-orange">Enhancement</span></td><td>Visual dividers between page sections and statistics</td></tr>
</table>
</div>

<!-- 2. LANDING PAGE REDESIGN -->
<h1 class="pb">2. Landing Page Redesign</h1>

<div class="section">
<p>The landing page received a complete visual overhaul, transforming it from the original design into a modern, professional page inspired by evolutclub.com and Revolut.com aesthetics. The redesign spans 1,062 lines of new/modified code.</p>

<h2>2.1 Design Changes</h2>
<div class="card">
  <h3>Typography</h3>
  <ul>
    <li><strong>Primary Font:</strong> Plus Jakarta Sans (Google Fonts) - modern, clean geometric sans-serif</li>
    <li><strong>Fallback Stack:</strong> system-ui, -apple-system, sans-serif</li>
    <li><strong>Hero Title:</strong> 64px+ with 700 weight, tight letter-spacing</li>
  </ul>
</div>

<div class="card">
  <h3>Color Scheme</h3>
  <table>
    <tr><th>Element</th><th>Color</th><th>Value</th></tr>
    <tr><td>Background</td><td><span class="color-swatch" style="background:#09090b"></span></td><td>#09090b (Near-black)</td></tr>
    <tr><td>Primary Accent</td><td><span class="color-swatch" style="background:#00d2d3"></span></td><td>#00d2d3 (Cyan/Teal)</td></tr>
    <tr><td>Gradient Start</td><td><span class="color-swatch" style="background:#00d2d3"></span></td><td>Cyan to Teal gradient on CTAs</td></tr>
    <tr><td>Text Primary</td><td><span class="color-swatch" style="background:#f2f2f2"></span></td><td>#f2f2f2 (Near-white)</td></tr>
    <tr><td>Text Secondary</td><td><span class="color-swatch" style="background:#a0a0a0"></span></td><td>rgba(255,255,255,0.5) - 50% opacity white</td></tr>
    <tr><td>Card Background</td><td><span class="color-swatch" style="background:#111113"></span></td><td>rgba(255,255,255,0.03) - Glass effect</td></tr>
    <tr><td>Borders</td><td><span class="color-swatch" style="background:#242424"></span></td><td>rgba(255,255,255,0.06) - Subtle glass borders</td></tr>
  </table>
</div>

<h2>2.2 New Features</h2>
<div class="card">
  <ul>
    <li><strong>Animated Real-time Statistics:</strong> Live member count, event count, course count pulled from API with smooth count-up animations</li>
    <li><strong>Visual Section Dividers:</strong> Horizontal/vertical lines separating page sections with gradient accents</li>
    <li><strong>Hero Section:</strong> Full-width dark hero with animated gradient text and CTA buttons</li>
    <li><strong>Feature Cards:</strong> Glass-morphism cards with hover elevation effects</li>
    <li><strong>Footer:</strong> Redesigned footer with Business Club branding</li>
  </ul>
</div>

<h2>2.3 Files Modified</h2>
<table>
  <tr><th>File</th><th>Changes</th></tr>
  <tr><td><code>client/src/pages/landing.tsx</code></td><td>+1,062 / -475 lines - Complete redesign</td></tr>
  <tr><td><code>client/index.html</code></td><td>Added Plus Jakarta Sans font import</td></tr>
</table>
</div>

<!-- 3. CAREER PORTAL -->
<h1 class="pb">3. Career Portal Implementation</h1>

<div class="section">
<p>A complete career portal was built, inspired by tbank.ru/career/ design patterns. The portal allows public job browsing with search and filters, and provides a streamlined application flow.</p>

<h2>3.1 Public Careers Page (/careers)</h2>
<div class="card">
  <h3>Features</h3>
  <ul>
    <li><strong>Job Listings:</strong> Card-based display of open positions with department, location, employment type</li>
    <li><strong>Search:</strong> Real-time text search across job titles and descriptions</li>
    <li><strong>Filters:</strong> Department filter and employment type filter (Full-time, Part-time, Contract, Internship)</li>
    <li><strong>Job Details:</strong> Expanded view with full description, requirements, salary range</li>
    <li><strong>Rich Text:</strong> Job descriptions support HTML formatting (sanitized with sanitize-html)</li>
    <li><strong>Salary Display:</strong> Min/max salary range with currency indicator</li>
    <li><strong>Application Dialog:</strong> Modal form with name, email, phone, resume upload, cover letter</li>
    <li><strong>Bilingual:</strong> Full English/Russian translation support</li>
  </ul>
</div>

<h2>3.2 Application Flow</h2>
<pre>
Candidate browses /careers
    |
    +-> Selects a job opening
    |
    +-> Clicks "Apply for this Position"
    |
    +-> Fills application form:
    |   - Name (required)
    |   - Email (required)
    |   - Phone (optional)
    |   - Resume PDF upload (optional)
    |   - Cover letter (optional)
    |   - Password for account (optional)
    |
    +-> Submits application
    |
    +-> If password provided:
    |   +-> Auto-creates candidate account
    |   +-> Shows portal redirect button
    |
    +-> Application stored in database
    +-> Admin receives notification
</pre>

<h2>3.3 Admin Careers Management (/admin/careers)</h2>
<div class="card">
  <ul>
    <li><strong>Job CRUD:</strong> Create, edit, delete job openings with draft/open/closed status workflow</li>
    <li><strong>Rich Text Editor:</strong> React Quill editor for job descriptions</li>
    <li><strong>Application Review:</strong> View all applications per job with status management</li>
    <li><strong>Status Tracking:</strong> new → reviewing → interview → offered → rejected → hired</li>
    <li><strong>Resume Download:</strong> Head Admins can download uploaded PDF resumes</li>
    <li><strong>Candidate Messaging:</strong> Send messages to candidates directly from admin panel</li>
  </ul>
</div>
</div>

<!-- 4. CANDIDATE ACCOUNT SYSTEM -->
<h1 class="pb">4. Candidate Account System</h1>

<div class="section">
<p>A new user role and authentication system was introduced specifically for job candidates, allowing them to track their applications and communicate with recruiters.</p>

<h2>4.1 Auto-Account Creation</h2>
<div class="card">
  <ul>
    <li>During job application, candidates can optionally provide a password</li>
    <li>If a password is provided, the system automatically creates a candidate account</li>
    <li>Account uses bcrypt password hashing (same security as regular member accounts)</li>
    <li>Candidate role (<code>role: "candidate"</code>) is distinct from member/admin/teacher roles</li>
    <li>Candidates are not included in the main platform user directory</li>
    <li>Duplicate email detection prevents creating multiple accounts</li>
  </ul>
</div>

<h2>4.2 Candidate Authentication (/candidate)</h2>
<div class="card">
  <ul>
    <li><strong>Login Page:</strong> Dedicated login form at /candidate with email/password authentication</li>
    <li><strong>Session Management:</strong> Uses same PostgreSQL session store as main platform</li>
    <li><strong>Route Protection:</strong> Candidate portal routes are protected and accessible only to candidate role users</li>
  </ul>
</div>

<h2>4.3 Candidate Portal Features</h2>
<div class="card">
  <ul>
    <li><strong>Application Tracker:</strong> View all submitted applications with real-time status updates</li>
    <li><strong>Status Display:</strong> Visual badges showing application status (New, Reviewing, Interview, Offered, Rejected, Hired)</li>
    <li><strong>Message Thread:</strong> View and send messages to recruiter for each application</li>
    <li><strong>Job Details:</strong> Quick access to original job posting details</li>
  </ul>
</div>

<h2>4.4 New Pages</h2>
<table>
  <tr><th>Page</th><th>Route</th><th>Lines</th><th>Purpose</th></tr>
  <tr><td>Candidate Auth</td><td><code>/candidate</code></td><td>247</td><td>Login/registration for candidates</td></tr>
  <tr><td>Candidate Portal</td><td><code>/candidate</code> (authenticated)</td><td>406</td><td>Application tracking & messaging</td></tr>
  <tr><td>Admin Careers</td><td><code>/admin/careers</code></td><td>816</td><td>Job management & application review</td></tr>
  <tr><td>Public Careers</td><td><code>/careers</code></td><td>677</td><td>Public job listings & application</td></tr>
</table>
</div>

<!-- 5. PDF RESUME UPLOAD -->
<h1 class="pb">5. PDF Resume Upload System</h1>

<div class="section">
<p>A secure file upload system was implemented allowing candidates to attach their CVs/resumes in PDF format during job applications. Files are stored in S3-compatible object storage (Google Cloud Storage backend).</p>

<h2>5.1 Upload Architecture</h2>
<pre>
Client (careers.tsx)
    |
    +-> User selects PDF via &lt;label htmlFor="resume-file-input"&gt;
    |   (Native file picker via &lt;input type="file" accept=".pdf"&gt;)
    |
    +-> Client-side validation:
    |   - File type check (application/pdf or .pdf extension)
    |   - File size display
    |
    +-> On form submit: POST /api/careers/upload-resume
    |   - FormData with "resume" field
    |   - Multer middleware processes upload
    |
    +-> Server-side validation:
    |   - Multer fileFilter: only PDF MIME type accepted
    |   - Max size: 10 MB
    |
    +-> Storage:
    |   - File saved to Object Storage: .private/resumes/{nanoid}-{timestamp}.pdf
    |   - Returns URL path for database storage
    |
    +-> Resume URL included in application submission
    +-> Head Admins can download via GET /api/careers/resume/:applicationId
</pre>

<h2>5.2 Security Measures</h2>
<table>
  <tr><th>Layer</th><th>Protection</th></tr>
  <tr><td>Client-side</td><td>HTML accept=".pdf,application/pdf" attribute + JavaScript MIME type validation</td></tr>
  <tr><td>Server-side</td><td>Multer fileFilter rejects non-PDF files with error message</td></tr>
  <tr><td>Size Limit</td><td>10 MB maximum file size enforced by Multer</td></tr>
  <tr><td>Storage</td><td>Files stored in <code>.private/</code> directory (not publicly accessible)</td></tr>
  <tr><td>Access Control</td><td>Resume download restricted to Head Admin role only</td></tr>
  <tr><td>File Naming</td><td>Original filename replaced with nanoid + timestamp (prevents collisions & path traversal)</td></tr>
</table>

<h2>5.3 UI/UX Implementation</h2>
<div class="card">
  <ul>
    <li><strong>Upload Trigger:</strong> HTML <code>&lt;label&gt;</code> element with <code>htmlFor</code> attribute linked to hidden file input - ensures reliable file picker opening inside Radix UI Dialog components</li>
    <li><strong>File Input:</strong> Uses <code>className="sr-only"</code> (screen-reader only) instead of <code>hidden</code> for better accessibility and Radix Dialog compatibility</li>
    <li><strong>File Preview:</strong> After selection, displays filename, file size in KB, and a remove button</li>
    <li><strong>Upload Progress:</strong> Loading state shown during upload with disabled submit button</li>
    <li><strong>Error Handling:</strong> Upload errors display in destructive-colored text with clear messaging</li>
  </ul>
</div>
</div>

<!-- 6. DARK THEME OVERHAUL -->
<h1 class="pb">6. Dark Theme System Overhaul</h1>

<div class="section">
<p>The platform's dark theme was completely overhauled to create a unified visual identity matching the landing page aesthetic. The approach leverages shadcn's CSS variable system, allowing changes to propagate to all components automatically.</p>

<h2>6.1 CSS Variable Changes</h2>
<table>
  <tr><th>Variable</th><th>Previous Value</th><th>New Value</th><th>Purpose</th></tr>
  <tr><td><code>--background</code></td><td>222 47% 11%</td><td>240 10% 4%</td><td>Near-black background (#09090b)</td></tr>
  <tr><td><code>--foreground</code></td><td>210 40% 98%</td><td>0 0% 95%</td><td>Near-white text</td></tr>
  <tr><td><code>--card</code></td><td>217 33% 17%</td><td>240 6% 7%</td><td>Card backgrounds</td></tr>
  <tr><td><code>--primary</code></td><td>220 85% 35%</td><td>187 85% 53%</td><td>Cyan/teal accent</td></tr>
  <tr><td><code>--primary-foreground</code></td><td>0 0% 100%</td><td>0 0% 5%</td><td>Text on primary buttons</td></tr>
  <tr><td><code>--secondary</code></td><td>215 28% 17%</td><td>240 5% 12%</td><td>Secondary surfaces</td></tr>
  <tr><td><code>--muted</code></td><td>215 28% 17%</td><td>240 4% 14%</td><td>Muted backgrounds</td></tr>
  <tr><td><code>--accent</code></td><td>215 28% 17%</td><td>240 5% 15%</td><td>Accent surfaces</td></tr>
  <tr><td><code>--border</code></td><td>215 28% 17%</td><td>0 0% 14%</td><td>Border colors</td></tr>
  <tr><td><code>--sidebar-background</code></td><td>222 47% 11%</td><td>240 10% 5%</td><td>Sidebar background</td></tr>
  <tr><td><code>--popover</code></td><td>222 47% 11%</td><td>240 8% 6%</td><td>Popover/dropdown backgrounds</td></tr>
</table>

<h2>6.2 Theme Provider Change</h2>
<div class="before-after">
  <div class="before">
    <h4>Before</h4>
    <code>defaultTheme: "light"</code>
    <p style="margin-top:4px; font-size:10px">Platform loaded in light mode by default, users had to switch to dark manually</p>
  </div>
  <div class="after">
    <h4>After</h4>
    <code>defaultTheme: "dark"</code>
    <p style="margin-top:4px; font-size:10px">Platform now defaults to dark mode, matching the landing page. Toggle remains available for accessibility</p>
  </div>
</div>

<h2>6.3 Component Updates</h2>
<table>
  <tr><th>Component</th><th>Change</th></tr>
  <tr><td>Radial Menu</td><td>Replaced hardcoded <code>text-white</code>/<code>border-white</code> with semantic <code>text-primary</code>/<code>border-primary</code> for cyan accents</td></tr>
  <tr><td>Admin Panel Cards</td><td>Removed hardcoded <code>bg-white/5 backdrop-blur-xl border-white/10</code>, now inherits from Card component theme</td></tr>
  <tr><td>404 Page</td><td>Replaced <code>bg-gray-50</code>/<code>text-gray-900</code> with semantic <code>bg-background</code>/<code>text-foreground</code></td></tr>
  <tr><td>Event Card</td><td>Fixed TypeScript interface (added <code>isDraft</code>, <code>registrationOpen</code> properties)</td></tr>
</table>

<h2>6.4 Design Philosophy</h2>
<div class="highlight">
  <strong>Key Approach:</strong> By updating CSS variables at the root level in <code>index.css</code>, all shadcn/ui components (Card, Button, Badge, Input, Dialog, etc.) automatically inherit the new dark theme. This eliminates the need to modify individual page files and ensures consistent styling across 19+ pages.
</div>
</div>

<!-- 7. DATABASE SCHEMA CHANGES -->
<h1 class="pb">7. Database Schema Changes</h1>

<div class="section">
<h2>7.1 New Tables</h2>

<table>
  <tr><th>Table</th><th>Columns</th><th>Purpose</th></tr>
  <tr>
    <td><code>job_openings</code></td>
    <td>id (UUID PK), title, department, location, employmentType, description, requirements, salaryMin, salaryMax, salaryCurrency, status, createdAt, updatedAt</td>
    <td>Store job listing details with draft/open/closed workflow</td>
  </tr>
  <tr>
    <td><code>job_applications</code></td>
    <td>id (UUID PK), jobId (FK), applicantName, email, phone, resumeUrl, resumeText, coverLetter, status, candidateId (FK to users), createdAt, updatedAt</td>
    <td>Track candidate applications with status progression</td>
  </tr>
  <tr>
    <td><code>job_application_messages</code></td>
    <td>id (UUID PK), applicationId (FK), senderId, senderType, content, createdAt</td>
    <td>Communication thread between recruiters and candidates</td>
  </tr>
</table>

<h2>7.2 Schema Details</h2>
<pre>
// shared/schema.ts - New tables (+123 lines)

export const jobOpenings = pgTable("job_openings", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  title: text("title").notNull(),
  department: text("department").notNull(),
  location: text("location").notNull(),
  employmentType: text("employment_type").notNull(), // full-time, part-time, contract, internship
  description: text("description").notNull(),
  requirements: text("requirements"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency").default("RUB"),
  status: text("status").notNull().default("draft"), // draft, open, closed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  jobId: varchar("job_id").notNull(),
  applicantName: text("applicant_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  resumeUrl: text("resume_url"),
  resumeText: text("resume_text"),
  coverLetter: text("cover_letter"),
  status: text("status").notNull().default("new"),
  candidateId: integer("candidate_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobApplicationMessages = pgTable("job_application_messages", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  applicationId: varchar("application_id").notNull(),
  senderId: integer("sender_id"),
  senderType: text("sender_type").notNull(), // "admin" or "candidate"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
</pre>

<h2>7.3 Zod Schemas Added</h2>
<table>
  <tr><th>Schema</th><th>Purpose</th></tr>
  <tr><td><code>insertJobOpeningSchema</code></td><td>Validates job creation/update payloads</td></tr>
  <tr><td><code>insertJobApplicationSchema</code></td><td>Validates application submissions</td></tr>
  <tr><td><code>insertJobApplicationMessageSchema</code></td><td>Validates message sending</td></tr>
  <tr><td><code>applyJobSchema</code></td><td>Public application validation (includes optional password)</td></tr>
</table>
</div>

<!-- 8. API ROUTES -->
<h1 class="pb">8. API Routes Added</h1>

<div class="section">
<p>16 new API routes were added to support the career portal functionality (+465 lines in server/routes.ts).</p>

<h2>8.1 Public Routes (No Authentication Required)</h2>
<table>
  <tr><th>Method</th><th>Route</th><th>Purpose</th></tr>
  <tr><td><span class="tag tag-green">GET</span></td><td><code>/api/careers/openings</code></td><td>List all open job positions (public browsing)</td></tr>
  <tr><td><span class="tag tag-green">GET</span></td><td><code>/api/careers/openings/:id</code></td><td>Get single job opening details</td></tr>
  <tr><td><span class="tag tag-blue">POST</span></td><td><code>/api/careers/upload-resume</code></td><td>Upload PDF resume to object storage</td></tr>
  <tr><td><span class="tag tag-blue">POST</span></td><td><code>/api/careers/apply</code></td><td>Submit job application (auto-creates candidate account if password provided)</td></tr>
</table>

<h2>8.2 Candidate Routes (Candidate Authentication)</h2>
<table>
  <tr><th>Method</th><th>Route</th><th>Purpose</th></tr>
  <tr><td><span class="tag tag-blue">POST</span></td><td><code>/api/candidate/login</code></td><td>Candidate email/password login</td></tr>
  <tr><td><span class="tag tag-green">GET</span></td><td><code>/api/candidate/me</code></td><td>Get current candidate profile</td></tr>
  <tr><td><span class="tag tag-blue">POST</span></td><td><code>/api/candidate/logout</code></td><td>Candidate session logout</td></tr>
  <tr><td><span class="tag tag-green">GET</span></td><td><code>/api/candidate/applications</code></td><td>List candidate's applications</td></tr>
  <tr><td><span class="tag tag-green">GET</span></td><td><code>/api/candidate/applications/:id/messages</code></td><td>Get message thread for an application</td></tr>
  <tr><td><span class="tag tag-blue">POST</span></td><td><code>/api/candidate/applications/:id/messages</code></td><td>Send message to recruiter</td></tr>
</table>

<h2>8.3 Admin Routes (Admin/Head Admin Authentication)</h2>
<table>
  <tr><th>Method</th><th>Route</th><th>Purpose</th></tr>
  <tr><td><span class="tag tag-blue">POST</span></td><td><code>/api/careers/openings</code></td><td>Create new job opening</td></tr>
  <tr><td><span class="tag tag-orange">PATCH</span></td><td><code>/api/careers/openings/:id</code></td><td>Update job opening</td></tr>
  <tr><td><span class="tag tag-red">DELETE</span></td><td><code>/api/careers/openings/:id</code></td><td>Delete job opening</td></tr>
  <tr><td><span class="tag tag-green">GET</span></td><td><code>/api/careers/applications</code></td><td>List all applications (with job details)</td></tr>
  <tr><td><span class="tag tag-orange">PATCH</span></td><td><code>/api/careers/applications/:id/status</code></td><td>Update application status</td></tr>
  <tr><td><span class="tag tag-green">GET</span></td><td><code>/api/careers/resume/:applicationId</code></td><td>Download resume PDF (Head Admin only)</td></tr>
</table>

<h2>8.4 Storage Interface Methods Added</h2>
<table>
  <tr><th>Method</th><th>Purpose</th></tr>
  <tr><td><code>getJobOpenings()</code></td><td>Fetch all job openings (optional status filter)</td></tr>
  <tr><td><code>getJobOpening(id)</code></td><td>Fetch single job opening by ID</td></tr>
  <tr><td><code>createJobOpening(data)</code></td><td>Create new job opening</td></tr>
  <tr><td><code>updateJobOpening(id, data)</code></td><td>Update job opening fields</td></tr>
  <tr><td><code>deleteJobOpening(id)</code></td><td>Delete job opening</td></tr>
  <tr><td><code>createJobApplication(data)</code></td><td>Create new application record</td></tr>
  <tr><td><code>getJobApplications(jobId?)</code></td><td>List applications (optional filter by job)</td></tr>
  <tr><td><code>getJobApplication(id)</code></td><td>Get single application with job details</td></tr>
  <tr><td><code>updateJobApplicationStatus(id, status)</code></td><td>Update application status</td></tr>
  <tr><td><code>getCandidateApplications(candidateId)</code></td><td>List applications for a specific candidate</td></tr>
  <tr><td><code>getApplicationMessages(applicationId)</code></td><td>Get message thread</td></tr>
  <tr><td><code>createApplicationMessage(data)</code></td><td>Send a new message</td></tr>
</table>
</div>

<!-- 9. NEW FRONTEND PAGES -->
<h1 class="pb">9. New Frontend Pages</h1>

<div class="section">
<h2>9.1 Page Summary</h2>
<table>
  <tr><th>File</th><th>Route</th><th>Lines</th><th>Description</th></tr>
  <tr><td><code>careers.tsx</code></td><td>/careers</td><td>677</td><td>Public career portal with job listings, search, filters, and application dialog</td></tr>
  <tr><td><code>admin-careers.tsx</code></td><td>/admin/careers</td><td>816</td><td>Admin panel for managing job openings, reviewing applications, candidate messaging</td></tr>
  <tr><td><code>candidate-auth.tsx</code></td><td>/candidate (unauth)</td><td>247</td><td>Candidate login page with email/password authentication</td></tr>
  <tr><td><code>candidate-portal.tsx</code></td><td>/candidate (auth)</td><td>406</td><td>Candidate dashboard for tracking applications and messaging</td></tr>
</table>

<h2>9.2 Route Registration</h2>
<div class="card">
  <p>Routes were registered in <code>client/src/App.tsx</code> and <code>server/index.ts</code>:</p>
  <ul>
    <li><code>/careers</code> - Public page, no authentication required</li>
    <li><code>/candidate</code> - Shows login if not authenticated, portal if authenticated as candidate</li>
    <li><code>/admin/careers</code> - Protected admin route, accessible to Admin and Head Admin roles only</li>
  </ul>
</div>

<h2>9.3 Component Architecture</h2>
<div class="card">
  <p>All new pages use the established component patterns:</p>
  <ul>
    <li><strong>shadcn/ui components:</strong> Card, Button, Badge, Dialog, Input, Textarea, Select, Tabs, Avatar, ScrollArea</li>
    <li><strong>TanStack Query:</strong> useQuery for data fetching, useMutation for state changes with cache invalidation</li>
    <li><strong>Translations:</strong> All text uses <code>t("key")</code> from LanguageContext for EN/RU support</li>
    <li><strong>data-testid:</strong> All interactive elements and meaningful displays have test identifiers</li>
    <li><strong>Responsive:</strong> Grid layouts with mobile-first responsive breakpoints</li>
  </ul>
</div>
</div>

<!-- 10. TRANSLATION UPDATES -->
<h1 class="pb">10. Translation Updates</h1>

<div class="section">
<p>228 lines of new translations were added to <code>client/src/lib/translations.ts</code> covering the career portal and candidate system.</p>

<h2>10.1 New Translation Keys</h2>
<table>
  <tr><th>Category</th><th>Example Keys (EN)</th><th>Example Values (RU)</th></tr>
  <tr><td>Career Portal</td><td>careers, openPositions, applyForPosition</td><td>Карьера, Открытые вакансии, Подать заявку</td></tr>
  <tr><td>Job Details</td><td>department, location, salaryRange</td><td>Отдел, Местоположение, Диапазон зарплаты</td></tr>
  <tr><td>Application</td><td>yourName, uploadResume, choosePdf</td><td>Ваше имя, Загрузить резюме, Выберите PDF</td></tr>
  <tr><td>Candidate</td><td>candidateLogin, myApplications, goToPortal</td><td>Вход кандидата, Мои заявки, Перейти в портал</td></tr>
  <tr><td>Status</td><td>statusNew, statusReviewing, statusInterview</td><td>Новая, На рассмотрении, Собеседование</td></tr>
  <tr><td>Admin</td><td>manageOpenings, applicationsList, sendMessage</td><td>Управление вакансиями, Список заявок, Отправить</td></tr>
  <tr><td>Employment</td><td>fullTime, partTime, contract, internship</td><td>Полная занятость, Частичная занятость, Контракт, Стажировка</td></tr>
</table>

<div class="highlight">
  <strong>Translation Coverage:</strong> All new UI elements, form labels, error messages, status badges, button labels, and tooltips have both English and Russian translations. No hardcoded strings in new pages.
</div>
</div>

<!-- 11. BUG FIXES -->
<h1 class="pb">11. Bug Fixes & Improvements</h1>

<div class="section">
<h2>11.1 Date Display Enhancement</h2>
<div class="card">
  <ul>
    <li><strong>Issue:</strong> Event dates displayed in inconsistent formats across different pages</li>
    <li><strong>Fix:</strong> Created <code>client/src/lib/dateUtils.ts</code> (29 lines) with centralized date formatting utility</li>
    <li><strong>Impact:</strong> Updated event-detail.tsx, admin-reports.tsx, event-certificate.tsx, event-ticket.tsx, simple-certificate.tsx, my-certificates.tsx, my-tickets.tsx</li>
  </ul>
</div>

<h2>11.2 Event Card TypeScript Fix</h2>
<div class="card">
  <ul>
    <li><strong>Issue:</strong> Missing <code>isDraft</code> and <code>registrationOpen</code> properties in Event interface</li>
    <li><strong>Fix:</strong> Added optional properties to the interface in <code>event-card.tsx</code></li>
    <li><strong>Impact:</strong> Resolved TypeScript compilation errors on events page</li>
  </ul>
</div>

<h2>11.3 Resume Upload Dialog Fix</h2>
<div class="card">
  <ul>
    <li><strong>Issue:</strong> PDF file picker not reliably opening inside Radix UI Dialog - programmatic <code>.click()</code> on hidden input could fail due to Dialog's outside-interaction detection</li>
    <li><strong>Fix:</strong> Replaced <code>className="hidden"</code> with <code>className="sr-only"</code> and switched from <code>Button onClick</code> to native <code>&lt;label htmlFor&gt;</code> approach for reliable file picker triggering</li>
    <li><strong>Additional:</strong> Added <code>onInteractOutside</code> handler to prevent dialog closing during upload, added client-side MIME type validation</li>
  </ul>
</div>

<h2>11.4 404 Page Theme Fix</h2>
<div class="card">
  <ul>
    <li><strong>Issue:</strong> Not Found page used hardcoded <code>bg-gray-50</code>, <code>text-gray-900</code> which broke in dark mode</li>
    <li><strong>Fix:</strong> Replaced with semantic <code>bg-background</code>, <code>text-foreground</code>, <code>text-muted-foreground</code></li>
  </ul>
</div>

<h2>11.5 Section Sidebar Enhancement</h2>
<div class="card">
  <ul>
    <li><strong>Change:</strong> Updated section sidebar component styling for better integration with dark theme</li>
    <li><strong>Impact:</strong> Dashboard section navigation now uses proper semantic colors</li>
  </ul>
</div>
</div>

<!-- 12. FILES CHANGED SUMMARY -->
<h1 class="pb">12. Files Changed Summary</h1>

<div class="section">
<h2>12.1 New Files Created</h2>
<table>
  <tr><th>File</th><th>Lines</th><th>Purpose</th></tr>
  <tr><td><code>client/src/pages/careers.tsx</code></td><td>677</td><td>Public career portal page</td></tr>
  <tr><td><code>client/src/pages/admin-careers.tsx</code></td><td>816</td><td>Admin career management page</td></tr>
  <tr><td><code>client/src/pages/candidate-auth.tsx</code></td><td>247</td><td>Candidate login page</td></tr>
  <tr><td><code>client/src/pages/candidate-portal.tsx</code></td><td>406</td><td>Candidate application portal</td></tr>
  <tr><td><code>client/src/lib/dateUtils.ts</code></td><td>29</td><td>Centralized date formatting utility</td></tr>
</table>

<h2>12.2 Modified Files</h2>
<table>
  <tr><th>File</th><th>Added</th><th>Removed</th><th>Change Summary</th></tr>
  <tr><td><code>client/src/pages/landing.tsx</code></td><td>+1,062</td><td>-475</td><td>Complete landing page redesign</td></tr>
  <tr><td><code>server/routes.ts</code></td><td>+465</td><td>-</td><td>16 new API routes for career portal</td></tr>
  <tr><td><code>client/src/lib/translations.ts</code></td><td>+228</td><td>-</td><td>Career portal translations (EN/RU)</td></tr>
  <tr><td><code>server/storage.ts</code></td><td>+175</td><td>-</td><td>12 new storage interface methods</td></tr>
  <tr><td><code>shared/schema.ts</code></td><td>+123</td><td>-</td><td>3 new tables + Zod schemas</td></tr>
  <tr><td><code>client/src/index.css</code></td><td>+93</td><td>-</td><td>Dark theme CSS variables overhaul</td></tr>
  <tr><td><code>client/src/pages/event-detail.tsx</code></td><td>+47</td><td>-</td><td>Date display improvements</td></tr>
  <tr><td><code>client/src/components/radial-menu.tsx</code></td><td>+10</td><td>-</td><td>Cyan accent colors</td></tr>
  <tr><td><code>client/src/App.tsx</code></td><td>+8</td><td>-</td><td>New route registrations</td></tr>
  <tr><td><code>client/src/pages/admin-panel.tsx</code></td><td>+3</td><td>-3</td><td>Removed hardcoded glass-card styles</td></tr>
  <tr><td><code>client/src/pages/not-found.tsx</code></td><td>+4</td><td>-4</td><td>Semantic color tokens</td></tr>
  <tr><td><code>client/src/components/theme-provider.tsx</code></td><td>+1</td><td>-1</td><td>Default theme changed to dark</td></tr>
  <tr><td><code>client/src/components/event-card.tsx</code></td><td>+7</td><td>-</td><td>TypeScript interface fix</td></tr>
  <tr><td><code>server/index.ts</code></td><td>+7</td><td>-</td><td>Candidate auth routes registration</td></tr>
  <tr><td><code>client/index.html</code></td><td>+2</td><td>-1</td><td>Plus Jakarta Sans font import</td></tr>
  <tr><td><code>the platform.md</code></td><td>+1</td><td>-</td><td>Career portal documentation added</td></tr>
</table>

<div class="highlight">
  <strong>Total Impact:</strong> 29 files changed | +3,991 lines added | -475 lines removed | Net: +3,516 lines of new code
</div>
</div>

<div class="footer" style="margin-top: 40px;">
  <p>Business Club Platform - Financial University | Changes Report</p>
  <p>Generated on February 6, 2026 | Confidential</p>
</div>

</body>
</html>`;

async function generatePDF() {
  const htmlPath = '/tmp/changes_report.html';
  const pdfPath = 'Business_Club_Platform_Changes_Report_Feb6.pdf';
  
  fs.writeFileSync(htmlPath, htmlContent);
  
  const browser = await puppeteer.launch({
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-size: 8px; text-align: center; width: 100%; color: #999;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  });
  
  await browser.close();
  console.log('PDF generated successfully: ' + pdfPath);
}

generatePDF().catch(console.error);
