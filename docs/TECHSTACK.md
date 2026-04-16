# Horizon — Tech Stack

> *"The specific technical choices that serve the vision without over-committing."*
> — VISION.md, section 10

## 1. Guiding principles

- **End-to-end type safety** — one schema (Zod + Drizzle) flows from DB columns through tRPC procedures to React hooks without manual syncing or codegen
- **Minimal surface area** — one canonical way to do each thing; no duplicate patterns (no REST alongside tRPC, no Prisma alongside Drizzle)
- **Optional AI** — OpenAI enrichment is additive and bounded; the app works without it, the API key is optional, and AI calls never block the critical path
- **Postgres-native** — advisory locks, pg-backed sessions, and raw SQL escapes are all first-class options; no ORM gymnastics to avoid the database

## 2. Architecture at a glance

```
Browser (React + Wouter)
  │  tRPC hooks (@trpc/react-query)
  ▼
Express HTTP server  ──►  /api/trpc  ──►  tRPC router (appRouter)
  │                                           │
  │  static assets (dist/public)         Drizzle ORM
  │                                           │
  │  POST /internal/jobs/gdelt           PostgreSQL
  │   (X-Job-Secret auth)
  │       │
  │  gdeltIngest.ts  ──►  generateSignals.ts
  │
  └──  OpenAI (server-side only, optional)
         └──  results written back to `themes` table
```

- A **single Express process** serves the API and all static assets
- All client↔server data flows through **tRPC procedures** — no hand-written fetch calls on the client
- **OpenAI** is called server-side exclusively; the API key never reaches the browser
- **GDELT ingestion** is triggered by an authenticated internal cron endpoint, protected by a shared job secret

## 3. Storage — PostgreSQL + Drizzle ORM

**Packages**

| Package | Version | Role |
|---|---|---|
| `drizzle-orm` | 0.45.2 | Query builder + type inference |
| `drizzle-kit` | 0.31.8 | Migration generator + studio UI |
| `drizzle-zod` | 0.7.0 | Auto-derives Zod schemas from table definitions |
| `pg` | 8.16 | Node.js PostgreSQL driver (`pg.Pool`) |

**Connection**

`server/db.ts` creates a `pg.Pool` from `DATABASE_URL` and wraps it with `drizzle(pool, { schema })`. The same pool is reused by `connect-pg-simple` for session storage.

**Schema**

- All table definitions live in `shared/db/tables/` (19 files) and are re-exported from `shared/db/index.ts`
- Sharing the schema directory means server code and tRPC routers import identical types via the `@shared` alias

**Key tables**

| Table | Purpose |
|---|---|
| `users` | Accounts — email, bcrypt hash, role (`analyst`\|`admin`), group |
| `user_sessions` | express-session store (managed by connect-pg-simple) |
| `themes` | Thematic collections; hold AI-generated synopsis + metadata |
| `snippets` | Content snippets linked to themes |
| `sources` | News/event source URLs |
| `gdelt_events` | Raw GDELT global event records (indexed on time, code, actors) |
| `gdelt_documents` | Document records from GDELT feed |
| `gdelt_event_mentions` | Event↔mention join records |
| `scenarios` | Analyst scenario definitions |
| `indicators` | Metrics/indicators for scenario monitoring |
| `scenarioIndicatorMap` | Scenario↔indicator join table |
| `signalEvents` | Generated signals/alerts |
| `tags` | Custom tagging system |
| `analyst_groups` | Team/group organisation |
| `eventCodes` | GDELT event code reference data |
| `recent_sources` | Recently visited source cache |
| `theme_group_links` | Theme↔group junction |
| `snippet_group_links` | Snippet↔group junction |

**Migrations**

Generated SQL files live in `migrations/` (16 files). Running `drizzle-kit migrate` applies any pending migrations and is run automatically on production startup.

**npm scripts**

```
db:generate   # drizzle-kit generate  — produce a new migration from schema changes
db:migrate    # drizzle-kit migrate   — apply pending migrations
db:seed       # tsx server/seed.ts    — populate reference/test data
db:studio     # drizzle-kit studio    — browser-based schema/data explorer
```

## 4. API layer — tRPC + Express

**Packages**

| Package | Version |
|---|---|
| `@trpc/server` | 11.8.1 |
| `@trpc/client` | 11.8.1 |
| `@trpc/react-query` | 11.8.1 |
| `superjson` | 2.2.6 |

**Server setup**

`server/trpc.ts` initialises tRPC with a SuperJSON transformer (so `Date`, `Map`, and `Set` round-trip without manual serialization) and exports three building blocks:

```ts
router            // compose sub-routers
publicProcedure   // open to all requests
protectedProcedure // throws UNAUTHORIZED if ctx.user is null
```

**Context** (`server/trpc/context.ts`) injects `{ req, res, db, user }` into every procedure. `user` is read from the express-session; `db` is the shared Drizzle instance.

**Router tree** (`server/routers/appRouter.ts`)

```
appRouter
├── auth          signup / login
├── users
├── themes
├── snippets
├── sources
├── webcut
├── synopsis      AI-generated theme summaries
├── admin
├── intel
└── horizon
    ├── dashboard
    ├── themes
    ├── scenarios
    ├── signals
    ├── updates
    └── reports
```

**Mounting** — `server/routes.ts` attaches the router at `/api/trpc` via `createExpressMiddleware`.

**Client** — `@trpc/react-query` wraps TanStack Query. Every data fetch is a typed tRPC hook; there are no raw `fetch` or `axios` calls in the client codebase.

## 5. Ingestion — GDELT pipeline

- **Trigger**: `POST /internal/jobs/gdelt` — authenticated by comparing the `X-Job-Secret` request header against `process.env.JOB_SECRET`
- **Concurrency guard**: `server/jobs/gdeltIngest.ts` acquires a PostgreSQL advisory lock (`pg_try_advisory_lock`) before processing; concurrent runs are silently skipped
- **Signal generation**: `server/jobs/generateSignals.ts` runs immediately after a successful ingest pass
- **Lifecycle / archival**: `server/jobs/lifecycleManager.ts` manages data retention; scheduled by a cron at **10:00 UTC daily** inside the Express process

## 6. AI / NLP — OpenAI (optional, bounded)

**Package**: `openai` 6.19.0

**Low-level wrapper** (`server/llm/openai.ts`)

`callOpenAIJson({ model, system, user })` — posts to the OpenAI Responses API with `"type": "json_object"` output format and returns the parsed JSON string. Throws if `OPENAI_API_KEY` is absent.

**Feature: theme synopsis** (`server/llm/generateThemeSynopsis.ts`)

- Collects snippets for a theme, assembles a prompt, and calls `callOpenAIJson`
- Default model: `process.env.THEME_SYNOPSIS_MODEL ?? "gpt-4.1-mini"`
- Output is validated with a Zod schema; the synopsis text and source citations are written back to the `themes` table (`synopsis`, `synopsisUpdatedAt`, `synopsisModel`, `synopsisVersion`)
- Exposed to the client via `server/routers/themeSynopsis.router.ts` (a `protectedProcedure`)

**Constraints**

- All OpenAI calls are server-side; the API key never reaches the browser
- AI enrichment is fully optional — removing `OPENAI_API_KEY` disables synopsis generation without breaking any other feature

## 7. UI — React + Vite + shadcn/ui

**Framework & build**
- React 18.3.1 with TypeScript 5.9.3
- Vite 7 as dev server and bundler (`@vitejs/plugin-react`)
- Root: `client/` directory; build output: `dist/public`
- Path aliases: `@` → `client/src`, `@shared` → `shared`, `@assets` → `attached_assets`

**Component system**
- shadcn/ui (new-york style, neutral base, CSS variables) — ~40 pre-built components in `client/src/components/ui/`
- Built on Radix UI primitives (accordion, dialog, dropdown, tabs, tooltip, etc.)
- No hand-rolled headless primitives — Radix handles all a11y

**Styling**
- Tailwind CSS 3.4 with `darkMode: ["class"]`
- CSS custom properties in `client/src/index.css` for both light and dark themes
- `tailwind-merge` + `clsx` via a `cn()` helper for conditional class composition
- `tailwindcss-animate` for Tailwind keyframe animations
- `@tailwindcss/typography` for prose content

**Routing**
- Wouter 3.3 (not React Router) — chosen for minimal bundle size
- 30+ routes in `client/src/App.tsx` using `<Switch>` / `<Route>`
- Auth gates: `<SessionGate>` and `<RequireAuth>` wrappers

**Server state / data fetching**
- TanStack React Query 5 as the async state layer
- tRPC React Query adapter (`@trpc/react-query`) — all API calls go through typed tRPC procedures, no manual `fetch` calls
- SuperJSON transformer for Date / Map / Set serialization over the wire

**Tables**
- TanStack React Table 8 for data-grid features (sorting, filtering, pagination)

**Forms**
- React Hook Form 7 + Zod 3 via `@hookform/resolvers` — validation schema is shared with the server

**UI utilities & extras**

| Package | Purpose |
|---|---|
| Lucide React 0.453 | SVG icon set |
| React Icons 5 | Additional icon sets |
| Framer Motion 11 | Page/component animations |
| Recharts 2 | Chart components |
| React Day Picker 8 | Date picker calendar |
| Embla Carousel 8 | Touch-friendly carousel |
| cmdk 1 | Command palette (`⌘K`) |
| React Resizable Panels 2 | Drag-resizable layout panels |
| date-fns 3 | Date formatting/manipulation |
| use-debounce 10 | Debounce hook for search inputs |

## 8. Authentication & sessions

- **Strategy**: Passport.js 0.7 with `passport-local` (username/password)
- **Password storage**: `bcrypt` 6 — passwords are never stored in plaintext
- **Session store**: `express-session` 1.18 backed by `connect-pg-simple` — sessions live in the `user_sessions` PostgreSQL table, so no separate Redis/Valkey instance is needed
- **Cookie config**: name `hl_session`, `httpOnly: true`, `sameSite: lax`, `secure: true` in production, max age 14 days
- **tRPC auth router** (`server/routers/auth.router.ts`): exposes `auth.signup` and `auth.login` as `publicProcedure`s; on success, the user object is written into `req.session.user`
- **Protected procedures**: any router that imports `protectedProcedure` automatically enforces authentication — no per-route middleware needed

## 9. Validation & shared types

- **Zod 3.24** is the single validation layer for the entire stack
- `drizzle-zod` auto-derives insert/select Zod schemas directly from Drizzle table definitions, so column constraints are reflected in validation without duplication
- Zod schemas live in `shared/` and are consumed by:
  - **Server**: tRPC `.input()` and `.output()` — input is validated and type-narrowed before the procedure body runs
  - **Client**: React Hook Form resolvers (`@hookform/resolvers/zod`) — the same schema drives form validation in the browser
- The `@shared` path alias makes cross-boundary imports identical on both sides: `import { insertThemeSchema } from "@shared/db"`

## 10. Type safety — the through-line

TypeScript 5.9 strict mode connects every layer without a codegen step:

```
shared/db/tables/*.ts   (Drizzle schema)
        │
        ▼  drizzle-orm infers row/insert types
server/routers/*.ts     (tRPC procedures)
        │
        ▼  tRPC infers I/O from .input()/.output() Zod schemas
server/routers/appRouter.ts  →  export type AppRouter
        │
        ▼  @trpc/react-query consumes AppRouter
client/src/lib/trpc.ts  →  fully typed hooks
```

A column type change in `shared/db` surfaces as a TypeScript error in the tRPC procedure, which surfaces as a TypeScript error in the React hook — no grep, no manual sync.

## 11. Testing

- **Vitest 4** as the test runner (config: `client/vitest.config.ts`)
- **jsdom 27** as the DOM environment
- **@testing-library/react 16** + **@testing-library/jest-dom 6** for component/integration tests
- **MSW 2** (Mock Service Worker) for intercepting tRPC/API calls in tests — setup in `client/src/test/setup.ts`

## 12. Build & dev tooling

- **Vite 7** — HMR dev server and production bundler
- **TypeScript 5.9** — strict mode, `bundler` module resolution, covers `client/src`, `shared`, and `server`
- **PostCSS** with `autoprefixer` — processes Tailwind output
- **`components.json`** — shadcn/ui CLI config (style, aliases, tsx flag)

## 13. Deployment & hosting

- A **single Express process** handles both the API and static file serving (no separate CDN required for basic deploys)
- **Build**: `tsx script/build.ts` — bundles server to `dist/index.cjs` and client to `dist/public/`
- **Start**: `npm run db:migrate && NODE_ENV=production node dist/index.cjs` — migrations are applied automatically before the server accepts traffic
- **Port**: `process.env.PORT ?? 5000`
- Compatible with Docker and Replit out of the box; no platform-specific adapters required

## 14. Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (`pg.Pool` + drizzle-kit) |
| `SESSION_SECRET` | Yes | — | Signs `express-session` cookies |
| `OPENAI_API_KEY` | For AI features | — | OpenAI Responses API authentication |
| `THEME_SYNOPSIS_MODEL` | No | `gpt-4.1-mini` | LLM model used for theme synopsis generation |
| `JOB_SECRET` | Yes (prod) | — | `X-Job-Secret` header value authorising cron job calls |
| `NODE_ENV` | No | `development` | `production` enables secure cookies and production logging |
| `PORT` | No | `5000` | TCP port the Express server listens on |

## 15. What we deliberately don't use (and why)

| Not used | Why |
|---|---|
| **GraphQL** | tRPC delivers the same end-to-end type safety with far less boilerplate for a single-team codebase |
| **Prisma** | Drizzle is lighter, closer to SQL, and makes advisory locks and raw queries natural rather than awkward |
| **Hand-written REST routes** | tRPC eliminates the need; a parallel REST layer would double the surface area and break type inference |
| **Redis / Valkey** | Sessions are stored in Postgres — one fewer infrastructure dependency to operate |
| **Next.js / Remix** | Vite + Express is simpler and sufficient; SSR is not a requirement for this application |
| **React Router** | Wouter covers all routing needs at a fraction of the bundle size |
| **Client-side OpenAI calls** | The API key must stay server-side; AI enrichment is optional and should not be a client concern |
