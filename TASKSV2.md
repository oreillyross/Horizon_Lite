# TASKSV2 — GDELT Triage Search: Vertical Slice

> Work through subtasks **one at a time**. Mark each `- [x]` when complete, commit, then stop and report.
> Never skip ahead or batch subtasks unless the user explicitly says so.

---

## Context & Goals

The GDELT triage screen (`/horizon/gdelt/triage`, `HorizonGdeltTriageScreen.tsx`) shows analysts
a paginated stream of ingested articles in "new" status. Two features are needed:

1. **Full-text search bar** — analyst types a term (e.g. "Elon Musk", "China", "sanctions"); the
   list filters in real-time against article titles, actor names, geo fields, theme tags, and
   organisation names stored in `gdelt_events` and `gdelt_documents`.

2. **Saved-search pills** — searches the analyst has pinned persist across sessions as clickable
   pills below the search bar. One click restores the query. An ✕ removes the pill. Full keyboard
   support throughout.

No new npm packages. No schema migrations. No REST routes. One canonical approach per concern.

---

## Phase 1 — Backend: extend the `list` procedure with full-text search

### 1.1 Add optional `q` input to `horizon.gdelt.list`

- [ ] Open `server/routers/gdelt.router.ts` and locate the `list` procedure.
- [ ] Add an optional `q: z.string().trim().max(200).optional()` field to the existing input schema.
- [ ] When `q` is present and non-empty, build a PostgreSQL full-text search condition using
  `sql<boolean>` (Drizzle raw SQL helper). The search must cover:
  - `gdelt_events.title` — the analyst-visible headline stored on the event row
  - `gdelt_documents.title` — the highest-confidence article title fetched via the existing
    LEFT JOIN LATERAL (alias `d`)
  - `gdelt_events.actor1_name`, `gdelt_events.actor2_name`
  - `gdelt_events.action_geo_fullname`, `gdelt_events.action_geo_country_code`
  - A text array contains check on `gdelt_documents.themes` and
    `gdelt_documents.organizations` (join `gdelt_documents` to the lateral alias `d`)
- [ ] Use `to_tsvector('english', coalesce(...))` + `plainto_tsquery('english', $query)` for
  relevance-aware matching. Fall back to `ILIKE '%term%'` only for the array columns where
  `unnest`/`array_to_string` is simpler.
- [ ] Apply the condition with `AND` so it composes cleanly with the existing status filter and
  cursor pagination.
- [ ] **Do not** change the procedure's return shape — only the WHERE clause is affected.
- [ ] Run `npm run build` (server only — TypeScript must compile cleanly) before marking done.

### 1.2 Add `countNew` awareness of the `q` filter

- [ ] Locate the `countNew` procedure in `server/routers/gdelt.router.ts`.
- [ ] Add the same optional `q` field so the floating status bar count stays consistent with the
  filtered view.
- [ ] Use the same full-text condition helper extracted in 1.1 (extract it as an internal function
  or `const` — do not duplicate the SQL).
- [ ] Confirm TypeScript compiles.

---

## Phase 2 — UI: search bar component

> Design principles: match the existing dark-mode palette, use semantic colour tokens
> (`bg-background`, `text-foreground`, `border-border`), compose with `cn()`, use shadcn/ui
> primitives where they exist.

### 2.1 Create `GdeltSearchBar` component

- [ ] Create `client/src/components/GdeltSearchBar.tsx`.
- [ ] Props interface:
  ```ts
  interface GdeltSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
    className?: string;
  }
  ```
- [ ] Render a `<div role="search">` wrapper containing:
  - A `<label htmlFor="gdelt-search" className="sr-only">Search articles</label>` (visually
    hidden but read by screen readers).
  - A shadcn/ui `<Input>` with `id="gdelt-search"`, `type="search"`,
    `placeholder="Search titles, actors, countries…"`, and `aria-label` omitted (label covers it).
  - A clear button (shadcn/ui `<Button variant="ghost" size="icon">`) that renders only when
    `value.length > 0`; it must have `aria-label="Clear search"` and `type="button"`.
- [ ] The `<Input>` calls `onChange` on every keystroke. Debouncing happens in the parent.
- [ ] The clear button calls both `onClear` and focuses the input (`useRef`) so keyboard users
  stay in context.
- [ ] Keyboard: pressing `Escape` inside the input calls `onClear` and clears focus from the
  button (standard search-widget pattern).
- [ ] No state inside the component — fully controlled.

### 2.2 Wire `GdeltSearchBar` into `HorizonGdeltTriageScreen`

- [ ] Open `client/src/pages/HorizonGdeltTriageScreen.tsx`.
- [ ] Add state: `const [rawQuery, setRawQuery] = useState('')`.
- [ ] Derive debounced value: use the existing `useDebounce` hook if one exists in the codebase,
  otherwise implement a `useMemo`+`useEffect` debounce of 350 ms (matching `IntelEventsPage`
  pattern). Store as `const query = useDebouncedValue(rawQuery, 350)`.
- [ ] Pass `q: query || undefined` into the `trpc.horizon.gdelt.list` call for the **"new"**
  infinite query. Do not pass `q` to the "flagged" query — flagged items are a separate read pane.
- [ ] Pass `q: query || undefined` to `trpc.horizon.gdelt.countNew` so the badge stays accurate.
- [ ] Place `<GdeltSearchBar>` immediately below the "GDELT Triage" page heading and above the
  tab strip / section dividers. Use `mt-4 mb-2` spacing consistent with the rest of the screen.
- [ ] When `query` changes, reset the infinite query cursor by calling
  `newQuery.remove()` then `newQuery.fetchNextPage()` — or simply ensure the tRPC infinite query
  key includes `q` so React Query auto-resets. Verify no stale pages appear.
- [ ] Visually: full-width on mobile, capped at `max-w-xl` on wider viewports (left-aligned, not
  centred).

---

## Phase 3 — Saved searches: persistence & pill UI

> Saved searches are stored in `localStorage` under the key `"gdelt:saved-searches"` as a JSON
> array of strings (max 10, newest first). No database changes, no tRPC procedures.

### 3.1 Create `useSavedSearches` hook

- [ ] Create `client/src/hooks/useSavedSearches.ts`.
- [ ] The hook manages `string[]` state backed by `localStorage`:
  ```ts
  function useSavedSearches(): {
    saved: string[];
    save: (term: string) => void;
    remove: (term: string) => void;
  }
  ```
- [ ] `save(term)` — trims, lowercases for dedup check, prepends to array, deduplicates (case-
  insensitive), caps at 10 entries, writes back to localStorage.
- [ ] `remove(term)` — filters the term out, writes back.
- [ ] Initialise from localStorage on mount. Handle JSON parse errors gracefully (reset to `[]`).
- [ ] No external dependencies — plain `useState` + `useEffect`.

### 3.2 Create `SavedSearchPills` component

- [ ] Create `client/src/components/SavedSearchPills.tsx`.
- [ ] Props:
  ```ts
  interface SavedSearchPillsProps {
    pills: string[];
    activeQuery: string;
    onSelect: (term: string) => void;
    onRemove: (term: string) => void;
  }
  ```
- [ ] Renders a `<div role="list" aria-label="Saved searches">` (or `<ul>`).
- [ ] Each pill is a `<div role="listitem">` (or `<li>`) containing:
  - A trigger `<button>` that applies the search on click and on `Enter`/`Space` keydown.
    - `aria-pressed={activeQuery === pill}` to indicate active state.
    - Visually uses accent/muted colours from the design system. Active pill gets a distinct
      background (e.g. `bg-accent text-accent-foreground`).
  - An ✕ `<button>` with `aria-label={\`Remove saved search: \${pill}\`}` that calls `onRemove`.
    - Must be separately focusable and activatable via `Enter`/`Space`.
    - On remove, focus moves to the next pill or, if none remain, to the search input.
- [ ] The two buttons inside each pill must not be nested (keep them siblings inside the listitem
  wrapper — a `<div>` with `role="group"` and `aria-label={pill}` works well).
- [ ] When the pill list is empty, render nothing (no empty state UI needed).
- [ ] Keyboard traversal: standard tab order. Do not implement arrow-key roving tabindex unless
  the pill count commonly exceeds 5 — the saved cap is 10, tab is sufficient.

### 3.3 Wire `useSavedSearches` and `SavedSearchPills` into `HorizonGdeltTriageScreen`

- [ ] In `HorizonGdeltTriageScreen.tsx`, call `useSavedSearches()`.
- [ ] Add a "Save search" trigger: a small `<Button variant="ghost" size="sm">` icon next to the
  `GdeltSearchBar`, visible only when `query.length >= 2`. Tooltip text: "Save this search".
  On click, call `save(query)`.
  - Use a bookmark or pin icon from `lucide-react` (already available in the project).
  - `aria-label="Save this search"`.
- [ ] Render `<SavedSearchPills>` immediately below `<GdeltSearchBar>` (and the save button row).
  When a pill is selected, set `rawQuery` to the pill's term (the debounce will trigger the query
  update automatically).
- [ ] When the clear button in `GdeltSearchBar` is used, `rawQuery` becomes `''` — the active
  pill highlight should disappear (controlled by `activeQuery === pill` comparison).

---

## Phase 4 — Accessibility audit & keyboard smoke-test

### 4.1 Focus-trap and skip-link check

- [ ] Verify that pressing `Tab` from the page header reaches the search bar first, then the save
  button (when visible), then the pill list, then the article list entries.
- [ ] Verify that pressing `Escape` inside the search input clears the query and returns focus to
  the input (not lost into the void).
- [ ] Verify that the ✕ button on each pill is reachable by Tab and activatable by Enter/Space.
- [ ] Verify that removing the last pill shifts focus to the search input (implemented in 3.2).
- [ ] Fix any tab-order or focus-loss issues found.

### 4.2 ARIA live region for result count

- [ ] Below the search bar (but above pills), add a visually hidden live region:
  ```tsx
  <p aria-live="polite" aria-atomic="true" className="sr-only">
    {query && !isLoading
      ? `${totalCount ?? 0} articles found for "${query}"`
      : null}
  </p>
  ```
  where `totalCount` is derived from the first page's total if the backend returns it, or omitted
  if the count is not available without an extra query.
- [ ] If the `list` procedure does not currently return a total count, skip the count text and
  just announce `"Showing results for ${query}"` when the query is non-empty and not loading.
- [ ] Do not add a separate tRPC call just for this announcement.

### 4.3 Final build & type check

- [ ] Run `npm run build` — zero TypeScript errors, zero new ESLint warnings.
- [ ] Run `npm test` — all existing tests pass. No new tests are required for this slice unless a
  test for `useSavedSearches` is trivial to add (it is a pure hook; a Vitest unit test is welcome
  but not mandatory).

---

## Out of scope for this slice

The following are explicitly deferred:

- Server-side pgvector / embedding-based semantic search (would require a schema migration and new
  infrastructure; ILIKE + `to_tsvector` covers the stated use case)
- Search history stored per-user in the database (localStorage is sufficient; avoids auth
  complexity and schema changes)
- Searching across the "flagged" pane (analysts triage "new"; flagged items are already curated)
- Any change to the `gdelt_event_mentions` or `gdelt_documents` tables
- Autocomplete / type-ahead suggestions
