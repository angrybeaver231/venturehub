# Business Club — Financial University Platform

A comprehensive platform for the Financial University Business Club: events, video
libraries, livestreams, learning courses, a startup & innovation (Venture OS) layer,
and robust role-based access control.

## Features

- **Event Management** — create/manage events with custom forms, attendance
  tracking, and certificate generation.
- **Learning Management System (LMS)** — courses with modules, lessons, quizzes,
  assignments, and progress tracking.
- **Startup & Innovation (Venture OS)** — startup profiles, corporate innovation
  briefs, accelerator programs, evaluations, investor matching, and AI-assisted
  thesis matching.
- **Signals & Vitality** — cross-platform signal ingestion, a composite vitality
  score per startup, financial verification connectors, and a unified timeline.
- **News Hub, Members Directory, Career Portal, and a block-based Landing Page
  builder.**
- **Bilingual UI (English / Russian)** and full Progressive Web App support.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, shadcn/ui, Radix UI, Tailwind CSS,
  Wouter, TanStack Query
- **Backend:** Express.js, TypeScript
- **ORM / DB:** Drizzle ORM on PostgreSQL
- **Validation:** Zod
- **Auth:** Passport.js with local email/password (bcrypt); optional OAuth connectors

## Getting started

### 1. Prerequisites

- Node.js 20+
- A PostgreSQL database (the connection string goes in `DATABASE_URL`)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the example env file and fill in the values you need (only `DATABASE_URL` and
`SESSION_SECRET` are required to boot):

```bash
cp .env.example .env
```

### 4. Apply the database schema

```bash
npm run db:push
```

### 5. Run in development

```bash
npm run dev
```

The Express API and the Vite dev server run together on a single port
(default `5000`).

## Scripts

| Command              | Description                                       |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Start the app (API + client) in dev mode         |
| `npm run build`      | Build the client and bundle the server to `dist` |
| `npm start`          | Run the production build (`dist/index.js`)        |
| `npm run check`      | Type-check the whole project                      |
| `npm test`           | Run the Vitest suite once                         |
| `npm run test:watch` | Run Vitest in watch mode                          |
| `npm run db:push`    | Push the Drizzle schema to the database           |

## Project structure

```
client/    React frontend (pages, components, hooks, lib)
server/    Express backend (routes, auth, signals, scout, telegram, storage)
shared/    Drizzle schema + Zod types shared by client and server
migrations/ Database migrations
scripts/   Maintenance and document-generation scripts
docs/      Additional documentation
```

## Authentication

The platform uses session-based authentication with local email/password login
(Passport.js + bcrypt). Optional OAuth connectors (Google, GitHub, Yandex, Slack,
Stripe, Tinkoff) can be enabled for founder integrations by setting the matching
`*_OAUTH_CLIENT_ID` / `*_OAUTH_CLIENT_SECRET` variables. See `.env.example` for the
full list.

## Self-hosting notes

- **Set `NODE_ENV=production` in production.** Session cookies are only marked
  `Secure` when `NODE_ENV` is `production`; forgetting this issues non-secure
  cookies.
- **Object storage requires a credential sidecar.** `server/objectStorage.ts`
  obtains storage credentials from a sidecar service (`STORAGE_SIDECAR_ENDPOINT`,
  default `http://127.0.0.1:1106`) that exposes `/token`, `/credential`, and
  `/object-storage/signed-object-url`, exchanged for Google Cloud Storage
  external-account credentials. To self-host you must either run a compatible
  sidecar or adapt this module to your storage provider's native SDK. File
  upload/download features depend on this.
- **Migrating an existing database?** Stored integration credentials are
  encrypted with `INTEGRATION_ENCRYPTION_KEY` (falling back to `SESSION_SECRET`).
  If you are moving an existing database, set `INTEGRATION_ENCRYPTION_KEY` to the
  exact secret used before, or previously encrypted rows will fail to decrypt.

## License

Proprietary — all rights reserved.
