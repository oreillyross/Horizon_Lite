# Horizon Lite — Claude Instructions

> This file is the authoritative guide for Claude working in this repository.
> If anything in another document contradicts this file, this file wins.

---

## 1. Project Overview

**Horizon Lite** is a structured environmental scanning and weak-signal detection system for strategic analysts. It helps analysts separate signal from noise, fight confirmation bias, and reason probabilistically about which futures are becoming more or less likely.

The core data model: **Themes → Scenarios → Indicators → Events → Links**

**North star:** A single analyst should be able to maintain ~20 scenarios across ~5 themes and produce a fully traceable Sentinel Assessment in under five minutes.

Horizon is a *thinking tool*, not a news reader. Automation ingests and suggests; the analyst always decides.

---

## 2. Hard Rules

These are non-negotiable. Do not deviate.

1. **NEVER read `docs/archive/`** — treat that directory as if it does not exist. Do not open, grep, or reference any file inside it.

2. **Follow `TASKS.md` one subtask at a time.** Read the file, identify the next incomplete subtask, complete it fully, then stop and report. Never attempt multiple subtasks in one session unless the user explicitly instructs it.

3. **Never introduce duplicate patterns.** No REST endpoints alongside tRPC. No Prisma alongside Drizzle. No raw `fetch` calls on the client alongside tRPC hooks. One canonical way to do each thing.

4. **Do not add speculative code.** No extra error handling for impossible scenarios, no feature flags for hypothetical future use, no helper utilities built for one-time operations. Implement exactly what the task requires.

---

## 3. Task Workflow

### Reading TASKS.md

1. Open `TASKS.md` at the project root.
2. Find the first incomplete subtask (unchecked `- [ ]` item).
3. Read only the context needed for that subtask — do not read ahead.
4. Implement the subtask fully.
5. Mark it complete (`- [x]`) in `TASKS.md`.
6. Commit the change with a clear message.
7. Report back to the user and wait for the next instruction.

### When to ask vs. proceed

**Ask the user (surface an architectural decision) when:**
- The task requires a change to the database schema (new table, new column, altered relation)
- A new npm package is needed that isn't already in `package.json`
- The task touches authentication, session handling, or access-control logic
- The implementation would affect the tRPC router tree in a structural way (new sub-router, new procedure shape)
- You are uncertain which of two valid approaches better fits the vision

**Proceed autonomously when:**
- Adding or modifying a UI component, page, or layout
- Minor refactors within an existing module
- Styling changes (Tailwind classes, colour tokens, spacing)
- Writing or updating tests
- Fixing a bug whose root cause is clear
- Updating documentation

### Commit discipline

- Branch: use whatever branch is active; never push directly to `main`
- Commit messages: short imperative present tense, e.g. `add scenario detail panel`, `fix indicator decay calculation`
- Keep commits focused — one logical change per commit
- After pushing, create a draft PR if one does not already exist

---

## 4. Tech Stack Quick-Reference

### Architecture

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
```

A **single Express process** serves both the API and all static assets. There is no separate CDN, no separate API server.

### Key packages

| Layer | Package | Notes |
|---|---|---|
| Runtime | Node.js + TypeScript 5.9 (strict) | |
| Server | Express 4 | HTTP + static serving |
| API | tRPC 11 + SuperJSON | All client↔server data |
| DB | PostgreSQL + Drizzle ORM 0.45 | `pg.Pool` via `DATABASE_URL` |
| Migrations | Drizzle Kit | `npm run db:generate` / `db:migrate` |
| Validation | Zod 3.24 + drizzle-zod | Shared across server and client |
| UI framework | React 18 + Vite 7 | Client at `client/`, output at `dist/public/` |
| Components | shadcn/ui (new-york) + Radix UI | ~40 components in `client/src/components/ui/` |
| Styling | Tailwind CSS 3.4 + `cn()` helper | Dark mode via `darkMode: ["class"]` |
| Routing | Wouter 3.3 | Not React Router |
| Async state | TanStack React Query 5 via tRPC | No raw `fetch` on the client |
| Forms | React Hook Form 7 + Zod resolvers | Schema shared with server |
| Tables | TanStack React Table 8 | |
| Charts | Recharts 2 | |
| Animation | Framer Motion 11 | |
| Auth | Passport.js + bcrypt + express-session | Sessions stored in Postgres |
| AI | OpenAI 6 (optional) | Server-side only, never on critical path |
| Testing | Vitest 4 + testing-library + MSW 2 | |
| E2E | Playwright | |

### Path aliases

| Alias | Resolves to |
|---|---|
| `@/*` | `client/src/*` |
| `@shared` | `shared/index.ts` |
| `@shared/db` | `shared/db/index.ts` |
| `@assets` | `attached_assets/` |

### tRPC router tree

```
appRouter
├── auth          signup / login (publicProcedure)
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

---

## 5. Development Conventions

### Type safety (end-to-end, no codegen)

```
shared/db/tables/*.ts   (Drizzle schema)
        │  drizzle-orm infers row/insert types
        ▼
server/routers/*.ts     (tRPC procedures)
        │  tRPC infers I/O from .input()/.output() Zod schemas
        ▼
client/src/lib/trpc.ts  (fully typed hooks)
```

A column type change in `shared/db` surfaces as a TypeScript error all the way up to the React hook. Never break this chain manually.

### Validation

- **Always use Zod.** No hand-rolled type guards at system boundaries.
- Use `drizzle-zod` (`createInsertSchema`, `createSelectSchema`) to derive Zod schemas from Drizzle tables — do not hand-write schemas that duplicate table definitions.
- Zod schemas live in `shared/` so they can be consumed by both server procedures and client form resolvers.

### Styling

- Use Tailwind utility classes. Never write custom CSS unless Tailwind cannot express it.
- Compose classes with the `cn()` helper (`clsx` + `tailwind-merge`).
- Use **shadcn/ui components first** — do not hand-roll headless primitives when a Radix-based component already exists.
- Colour tokens are CSS custom properties defined in `client/src/index.css`. Prefer semantic tokens (`bg-background`, `text-foreground`) over raw Tailwind colour classes.

### Forms

- Always use React Hook Form with `@hookform/resolvers/zod`.
- The Zod schema passed to the resolver must be the same schema used in the tRPC procedure's `.input()`.

### Routing

- Use **Wouter** (`useLocation`, `useRoute`, `<Link>`, `<Route>`, `<Switch>`).
- Do not install or use React Router.
- Routes are defined in `client/src/App.tsx`.

### Data fetching

- All API calls go through **tRPC React Query hooks** (`trpc.router.procedure.useQuery`, `.useMutation`).
- No raw `fetch`, `axios`, or `useEffect`-based fetching on the client.

### Database

- All queries use **Drizzle ORM**. No raw SQL unless Drizzle cannot express the query (e.g. advisory locks).
- Schema changes: edit `shared/db/tables/*.ts`, then run `npm run db:generate` to produce a migration, then `npm run db:migrate` to apply.
- Never edit generated migration files by hand.

### AI / OpenAI

- All OpenAI calls are **server-side only** — the API key never reaches the browser.
- AI enrichment is **optional**: the app must function fully without `OPENAI_API_KEY` set.
- Never put an AI call on the critical rendering or data-fetch path.

---

## 6. Testing & Build

### Test scripts

```bash
npm test          # Vitest (unit + component tests)
npm run test:e2e  # Playwright end-to-end
```

Tests live alongside source files or in `client/src/test/`. MSW mocks are set up in `client/src/test/setup.ts`.

### Build

```bash
npm run build        # tsx script/build.ts — bundles server + client
npm run dev          # Vite HMR dev server
```

### Database scripts

```bash
npm run db:generate  # Produce a new migration from schema changes
npm run db:migrate   # Apply pending migrations
npm run db:seed      # Populate reference/test data
npm run db:studio    # Browser-based schema/data explorer
```

### Production start

```bash
npm run db:migrate && NODE_ENV=production node dist/index.cjs
```

---

## 7. Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | — | Signs express-session cookies |
| `OPENAI_API_KEY` | For AI features | — | OpenAI Responses API |
| `THEME_SYNOPSIS_MODEL` | No | `gpt-4.1-mini` | LLM model for theme synopsis |
| `JOB_SECRET` | Yes (prod) | — | Authorises cron job calls via `X-Job-Secret` header |
| `NODE_ENV` | No | `development` | `production` enables secure cookies |
| `PORT` | No | `5000` | TCP port for Express |

---

## 8. What We Deliberately Don't Use

| Not used | Why |
|---|---|
| GraphQL | tRPC gives the same type safety with far less boilerplate |
| Prisma | Drizzle is lighter and makes raw SQL/advisory locks natural |
| Hand-written REST routes | tRPC eliminates the need; a parallel REST layer breaks type inference |
| Redis / Valkey | Sessions live in Postgres — one fewer infrastructure dependency |
| Next.js / Remix | Vite + Express is simpler and sufficient; SSR is not required |
| React Router | Wouter covers all routing needs at a fraction of the bundle size |
| Client-side OpenAI | The API key must stay server-side |
