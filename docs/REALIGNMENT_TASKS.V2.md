# REALIGNMENT_TASKS.V2.md

> Work through these one subtask at a time, in order.
> Mark each `- [x]` when complete, commit, then stop and report.
> Do not start the next subtask until the user confirms.
>
> **Prerequisite:** All tasks in `REALIGNMENT_TASKS.md` must be complete before starting Phase 1 here.

---

## Intelligence Hierarchy (reference)

```
Theme
 └── Scenario
      └── Indicator
           └── Snippet
                └── Source URL
                └── Publication
                └── Timestamp
                └── Analyst confidence
                └── Extracted entities
```

---

## What We Will NOT Build

Do not introduce any of the following at any point during this realignment:

- Vector graphs or vector databases
- Autonomous agents
- Knowledge graphs
- Advanced Bayesian engines
- Real-time streaming pipelines
- Automated inference systems that act without analyst approval

---

## Phase 1 — GDELT Ingestion Pipeline

Set up the scheduled GDELT pull and raw-event storage so the system has a
live feed of pre-filtered articles to review. No analyst-facing UI yet.

- [ ] **1.1** Create a `gdelt_events` database table with columns:
  `id`, `gdelt_event_id`, `url`, `title`, `pub_date`, `country_code`,
  `event_root_code`, `goldstein_scale`, `num_mentions`, `source_name`,
  `ingested_at`, `status` (`new` | `flagged` | `reviewed` | `skipped`).
  Run `npm run db:generate && npm run db:migrate`.

- [ ] **1.2** Write `server/jobs/gdeltIngest.ts` — fetches the latest GDELT
  GKG/events CSV endpoint, parses rows, deduplicates against existing
  `gdelt_event_id` values, and bulk-inserts new rows with `status = 'new'`.
  No OpenAI calls. No side-effects beyond DB writes.

- [ ] **1.3** Add a `POST /internal/jobs/gdelt` Express route (guarded by
  `X-Job-Secret` header matching `process.env.JOB_SECRET`) that triggers
  `gdeltIngest.ts`. This is the hook for external cron schedulers.

- [ ] **1.4** Write a Vitest unit test for the GDELT CSV parser in
  `gdeltIngest.ts` using a fixture file — at minimum: deduplication logic
  and correct `status` assignment.

- [ ] **1.5** Document the cron schedule (twice daily: 06:00 UTC, 18:00 UTC)
  as a comment in the route file and in a brief note in `README.md` under
  a new "Scheduled Jobs" section.

---


## Phase 2 — GDELT Triage Screen

Give the analyst a fast one-pass review surface to flag or skip raw GDELT
events before doing deep reading. Speed is the design goal: keyboard-friendly,
no modals, minimal clicks.

- [ ] **2.1** Add a `horizon.gdelt.list` tRPC query that returns paginated
  `gdelt_events` rows filtered to `status = 'new'`, ordered by
  `pub_date DESC`. Accept optional `limit` / `cursor` inputs for cursor
  pagination.

- [ ] **2.2** Add a `horizon.gdelt.setStatus` tRPC mutation that accepts
  `{ id, status: 'flagged' | 'skipped' }` and updates the row. No bulk
  mutations yet.

- [ ] **2.3** Create `client/src/pages/HorizonGdeltTriageScreen.tsx`.
  Layout: a scrollable list of event cards showing `title`, `source_name`,
  `pub_date`, `country_code`, and a truncated URL. Each card has two
  inline action buttons: **Flag** and **Skip**.

- [ ] **2.4** Clicking **Flag** calls `horizon.gdelt.setStatus` with
  `status = 'flagged'` and optimistically removes the card from the
  `new` list. Clicking **Skip** does the same with `status = 'skipped'`.
  No confirmation dialogs.

- [ ] **2.5** Add a count badge in the sidebar navigation item for the
  triage screen showing the number of `status = 'new'` events. Invalidate
  on mutation.

- [ ] **2.6** Wire the route `/horizon/gdelt/triage` in `client/src/App.tsx`
  and add it to the Horizon sidebar nav.

---

## Phase 3 — Webcut: Article Reader View

When an analyst clicks a flagged event they need a clean, distraction-free
reading surface — source HTML stripped to text only, no images, no nav chrome.

- [ ] **3.1** Add a server-side `POST /api/webcut` Express route (not tRPC —
  this does an outbound HTTP fetch). Accepts `{ url: string }` in the
  request body. Fetches the URL server-side, uses a lightweight HTML parser
  (e.g. `node-html-parser` or `cheerio` — check `package.json` first; only
  add a package if none exists) to strip everything except block-level text
  nodes (`p`, `h1`–`h4`, `li`, `blockquote`). Returns `{ text: string }`.

- [ ] **3.2** Add a `horizon.gdelt.webcut` tRPC query that proxies to the
  `/api/webcut` route internally and returns the stripped text. This keeps
  the client on tRPC hooks only.

- [ ] **3.3** Create `client/src/pages/HorizonWebcutScreen.tsx`. Route:
  `/horizon/gdelt/read/:eventId`. On mount: fetch the `gdelt_events` row
  by `eventId`, then call `horizon.gdelt.webcut` with the stored URL.
  Display the stripped article text in a readable single-column layout
  (max-width ~72ch, generous line height).

- [ ] **3.4** Add a back-link breadcrumb to the Triage Screen at the top
  of `HorizonWebcutScreen`.

- [ ] **3.5** Make flagged event rows in the Triage Screen link to
  `/horizon/gdelt/read/:eventId` so the analyst can open an article
  directly from the queue.

---

## Phase 4 — Snippet Capture

The analyst selects text in the Webcut view and saves it as a snippet linked
to an indicator. This is the core data-capture moment.

- [ ] **4.1** Confirm the `snippets` table has columns: `id`, `quote` (text),
  `source_url`, `pub_date`, `indicator_id` (FK), `analyst_notes`, `created_at`.
  If any column is missing, add it, generate and apply a migration.

- [ ] **4.2** In `HorizonWebcutScreen`, detect browser text selection
  (`document.addEventListener('mouseup', ...)` or equivalent React pattern).
  When the user releases the mouse after selecting text, show a small
  floating **"Create Snippet"** button anchored near the selection — no
  modal yet, just the button.

- [ ] **4.3** Clicking **Create Snippet** opens an inline panel (not a full
  modal) at the bottom of the screen containing:
  - Read-only **Quote** field pre-populated with the selected text.
  - Read-only **Source URL** pre-populated from the current event URL.
  - **Linked Indicator** dropdown populated by `horizon.indicators.list`.
  - **Analyst Notes** textarea (optional).
  - **Save** and **Cancel** buttons.

- [ ] **4.4** Add a `horizon.snippets.create` tRPC mutation (or confirm it
  exists and works). On save: insert the snippet row and show a brief
  inline success toast. The panel closes automatically.

- [ ] **4.5** After a successful snippet save, display a count of snippets
  created during this reading session at the top of `HorizonWebcutScreen`
  (e.g. "3 snippets captured this session"). Resets on page leave.

---

## Phase 5 — AI Indicator Suggestion

After the snippet text is selected, use the LLM to suggest the most relevant
indicator. The analyst can accept in one click or override manually. This is
a convenience feature — the system must work fully without it.

- [ ] **5.1** Add a server-side function `server/lib/suggestIndicator.ts`
  that accepts `{ quote: string, indicators: Indicator[] }` and calls the
  OpenAI API with a minimal prompt asking it to return the single most
  relevant `indicator_id` from the list. If `OPENAI_API_KEY` is not set,
  return `null` immediately.

- [ ] **5.2** Add a `horizon.snippets.suggestIndicator` tRPC query that
  accepts `{ quote: string }`, fetches the indicator list server-side,
  calls `suggestIndicator`, and returns `{ suggestedIndicatorId: string | null }`.

- [ ] **5.3** In the snippet capture panel (Phase 4.3): after the quote is
  populated, fire `horizon.snippets.suggestIndicator` in the background.
  When it resolves, pre-select the suggested indicator in the dropdown and
  add a subtle "AI suggestion" label beside it.

- [ ] **5.4** The analyst can change the dropdown at any time — the AI
  suggestion is never locked in. If the API call is still loading when
  the analyst saves, save with whatever indicator is selected (do not block
  on the AI response).

- [ ] **5.5** Store a `ai_suggested_indicator_id` column on the `snippets`
  table (nullable) so future analysis can measure suggestion accuracy.
  Generate and apply migration.

---

## Phase 6 — Enhanced Theme Synopsis

Upgrade the existing synopsis generation to include structured evidence from
snippets — weighted indicators, temporal context, competing scenarios. The
analyst still triggers synopsis generation manually; it is never automatic.

- [ ] **6.1** In `server/lib/generateSynopsis.ts` (or equivalent), extend the
  prompt context to include:
  - The list of competing scenarios for the theme (name + description).
  - Per-scenario: indicator names, current strength/decay values.
  - Per-scenario: the 5 most recent snippets (quote + pub_date + analyst_notes).
  Guard each section so it degrades gracefully when data is absent.

- [ ] **6.2** Ensure the assembled prompt context is assembled from DB queries
  only — no in-memory state, no globals. The function must be pure given
  a `themeId`.

- [ ] **6.3** Add `synopsis_context_hash` (a hash of the input data used to
  generate the synopsis) to the theme synopsis storage so the UI can show
  "synopsis may be outdated" when the underlying data has changed since
  last generation.

- [ ] **6.4** On `ThemeViewScreen`, show a subtle "Synopsis may be outdated"
  notice when `synopsis_context_hash` does not match the current hash of
  live data. Do not auto-regenerate — show the Refresh Synopsis button and
  let the analyst decide.

- [ ] **6.5** Write a Vitest test for the prompt-assembly function in 6.1:
  confirm that missing scenarios, missing indicators, and missing snippets
  each produce a graceful (non-crashing) prompt string.

---

## Exit Criteria

Phase V2 is complete when all tasks above are checked and:

- The analyst can move from GDELT triage → article read → snippet capture → indicator link in a single uninterrupted flow.
- Snippet creation never requires more than three clicks after text selection.
- The AI indicator suggestion appears automatically but is never blocking or mandatory.
- The Theme Synopsis visibly reflects captured snippet evidence.
- The app functions fully (no errors, no blank screens) when `OPENAI_API_KEY` is absent.
- No new autonomous, real-time, or vector-based systems have been introduced.
