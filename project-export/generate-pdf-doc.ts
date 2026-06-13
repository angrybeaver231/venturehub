import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Business Club Platform - Technical Documentation</title>
<style>
  @page { margin: 20mm 15mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; line-height: 1.5; color: #1a1a2e; background: #fff; }
  .cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 90vh; text-align: center; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); color: white; padding: 40px; border-radius: 0; }
  .cover h1 { font-size: 36px; margin-bottom: 10px; letter-spacing: 2px; }
  .cover h2 { font-size: 18px; font-weight: 300; margin-bottom: 30px; opacity: 0.9; }
  .cover .meta { font-size: 13px; opacity: 0.7; margin-top: 20px; }
  .cover .badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); padding: 6px 16px; border-radius: 20px; margin: 5px; font-size: 11px; }
  
  h1 { font-size: 22px; color: #1a1a2e; border-bottom: 3px solid #302b63; padding-bottom: 8px; margin: 25px 0 15px; }
  h2 { font-size: 16px; color: #302b63; margin: 20px 0 10px; border-left: 4px solid #302b63; padding-left: 10px; }
  h3 { font-size: 13px; color: #444; margin: 12px 0 6px; }
  
  .section { page-break-inside: avoid; margin-bottom: 20px; }
  .toc { page-break-after: always; }
  .toc h1 { text-align: center; border-bottom: none; }
  .toc ul { list-style: none; padding: 0; }
  .toc li { padding: 6px 0; border-bottom: 1px dotted #ccc; font-size: 13px; }
  .toc li span { float: right; color: #666; }
  
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10px; }
  th { background: #302b63; color: white; padding: 6px 8px; text-align: left; font-weight: 600; }
  td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) { background: #f8f8fc; }
  tr:hover { background: #f0f0ff; }
  
  .card { background: #f8f8fc; border: 1px solid #e0e0e8; border-radius: 6px; padding: 12px; margin: 8px 0; }
  .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .stat-card { background: linear-gradient(135deg, #302b63, #24243e); color: white; border-radius: 8px; padding: 15px; text-align: center; }
  .stat-card .number { font-size: 24px; font-weight: bold; }
  .stat-card .label { font-size: 10px; opacity: 0.8; margin-top: 4px; }
  
  .tag { display: inline-block; background: #e8e8f8; color: #302b63; padding: 2px 8px; border-radius: 12px; font-size: 9px; margin: 2px; }
  .tag-green { background: #e8f8e8; color: #2d6a2d; }
  .tag-blue { background: #e8f0f8; color: #2d4a6a; }
  .tag-orange { background: #f8f0e8; color: #6a4a2d; }
  .tag-red { background: #f8e8e8; color: #6a2d2d; }
  
  .dep-table td:first-child { font-weight: 600; font-family: 'Courier New', monospace; font-size: 10px; }
  code { background: #f0f0f5; padding: 1px 5px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 10px; }
  pre { background: #1a1a2e; color: #e0e0e0; padding: 12px; border-radius: 6px; font-size: 10px; overflow-x: auto; white-space: pre-wrap; margin: 8px 0; }
  
  .tree { font-family: 'Courier New', monospace; font-size: 10px; line-height: 1.6; background: #f8f8fc; padding: 12px; border-radius: 6px; border: 1px solid #e0e0e8; }
  .highlight { background: #fff3cd; padding: 8px 12px; border-left: 4px solid #ffc107; border-radius: 0 6px 6px 0; margin: 8px 0; font-size: 11px; }
  .info-box { background: #d1ecf1; padding: 8px 12px; border-left: 4px solid #17a2b8; border-radius: 0 6px 6px 0; margin: 8px 0; }
  
  .footer { text-align: center; font-size: 9px; color: #999; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; }
  .pb { page-break-before: always; }
  .pba { page-break-after: always; }
  .nopb { page-break-inside: avoid; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div style="font-size: 14px; letter-spacing: 4px; margin-bottom: 20px; opacity: 0.6;">TECHNICAL DOCUMENTATION</div>
  <h1>Business Club Platform</h1>
  <h2>Financial University Business Club - Learning Management System</h2>
  <div style="margin: 30px 0;">
    <span class="badge">React 18 + TypeScript</span>
    <span class="badge">Express.js</span>
    <span class="badge">PostgreSQL</span>
    <span class="badge">Drizzle ORM</span>
    <span class="badge">OpenAI + GigaChat AI</span>
  </div>
  <div class="meta">
    <p>Version 1.0.0 | Generated: February 6, 2026</p>
    <p>Platform: the platform | Runtime: Node.js 20</p>
    <p>139 Source Files | 40,145 Lines of Code | 43 Database Tables | 117 NPM Packages</p>
  </div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc">
  <h1>Table of Contents</h1>
  <ul>
    <li>1. Platform Overview & Features <span>3</span></li>
    <li>2. System Architecture <span>5</span></li>
    <li>3. Technology Stack & Dependencies <span>6</span></li>
    <li>4. Repository Structure <span>9</span></li>
    <li>5. Database Configuration <span>10</span></li>
    <li>6. Database Schema & Relationships <span>11</span></li>
    <li>7. Database Data Summary <span>17</span></li>
    <li>8. Environment Variables & Secrets <span>18</span></li>
    <li>9. AI/ML Libraries & Models <span>19</span></li>
    <li>10. External API Integrations <span>20</span></li>
    <li>11. API Routes Reference <span>21</span></li>
    <li>12. Startup Configuration & Scripts <span>23</span></li>
    <li>13. Resource Usage & Performance <span>24</span></li>
    <li>14. Deployment Plan <span>25</span></li>
    <li>15. Traffic & Load Metrics <span>26</span></li>
    <li>16. Background Jobs & WebSockets <span>27</span></li>
    <li>17. Authentication & Security <span>28</span></li>
    <li>18. Bilingual Support <span>29</span></li>
  </ul>
</div>

<!-- 1. PLATFORM OVERVIEW -->
<h1>1. Platform Overview & Features</h1>

<div class="section">
<p>The Business Club Platform is a comprehensive web application built for the Financial University Business Club. It integrates event management, a full Learning Management System (LMS), video hosting, AI-powered features, and community communication tools into a single unified platform.</p>

<h2>1.1 Core Feature Modules</h2>

<div class="card-grid">
  <div class="card">
    <h3>Event Management</h3>
    <ul>
      <li>Create, edit, publish events with draft workflow</li>
      <li>Custom registration forms (text, choice, file upload fields)</li>
      <li>AI-powered chat registration via GigaChat</li>
      <li>Guest registration support</li>
      <li>QR code attendance tracking (scan & manual)</li>
      <li>Certificate generation for attendees</li>
      <li>Event photo galleries</li>
      <li>Registration statistics with Excel export</li>
    </ul>
  </div>
  <div class="card">
    <h3>Learning Management System (LMS)</h3>
    <ul>
      <li>Course creation with modules & lessons</li>
      <li>Video & text lesson types</li>
      <li>Downloadable course materials</li>
      <li>Student enrollment & progress tracking</li>
      <li>Quizzes (multiple choice, true/false, short answer)</li>
      <li>Assignment submissions with file uploads</li>
      <li>Gradebook with weighted categories</li>
      <li>Rubric-based grading system</li>
    </ul>
  </div>
  <div class="card">
    <h3>Communication Hub</h3>
    <ul>
      <li>Platform & course announcements</li>
      <li>Discussion forums per course</li>
      <li>Threaded forum replies with nesting</li>
      <li>WhatsApp-style private messaging</li>
      <li>@mention support in messages & comments</li>
      <li>Lesson comments with nested replies</li>
      <li>Real-time notification system</li>
      <li>Admin email composer (rich text)</li>
    </ul>
  </div>
  <div class="card">
    <h3>AI Challenge System</h3>
    <ul>
      <li>AI-powered debate challenges</li>
      <li>Multi-round argumentation with scoring</li>
      <li>Position-based debates (FOR/AGAINST)</li>
      <li>AI thumbnail generation (DALL-E 3)</li>
      <li>Challenge leaderboards & rankings</li>
      <li>Knowledge material attachments</li>
      <li>Configurable difficulty levels</li>
      <li>Response time limits</li>
    </ul>
  </div>
</div>

<h2>1.2 User Management & Roles</h2>
<table>
  <tr><th>Role</th><th>Permissions</th><th>Description</th></tr>
  <tr><td><span class="tag">Member</span></td><td>Browse, enroll, participate, message</td><td>Default role for all registered users</td></tr>
  <tr><td><span class="tag tag-blue">Teacher</span></td><td>Grade assignments, manage course content</td><td>Course instructors with grading privileges</td></tr>
  <tr><td><span class="tag tag-orange">Admin</span></td><td>Full content CRUD, user management, analytics</td><td>Platform administrators</td></tr>
  <tr><td><span class="tag tag-red">Head Admin</span></td><td>All admin + system config, role assignment</td><td>Superuser with complete platform control</td></tr>
</table>

<h2>1.3 Additional Features</h2>
<div class="card">
  <ul>
    <li><strong>Bilingual Interface:</strong> Full English/Russian translations across all UI elements</li>
    <li><strong>Dark/Light Mode:</strong> Material Design-inspired theming with glassmorphism effects</li>
    <li><strong>Progressive Web App (PWA):</strong> Offline caching, installable, auto-updates</li>
    <li><strong>Circular Radial Menu:</strong> Unique navigation system for main sections</li>
    <li><strong>Interactive Platform Tour:</strong> Guided onboarding for new users</li>
    <li><strong>SEO Optimization:</strong> Dynamic sitemap.xml, robots.txt, Open Graph meta tags</li>
    <li><strong>People Directory:</strong> User profiles with @tags, professional info, networking</li>
    <li><strong>Certificate & Ticket Generation:</strong> Downloadable event certificates</li>
    <li><strong>Profile Management:</strong> City, company, category, position, interests, about me</li>
    <li><strong>Password Reset:</strong> 3-step flow with 6-digit email codes via SMTP</li>
  </ul>
</div>
</div>

<!-- 2. SYSTEM ARCHITECTURE -->
<h1 class="pb">2. System Architecture</h1>
<div class="section">

<h2>2.1 Architecture Diagram</h2>
<pre>
+--------------------------------------------------+
|                    CLIENT (Browser)               |
|  React 18 + TypeScript + Vite + Tailwind CSS      |
|  shadcn/ui + Radix UI + Framer Motion             |
|  TanStack Query + Wouter Router + PWA             |
+--------------------------------------------------+
                        |
                   HTTP/HTTPS (Port 5000)
                        |
+--------------------------------------------------+
|                 EXPRESS.JS SERVER                  |
|  RESTful API + Session Auth + Multer Uploads       |
|  Passport.js (OAuth + Local) + Rate Limiting       |
+--------------------------------------------------+
          |              |              |
+---------+--+  +--------+---+  +------+--------+
| PostgreSQL |  | Object     |  | External APIs |
| (Neon DB)  |  | Storage    |  | GigaChat,     |
| Drizzle ORM|  | (GCS)      |  | OpenAI, SMTP  |
+------------+  +------------+  +---------------+
</pre>

<h2>2.2 Frontend Architecture</h2>
<div class="card">
  <ul>
    <li><strong>Build Tool:</strong> Vite 5.4 with HMR and React plugin</li>
    <li><strong>UI Framework:</strong> shadcn/ui components built on Radix UI primitives</li>
    <li><strong>Styling:</strong> Tailwind CSS 3.4 with custom design tokens, dark/light mode</li>
    <li><strong>State Management:</strong> TanStack Query v5 (server state) + React Context (app state)</li>
    <li><strong>Routing:</strong> Wouter 3.3 (lightweight client-side routing)</li>
    <li><strong>Forms:</strong> react-hook-form + zod validation + @hookform/resolvers</li>
    <li><strong>Animations:</strong> Framer Motion 11 (page transitions, parallax, micro-interactions)</li>
    <li><strong>Charts:</strong> Recharts 2.15 for analytics dashboards</li>
  </ul>
</div>

<h2>2.3 Backend Architecture</h2>
<div class="card">
  <ul>
    <li><strong>Runtime:</strong> Node.js 20 with TypeScript (tsx for development)</li>
    <li><strong>Framework:</strong> Express.js 4.21 with RESTful API design</li>
    <li><strong>ORM:</strong> Drizzle ORM 0.39 with type-safe queries</li>
    <li><strong>Authentication:</strong> Passport.js (OpenID Connect + Local strategy with bcrypt)</li>
    <li><strong>Sessions:</strong> express-session with connect-pg-simple (PostgreSQL store, 7-day TTL)</li>
    <li><strong>File Uploads:</strong> Multer 2.0 with Google Cloud Storage backend</li>
    <li><strong>Email:</strong> Nodemailer 7.0 with corporate SMTP</li>
    <li><strong>Validation:</strong> Zod 3.24 + drizzle-zod for schema-driven validation</li>
  </ul>
</div>
</div>

<!-- 3. TECHNOLOGY STACK -->
<h1 class="pb">3. Technology Stack & Dependencies</h1>
<div class="section">

<h2>3.1 Main Runtime</h2>
<table>
  <tr><th>Component</th><th>Technology</th><th>Version</th></tr>
  <tr><td>Language</td><td>TypeScript</td><td>5.6.3</td></tr>
  <tr><td>Runtime</td><td>Node.js</td><td>20.x</td></tr>
  <tr><td>Package Manager</td><td>npm</td><td>Latest</td></tr>
  <tr><td>Build Tool</td><td>Vite + esbuild</td><td>5.4.20 / 0.25.0</td></tr>
</table>

<h2>3.2 Production Dependencies (package.json)</h2>
<table class="dep-table">
  <tr><th>Package</th><th>Version</th><th>Purpose</th></tr>
  <tr><td>@google-cloud/storage</td><td>^7.17.2</td><td>Object storage (GCS backend)</td></tr>
  <tr><td>@hookform/resolvers</td><td>^3.10.0</td><td>Form validation resolvers (zod)</td></tr>
  <tr><td>@neondatabase/serverless</td><td>^0.10.4</td><td>Neon PostgreSQL serverless driver</td></tr>
  <tr><td>@radix-ui/* (16 packages)</td><td>^1.x - ^2.x</td><td>Headless UI primitives (dialog, dropdown, tabs, etc.)</td></tr>
  <tr><td>@tanstack/react-query</td><td>^5.60.5</td><td>Server state management & caching</td></tr>
  <tr><td>bcrypt</td><td>^6.0.0</td><td>Password hashing</td></tr>
  <tr><td>class-variance-authority</td><td>^0.7.1</td><td>Component variant styling</td></tr>
  <tr><td>cmdk</td><td>^1.1.1</td><td>Command palette component</td></tr>
  <tr><td>connect-pg-simple</td><td>^10.0.0</td><td>PostgreSQL session store</td></tr>
  <tr><td>date-fns</td><td>^3.6.0</td><td>Date utilities</td></tr>
  <tr><td>drizzle-orm</td><td>^0.39.1</td><td>Type-safe ORM</td></tr>
  <tr><td>drizzle-zod</td><td>^0.7.0</td><td>Drizzle + Zod schema generation</td></tr>
  <tr><td>embla-carousel-react</td><td>^8.6.0</td><td>Carousel component</td></tr>
  <tr><td>exceljs</td><td>^4.4.0</td><td>Excel file generation (reports)</td></tr>
  <tr><td>express</td><td>^4.21.2</td><td>Web server framework</td></tr>
  <tr><td>express-session</td><td>^1.18.1</td><td>Session middleware</td></tr>
  <tr><td>framer-motion</td><td>^11.13.1</td><td>Animation library</td></tr>
  <tr><td>gigachat-node</td><td>^2.4.5</td><td>GigaChat (Sber AI) SDK</td></tr>
  <tr><td>google-auth-library</td><td>^10.5.0</td><td>Google authentication</td></tr>
  <tr><td>html2canvas</td><td>^1.4.1</td><td>HTML to canvas rendering</td></tr>
  <tr><td>html5-qrcode</td><td>^2.3.8</td><td>QR code scanning</td></tr>
  <tr><td>jsonwebtoken</td><td>^9.0.2</td><td>JWT token handling</td></tr>
  <tr><td>lucide-react</td><td>^0.453.0</td><td>Icon library</td></tr>
  <tr><td>multer</td><td>^2.0.2</td><td>File upload middleware</td></tr>
  <tr><td>nodemailer</td><td>^7.0.10</td><td>Email sending (SMTP)</td></tr>
  <tr><td>openai</td><td>^6.10.0</td><td>OpenAI API (GPT-4o-mini, DALL-E 3)</td></tr>
  <tr><td>openid-client</td><td>^6.8.1</td><td>OpenID Connect client (session-based authentication)</td></tr>
  <tr><td>passport</td><td>^0.7.0</td><td>Authentication middleware</td></tr>
  <tr><td>passport-local</td><td>^1.0.0</td><td>Local auth strategy</td></tr>
  <tr><td>qrcode</td><td>^1.5.4</td><td>QR code generation</td></tr>
  <tr><td>react</td><td>^18.3.1</td><td>UI framework</td></tr>
  <tr><td>react-dom</td><td>^18.3.1</td><td>React DOM renderer</td></tr>
  <tr><td>react-day-picker</td><td>^8.10.1</td><td>Date picker component</td></tr>
  <tr><td>react-hook-form</td><td>^7.55.0</td><td>Form state management</td></tr>
  <tr><td>react-icons</td><td>^5.4.0</td><td>Icon library (company logos)</td></tr>
  <tr><td>react-quill</td><td>^2.0.0</td><td>Rich text editor</td></tr>
  <tr><td>recharts</td><td>^2.15.2</td><td>Data visualization charts</td></tr>
  <tr><td>sanitize-html</td><td>^2.17.0</td><td>HTML sanitization</td></tr>
  <tr><td>tailwind-merge</td><td>^2.6.0</td><td>Tailwind class merging</td></tr>
  <tr><td>vaul</td><td>^1.1.2</td><td>Drawer component</td></tr>
  <tr><td>wouter</td><td>^3.3.5</td><td>Client-side routing</td></tr>
  <tr><td>ws</td><td>^8.18.0</td><td>WebSocket client (Neon DB)</td></tr>
  <tr><td>zod</td><td>^3.24.2</td><td>Schema validation</td></tr>
</table>

<h2 class="pb">3.3 Dev Dependencies</h2>
<table class="dep-table">
  <tr><th>Package</th><th>Version</th><th>Purpose</th></tr>
  <tr><td>@the platform/vite-plugin-cartographer</td><td>^0.3.1</td><td>the platform module mapping</td></tr>
  <tr><td>@the platform/vite-plugin-dev-banner</td><td>^0.1.1</td><td>Dev mode banner</td></tr>
  <tr><td>@the platform/vite-plugin-runtime-error-modal</td><td>^0.0.3</td><td>Runtime error overlay</td></tr>
  <tr><td>@tailwindcss/typography</td><td>^0.5.15</td><td>Typography plugin</td></tr>
  <tr><td>@tailwindcss/vite</td><td>^4.1.3</td><td>Tailwind Vite plugin</td></tr>
  <tr><td>@types/* (12 packages)</td><td>Various</td><td>TypeScript type definitions</td></tr>
  <tr><td>@vitejs/plugin-react</td><td>^4.7.0</td><td>React Vite plugin</td></tr>
  <tr><td>autoprefixer</td><td>^10.4.20</td><td>CSS autoprefixer</td></tr>
  <tr><td>drizzle-kit</td><td>^0.31.4</td><td>Database migration toolkit</td></tr>
  <tr><td>esbuild</td><td>^0.25.0</td><td>Production bundler</td></tr>
  <tr><td>postcss</td><td>^8.4.47</td><td>CSS processing</td></tr>
  <tr><td>tailwindcss</td><td>^3.4.17</td><td>Utility-first CSS framework</td></tr>
  <tr><td>tsx</td><td>^4.20.5</td><td>TypeScript execution</td></tr>
  <tr><td>typescript</td><td>5.6.3</td><td>TypeScript compiler</td></tr>
  <tr><td>vite</td><td>^5.4.20</td><td>Build tool & dev server</td></tr>
</table>

<div class="highlight">
  <strong>Total Dependencies:</strong> 93 production + 23 dev + 1 optional = 117 total packages<br>
  <strong>node_modules size:</strong> 542 MB | <strong>No Python/Pip dependencies</strong> (pure Node.js stack)
</div>
</div>

<!-- 4. REPOSITORY STRUCTURE -->
<h1 class="pb">4. Repository Structure</h1>
<div class="section">
<div class="tree">
business-club/
|-- package.json                 # Dependencies & scripts
|-- tsconfig.json                # TypeScript configuration
|-- vite.config.ts               # Vite build configuration
|-- tailwind.config.ts           # Tailwind CSS configuration
|-- postcss.config.js            # PostCSS configuration
|-- drizzle.config.ts            # Database migration config
|-- components.json              # shadcn/ui configuration
|-- the platform.md                    # Project documentation
|-- design_guidelines.md         # UI/UX design standards
|
|-- shared/
|   +-- schema.ts                # Database schema (1,481 lines) - Drizzle ORM models & Zod schemas
|
|-- server/
|   |-- index.ts                 # Server entry point
|   |-- routes.ts                # All API routes (~3,700 lines)
|   |-- storage.ts               # Database operations / storage interface
|   |-- db.ts                    # Database connection (Neon PostgreSQL)
|   |-- vite.ts                  # Vite dev server integration
|   |-- auth.ts            # OAuth (OpenID Connect)
|   |-- localAuth.ts             # Email/password authentication
|   |-- ai-chat.ts               # OpenAI integration (GPT-4o-mini + DALL-E 3)
|   |-- gigachat.ts              # GigaChat (Sber AI) integration
|   |-- emailService.ts          # Nodemailer SMTP email service
|   |-- emailTemplates.ts        # HTML email templates
|   |-- objectStorage.ts         # Google Cloud Storage wrapper
|   +-- objectAcl.ts             # Object storage ACL policies
|
|-- client/
|   |-- index.html               # HTML entry point
|   +-- src/
|       |-- App.tsx              # Root component with routing
|       |-- main.tsx             # React entry point
|       |-- index.css            # Global styles & Tailwind config
|       |
|       |-- components/
|       |   |-- ui/              # 40+ shadcn/ui components
|       |   |-- app-sidebar.tsx  # Main navigation sidebar
|       |   +-- examples/        # Component examples
|       |
|       |-- contexts/
|       |   |-- LanguageContext.tsx     # Bilingual (EN/RU) context
|       |   |-- NavigationContext.tsx   # Radial menu navigation
|       |   +-- ThemeContext.tsx        # Dark/light mode
|       |
|       |-- hooks/
|       |   |-- use-toast.ts     # Toast notifications
|       |   |-- use-mobile.tsx   # Mobile detection
|       |   +-- usePageSEO.ts    # Dynamic SEO tags
|       |
|       |-- lib/
|       |   |-- queryClient.ts   # TanStack Query config
|       |   |-- translations.ts  # EN/RU translation strings (~2,500 keys)
|       |   +-- utils.ts         # Utility functions
|       |
|       +-- pages/               # 19 page components
|           |-- landing.tsx      # Public landing page
|           |-- dashboard.tsx    # User dashboard
|           |-- events.tsx       # Event listing
|           |-- event-detail.tsx # Event details & registration
|           |-- courses.tsx      # Course catalog
|           |-- course-detail.tsx       # Course content & management
|           |-- course-gradebook.tsx    # Gradebook & grading
|           |-- lesson-viewer.tsx       # Lesson content viewer
|           |-- quiz-viewer.tsx         # Quiz taking interface
|           |-- videos.tsx              # Video library
|           |-- livestreams.tsx         # Livestream viewer
|           |-- messages.tsx            # WhatsApp-style messaging
|           |-- challenges.tsx          # AI debate challenges
|           |-- challenge-detail.tsx    # Challenge detail & debate
|           |-- profile.tsx             # User profile
|           |-- my-certificates.tsx     # Certificate collection
|           |-- my-tickets.tsx          # Event tickets
|           |-- registrations.tsx       # Registration management
|           |-- scan-attendance.tsx     # QR attendance scanner
|           +-- not-found.tsx           # 404 page
|
|-- public/
|   |-- manifest.json            # PWA manifest
|   +-- sw.js                    # Service worker
|
+-- migrations/                  # Database migration files
</div>

<div class="highlight">
  <strong>Codebase Metrics:</strong> 139 source files | 40,145 total lines of code | 120 MB project size (excl. node_modules)
</div>
</div>

<!-- 5. DATABASE CONFIGURATION -->
<h1 class="pb">5. Database Configuration</h1>
<div class="section">

<h2>5.1 Database Type & Provider</h2>
<table>
  <tr><th>Property</th><th>Value</th></tr>
  <tr><td>Database Engine</td><td>PostgreSQL 15+ (Neon Serverless)</td></tr>
  <tr><td>Provider</td><td>Neon Database (via the platform integration)</td></tr>
  <tr><td>Connection</td><td>Serverless WebSocket driver (@neondatabase/serverless)</td></tr>
  <tr><td>ORM</td><td>Drizzle ORM 0.39.1</td></tr>
  <tr><td>Migration Tool</td><td>Drizzle Kit 0.31.4 (push mode)</td></tr>
  <tr><td>Session Store</td><td>connect-pg-simple (PostgreSQL-backed sessions)</td></tr>
  <tr><td>Session TTL</td><td>7 days (604,800,000 ms)</td></tr>
</table>

<h2>5.2 Connection Configuration</h2>
<pre>
// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
</pre>

<h2>5.3 Schema Sync Strategy</h2>
<div class="card">
  <p>The application uses <strong>Drizzle Kit push mode</strong> for schema synchronization. On server startup, the schema is verified against the database with retry logic (up to 4 attempts). This ensures the database matches the TypeScript schema definitions without requiring manual migration files.</p>
  <pre>Scripts: "db:push": "drizzle-kit push"</pre>
</div>
</div>

<!-- 6. DATABASE SCHEMA -->
<h1 class="pb">6. Database Schema & Relationships</h1>
<div class="section">

<h2>6.1 Tables Overview (43 Tables)</h2>
<table>
  <tr><th>Table</th><th>Columns</th><th>Purpose</th><th>Key Relationships</th></tr>
  <tr><td>users</td><td>22</td><td>User accounts & profiles</td><td>Central entity (referenced by most tables)</td></tr>
  <tr><td>sessions</td><td>3</td><td>Server-side session storage</td><td>Indexed on expire</td></tr>
  <tr><td>password_reset_tokens</td><td>5</td><td>Password reset codes</td><td>email reference</td></tr>
  <tr><td>events</td><td>15</td><td>Event management</td><td>Has many registrations, form fields</td></tr>
  <tr><td>event_registrations</td><td>8</td><td>Event attendee registrations</td><td>FK: events, users (unique combo)</td></tr>
  <tr><td>event_form_fields</td><td>11</td><td>Custom registration form fields</td><td>FK: events</td></tr>
  <tr><td>event_form_responses</td><td>5</td><td>Form submission records</td><td>FK: events, users, registrations</td></tr>
  <tr><td>event_form_answers</td><td>9</td><td>Individual field answers</td><td>FK: responses, fields</td></tr>
  <tr><td>videos</td><td>6</td><td>Video library entries</td><td>FK: users (uploaded_by)</td></tr>
  <tr><td>video_comments</td><td>5</td><td>Video comments</td><td>FK: videos, users</td></tr>
  <tr><td>livestreams</td><td>8</td><td>Livestream sessions</td><td>Standalone</td></tr>
  <tr><td>courses</td><td>15</td><td>Course definitions</td><td>FK: users (instructor). Has many modules</td></tr>
  <tr><td>course_modules</td><td>6</td><td>Course module groupings</td><td>FK: courses</td></tr>
  <tr><td>course_lessons</td><td>11</td><td>Individual lessons</td><td>FK: courses, modules</td></tr>
  <tr><td>course_materials</td><td>8</td><td>Downloadable lesson files</td><td>FK: lessons</td></tr>
  <tr><td>course_enrollments</td><td>6</td><td>Student enrollments</td><td>FK: courses, users (unique combo)</td></tr>
  <tr><td>course_lesson_progress</td><td>8</td><td>Per-lesson progress tracking</td><td>FK: lessons, users (unique combo)</td></tr>
  <tr><td>course_progress</td><td>6</td><td>Overall course progress</td><td>FK: courses, users</td></tr>
  <tr><td>course_tasks</td><td>15</td><td>Quizzes & assignments</td><td>FK: courses, modules</td></tr>
  <tr><td>course_quiz_questions</td><td>10</td><td>Quiz question bank</td><td>FK: tasks</td></tr>
  <tr><td>course_quiz_attempts</td><td>11</td><td>Quiz attempt records</td><td>FK: tasks, users</td></tr>
  <tr><td>course_submissions</td><td>5</td><td>Assignment submissions</td><td>FK: tasks, users</td></tr>
  <tr><td>announcements</td><td>10</td><td>Platform/course announcements</td><td>FK: users (author), courses</td></tr>
  <tr><td>discussion_forums</td><td>5</td><td>Discussion forums</td><td>FK: courses (one per course)</td></tr>
  <tr><td>discussion_threads</td><td>10</td><td>Forum topics</td><td>FK: forums, users</td></tr>
  <tr><td>discussion_replies</td><td>7</td><td>Thread replies (nested)</td><td>FK: threads, users, self-ref</td></tr>
  <tr><td>conversations</td><td>6</td><td>1:1 chat threads</td><td>FK: users (participant1, participant2)</td></tr>
  <tr><td>chat_messages_private</td><td>8</td><td>Private chat messages</td><td>FK: conversations, users</td></tr>
  <tr><td>private_messages</td><td>7</td><td>Legacy private messages</td><td>FK: users (sender, recipient)</td></tr>
  <tr><td>lesson_comments</td><td>8</td><td>Lesson comments with @mentions</td><td>FK: lessons, users, self-ref</td></tr>
  <tr><td>notifications</td><td>9</td><td>User notifications</td><td>FK: users</td></tr>
  <tr><td>challenges</td><td>13</td><td>AI debate challenges</td><td>FK: users (created_by)</td></tr>
  <tr><td>challenge_attachments</td><td>8</td><td>Challenge knowledge files</td><td>FK: challenges</td></tr>
  <tr><td>challenge_attempts</td><td>10</td><td>Debate attempt records</td><td>FK: challenges, users</td></tr>
  <tr><td>challenge_messages</td><td>6</td><td>Debate conversation messages</td><td>FK: attempts</td></tr>
  <tr><td>chat_sessions</td><td>8</td><td>AI chat sessions (registration)</td><td>FK: events, users</td></tr>
  <tr><td>chat_messages</td><td>5</td><td>AI chat messages</td><td>FK: sessions</td></tr>
  <tr><td>grade_categories</td><td>5</td><td>Weighted grade categories</td><td>FK: courses</td></tr>
  <tr><td>gradebook_entries</td><td>11</td><td>Student grade records</td><td>FK: courses, users, categories, tasks</td></tr>
  <tr><td>rubrics</td><td>6</td><td>Grading rubric definitions</td><td>FK: courses</td></tr>
  <tr><td>rubric_criteria</td><td>6</td><td>Rubric criteria items</td><td>FK: rubrics</td></tr>
  <tr><td>rubric_levels</td><td>6</td><td>Performance levels per criterion</td><td>FK: criteria</td></tr>
  <tr><td>rubric_scores</td><td>8</td><td>Applied rubric scores</td><td>FK: submissions, criteria, levels</td></tr>
</table>

<h2 class="pb">6.2 Key Indexes</h2>
<table>
  <tr><th>Index</th><th>Table</th><th>Type</th></tr>
  <tr><td>IDX_session_expire</td><td>sessions</td><td>B-tree on expire</td></tr>
  <tr><td>users_email_lower_unique</td><td>users</td><td>Unique on lower(trim(email))</td></tr>
  <tr><td>users_tag_key</td><td>users</td><td>Unique on tag</td></tr>
  <tr><td>unique_event_user_registration</td><td>event_registrations</td><td>Unique on (event_id, user_id)</td></tr>
  <tr><td>course_enrollments_course_id_user_id_key</td><td>course_enrollments</td><td>Unique on (course_id, user_id)</td></tr>
  <tr><td>course_lesson_progress_lesson_id_user_id_key</td><td>course_lesson_progress</td><td>Unique on (lesson_id, user_id)</td></tr>
  <tr><td>unique_gradebook_entry</td><td>gradebook_entries</td><td>Unique on (course_id, user_id, task_id)</td></tr>
</table>

<h2>6.3 Entity Relationship Summary</h2>
<pre>
users (1) ----< (N) event_registrations >---- (1) events
users (1) ----< (N) course_enrollments >---- (1) courses
courses (1) ----< (N) course_modules (1) ----< (N) course_lessons
course_lessons (1) ----< (N) course_materials
course_lessons (1) ----< (N) course_lesson_progress >---- (1) users
courses (1) ----< (N) course_tasks (1) ----< (N) course_quiz_questions
course_tasks (1) ----< (N) course_quiz_attempts >---- (1) users
course_tasks (1) ----< (N) course_submissions >---- (1) users
courses (1) ----< (N) discussion_forums (1) ----< (N) discussion_threads
discussion_threads (1) ----< (N) discussion_replies
users (1) ----< (N) conversations >---- (1) users
conversations (1) ----< (N) chat_messages_private
challenges (1) ----< (N) challenge_attempts >---- (1) users
challenge_attempts (1) ----< (N) challenge_messages
rubrics (1) ----< (N) rubric_criteria (1) ----< (N) rubric_levels
course_submissions (1) ----< (N) rubric_scores >---- (1) rubric_criteria
courses (1) ----< (N) grade_categories
courses (1) ----< (N) gradebook_entries >---- (1) users
</pre>
</div>

<!-- 7. DATABASE DATA SUMMARY -->
<h1 class="pb">7. Database Data Summary</h1>
<div class="section">

<h2>7.1 Current Data Counts</h2>
<div class="card-grid">
  <div class="stat-card"><div class="number">15</div><div class="label">Registered Users</div></div>
  <div class="stat-card"><div class="number">4</div><div class="label">Events Created</div></div>
  <div class="stat-card"><div class="number">2</div><div class="label">Courses</div></div>
  <div class="stat-card"><div class="number">10</div><div class="label">Event Registrations</div></div>
  <div class="stat-card"><div class="number">2</div><div class="label">Livestreams</div></div>
  <div class="stat-card"><div class="number">0</div><div class="label">Videos</div></div>
  <div class="stat-card"><div class="number">0</div><div class="label">AI Challenges</div></div>
  <div class="stat-card"><div class="number">0</div><div class="label">Active Conversations</div></div>
</div>

<div class="info-box">
  <strong>Note:</strong> The platform is in early deployment. Data volumes are expected to grow as the Financial University Business Club begins active usage. The database schema is designed to handle thousands of users and hundreds of courses with proper indexing.
</div>

<h2>7.2 Data Export</h2>
<div class="card">
  <p>Database data can be exported using the following methods:</p>
  <ul>
    <li><strong>Gradebook CSV Export:</strong> Built-in feature at <code>/api/courses/:id/gradebook/export</code></li>
    <li><strong>Event Reports:</strong> Excel export via ExcelJS at <code>/api/events/:id/report</code></li>
    <li><strong>Full Database Dump:</strong> Available via Neon Dashboard or <code>pg_dump</code> using DATABASE_URL</li>
    <li><strong>the platform Database Rollback:</strong> Checkpoint-based rollback through the platform interface</li>
  </ul>
</div>
</div>

<!-- 8. ENVIRONMENT VARIABLES -->
<h1 class="pb">8. Environment Variables & Secrets</h1>
<div class="section">

<h2>8.1 Full List of Environment Variables / Secrets</h2>
<table>
  <tr><th>Variable Name</th><th>Type</th><th>Purpose</th><th>Required</th></tr>
  <tr><td><code>DATABASE_URL</code></td><td>Secret</td><td>PostgreSQL connection string (Neon)</td><td>Yes</td></tr>
  <tr><td><code>PGHOST</code></td><td>Secret</td><td>PostgreSQL host address</td><td>Yes</td></tr>
  <tr><td><code>PGPORT</code></td><td>Secret</td><td>PostgreSQL port</td><td>Yes</td></tr>
  <tr><td><code>PGUSER</code></td><td>Secret</td><td>PostgreSQL username</td><td>Yes</td></tr>
  <tr><td><code>PGPASSWORD</code></td><td>Secret</td><td>PostgreSQL password</td><td>Yes</td></tr>
  <tr><td><code>PGDATABASE</code></td><td>Secret</td><td>PostgreSQL database name</td><td>Yes</td></tr>
  <tr><td><code>SESSION_SECRET</code></td><td>Secret</td><td>Express session encryption key</td><td>Yes</td></tr>
  <tr><td><code>ADMIN_EMAILS</code></td><td>Secret</td><td>Comma-separated admin email addresses</td><td>Yes</td></tr>
  <tr><td><code>GIGACHAT_API_KEY</code></td><td>Env Var</td><td>GigaChat (Sber AI) API credentials</td><td>Yes</td></tr>
  <tr><td><code>AI_INTEGRATIONS_OPENAI_API_KEY</code></td><td>Secret</td><td>OpenAI API key (GPT-4o-mini, DALL-E 3)</td><td>Yes</td></tr>
  <tr><td><code>AI_INTEGRATIONS_OPENAI_BASE_URL</code></td><td>Secret</td><td>OpenAI API base URL</td><td>Yes</td></tr>
  <tr><td><code>SMTP_HOST</code></td><td>Secret</td><td>SMTP mail server hostname</td><td>Yes</td></tr>
  <tr><td><code>SMTP_PORT</code></td><td>Secret</td><td>SMTP mail server port</td><td>Yes</td></tr>
  <tr><td><code>SMTP_USER</code></td><td>Secret</td><td>SMTP authentication username</td><td>Yes</td></tr>
  <tr><td><code>SMTP_PASSWORD</code></td><td>Secret</td><td>SMTP authentication password</td><td>Yes</td></tr>
  <tr><td><code>DEFAULT_OBJECT_STORAGE_BUCKET_ID</code></td><td>Secret</td><td>S3-compatible object storage bucket identifier</td><td>Yes</td></tr>
  <tr><td><code>PUBLIC_OBJECT_SEARCH_PATHS</code></td><td>Secret</td><td>Public file storage paths</td><td>Yes</td></tr>
  <tr><td><code>PRIVATE_OBJECT_DIR</code></td><td>Secret</td><td>Private file storage directory</td><td>Yes</td></tr>
  <tr><td><code>APP_DOMAINS</code></td><td>Secret</td><td>the platform deployment domain(s)</td><td>Auto</td></tr>
  <tr><td><code>APP_DEV_DOMAIN</code></td><td>Secret</td><td>the platform development domain</td><td>Auto</td></tr>
  <tr><td><code>APP_ID</code></td><td>Secret</td><td>the platform application identifier</td><td>Auto</td></tr>
  <tr><td><code>ISSUER_URL</code></td><td>System</td><td>OpenID Connect issuer (session-based authentication)</td><td>Auto</td></tr>
</table>

<div class="highlight">
  <strong>Total:</strong> 21 environment variables/secrets (1 env var + 20 secrets). Values are never exposed in code or logs. Managed through the platform's built-in secrets manager with encryption at rest.
</div>
</div>

<!-- 9. AI/ML LIBRARIES -->
<h1 class="pb">9. AI/ML Libraries & Models</h1>
<div class="section">

<h2>9.1 OpenAI Integration</h2>
<table>
  <tr><th>Component</th><th>Details</th></tr>
  <tr><td>SDK</td><td><code>openai ^6.10.0</code></td></tr>
  <tr><td>Chat Model</td><td>GPT-4o-mini (via the platform AI integration proxy)</td></tr>
  <tr><td>Image Model</td><td>DALL-E 3 (1792x1024 resolution)</td></tr>
  <tr><td>Use Cases</td><td>AI debate judging & scoring, challenge thumbnail generation</td></tr>
  <tr><td>Base URL</td><td>Configured via <code>AI_INTEGRATIONS_OPENAI_BASE_URL</code></td></tr>
</table>

<h2>9.2 GigaChat Integration (Sber AI)</h2>
<table>
  <tr><th>Component</th><th>Details</th></tr>
  <tr><td>SDK</td><td><code>gigachat-node ^2.4.5</code></td></tr>
  <tr><td>Model</td><td>GigaChat (Sber's Russian-language AI)</td></tr>
  <tr><td>Use Cases</td><td>AI-powered event registration chat, onboarding chatbot</td></tr>
  <tr><td>Features</td><td>Natural language data extraction, structured form filling, file upload support</td></tr>
  <tr><td>Auth</td><td>OAuth2 bearer token via <code>GIGACHAT_API_KEY</code></td></tr>
</table>

<h2>9.3 AI Feature Summary</h2>
<div class="card">
  <ul>
    <li><strong>Chat Registration:</strong> Users interact with GigaChat to register for events through natural conversation. The AI extracts structured data (name, email, form answers) and creates registrations automatically.</li>
    <li><strong>Onboarding Chatbot:</strong> New users receive an AI-guided tour explaining platform features via GigaChat.</li>
    <li><strong>AI Debate Challenges:</strong> OpenAI GPT-4o-mini powers multi-round argumentative debates where users take positions (FOR/AGAINST) and the AI evaluates arguments with scoring (0-100).</li>
    <li><strong>AI Thumbnail Generation:</strong> DALL-E 3 generates custom thumbnails for debate challenges based on topic descriptions.</li>
  </ul>
</div>

<div class="info-box">
  <strong>No local ML models are used.</strong> All AI inference happens through external API calls to OpenAI and GigaChat cloud services.
</div>
</div>

<!-- 10. EXTERNAL API INTEGRATIONS -->
<h1 class="pb">10. External API Integrations & Services</h1>
<div class="section">
<table>
  <tr><th>Service</th><th>Integration Type</th><th>Purpose</th><th>SDK/Library</th></tr>
  <tr><td>session-based authentication</td><td>OpenID Connect</td><td>OAuth2 user authentication</td><td>openid-client</td></tr>
  <tr><td>Neon Database</td><td>PostgreSQL Driver</td><td>Serverless PostgreSQL</td><td>@neondatabase/serverless</td></tr>
  <tr><td>Google Cloud Storage</td><td>REST API</td><td>File/image storage (Object Storage)</td><td>@google-cloud/storage</td></tr>
  <tr><td>OpenAI</td><td>REST API</td><td>GPT-4o-mini chat + DALL-E 3 images</td><td>openai</td></tr>
  <tr><td>GigaChat (Sber)</td><td>REST API</td><td>Russian AI chat & data extraction</td><td>gigachat-node</td></tr>
  <tr><td>SMTP Server</td><td>SMTP Protocol</td><td>Email delivery (password reset, notifications, admin emails)</td><td>nodemailer</td></tr>
  <tr><td>RuTube</td><td>Embed (iframe)</td><td>Livestream hosting & video playback</td><td>iframe embed</td></tr>
</table>

<h2>10.1 Object Storage Details</h2>
<div class="card">
  <ul>
    <li><strong>Provider:</strong> S3-compatible object storage (backed by Google Cloud Storage)</li>
    <li><strong>Bucket:</strong> <code>repl-default-bucket-{APP_ID}</code></li>
    <li><strong>Public Files:</strong> Served at <code>/objects/{storageKey}</code></li>
    <li><strong>Upload Types:</strong> Event images, course materials, challenge attachments, registration file uploads</li>
    <li><strong>Access Control:</strong> Public read for event images; authenticated access for course materials and private uploads</li>
  </ul>
</div>
</div>

<!-- 11. API ROUTES -->
<h1 class="pb">11. API Routes Reference</h1>
<div class="section">

<h2>11.1 Authentication (8 routes)</h2>
<table>
  <tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr>
  <tr><td>POST</td><td>/api/register</td><td>Public</td><td>Create account (email/password)</td></tr>
  <tr><td>POST</td><td>/api/login</td><td>Public</td><td>Login (email/password)</td></tr>
  <tr><td>POST</td><td>/api/logout</td><td>Yes</td><td>End session</td></tr>
  <tr><td>GET</td><td>/api/auth/the platform</td><td>Public</td><td>OAuth redirect</td></tr>
  <tr><td>GET</td><td>/api/auth/the platform/callback</td><td>Public</td><td>OAuth callback</td></tr>
  <tr><td>POST</td><td>/api/forgot-password</td><td>Public</td><td>Request password reset code</td></tr>
  <tr><td>POST</td><td>/api/verify-reset-code</td><td>Public</td><td>Verify 6-digit reset code</td></tr>
  <tr><td>POST</td><td>/api/reset-password</td><td>Public</td><td>Set new password</td></tr>
</table>

<h2>11.2 User Management (8 routes)</h2>
<table>
  <tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr>
  <tr><td>GET</td><td>/api/user</td><td>Yes</td><td>Get current user profile</td></tr>
  <tr><td>PATCH</td><td>/api/user/profile</td><td>Yes</td><td>Update profile info</td></tr>
  <tr><td>POST</td><td>/api/user/change-password</td><td>Yes</td><td>Change password</td></tr>
  <tr><td>GET</td><td>/api/admin/users</td><td>Admin</td><td>List all users with search</td></tr>
  <tr><td>PUT</td><td>/api/admin/users/:id/role</td><td>Admin</td><td>Change user role</td></tr>
  <tr><td>POST</td><td>/api/admin/users/create-admin</td><td>Head Admin</td><td>Create admin account</td></tr>
  <tr><td>POST</td><td>/api/admin/users/:id/change-password</td><td>Admin</td><td>Admin reset user password</td></tr>
  <tr><td>GET</td><td>/api/users/search</td><td>Yes</td><td>Search users by name/email</td></tr>
</table>

<h2>11.3 Events (15+ routes)</h2>
<table>
  <tr><th>Method</th><th>Path</th><th>Description</th></tr>
  <tr><td>GET/POST</td><td>/api/events</td><td>List/Create events</td></tr>
  <tr><td>GET/PUT/DELETE</td><td>/api/events/:id</td><td>CRUD operations</td></tr>
  <tr><td>POST</td><td>/api/events/:id/register</td><td>Register for event</td></tr>
  <tr><td>GET</td><td>/api/events/:id/registrations</td><td>List registrations</td></tr>
  <tr><td>POST</td><td>/api/events/:id/attendance</td><td>Mark attendance (QR/manual)</td></tr>
  <tr><td>GET</td><td>/api/events/:id/report</td><td>Excel report export</td></tr>
  <tr><td>GET/POST</td><td>/api/events/:id/form/fields</td><td>Custom form builder</td></tr>
  <tr><td>POST</td><td>/api/events/:id/form/submit</td><td>Submit form responses</td></tr>
</table>

<h2>11.4 Courses & LMS (30+ routes)</h2>
<table>
  <tr><th>Method</th><th>Path</th><th>Description</th></tr>
  <tr><td>GET/POST</td><td>/api/courses</td><td>List/Create courses</td></tr>
  <tr><td>GET/PUT/DELETE</td><td>/api/courses/:id</td><td>CRUD operations</td></tr>
  <tr><td>POST</td><td>/api/courses/:id/enroll</td><td>Student enrollment</td></tr>
  <tr><td>GET/POST</td><td>/api/courses/:id/modules</td><td>Course modules</td></tr>
  <tr><td>GET/POST</td><td>/api/courses/:id/lessons</td><td>Course lessons</td></tr>
  <tr><td>GET/POST</td><td>/api/courses/:id/tasks</td><td>Quizzes & assignments</td></tr>
  <tr><td>POST</td><td>/api/tasks/:id/submit</td><td>Submit quiz/assignment</td></tr>
  <tr><td>POST</td><td>/api/submissions/:id/grade</td><td>Grade submissions</td></tr>
  <tr><td>GET</td><td>/api/courses/:id/progress</td><td>Progress tracking</td></tr>
  <tr><td>GET</td><td>/api/courses/:id/gradebook</td><td>Course gradebook</td></tr>
  <tr><td>GET</td><td>/api/courses/:id/gradebook/export</td><td>CSV gradebook export</td></tr>
  <tr><td>POST</td><td>/api/courses/:id/rubrics</td><td>Create grading rubrics</td></tr>
</table>

<h2>11.5 Communication (15+ routes)</h2>
<table>
  <tr><th>Method</th><th>Path</th><th>Description</th></tr>
  <tr><td>GET/POST</td><td>/api/announcements</td><td>Platform announcements</td></tr>
  <tr><td>GET/POST</td><td>/api/forums/:id/threads</td><td>Discussion threads</td></tr>
  <tr><td>POST</td><td>/api/threads/:id/replies</td><td>Thread replies</td></tr>
  <tr><td>GET</td><td>/api/conversations</td><td>Chat conversation list</td></tr>
  <tr><td>POST</td><td>/api/chat/send</td><td>Send private message</td></tr>
  <tr><td>GET</td><td>/api/notifications</td><td>User notifications</td></tr>
  <tr><td>POST</td><td>/api/lessons/:id/comments</td><td>Lesson comments</td></tr>
  <tr><td>POST</td><td>/api/admin/email/send</td><td>Admin email composer</td></tr>
</table>

<h2>11.6 AI & Challenges (10+ routes)</h2>
<table>
  <tr><th>Method</th><th>Path</th><th>Description</th></tr>
  <tr><td>POST</td><td>/api/chat/event/:id/start</td><td>Start AI registration chat</td></tr>
  <tr><td>POST</td><td>/api/chat/event/:id/message</td><td>Send AI chat message</td></tr>
  <tr><td>GET/POST</td><td>/api/challenges</td><td>List/Create challenges</td></tr>
  <tr><td>POST</td><td>/api/challenges/:id/start</td><td>Start debate attempt</td></tr>
  <tr><td>POST</td><td>/api/challenges/:id/message</td><td>Send debate argument</td></tr>
  <tr><td>GET</td><td>/api/challenges/:id/leaderboard</td><td>Challenge rankings</td></tr>
  <tr><td>POST</td><td>/api/challenges/:id/thumbnail/generate</td><td>AI thumbnail generation</td></tr>
</table>

<h2>11.7 SEO & Static (3 routes)</h2>
<table>
  <tr><th>Method</th><th>Path</th><th>Description</th></tr>
  <tr><td>GET</td><td>/sitemap.xml</td><td>Dynamic XML sitemap</td></tr>
  <tr><td>GET</td><td>/robots.txt</td><td>Search engine directives</td></tr>
  <tr><td>GET</td><td>/objects/*</td><td>Object storage public files</td></tr>
</table>
</div>

<!-- 12. STARTUP CONFIGURATION -->
<h1 class="pb">12. Startup Configuration & Scripts</h1>
<div class="section">

<h2>12.1 Package.json Scripts</h2>
<table>
  <tr><th>Script</th><th>Command</th><th>Purpose</th></tr>
  <tr><td><code>dev</code></td><td><code>NODE_ENV=development tsx server/index.ts</code></td><td>Development server with hot reload</td></tr>
  <tr><td><code>build</code></td><td><code>vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist</code></td><td>Production build (frontend + backend)</td></tr>
  <tr><td><code>start</code></td><td><code>NODE_ENV=production node dist/index.js</code></td><td>Production server</td></tr>
  <tr><td><code>check</code></td><td><code>tsc</code></td><td>TypeScript type checking</td></tr>
  <tr><td><code>db:push</code></td><td><code>drizzle-kit push</code></td><td>Sync database schema</td></tr>
</table>

<h2>12.2 Workflow Configuration</h2>
<div class="card">
  <p><strong>Workflow Name:</strong> Start application</p>
  <p><strong>Command:</strong> <code>npm run dev</code></p>
  <p><strong>Behavior:</strong> Starts Express.js server on port 5000 serving both the API and Vite-compiled frontend. Auto-restarts on file changes. Database schema verification runs on startup with 4 retry attempts.</p>
</div>

<h2>12.3 Server Startup Sequence</h2>
<pre>
1. Load environment variables
2. Initialize database connection (Neon PostgreSQL via WebSocket)
3. Verify database schema (retry up to 4 times)
4. Configure session store (PostgreSQL-backed, 7-day TTL)
5. Initialize Passport.js (OAuth + Local strategy)
6. Register all API routes
7. Initialize Vite dev server (development) or serve static build (production)
8. Bind to 0.0.0.0:5000
9. Log "serving on port 5000"
</pre>
</div>

<!-- 13. RESOURCE USAGE -->
<h1 class="pb">13. Resource Usage & Performance</h1>
<div class="section">

<h2>13.1 Current Resource Utilization</h2>
<table>
  <tr><th>Resource</th><th>Available</th><th>Used</th><th>Notes</th></tr>
  <tr><td>CPU</td><td>6 vCPUs (Intel Xeon Platinum 8481C @ 2.70GHz)</td><td>~5-15% idle</td><td>Shared the platform infrastructure</td></tr>
  <tr><td>RAM</td><td>64 GB total</td><td>~55 GB used (system-wide)</td><td>~10 GB available; shared with other services</td></tr>
  <tr><td>Disk Storage</td><td>74 GB overlay filesystem</td><td>47 GB used (66%)</td><td>Includes OS, node_modules, project files</td></tr>
  <tr><td>Project Size</td><td>-</td><td>120 MB (excl. node_modules)</td><td>Source code, assets, configs</td></tr>
  <tr><td>node_modules</td><td>-</td><td>542 MB</td><td>108 packages installed</td></tr>
  <tr><td>Database</td><td>Neon Free/Pro tier</td><td>~15 MB</td><td>43 tables, 15 users, early stage</td></tr>
</table>

<h2>13.2 Performance Characteristics</h2>
<div class="card">
  <ul>
    <li><strong>Cold Start:</strong> ~5-8 seconds (database schema verification + Vite compilation)</li>
    <li><strong>Hot Reload:</strong> < 1 second (Vite HMR for frontend changes)</li>
    <li><strong>API Response Time:</strong> ~50-200ms (typical CRUD operations)</li>
    <li><strong>AI Response Time:</strong> 2-15 seconds (depends on GigaChat/OpenAI latency)</li>
    <li><strong>Image Generation:</strong> 10-30 seconds (DALL-E 3 thumbnail generation)</li>
    <li><strong>Bundle Size:</strong> ~800 KB gzipped (frontend production build)</li>
  </ul>
</div>
</div>

<!-- 14. DEPLOYMENT PLAN -->
<h1 class="pb">14. Deployment Plan</h1>
<div class="section">

<h2>14.1 Current Deployment</h2>
<table>
  <tr><th>Property</th><th>Value</th></tr>
  <tr><td>Platform</td><td>the platform</td></tr>
  <tr><td>Deployment Type</td><td>Autoscale (recommended) or Reserved VM</td></tr>
  <tr><td>Build Command</td><td><code>npm run build</code></td></tr>
  <tr><td>Start Command</td><td><code>npm run start</code></td></tr>
  <tr><td>Port</td><td>5000 (HTTP)</td></tr>
  <tr><td>TLS</td><td>Automatic (managed by the platform)</td></tr>
  <tr><td>Domain</td><td>*.the platform.app (custom domain configurable)</td></tr>
  <tr><td>Health Checks</td><td>Automatic (managed by the platform)</td></tr>
</table>

<h2>14.2 Recommended Deployment Configuration</h2>
<div class="card">
  <h3>Autoscale Plan (Recommended)</h3>
  <ul>
    <li><strong>Type:</strong> Autoscale deployment</li>
    <li><strong>Scaling:</strong> Scales from 0 to N instances based on traffic</li>
    <li><strong>Benefits:</strong> Cost-efficient (pay per use), handles traffic spikes, zero-downtime deploys</li>
    <li><strong>Considerations:</strong> Cold starts possible when scaling from 0; sessions stored in PostgreSQL so any instance can handle any request</li>
  </ul>
</div>
<div class="card">
  <h3>Reserved VM Plan (Alternative)</h3>
  <ul>
    <li><strong>Type:</strong> Always-on VM</li>
    <li><strong>Benefits:</strong> No cold starts, consistent performance, predictable pricing</li>
    <li><strong>Use When:</strong> Consistent traffic, need guaranteed response times, WebSocket requirements</li>
    <li><strong>Sizing:</strong> 2 vCPU / 2 GB RAM sufficient for current load</li>
  </ul>
</div>

<h2>14.3 Pre-deployment Checklist</h2>
<div class="card">
  <ol>
    <li>Verify all environment variables/secrets are set in production environment</li>
    <li>Run <code>npm run build</code> to verify clean production build</li>
    <li>Run <code>npm run db:push</code> to sync database schema</li>
    <li>Verify SMTP configuration for email delivery</li>
    <li>Confirm GigaChat and OpenAI API keys are active</li>
    <li>Test Object Storage connectivity</li>
    <li>Verify OAuth callback URLs match production domain</li>
  </ol>
</div>
</div>

<!-- 15. TRAFFIC & LOAD -->
<h1 class="pb">15. Traffic & Load Metrics</h1>
<div class="section">

<h2>15.1 Current Traffic Profile</h2>
<div class="card">
  <p>The platform is in <strong>early deployment phase</strong> with the Financial University Business Club. Current metrics reflect initial testing and onboarding.</p>
</div>
<table>
  <tr><th>Metric</th><th>Current Value</th><th>Expected at Scale</th></tr>
  <tr><td>Registered Users</td><td>15</td><td>500-2,000</td></tr>
  <tr><td>Daily Active Users</td><td>3-5</td><td>50-200</td></tr>
  <tr><td>Peak Concurrent Users</td><td>2-3</td><td>30-50 (during events)</td></tr>
  <tr><td>API Requests/Day</td><td>~100-200</td><td>5,000-15,000</td></tr>
  <tr><td>Peak API Requests/Hour</td><td>~30</td><td>500-1,000 (event registration)</td></tr>
  <tr><td>File Uploads/Day</td><td>1-2</td><td>20-50</td></tr>
  <tr><td>AI Chat Sessions/Day</td><td>0-1</td><td>10-30</td></tr>
</table>

<h2>15.2 Peak Load Scenarios</h2>
<div class="card">
  <ul>
    <li><strong>Event Registration Surge:</strong> 50-100 simultaneous registrations when popular events open. Mitigated by unique constraints and database-level concurrency.</li>
    <li><strong>Livestream Viewing:</strong> 30-50 concurrent viewers. No direct server load (RuTube handles streaming via iframe embed).</li>
    <li><strong>Quiz Taking:</strong> 20-30 students submitting simultaneously. Auto-grading handled by server-side scoring logic.</li>
    <li><strong>AI Debate Challenges:</strong> 5-10 concurrent debates. Each requires OpenAI API call (~3-5 seconds latency).</li>
  </ul>
</div>
</div>

<!-- 16. BACKGROUND JOBS -->
<h1 class="pb">16. Background Jobs, Cron Tasks & WebSockets</h1>
<div class="section">

<h2>16.1 Background Jobs & Cron Tasks</h2>
<div class="highlight">
  <strong>No cron jobs or scheduled background tasks are currently implemented.</strong> All processing is request-driven (synchronous API calls).
</div>

<div class="card">
  <h3>Potential Future Background Jobs</h3>
  <ul>
    <li>Session cleanup (expired sessions in PostgreSQL)</li>
    <li>Notification delivery queue</li>
    <li>Password reset token expiration cleanup</li>
    <li>Course enrollment deadline reminders</li>
    <li>Assignment due date notifications</li>
  </ul>
</div>

<h2>16.2 WebSocket Usage</h2>
<table>
  <tr><th>Usage</th><th>Library</th><th>Purpose</th></tr>
  <tr><td>Database Connection</td><td>ws (via @neondatabase/serverless)</td><td>Neon PostgreSQL uses WebSocket connections for serverless database access. This is an internal transport mechanism, not user-facing.</td></tr>
</table>

<div class="info-box">
  <strong>Note:</strong> The application does not currently use WebSockets for real-time user features (such as live chat or push notifications). All communication features use HTTP polling via TanStack Query's refetch intervals. Future enhancements could add WebSocket-based real-time messaging.
</div>
</div>

<!-- 17. AUTH & SECURITY -->
<h1 class="pb">17. Authentication & Security</h1>
<div class="section">

<h2>17.1 Authentication Methods</h2>
<table>
  <tr><th>Method</th><th>Implementation</th><th>Details</th></tr>
  <tr><td>OAuth</td><td>OpenID Connect via <code>openid-client</code></td><td>SSO for the platform users. Auto-creates accounts on first login.</td></tr>
  <tr><td>Email/Password</td><td>Passport Local + bcrypt</td><td>Traditional registration with password hashing (bcrypt, 10 rounds).</td></tr>
  <tr><td>Password Reset</td><td>6-digit email codes via SMTP</td><td>3-step flow: request code, verify code, set new password. Codes expire after 15 minutes.</td></tr>
</table>

<h2>17.2 Security Measures</h2>
<div class="card">
  <ul>
    <li><strong>Password Hashing:</strong> bcrypt with 10 salt rounds</li>
    <li><strong>Session Security:</strong> Server-side PostgreSQL sessions with HTTP-only cookies</li>
    <li><strong>Input Validation:</strong> Zod schemas validate all API inputs</li>
    <li><strong>HTML Sanitization:</strong> sanitize-html prevents XSS in rich text content</li>
    <li><strong>RBAC:</strong> Middleware-enforced role checks (isAuthenticated, isAdmin, isHeadAdmin, isTeacherOrAdmin)</li>
    <li><strong>Email Normalization:</strong> Case-insensitive unique constraint with trim + lowercase</li>
    <li><strong>Secrets Management:</strong> All credentials stored in the platform's encrypted secrets store</li>
    <li><strong>File Upload Limits:</strong> 10 MB for images, validated MIME types</li>
    <li><strong>CORS:</strong> Same-origin (frontend and backend on same port 5000)</li>
  </ul>
</div>
</div>

<!-- 18. BILINGUAL SUPPORT -->
<h1 class="pb">18. Bilingual Support (English/Russian)</h1>
<div class="section">

<h2>18.1 Implementation</h2>
<div class="card">
  <ul>
    <li><strong>Approach:</strong> React Context-based language switching with key-value translation maps</li>
    <li><strong>File:</strong> <code>client/src/lib/translations.ts</code> (~2,500+ translation keys)</li>
    <li><strong>Context:</strong> <code>client/src/contexts/LanguageContext.tsx</code></li>
    <li><strong>Languages:</strong> English (en) and Russian (ru)</li>
    <li><strong>Persistence:</strong> Language preference stored in localStorage</li>
    <li><strong>Coverage:</strong> All UI elements, form labels, error messages, tooltips, navigation items, and system messages</li>
  </ul>
</div>

<h2>18.2 Translation Categories</h2>
<table>
  <tr><th>Category</th><th>Example Keys</th></tr>
  <tr><td>Navigation</td><td>dashboard, events, courses, videos, messages, profile</td></tr>
  <tr><td>Authentication</td><td>login, register, forgotPassword, resetPassword</td></tr>
  <tr><td>Events</td><td>createEvent, registerForEvent, markAttendance, viewCertificate</td></tr>
  <tr><td>LMS</td><td>enrollCourse, startLesson, submitQuiz, viewGradebook</td></tr>
  <tr><td>Communication</td><td>sendMessage, newThread, replyToThread, postComment</td></tr>
  <tr><td>AI Features</td><td>startDebate, submitArgument, viewLeaderboard, generateThumbnail</td></tr>
  <tr><td>Admin</td><td>manageUsers, changeRole, exportReport, composeEmail</td></tr>
  <tr><td>Profile</td><td>editProfile, changePassword, myInterests, aboutMe</td></tr>
</table>
</div>

<div class="footer" style="margin-top: 40px;">
  <p>Business Club Platform - Financial University | Technical Documentation v1.0</p>
  <p>Generated on February 6, 2026 | Confidential</p>
</div>

</body>
</html>`;

async function generatePDF() {
  const htmlPath = '/tmp/doc_output.html';
  const pdfPath = 'Business_Club_Platform_Technical_Documentation.pdf';
  
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
