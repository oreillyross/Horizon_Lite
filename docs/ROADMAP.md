# Horizon — Roadmap

> *"The sequence in which we build `horizon_lite` toward the vision, in shippable slices."*
> — VISION.md, section 10

---

## How to read this document

Each phase ends in a **shippable milestone** — a version an analyst can use in earnest, not just a technical checkpoint. Work within a phase can be sequenced however the TASKS.md demands; the phases themselves are ordered by dependency and value.

The north star against which every phase is measured:

> A single analyst, working alone, should be able to maintain a living set of ~20 scenarios across ~5 themes, supported by a few hundred active indicators and a continuous stream of events — and produce a Sentinel Assessment on any of them in under five minutes, with every claim traceable to source.

---

## Phase 0 — Foundation (complete)

**Goal:** A working, type-safe monorepo with all the infrastructure the product needs.

This phase is done. What exists:

- End-to-end type safety: Drizzle schema → tRPC procedures → React hooks, with no codegen
- Core data model tables: `themes`, `scenarios`, `indicators`, `signalEvents`, `scenarioIndicatorMap`
- 18 tRPC routers covering all major entities
- GDELT ingestion pipeline with PostgreSQL advisory locking and signal generation
- Authentication: Passport.js + bcrypt + express-session (Postgres-backed)
- React 18 + Vite UI with 28 pages and 40+ shadcn/ui components
- Optional OpenAI theme synopsis, server-side only, never on the critical path

The foundation is solid. Phases 1–4 build the analyst's actual experience on top of it.

---

## Phase 1 — Analyst Workflow

**Goal:** The core Horizon loop works end-to-end for a single analyst.

An analyst can open Horizon, create a theme with four or more scenarios, define indicators for each, and watch incoming events get linked to those indicators. The relationship between evidence and scenario likelihood is visible at a glance.

**Milestone:** An analyst can complete one full scan cycle — from theme setup to reviewing which scenarios moved — without leaving the app.

### Work items

- **Indicator management** — create, edit, and delete indicators with strength (1–9), time-weight (day / week / month / year), and decay behaviour
- **Scenario ↔ Indicator linking** — a clear UI over `scenarioIndicatorMap` so analysts can assign indicators to scenarios and see the map at a glance
- **Event → Indicator suggestion** — the system proposes links between incoming signal events and existing indicators; the analyst approves or dismisses each
- **Scenario warmth on the dashboard** — the Horizon overview shows which scenarios are trending warmer or colder based on recently linked events
- **TASKS.md** — a concrete, near-term work queue that tracks individual subtasks within this phase

---

## Phase 2 — Sentinel Assessment

**Goal:** The primary deliverable exists and is traceable.

A Sentinel Assessment is the unit of value Horizon delivers to decision-makers. After Phase 2, an analyst can generate one in under five minutes, and every claim in it traces back to a source event.

**Milestone:** A Sentinel Assessment can be produced on demand for any theme, exported, and handed to a decision-maker.

### Work items

- **Report generation** — a structured report per theme: scenarios trending warmer, scenarios trending colder, and the evidence behind each movement
- **Evidence trail** — every claim in the report links back: scenario → indicator → event → source URL
- **Research agenda** — a section listing high-value unfulfilled indicators (those that would materially shift scenario likelihood if observed), giving the analyst a prioritised collection agenda
- **Export** — Markdown and PDF output so the assessment can leave the app

---

## Phase 3 — Signal Intelligence

**Goal:** The ingestion pipeline earns analyst trust.

Raw GDELT volume is high and precision is low. After Phase 3, the signals surfaced are worth the analyst's attention.

**Milestone:** An analyst reviewing the signals queue dismisses fewer than one in three suggestions as irrelevant.

### Work items

- **Signal confidence scoring** — weight GDELT suggestions by event type, Goldstein scale, and mention count before surfacing them
- **Deduplication** — collapse repeated coverage of the same event into a single signal rather than flooding the queue
- **Signal lifecycle** — age out stale signals automatically; re-surface if new corroborating evidence arrives
- **Bulk link approval** — let an analyst approve or dismiss a batch of suggestions in a single pass, not one at a time
- **Additional open-source feeds** — a second ingestion adapter beyond GDELT, so the pipeline is not a single point of failure

---

## Phase 4 — Operational Maturity

**Goal:** Horizon is reliable, testable, and ready for more than one analyst.

**Milestone:** A second analyst can join an existing instance, the test suite catches regressions, and the system runs unattended in production without surprises.

### Work items

- **Unit and component test coverage** — Vitest tests for the critical server logic (signal scoring, indicator decay, report generation) and key React components
- **E2E tests** — Playwright tests covering the analyst golden path: create theme → add scenario → add indicator → review signals → generate assessment
- **Multi-analyst support** — the `analyst_groups` table already exists; wire group membership to access control so multiple analysts can share a Horizon instance without stepping on each other
- **Observability** — structured server-side logging and a health endpoint that surfaces ingestion lag, queue depth, and database connectivity

---

## What this roadmap is not

- A release schedule. No dates are attached to phases — the analyst experience comes first; shipping speed is a function of that.
- A feature wishlist. Items not on this list are not planned. Adding them requires revisiting the vision first.
- A commitment to external data integrations beyond GDELT in Phase 3. Those depend on licensing, reliability, and analyst feedback from Phase 2.

---

## See also

- **VISION.md** — the anchor. If this document contradicts it, the vision wins.
- **TECHSTACK.md** — the specific technical choices that serve each phase.
- **TASKS.md** — the concrete, near-term work queue derived from whichever phase is active.
