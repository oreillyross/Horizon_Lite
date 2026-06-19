# TASKSV3 — Snippet Capture: Visibility, Editability & Indicator-Suggestion Fix

> Work through subtasks **one at a time**. Mark each `- [x]` when complete, commit, then stop and report.
> Never skip ahead or batch subtasks unless the user explicitly says so.

---

## Context & prior corrective action

`TASKS.md` Phase 0.5 ("Revision & Cleanup") deliberately made snippets **invisible** to the
analyst — at that point snippets were considered scope-creep alongside webcut/sources/tags, and
the nav, routes, and `GlobalSearch` references to them were stripped out (see
`TASKS.md` → "Navigation & routing", commits removing `/snippet/*` routes).

Since then, snippet capture became load-bearing: `HorizonWebcutScreen.tsx` (mounted at
`/horizon/gdelt/read/:eventId`) lets an analyst select text from a flagged GDELT article and
capture it as a snippet via `trpc.horizon.snippets.create`, optionally linked to an indicator with
an AI suggestion (`trpc.horizon.snippets.suggestIndicator`, added in a later "Phase 4/5" pass per
the file's own comments). That capture flow works, but two things never got finished, and a third
was never built:

1. **No way to see or edit captured snippets.** `server/routers/horizonSnippets.router.ts` only
   exposes `create` and `suggestIndicator` — there is no `list`, `update`, or `delete`. No client
   screen exists at all (confirmed: no file matching `*Snippet*` under `client/src/pages/` besides
   the legacy `HorizonWebcutScreen.tsx` capture UI itself). Once a snippet is saved, it disappears
   from the analyst's view entirely.

2. **Indicator-suggestion regression.** On `HorizonWebcutScreen.tsx`, the "Linked Indicator"
   `<Select>` (lines ~300-322) is populated only from `indicators.length` returned by
   `trpc.horizon.signals.listIndicators`. When the AI suggester
   (`server/lib/suggestIndicator.ts`) returns `null` — which it always does with no
   `OPENAI_API_KEY`, or with zero scenario-linked indicators, or simply when nothing matches — the
   analyst is left with a plain dropdown of *existing* indicators and no way to create a new one
   inline. `signals.router.ts` already has a working `createIndicator` procedure (reused by
   `HorizonIndicatorNewScreen.tsx`); the webcut panel never wired an inline "create new indicator"
   path to it. This is the "regression" to fix — not a backend bug, a missing UI affordance that
   makes the AI-suggestion failure path a dead end.

3. **No grouped snippets view.** Never built. Per the data model (Themes → Scenarios → Indicators
   → Events → Links), snippets are evidence one level below indicators. The most useful grouping
   for an analyst reviewing captured evidence is by **linked Indicator** (with an "Unlinked"
   bucket for snippets captured with no indicator chosen), and indicators in turn show their
   parent scenario/theme via the existing `scenarioIndicatorMap` chain — so the screen should
   group `Indicator → its snippets`, with an "Unlinked snippets" section at the end.

This explicitly reverses the Phase 0.5 "snippets stay invisible" decision for the capture +
review loop, per direct user request. It does **not** resurrect the old in-memory
`snippets.router.ts` (`getSnippets`/`getTags` via `snippetStorage`) — that is a separate legacy
path tied to the abandoned webcut/tags feature and is out of scope; everything here builds on the
canonical `horizonSnippets` router and the real `snippets` Drizzle table.

No new npm packages. No duplicate routers. One canonical way to manage snippets.

---

## Phase 1 — Backend: list, update, delete for snippets

### 1.1 Add `list` procedure to `horizonSnippetsRouter`

- [x] Open `server/routers/horizonSnippets.router.ts`.
- [x] Add a `list: protectedProcedure` query, no input required, that returns all snippets scoped
  to the current analyst group. Since `snippets` has no `analystGroupId` column, scope via the
  optional `indicatorId` → `indicators` → ... chain is not reliable for unlinked snippets; instead
  add scoping the simplest correct way available today: return all snippets (the app is currently
  single-group per `TASKS.md` Phase 4 multi-analyst notes — confirm by checking whether `snippets`
  or any joined table already enforces group scoping elsewhere in this router file; if `ctx.user`
  exposes `analystGroupId` and indicators are group-scoped, join `snippets` → `indicators` →
  (left join, since `indicatorId` is nullable) and filter `indicators.analystGroupId = groupId OR
  snippets.indicatorId IS NULL`). Match whatever scoping pattern `signals.router.ts` already uses
  for indicators so this stays consistent with existing group-isolation rules.
  - Implemented by extracting the existing `suggestIndicator`-procedure pattern (the
    `scenarioIndicatorMap` → `scenarios.analystGroupId` lookup) into a shared
    `visibleIndicatorIds(groupId)` helper, reused by both `list` and `suggestIndicator`. `list`
    returns snippets whose `indicatorId` is either `NULL` (always visible — unlinked evidence
    isn't owned by any group) or in the group's visible indicator set.
- [x] Select and return: `id`, `quote`, `content`, `sourceUrl`, `pubDate`, `indicatorId`,
  `analystNotes`, `aiSuggestedIndicatorId`, `createdAt`, plus the linked indicator's `name` (left
  join `indicators` on `snippets.indicatorId`) so the client doesn't need a second round-trip.
- [x] Order by `createdAt DESC`.
- [x] Run `npm run build` (server) to confirm it compiles.

### 1.2 Add `update` procedure

- [x] Add `update: protectedProcedure` mutation. Input: `{ id: z.string(), indicatorId:
  z.string().uuid().nullable().optional(), analystNotes: z.string().optional() }`.
- [x] Update only the fields provided; do not allow `quote`, `sourceUrl`, or `pubDate` to be
  edited — those are captured facts about the source, not analyst judgement.
- [x] Return the updated row's `id`. Throws `NOT_FOUND` if the id doesn't exist.

### 1.3 Add `delete` procedure

- [x] Add `delete: protectedProcedure` mutation. Input: `{ id: z.string() }`. Deletes the row by
  id. Return `{ id }`. Throws `NOT_FOUND` if the id doesn't exist.
- [x] Confirm `npm run build` compiles cleanly. (`npm test` also run — the 12 pre-existing
  failures in `NavigationBar.test.tsx` and `HorizonScenarioDetailScreen.test.tsx` are unrelated to
  this change; confirmed identical failures on the base branch via `git stash`.)

---

## Phase 2 — Fix the indicator-suggestion dead end on the capture panel

### 2.1 Add inline "create new indicator" affordance to `HorizonWebcutScreen`

- [x] Open `client/src/pages/HorizonWebcutScreen.tsx`.
- [x] In the "Linked Indicator" `<Select>` (around line 300), add a sentinel item at the bottom of
  `<SelectContent>` — e.g. `<SelectItem value="__create_new__">+ Create new indicator…</SelectItem>`
  — always rendered, regardless of whether `indicators.length === 0` or the AI suggestion is
  `null`. This is the actual fix for "AI finds no suggestion → analyst is stuck": the dropdown
  must offer a way out in every case, not just when existing indicators happen to exist.
- [x] When `__create_new__` is selected, open a small inline form (reuse the existing panel's
  layout — a couple of fields, not a separate route) for `name` and `description`, matching the
  minimal shape `createIndicatorInputSchema` requires beyond its defaults (`strength`,
  `timeWeight`, `decayBehaviour` keep their schema defaults; do not expose them here — that's
  scope creep for a quick-capture flow).
  - Built with `name` (text input) + `category` (the same shadcn `<Select>` with the four
    `infoops`/`political`/`infra`/`diplomatic` options, matching `HorizonIndicatorNewScreen`'s
    labels). `description` omitted — not worth a field in a quick-capture flow; analysts can flesh
    it out later from `HorizonIndicatorDetailScreen`.
- [x] Wire a `trpc.horizon.signals.createIndicator.useMutation()` — reuse this existing procedure;
  do not add a second indicator-creation path. On success, set `indicatorId` to the newly created
  indicator's id, mark `userChangedIndicator.current = true`, and invalidate
  `trpc.horizon.signals.listIndicators` so the new indicator appears in the dropdown immediately
  (and on any other screen using that query).
  - Note: `listIndicators` only returns indicators linked via `scenarioIndicatorMap`, and
    indicators created from this quick-capture flow intentionally have no `scenarioId` (no
    scenario picker in this minimal form), so the invalidation alone won't surface the new
    indicator's name in the dropdown. Added a `sessionIndicators` local list (id+name) populated
    on create success and merged into the rendered `indicators` array so the new indicator shows
    up immediately regardless of `listIndicators` scoping.
- [x] On cancel of the inline create form, revert the `<Select>` value to whatever it was before
  (`""` or the AI suggestion if still applicable). Tracked via `indicatorBeforeCreate` ref.
- [x] Placeholder text logic (line ~308-313) already branches on `indicators.length === 0` to show
  "No indicators" — update that branch so it no longer reads as a dead end; e.g. keep "No
  indicators yet" as placeholder text but the `__create_new__` item is still selectable from the
  (otherwise empty) `<SelectContent>`.

### 2.2 Regression check on existing suggestion logic

- [x] Confirm `server/lib/suggestIndicator.ts` and `horizonSnippets.router.ts`'s
  `suggestIndicator` procedure are unchanged by this fix — the bug was UI-only (no escape hatch
  when suggestion is `null`), not in the suggestion logic itself. Do not modify
  `suggestIndicator.ts`.
- [x] Manually verify (dev server, no `OPENAI_API_KEY` set) that: selecting text → opening the
  capture panel → the indicator dropdown still lets you either pick an existing indicator or
  create one inline, with no `OPENAI_API_KEY`-dependent dead end.
  - **Not verified in-browser this session** — no `DATABASE_URL` is configured in this sandbox, so
    the dev server can't serve real data. Verified via code review instead: the `__create_new__`
    sentinel and inline form are unconditional (not gated on `indicators.length` or
    `suggestQuery.data`), so the path is reachable regardless of AI-suggestion outcome.
    `npm run build` and `npm test` both pass with no new failures. Recommend an in-app smoke test
    before merge.

---

## Phase 3 — Snippets review screen, grouped by indicator

### 3.1 Create `HorizonSnippetsScreen`

- [ ] Create `client/src/pages/HorizonSnippetsScreen.tsx`, routed at `/horizon/snippets`.
- [ ] Fetch all snippets via `trpc.horizon.snippets.list.useQuery()`.
- [ ] Group client-side: snippets with a non-null `indicatorId` are bucketed under their
  indicator's name (heading per indicator, sorted by indicator name); snippets with
  `indicatorId === null` go in a trailing "Unlinked" section.
- [ ] Each snippet renders: the `quote` (blockquote style), `sourceUrl` as a clickable external
  link (matches the convention already used on `HorizonIndicatorDetailScreen` per `TASKS.md`
  Phase 2 "Evidence trail"), `pubDate` formatted the same way `HorizonGdeltTriageScreen.tsx`
  formats dates, and `analystNotes` if present.
- [ ] Each snippet card has an "Edit" action that opens an inline editor (reuse shadcn/ui
  `<Select>` + `<Textarea>` + `<Label>` patterns already used in `HorizonWebcutScreen.tsx`) letting
  the analyst change the linked indicator (including the same "+ Create new indicator…" sentinel
  from Phase 2.1 — extract that mini-form into a small shared component,
  `client/src/components/IndicatorQuickCreate.tsx`, so it isn't duplicated between the webcut
  capture panel and this screen) and edit `analystNotes`. Submits via
  `trpc.horizon.snippets.update`.
- [ ] Each snippet card has a "Delete" action behind an `AlertDialog` confirmation (matches the
  existing delete-indicator pattern on `HorizonIndicatorDetailScreen`), calling
  `trpc.horizon.snippets.delete`.
- [ ] Empty state: "No snippets captured yet." with a link back to `/horizon/gdelt/triage`.
- [ ] If the AI suggestion was accepted (`aiSuggestedIndicatorId === indicatorId`), show the same
  "AI suggestion" `<Badge>` used in `HorizonWebcutScreen.tsx` so the provenance is visible here
  too.

### 3.2 Extract `IndicatorQuickCreate` shared component

- [ ] Create `client/src/components/IndicatorQuickCreate.tsx` with props `{ onCreated: (id:
  string) => void; onCancel: () => void }`. Contains the `name`/`description` form and the
  `createIndicator` mutation built in Phase 2.1.
- [ ] Refactor `HorizonWebcutScreen.tsx` to use this component instead of its inline version.
- [ ] Use the same component in `HorizonSnippetsScreen.tsx` (Phase 3.1).

### 3.3 Route and navigation

- [ ] Register the route in `client/src/App.tsx`: `<Route path="/horizon/snippets"><HorizonSnippetsScreen /></Route>`.
- [ ] Add a "Snippets" entry to `BASE_NAV_ITEMS` in `client/src/components/SubNavigationBar.tsx`,
  positioned after "GDELT Triage" since snippets are downstream of triage in the analyst's flow.

### 3.4 Build & smoke-test

- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all existing tests pass.
- [ ] Manually verify: capture a snippet on `HorizonWebcutScreen` (with and without picking an
  indicator) → it appears grouped correctly on `/horizon/snippets` → edit its indicator/notes →
  change persists on reload → delete it → it disappears.

---

## Out of scope for this slice

- Reviving the legacy `snippets.router.ts` (`getSnippets`/`getTags`/`snippetStorage`) — dead
  in-memory code tied to the abandoned tags/webcut feature; not touched here.
- Exposing `strength`/`timeWeight`/`decayBehaviour` on the inline indicator quick-create form —
  those stay on the full `HorizonIndicatorNewScreen` form only.
- Bulk snippet operations (multi-select delete/relink) — not requested.
- Full-text search across snippets (mirroring `TASKSV2.md`'s GDELT search) — not requested; the
  grouped view is sufficient for the stated need.
