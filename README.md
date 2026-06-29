# Horizon Lite

A structured environmental scanning and weak-signal detection system for strategic analysts. Helps analysts separate signal from noise, fight confirmation bias, and reason probabilistically about which futures are becoming more or less likely.

**Core data model:** Themes → Scenarios → Indicators → Events → Links

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Wouter, Tailwind CSS + shadcn/ui |
| Backend | Express 4 + tRPC 11 + SuperJSON |
| Database | PostgreSQL + Drizzle ORM (22 tables, versioned migrations) |
| Auth | Passport.js + bcrypt + express-session (sessions in Postgres) |
| AI | OpenAI (optional, server-side only) |
| Testing | Vitest + Playwright |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Install & run

```bash
npm install
npm run db:migrate
npm run dev
```

### Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | — | Signs express-session cookies |
| `OPENAI_API_KEY` | No | — | AI features (theme synopsis) |
| `THEME_SYNOPSIS_MODEL` | No | `gpt-4.1-mini` | LLM model for theme synopsis |
| `JOB_SECRET` | Yes (prod) | — | Authenticates cron job calls via `X-Job-Secret` header |
| `PORT` | No | `5000` | TCP port |
| `NODE_ENV` | No | `development` | `production` enables secure cookies |

---

## Scripts

```bash
npm run dev           # Vite HMR dev server
npm run build         # Bundle server + client
npm start             # Production server

npm run db:generate   # Generate migration from schema changes
npm run db:migrate    # Apply pending migrations
npm run db:seed       # Populate reference data
npm run db:studio     # Browser-based schema explorer

npm test              # Vitest unit + component tests
npm run test:e2e      # Playwright end-to-end tests
npm run check         # TypeScript type check
```

---

## Project Structure

```
client/          # React app (Vite)
server/          # Express + tRPC routers + background jobs
shared/          # Drizzle schema, Zod validators, shared types
migrations/      # Versioned database migrations
e2e/             # Playwright tests
```

---

## Scheduled Jobs

One authenticated HTTP endpoint for external cron schedulers:

| Job | Endpoint | Default Schedule |
|---|---|---|
| GDELT ingestion + signal generation | `POST /internal/jobs/gdelt` | Twice daily — 06:00 and 18:00 UTC |

The caller must send `X-Job-Secret: <value>` matching the `JOB_SECRET` env variable. Requests without a valid secret return `401`. PostgreSQL advisory locks prevent concurrent runs — a duplicate trigger returns `409`.

```bash
0 6,18 * * * curl -s -X POST https://your-host/internal/jobs/gdelt \
  -H "X-Job-Secret: $JOB_SECRET"
```

---

## License

[MIT](./LICENSE)
