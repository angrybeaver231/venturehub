# Venture & Events Hub

A focused, self-contained platform with two features:

- **Event Management** — create events, browse upcoming/past events, register
  guests, and check attendees in.
- **Venture Hub** — a directory of startups and investors, plus a **Thesis
  Match** view that ranks which startups best fit a given investor's thesis.

It runs entirely on **built-in in-memory sample data** — no database, no
external services, and no API keys required. Restarting the server resets the
data to the seed set.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, wouter, TanStack Query
- **Backend:** Express, TypeScript (in-memory storage)
- **Validation:** Zod

## Getting started

Requires Node.js 18+.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (client + API on http://localhost:5000)
npm run dev
```

Then open <http://localhost:5000>.

### Production build

```bash
npm run build   # builds the client to dist/public
npm start       # serves the built client + API
```

### Type checking

```bash
npm run check
```

## Configuration

No configuration is needed. A `.env.example` is included with optional
placeholders (e.g. `PORT`) if you want to customise the server later. Copy it to
`.env` to use it.

## Project structure

```
client/        React app (pages, components, theme)
server/        Express API + in-memory storage + seed data
shared/        Shared TypeScript types and Zod schemas
```

## API overview

| Method | Endpoint                          | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/events`                     | List events                          |
| GET    | `/api/events/:id`                 | Event details + registrations        |
| POST   | `/api/events`                     | Create an event                      |
| POST   | `/api/events/:id/register`        | Register a guest                     |
| POST   | `/api/registrations/:id/attendance` | Mark a guest as attended           |
| GET    | `/api/startups`                   | List startups                        |
| GET    | `/api/startups/:id`               | Startup details                      |
| POST   | `/api/startups`                   | Add a startup                        |
| GET    | `/api/investors`                  | List investors                       |
| GET    | `/api/investors/:id`              | Investor details                     |
| POST   | `/api/investors`                  | Add an investor                      |
| GET    | `/api/investors/:id/matches`      | Ranked startup matches for a thesis  |

## Thesis matching

The matcher in `server/thesis-match.ts` scores investor↔startup fit using simple,
explainable heuristics: vertical overlap, stage focus, geography, and keyword
overlap between the investor thesis and the startup profile. Swap it for a real
LLM call if you connect an API key.

## License

[MIT](./LICENSE)
