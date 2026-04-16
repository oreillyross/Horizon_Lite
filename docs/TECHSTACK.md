# Horizon — Tech Stack

> *"The specific technical choices that serve the vision without over-committing."*
> — VISION.md, section 10

## 1. Guiding principles

## 2. Architecture at a glance

## 3. Storage — PostgreSQL + Drizzle ORM

## 4. API layer — tRPC + Express

## 5. Ingestion — GDELT pipeline

## 6. AI / NLP — OpenAI (optional, bounded)

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

## 9. Validation & shared types

## 10. Type safety — the through-line

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

## 14. Environment variables

## 15. What we deliberately don't use (and why)
