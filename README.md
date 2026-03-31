# Horizon Lite

**Full-stack TypeScript SaaS for geopolitical signal tracking, event monitoring, and intelligent information curation.**

Horizon Lite transforms raw global event data into actionable intelligence—tracking signals across geopolitical landscapes, monitoring emerging scenarios, and curating content with precision. Built for teams who need to see the signal in the noise.

---

## ⚡ The Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite, Wouter (routing), Tailwind CSS + shadcn/ui |
| **Backend** | Express + tRPC, Passport.js (authentication), express-session |
| **Database** | PostgreSQL via Drizzle ORM (18 tables, versioned migrations) |
| **Shared** | Zod validators, shared TypeScript types, tRPC contracts |

**Philosophy:** Type safety from request to database. Not a single `any` in sight.

---

## 🏗️ Architecture

### Type-Safe End-to-End (tRPC)
- **14 server routers** mapped directly to features: snippets, themes, sources, signals, intel, admin, and more
- Every API contract is a TypeScript type—client and server stay in lockstep
- SuperJSON transformer handles dates, Maps, and Sets without manual serialization

### Monorepo Discipline
```
horizon-lite/
├── client/          # React app (Vite)
├── server/          # Express + tRPC
└── shared/          # Types, validators, schemas (single source of truth)
```
The `shared/` layer is sacred—all validation logic and type contracts live here, eliminating duplication.

### Spec-Driven Development
Feature specs live in `/docs/specs/` and *drive* implementation. This isn't incidental documentation—it's the blueprint. Each feature is planned before a line of business logic is written.

### GDELT Pipeline
- **Ingestion:** Background jobs consume the Global Database of Events, Language and Tone (GDELT) at scale
- **Advisory Locking:** Cron jobs use PostgreSQL advisory locks to prevent concurrent runs—a production-grade safeguard
- **Signal Generation:** Events flow through a transformation pipeline, becoming signals and indicators for scenario tracking

The result: your dashboard shows real geopolitical data, not synthetic data.

---

## 🎯 What Stands Out

1. **Spec-driven workflow** — Disciplined feature planning before implementation. Rare and valuable.

2. **Advisory locking on cron jobs** — Prevents double-execution of long-running ingestion tasks. Quiet but critical.

3. **SuperJSON serialization** — Dates and complex types just work. No `JSON.stringify` workarounds.

4. **Wouter over React Router** — A deliberate choice for smaller bundle size and better performance in dashboard contexts.

5. **Real event data** — GDELT integration means this is an *actual* intelligence dashboard, not a toy project.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Environment variables (see `.env.example`)

### Installation

```bash
# Install dependencies
npm install

# Set up database
npm run db:migrate

# Start development server
npm run dev
```

### Environment Setup
Copy `.env.example` to `.env.local` and configure:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/horizon_lite
SESSION_SECRET=<generate-a-secure-random-string>
GDELT_API_KEY=<your-gdelt-api-key>
```

---

## 📦 Key Features

### Signal Tracking
Monitor geopolitical signals in real-time. Sources feed events into signal generation pipelines that identify patterns and trends.

### Content Curation
Organize snippets and intel by theme. Build thematic collections that matter to your workflow.

### Event Monitoring
Ingest GDELT data continuously. Track events as they happen, with full audit trails and versioned data.

### Role-Based Access
Admin interfaces for managing users, themes, and data sources. Passport.js + express-session handles authentication and sessions cleanly.

---

## 🛠️ Development

### Project Structure
```
server/
├── routers/           # 14 tRPC routers (features)
├── middleware/        # Auth, logging, error handling
├── jobs/              # Background tasks (GDELT ingestion, signal generation)
└── db/                # Drizzle schema, migrations

client/
├── pages/             # Route pages
├── components/        # Reusable UI (shadcn/ui)
├── hooks/             # React hooks (useQuery, useMutation via tRPC)
└── utils/             # Helpers, formatters

shared/
├── types/             # Exported TypeScript types
├── validators/        # Zod schemas (source of truth)
└── trpc.ts            # tRPC router setup
```

### Database Migrations
Drizzle manages schema evolution with versioned migrations:
```bash
npm run db:generate    # Generate new migration
npm run db:migrate     # Apply migrations
npm run db:push        # Push schema to dev database
```

### Running Background Jobs
```bash
npm run jobs:gdelt-ingest    # Ingest latest GDELT data
npm run jobs:generate-signals # Transform events into signals
```

---

## 🔐 Authentication & Sessions

- **Passport.js** strategies for flexible auth (local, OAuth, etc.)
- **express-session** with secure session storage
- **Role-based access control** via admin routers
- Environment-based secrets with no hardcoding

---

## 📊 Database Schema (18 Tables)

Core entities: Users, Sources, Events, Signals, Themes, Snippets, Intel, Sessions, and audit/versioning tables. Full schema and relationships are documented in migrations.

---

## 🧪 Testing & Quality

- **Type checking:** `tsc --noEmit` (run before deploy)
- **Linting:** ESLint configured for both client and server
- **Database:** Migrations are tested in CI before merge

```bash
npm run type-check
npm run lint
npm run lint:fix
```

---

## 🚢 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Session secret rotated
- [ ] GDELT API key active
- [ ] Express serving gzipped assets
- [ ] Error tracking enabled (Sentry, etc.)
- [ ] Cron jobs configured (systemd timer or cloud scheduler)

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

---

## 🤝 Contributing

1. Create a feature branch from `main`
2. Write the spec in `/docs/specs/`
3. Implement with tests
4. Ensure `npm run type-check && npm run lint` pass
5. Submit PR with spec and implementation

---

## 📄 License

[MIT](./LICENSE) — Use freely in personal and commercial projects.

---

## 📚 Further Reading

- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM Guide](https://orm.drizzle.team)
- [shadcn/ui Components](https://ui.shadcn.com)
- [GDELT Project](https://www.gdeltproject.org)
- [Wouter Routing](https://github.com/molefrog/wouter)

---

**Built with precision. Designed for intelligence.**
