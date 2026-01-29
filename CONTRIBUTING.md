# Contributing to Horizon Lite

Thanks for contributing to **Horizon Lite** — a spec-driven, type-safe snippets app built with React + tRPC + Drizzle + Postgres. :contentReference[oaicite:0]{index=0}

This guide is optimized for a clean history, fast iteration, and predictable releases.

---

## Project principles

- **Spec-first**: For meaningful work, start with a short spec in `docs/`.
- **Type-safe end-to-end**: Prefer shared schema/types and tRPC procedures over ad-hoc JSON.
- **Small PRs**: Ship in small, reviewable slices.
- **Tests are part of the feature**: Don’t merge red.

---

## Repo layout (high-level)

- `client/` — React app (Vite, Tailwind, shadcn/ui)
- `server/` — Express + tRPC + Drizzle
- `shared/` — shared schema/types
- `docs/` — feature specs

Architecture overview: :contentReference[oaicite:1]{index=1}

---

## Quick start

Install deps and run:

```bash
npm install
npm run dev
