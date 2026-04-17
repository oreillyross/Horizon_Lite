# Horizon — Tasks

> Derived from `docs/ROADMAP.md`. Follow CLAUDE.md rule 2: one subtask at a time.
>
> **Current active phase: Phase 0.5 — Revision & Cleanup**

---

## How to use this file

1. Find the first unchecked `- [ ]` item in the current active phase.
2. Implement it fully.
3. Mark it `- [x]`.
4. Commit with a focused message.
5. Stop and report back.

Never skip ahead. Never batch subtasks in one session unless explicitly told to.

---

## Phase 0.5 — Revision & Cleanup

**Goal:** Get the app to a consistent, honest MVP. Navigation shows only what the vision describes.
Core routers return real data. Dead-end pages are unreachable without deleting their code.
Scope-creep features (snippets, webcut, sources, tags) stay in the codebase but are invisible to the analyst.

**Milestone:** Every page reachable from the nav returns real data and reflects the
themes → scenarios → indicators → events model. No mock or hardcoded returns survive in core routers.

---

### Navigation & routing

- [x] Rewrite `SubNavigationBar.tsx` `SUB_NAV_ITEMS` to contain only: Overview (`/horizon/overview`), Themes (`/themes`), Scenarios (`/horizon/scenarios`), Signals (`/horizon/signals`), Updates (`/horizon/updates`), Reports (`/horizon/reports`), Intel Feed (`/intel/feed`), Events (`/intel/events`)
- [ ] Remove the `/snippet/create`, `/snippet/show`, `/snippet/:id`, `/snippet/:id/edit`, `/tags/show`, `/sources`, `/sources/recent`, and `/webcut` routes from `client/src/App.tsx` (keep the page files; just unregister the routes)
- [ ] Remove the `GlobalSearch` component from `NavigationBar.tsx` — it queries snippets and sources, which are now unreachable; replace with a plain wordmark link until a vision-aligned search exists

---

### Data model gaps

- [ ] Add `themeId uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE` to the `scenarios` table (`shared/db/tables/scenarios.ts`); run `npm run db:generate` then `npm run db:migrate`
- [ ] Add `strength integer NOT NULL DEFAULT 5` (1–9 scale), `timeWeight text NOT NULL DEFAULT 'week'` (day/week/month/year enum), and `decayBehaviour text NOT NULL DEFAULT 'linear'` (linear/step/none) columns to the `indicators` table (`shared/db/tables/indicators.ts`); run `npm run db:generate` then `npm run db:migrate`
- [ ] Add proper FK constraints to `scenarioIndicatorMap`: `scenarioId` should reference `scenarios(id)` and `indicatorId` should reference `indicators(id)` with `ON DELETE CASCADE`; fix column types so both are `uuid` if scenarios migrated to uuid, or keep as `text` consistently — choose one and apply; run `npm run db:generate` then `npm run db:migrate`

---

### Wire core routers to the database

- [ ] Replace `server/routers/scenarios.router.ts` in-memory store with Drizzle queries: `list` filtered by `themeId` (query param), `getById`, `create`, `update`, `delete` — all hitting the `scenarios` table
- [ ] Replace `server/routers/horizonThemes.router.ts` mock array with real Drizzle queries against the `themes` table: `list` (all themes for the session's analyst group), `getById` (single theme with scenario count)
- [ ] Replace `server/routers/signals.router.ts` mock data with real Drizzle queries against the `indicators` table: `listIndicators` (optionally filtered by `themeId` via joined scenarios), `getIndicator` by id
- [ ] Replace `server/routers/updates.router.ts` mock data with a real query: compute belief updates by joining `signalEvents` → `scenarioIndicatorMap` → `scenarios`; return an empty array if no data — never a hardcoded list
- [ ] Replace `server/routers/reports.router.ts` mock brief with a real query: for a given `themeId`, return each scenario with its linked indicator count and total signal event count; this is the skeleton the Phase 2 assessment will flesh out

---

### Screen audits — empty state & real data

- [ ] Audit `HorizonOverviewScreen` — remove any hardcoded mock values; wire to the real `horizon.dashboard` tRPC procedure; add an empty state for when no themes/scenarios exist
- [ ] Audit `HorizonScenariosListScreen` — confirm it calls the updated scenarios router; add a "No scenarios yet" empty state with a link to create one
- [ ] Audit `HorizonSignalsScreen` — confirm it calls the updated indicators router after the mock is removed; add an empty state
- [ ] Audit `HorizonUpdatesScreen` — confirm it renders the real (possibly empty) updates list gracefully; remove any hardcoded sample entries
- [ ] Audit `HorizonReportsScreen` — confirm it renders the real sparse report skeleton; remove any hardcoded brief text

---

## Phase 1 — Analyst Workflow

**Goal:** The core Horizon loop works end-to-end for a single analyst.

**Milestone:** An analyst can complete one full scan cycle — create a theme, add scenarios, define
indicators, and see which scenarios moved — without leaving the app.

**Prerequisite:** Phase 0.5 fully complete.

---

### Indicator management

- [ ] Add `createIndicator`, `updateIndicator`, `deleteIndicator` tRPC procedures to `signals.router.ts` using the updated indicators schema (including `strength`, `timeWeight`, `decayBehaviour`)
- [ ] Build a create-indicator form (`HorizonIndicatorNewScreen`) using React Hook Form + Zod derived from the indicators insert schema; route it at `/horizon/signals/new`
- [ ] Build an edit-indicator form on `HorizonIndicatorDetailScreen` with pre-populated values; use the same Zod schema
- [ ] Add a delete-indicator action on `HorizonIndicatorDetailScreen` with an `AlertDialog` confirmation
- [ ] Display `strength` (1–9 badge) and `timeWeight` on each indicator card in `HorizonSignalsScreen`

### Scenario ↔ Indicator linking

- [ ] Add `assignIndicator` and `removeIndicator` tRPC procedures to `scenarios.router.ts` (write to / delete from `scenarioIndicatorMap`)
- [ ] Add a "Linked indicators" panel to `HorizonScenarioDetailScreen` listing current indicator links with their weight; each entry has a remove button
- [ ] Add a combobox on `HorizonScenarioDetailScreen` to search existing indicators and assign them to the scenario with a weight (default 1.0)

### Event → Indicator suggestion

- [ ] Add a `listSuggestions` tRPC procedure in `signals.router.ts` that returns `signalEvents` rows whose `indicatorId` matches a given indicator and whose status is `pending`; add a `status text DEFAULT 'pending'` column to `signalEvents` if not present and run migrations
- [ ] Add `approveLink` and `dismissLink` procedures that set `status = 'approved'` or `'dismissed'` on a `signalEvents` row
- [ ] Build a suggestion review panel on `HorizonIndicatorDetailScreen` — lists pending signal events with approve / dismiss buttons

### Scenario warmth on the dashboard

- [ ] Add a `getScenarioWarmth` query to `horizon.router.ts`: for each scenario, sum `strength × recency_weight` of all approved `signalEvents` linked via `scenarioIndicatorMap` within the last 30 days; return a `delta` (positive = warmer, negative = colder) per scenario
- [ ] Display a warmth indicator (▲ / ▼ / —) beside each scenario in `HorizonScenariosListScreen` and on `HorizonOverviewScreen`
- [ ] Add a "Recently moved" section to `HorizonOverviewScreen` showing the top 3 warmest and top 3 coldest scenarios with their delta value

---

## Phase 2 — Sentinel Assessment

**Goal:** The primary deliverable exists and is traceable.

**Milestone:** A Sentinel Assessment can be produced on demand for any theme, exported,
and handed to a decision-maker.

**Prerequisite:** Phase 1 fully complete.

---

### Report generation

- [ ] Add a `generateAssessment` tRPC procedure in `reports.router.ts` that accepts `themeId` and a `window` (7d/30d/90d) and returns: scenarios sorted by warmth delta (warmer first), each with their driving indicators and the signal events behind them
- [ ] Build an assessment view in `HorizonReportsScreen` — warmer scenarios section, colder scenarios section, evidence list per scenario
- [ ] Add a 7d / 30d / 90d window selector that re-runs the assessment query

### Evidence trail

- [ ] Ensure every event in the report view renders: scenario name → indicator name → event title → clickable source URL
- [ ] Add a collapsible "Show evidence" toggle per scenario in the report that expands the full indicator→event chain
- [ ] Render source URLs as clickable external links on `HorizonIndicatorDetailScreen` and in the report evidence rows

### Research agenda

- [ ] Add a `getResearchAgenda` query in `reports.router.ts`: return indicators with zero approved `signalEvents`, sorted descending by their total weight across all linked scenarios
- [ ] Render a "Research agenda" section at the bottom of the assessment — unfulfilled indicators listed with parent scenario name and weight

### Export

- [ ] Add an `exportMarkdown` tRPC procedure that serialises the current assessment to a Markdown string
- [ ] Add a "Download Markdown" button to `HorizonReportsScreen` that triggers the export and initiates a file download in the browser
- [ ] Add a print-optimised CSS block in `client/src/index.css` (scoped to `@media print`) so the report page prints cleanly; add a "Print / Save PDF" button that calls `window.print()`

---

## Phase 3 — Signal Intelligence

**Goal:** The ingestion pipeline earns analyst trust.

**Milestone:** An analyst reviewing the signals queue dismisses fewer than one in three suggestions as irrelevant.

**Prerequisite:** Phase 2 fully complete.

---

### Signal confidence scoring

- [ ] Add a `confidenceScore doublePrecision` column to `signalEvents`; run migrations
- [ ] Update `server/ingest/generateSignals.ts` to compute confidence from: GDELT `eventCode` category weight + Goldstein scale (normalised 0–1) + log(mention count); store in `confidenceScore`
- [ ] Display confidence score on signal suggestion cards in the indicator review panel

### Deduplication

- [ ] Add a `canonicalId uuid` (nullable, self-reference) column to `signalEvents` to mark duplicates; run migrations
- [ ] In `server/ingest/gdeltIngest.ts`, before inserting a new signal event, check for existing rows with the same `globalEventId`; for near-duplicates (same actors + same day + same CAMEO root code) set `canonicalId` to the id of the earliest matching row
- [ ] Filter non-canonical rows (where `canonicalId IS NOT NULL`) out of the default suggestion queue; add a "Show duplicates" toggle

### Signal lifecycle

- [ ] Add an `expiresAt timestamp` column to `signalEvents`; set on insert based on the linked indicator's `timeWeight` (day=+1d, week=+7d, month=+30d, year=+365d); run migrations
- [ ] Add a nightly cleanup step in the GDELT ingest job that sets `status = 'expired'` on rows past `expiresAt`
- [ ] Add re-surface logic: if a new ingest event matches an expired signal's indicator with higher `confidenceScore`, reset `expiresAt` and set `status = 'pending'`
- [ ] Hide expired signals from the default queue; add a "Show expired" toggle to the indicator detail panel

### Bulk link approval

- [ ] Add `approveLinks` and `dismissLinks` (plural) tRPC procedures accepting an array of `signalEventId` values
- [ ] Add checkbox selection to the signal suggestion list on `HorizonIndicatorDetailScreen`
- [ ] Add "Approve selected" and "Dismiss selected" bulk action buttons; disable when nothing is checked

### Additional open-source feed

- [ ] Choose a second ingest source (ACLED event API or GDELT GKG v2 document stream); add a one-paragraph ADR comment at the top of the new adapter file recording the choice and why
- [ ] Implement the second ingest adapter in `server/ingest/` following the same interface and error-handling pattern as `gdeltIngest.ts`
- [ ] Wire the adapter into `generateSignals.ts` so its events flow through the same confidence scoring and deduplication logic
- [ ] Add an enable/disable toggle for the second feed in `AdminScreen` backed by a config row in the database (or an env var if simpler)

---

## Phase 4 — Operational Maturity

**Goal:** Horizon is reliable, testable, and ready for more than one analyst.

**Milestone:** A second analyst can join an existing instance, the test suite catches regressions,
and the system runs unattended in production without surprises.

**Prerequisite:** Phase 3 fully complete.

---

### Unit and component tests

- [ ] Write Vitest unit tests for `generateSignals.ts` confidence scoring — edge cases: zero mentions, negative Goldstein, unknown CAMEO code
- [ ] Write Vitest unit tests for indicator decay calculation (linear / step / none) using fixed timestamps
- [ ] Write Vitest unit tests for scenario warmth calculation — verify correct weighting of strength × recency across multiple indicators
- [ ] Write Vitest unit tests for `generateAssessment` report logic — verify warmer/colder sorting and empty-theme edge case
- [ ] Write component tests (testing-library) for `HorizonScenarioDetailScreen`: indicator link panel renders, add/remove interactions fire correct tRPC mutations
- [ ] Write component tests for the signal suggestion review panel: approve and dismiss buttons call the right procedures; optimistic UI updates correctly

### E2E tests

- [ ] Write a Playwright test: sign up → create theme → add scenario → add indicator → link indicator to scenario → verify all appear on the overview
- [ ] Write a Playwright test: approve a signal suggestion on the indicator detail page → verify it appears in the scenario evidence chain
- [ ] Write a Playwright test: generate a Sentinel Assessment → verify warmer/colder sections render → download Markdown export → verify the file is non-empty

### Multi-analyst support

- [ ] Add a group-membership middleware in `server/middleware/` that resolves the authenticated user's `analystGroupId` from session and attaches it to the tRPC context
- [ ] Guard all `scenarios`, `indicators`, and `themes` procedures: a user may only read/write records that belong to their group (via `analystGroupId` or `themeGroupLinks`)
- [ ] Restrict theme visibility: `horizonThemes.list` returns only themes linked to the current user's group via `themeGroupLinks`
- [ ] Add an "Invite analyst" flow in `AdminScreen`: create a new user record, assign them to the current group; send no email for now — show a one-time credential display

### Observability

- [ ] Add structured JSON logging to all tRPC procedures using `pino` (if not already in `package.json`) or plain `JSON.stringify` if keeping dependencies minimal; log: procedure name, duration ms, error if any
- [ ] Add a `GET /health` Express route returning JSON: `{ db: 'ok'|'error', lastIngestAt: ISO string|null, signalQueueDepth: number }`
- [ ] Surface the `/health` response on `AdminScreen` as a live status panel (refresh on mount, manual refresh button)

---

## Completed phases

- [x] **Phase 0 — Foundation** — type-safe monorepo, Drizzle schema, tRPC routers, GDELT ingest pipeline, Passport auth, React + Vite UI shell
