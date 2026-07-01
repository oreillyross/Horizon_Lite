# TASKS v5 — Stabilise the Core, Fix the Feed, Realign Signals

> Derived from analyst field observations of the running app. Reordered and grouped
> into phases with logical sequencing. **Do not start any work yet** — this document
> is for review first.
>
> Work top-to-bottom. Complete one subtask fully, mark it `- [x]`, commit, then stop.

---

## Reading of the current state (critical analysis)

Before the tasks, here is what the four observations actually point to, after reading
the code:

- **The two "errors" are almost certainly not the same class of problem.**
  - The Admin → Categories failure (`select … from "indicator_categories"`) is a
    *database/migration* problem, not an application-logic one. The table, its Drizzle
    schema (`shared/db/tables/indicatorCategories.ts`), the router
    (`adminRouter.listIndicatorCategories`), and migration `0003_indicator_categories.sql`
    all exist and are consistent. If the query fails at runtime, the migration has not
    been applied to the target database. This is a **deploy/ops verification** task.
  - The Signals "Output validation failed" is an *application* problem: the tRPC
    `signals.listIndicators` procedure declares `.output(z.array(IndicatorSummarySchema))`,
    and a returned row is violating that schema at runtime (a likely culprit is a
    `category` value that is empty, or a `strength`/`timeWeight`/`decayBehaviour` value
    outside the enum/range the schema enforces). This needs reproduction and a fix at
    the boundary, not a migration.

- **The GDELT duplication is by design of the source, not a bug.** GDELT emits a new
  `GlobalEventID` per article/mention, so the same underlying story legitimately appears
  many times. Triage (`gdelt.router.list`) lists one row per `global_event_id`, so
  near-identical titles stack up. Dedup should happen **as close to ingestion as
  possible** (per the observation) — collapsing on a stable key (normalised title, or
  title + source domain) so the analyst triages *stories*, not raw event rows.

- **Signals being "out of whack with the vision" is the most important, least
  mechanical item.** The vision is Themes → Scenarios → Indicators as a thinking tool.
  The Signals screen presents an "operator view" of indicator acceleration that
  currently (a) is broken and (b) duplicates concepts the Indicators CRUD already owns.
  Before rebuilding it, we should decide whether it earns its place at all. This is a
  **product decision that needs the user**, so it is gated behind an explicit question.

- **The DAG CRUD is the asset to protect.** Themes → Scenarios → Indicators is what
  works. It should be pinned down with a regression baseline so the fixes above don't
  quietly break it.

---

## Phase 0 — Establish the baseline (protect what works)

Goal: know exactly what "working" means before changing anything, so later phases can't
silently regress the core.

- [ ] **0.1 Audit the Themes → Scenarios → Indicators DAG.** Trace the CRUD paths end to
  end (routers under `horizon`, the Drizzle tables, and the client pages) and write a
  short note in this file describing the confirmed-good behaviour: what relations exist
  (theme has scenarios; scenario has indicators via `scenarioIndicatorMap`), and any
  gaps found. No code changes.
- [ ] **0.2 Add/confirm a regression test for the DAG.** Ensure there is a Vitest test
  covering create → link → read for a theme, a scenario under it, and an indicator
  mapped to that scenario. If one exists, note it; if not, add it. This is the guardrail
  for Phases 1–3.

## Phase 1 — Fix the Admin Categories failure (migration/ops)

Goal: Admin → Categories loads without a query error.

- [ ] **1.1 Reproduce and diagnose.** Confirm the failing query
  (`select "id","value","label","created_at" from "indicator_categories" order by … "label"`)
  against the actual target database. Verify whether the `indicator_categories` table
  exists and whether migration `0003_indicator_categories` is recorded as applied.
- [ ] **1.2 Apply the fix at the correct layer.** If the table is missing, the fix is to
  run `npm run db:migrate` in the environment and confirm the seed rows land (Political,
  InfoOps, Infrastructure, Diplomatic). Do **not** hand-edit the generated migration.
  If, instead, the migration is applied but the query still fails, capture the real
  Postgres error and fix the schema/router mismatch that produces it.
- [ ] **1.3 Verify in the UI.** Load Admin → Categories and confirm the list renders and
  create/rename/delete still behave.

## Phase 2 — Deduplicate GDELT at ingestion

Goal: the Triage screen shows one row per *story*, not per raw GDELT event.

- [ ] **2.1 Decide the dedup key.** Settle on the collapse key: normalised title, or
  title + source domain. Document the choice and the normalisation rule (case-fold, trim,
  collapse whitespace/punctuation) in this file. Prefer title + source domain to avoid
  merging unrelated same-titled wire copies across outlets unless the user wants
  cross-outlet collapse.
- [ ] **2.2 Deduplicate as close to the source as possible.** In `gdeltIngest.ts`, skip
  or fold events whose dedup key already exists for the same ingestion window, so
  duplicate stories never reach the triage table in the first place. Keep the analyst's
  triage `status` on the surviving row untouched (the existing upsert already preserves
  it — do not regress that).
- [ ] **2.3 Cover the historical backlog.** Triage already contains duplicates. Provide a
  one-time collapse for existing `gdelt_events` rows sharing the dedup key (keep the
  earliest/most-mentioned, mark the rest). Keep this as a scoped, reviewable step.
- [ ] **2.4 Test ingestion dedup.** Extend `gdeltIngest.test.ts` (fixtures already exist)
  with a case where two events share the dedup key and assert only one survives.

## Phase 3 — Repair and realign the Signals screen

Goal: Signals either works and clearly serves the vision, or is removed. Two sub-goals:
first stop the bleeding (make it load), then decide its future.

### 3a. Stop the bleeding (bug fix)

- [ ] **3.1 Reproduce "Output validation failed" on `signals.listIndicators`.** Log the
  actual Zod error to find which field/row violates `IndicatorSummarySchema` (suspect
  `category` empty, or `strength`/`timeWeight`/`decayBehaviour` out of the declared
  enum/range).
- [ ] **3.2 Fix at the boundary.** Correct the offending data mapping in
  `signals.router.ts` (and/or the schema, if the schema is wrong about reality). The
  goal is a valid, honest payload — not loosening the schema to hide bad data.
- [ ] **3.3 Confirm the screen loads** with real data and the Total/Triggered/Watching
  counts populate.

### 3b. Decide the screen's future (product decision — gated)

- [ ] **3.4 Put the decision to the user before rebuilding.** Ask whether the Signals
  "operator view" should be (a) kept and reframed to clearly complement the
  Themes→Scenarios→Indicators DAG, (b) merged into the Indicators/Scenario views, or
  (c) removed. **Do not redesign until this is answered** — it is a vision-level call,
  not a UI tweak.
- [ ] **3.5 Execute the chosen direction.** Implement (a), (b), or (c) as a distinct,
  reviewable change once the user has decided.

---

## Deferred / open questions

- Cross-outlet dedup: should the same wire story from different domains collapse into one
  triage row, or stay separate? (Affects Phase 2.1.)
- Signals screen fate: keep / merge / remove. (Phase 3.4 — must be answered by the user.)
