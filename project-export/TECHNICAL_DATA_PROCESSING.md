# Ventorix Platform — Technical Data Processing Document

**Document version:** 1.0  
**Last updated:** February 16, 2026  
**Platform:** Ventorix (Business Club — Financial University)

---

## 1. Overview

This document describes the technical infrastructure used by the Ventorix platform to collect, process, store, and transmit personal data. It covers all third-party services, internal systems, data flows, and security measures.

---

## 2. Services That Collect and Store Personal Data

### 2.1 Neon Serverless PostgreSQL (Primary Database)

**Purpose:** Central storage for all structured personal data.  
**Provider:** Neon (neon.tech)  
**Data center location:** Managed by Neon's cloud infrastructure.  
**Connection:** Encrypted via `DATABASE_URL` environment variable over TLS.

**Personal data stored:**

| Table | Data Fields | Purpose |
|-------|------------|---------|
| `users` | email, first name, last name, patronymic, password (bcrypt hash), profile image URL, organization type/name, faculty, city, company, position, interests, about me, skills, previous startups, pitch deck link | User accounts and profiles |
| `sessions` | session ID, session data (JSON), expiry | Active login sessions |
| `event_registrations` | user ID, event ID, guest name, guest email, attendance time | Event participation tracking |
| `event_form_answers` | user responses to custom event registration questions | Custom form data collection |
| `chat_sessions` / `chat_messages` | user ID, message content, timestamps, extracted data | AI chat interaction history |
| `chat_messages_private` | sender/receiver IDs, message content | Direct messaging between users |
| `job_applications` | applicant name, email, phone, cover letter, resume URL, candidate ID | Career portal applications |
| `course_enrollments` | user ID, course ID, enrollment date | Learning activity |
| `course_submissions` | user ID, assignment responses, grades, feedback | Academic work |
| `password_reset_tokens` | email, 6-digit code, expiry | Password recovery |
| `startup_members` | user ID, startup ID, role | Startup team membership |
| `company_users` | user ID, company ID, role | Corporate workspace membership |
| `user_university_memberships` | user ID, university ID, role | University affiliation |
| `user_club_memberships` | user ID, club ID, role | Club affiliation |
| `evaluations` | evaluator user ID, scores, recommendations | Startup evaluation data |

**Security:** All connections use TLS encryption. Passwords are hashed with bcrypt (cost factor 10). Database credentials are stored as environment secrets, never in code.

---

### 2.2 S3-compatible object storage (File Storage)

**Purpose:** Persistent storage for uploaded files (images, documents, resumes).  
**Provider:** the platform, backed by Google Cloud Storage (GCS).  
**Connection:** Authenticated via service account tokens.

**Personal data stored:**
- **Profile images:** User-uploaded profile photos
- **Event images:** Photos associated with events
- **Email images:** Images embedded in bulk newsletters
- **Resume files (PDF):** Job applicant resumes
- **Chat file uploads:** Documents shared during AI chat registration (images, PDFs, Word files)
- **Lesson videos:** Course content uploaded by teachers

**Storage structure:**
- `public/` directory — publicly accessible assets (event images, email images)
- `.private/` directory — access-controlled files (resumes, chat uploads)

**Access control:** Private files require authentication and permission checks (user ID matching). Public files are served via signed GCS URLs with 7-day expiration for email compatibility.

---

### 2.3 session-based authenticationentication (OpenID Connect)

**Purpose:** OAuth-based user login via the platform accounts.  
**Provider:** the platform (the OIDC provider)  
**Protocol:** OpenID Connect (OIDC)

**Data received from the platform:**
- `sub` (unique user identifier)
- `email`
- `first_name`, `last_name`
- `profile_image_url`

**Data flow:**
1. User clicks "Log in with the platform" and is redirected to `the OIDC provider`
2. User authenticates on the platform's side
3. the platform returns an authorization code to our callback URL
4. Platform exchanges the code for tokens (access token, refresh token, ID token)
5. User claims are extracted and stored/updated in the `users` table
6. A server-side session is created in PostgreSQL

**Tokens stored:** Access token and refresh token are held in the server-side session (PostgreSQL `sessions` table), never exposed to the browser. Sessions expire after 7 days.

---

### 2.4 Local Email/Password Authentication

**Purpose:** Alternative login method for users without the platform accounts.  
**Library:** Passport.js with `passport-local` strategy.

**Data collected at registration:**
- Email (normalized to lowercase, used as unique identifier)
- Password (immediately hashed with bcrypt, plaintext is never stored)
- First name, last name, patronymic (optional)
- Organization type and name (optional)
- Faculty (optional, for Financial University students)

**Session management:** Same PostgreSQL-backed session store as OAuth, with httpOnly cookies, SameSite=Lax policy, and Secure flag in production (HTTPS only).

---

### 2.5 Resend (Email Service)

**Purpose:** Sending transactional and bulk emails.  
**Provider:** Resend (resend.com) — Pro plan.  
**Connection:** Direct API key (`RESEND_API_KEY`) over HTTPS.

**Personal data transmitted to Resend:**
- Recipient email addresses
- Recipient names (used for personalized greetings in email body)
- Email content (HTML body, subject line)
- File attachments (non-image files sent as base64-encoded attachments)

**Sending domains:**
- `events@ecfinuni.com` — bulk newsletters
- `no-reply@ecfinuni.com` — transactional emails (password resets, notifications)

**Data retention by Resend:** Resend retains email delivery logs (recipient, status, timestamps) according to their data processing terms. Email body content is not permanently stored by Resend after delivery.

**Rate limiting:** 600ms delay between individual sends, exponential backoff retry on rate limit errors, automatic stop on daily quota exceeded.

---

### 2.6 GigaChat (Sber AI)

**Purpose:** AI-powered chat for event registration and onboarding assistance.  
**Provider:** Sberbank (Sber) — GigaChat API.  
**Connection:** API key (`GIGACHAT_API_KEY`) over HTTPS with TLS verification disabled (`isIgnoreTSL: true`) as required by the GigaChat SDK.

**Personal data transmitted to GigaChat:**
- User chat messages (free-text input during event registration)
- Context about the event being registered for (event name, required fields)
- Extracted structured data (name, email, organization) parsed from conversation

**Data flow:**
1. User sends a message in the chat registration interface
2. Message history (including system prompt with event context) is sent to GigaChat API
3. GigaChat returns a response and/or extracted registration data
4. All messages are stored in the platform's `chat_messages` table
5. Extracted registration data is stored in `chat_sessions.extractedData`

**Important:** User messages are sent to Sber's servers for AI processing. GigaChat's data retention and processing policies are governed by Sber's terms of service.

---

## 3. Data Flow Diagram

```
User's Browser
    |
    |— HTTPS (TLS) —|
    v                |
+-----------------+  |
| Express Server  |  |  (Port 5000, the hosting platform)
| (Node.js/TS)    |  |
+--------+--------+  |
         |            |
         |— Authentication ——> the platform OIDC (OAuth tokens)
         |                     OR Local (bcrypt passwords)
         |
         |— Database ————————> Neon PostgreSQL (TLS)
         |                     - User profiles, sessions
         |                     - Event registrations, form answers
         |                     - Chat history, messages
         |                     - Job applications
         |                     - Course data, submissions
         |                     - Startup/company data
         |
         |— File Storage ———> S3-compatible object storage (GCS)
         |                     - Profile images
         |                     - Event photos
         |                     - Resumes (PDF)
         |                     - Chat file uploads
         |                     - Email images (signed URLs)
         |
         |— Email ——————————> Resend API (HTTPS)
         |                     - Recipient emails + names
         |                     - Email HTML content
         |                     - File attachments
         |
         |— AI Chat ————————> GigaChat API (Sber, HTTPS)
                               - User messages
                               - Extracted registration data
```

---

## 4. How Services Are Connected

### 4.1 Authentication → Database
When a user logs in (via OAuth or email/password), their profile data is upserted into the `users` table. The session is stored in the `sessions` table with a 7-day TTL. Session cookies reference the session ID, which maps to the stored session data.

### 4.2 Database → Email Service
When an admin sends a bulk newsletter, user emails and names are read from the `users` table, filtered by `newsletterOptOut` preference. Each email is personalized with the recipient's name and sent individually via Resend's API. Users can opt out via a cryptographically signed unsubscribe link (HMAC-SHA256).

### 4.3 File Uploads → Object Storage → Email
When images are attached to emails, they are uploaded to S3-compatible object storage (GCS). Signed URLs are generated for each image with a 7-day expiration, then embedded as `<img src="...">` tags in the email HTML. This ensures images display correctly in Gmail, Yandex Mail, and other email clients.

### 4.4 AI Chat → Database
During AI-powered event registration, user messages are sent to GigaChat for natural language processing. The AI extracts structured data (name, email, organization, form answers) from the conversation. Both the raw messages and extracted data are stored in `chat_sessions` and `chat_messages` tables.

### 4.5 Job Applications → Object Storage
When applicants submit resumes (PDF), files are uploaded to the private directory in Object Storage. The file path is stored in the `job_applications.resume_url` column. Access requires authentication and is restricted to the applicant and admin users.

---

## 5. Security Measures

### 5.1 Data at Rest
- **Passwords:** Hashed with bcrypt (10 salt rounds), plaintext never stored
- **Database:** Neon PostgreSQL with TLS encryption
- **Files:** Stored in Google Cloud Storage with access-controlled paths
- **Secrets:** All API keys and credentials stored as environment secrets, never committed to code

### 5.2 Data in Transit
- **All HTTP traffic:** TLS/HTTPS enforced in production
- **Session cookies:** httpOnly (no JavaScript access), Secure flag (HTTPS only), SameSite=Lax
- **Database connections:** TLS-encrypted connection strings
- **API calls to external services:** HTTPS (Resend, the platform OIDC, GigaChat)

### 5.3 Access Control
- **Role-based access control (RBAC):** Multi-tiered hierarchy — member, teacher, expert, admin, lmsAdmin, eventAdmin, innoLabsAdmin, Head Admin
- **Middleware enforcement:** Every protected route uses authentication and authorization middleware (`isAuthenticated`, `isHeadAdmin`, `isPlatformAdminMiddleware`, etc.)
- **File access:** Private objects require user ID matching or admin role
- **Email unsubscribe:** Cryptographically signed tokens (HMAC-SHA256) prevent unauthorized opt-out manipulation

### 5.4 Data Minimization
- Email verification has been removed — reducing unnecessary token storage
- Profile fields beyond email and name are optional
- Newsletter opt-out is respected for all bulk communications
- Password reset codes expire after a set time period

---

## 6. Third-Party Data Processors Summary

| Service | Provider | Data Shared | Purpose | Data Location |
|---------|----------|-------------|---------|---------------|
| Neon PostgreSQL | Neon Inc. | All structured personal data | Primary database | Cloud (Neon-managed) |
| S3-compatible object storage | the platform (via GCS) | Uploaded files (images, resumes, documents) | File storage | Google Cloud Storage |
| session-based authenticationentication | the hosting provider | Email, name, profile image (received) | OAuth login | the hosting provider |
| Resend | Resend Inc. | Email addresses, names, email content | Email delivery | Resend infrastructure |
| GigaChat | Sberbank (Sber) | Chat messages, extracted personal data | AI chat processing | Sber servers (Russia) |

---

## 7. Environment Variables Containing Sensitive Data

| Variable | Purpose | Contains Personal Data? |
|----------|---------|----------------------|
| `DATABASE_URL` | PostgreSQL connection string | No (credential only) |
| `SESSION_SECRET` | Session cookie signing key | No (key only) |
| `RESEND_API_KEY` | Resend email API authentication | No (key only) |
| `GIGACHAT_API_KEY` | GigaChat AI API authentication | No (key only) |
| `APP_ID` | the platform application identifier | No |
| `APP_DOMAINS` | Allowed callback domains | No |

All sensitive variables are stored as encrypted environment secrets and are never exposed in client-side code or logs.

---

## 8. Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| User sessions | 7 days (TTL) | Automatic expiry in PostgreSQL |
| Password reset codes | Time-limited expiry | Automatic expiry |
| User accounts | Until user requests deletion or admin removes | Manual deletion via admin panel |
| Event registrations | Indefinite (tied to event records) | Cascade delete with event |
| Chat messages | Indefinite | Cascade delete with chat session |
| Uploaded files | Indefinite | Manual deletion via admin or Object Storage management |
| Email delivery logs (Resend) | Per Resend's retention policy | Managed by Resend |
| AI chat logs (GigaChat) | Per Sber's retention policy | Managed by Sber |

---

*This document should be updated whenever new services are integrated or data handling practices change.*
