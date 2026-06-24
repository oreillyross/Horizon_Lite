# TASKSV4 — Horizon UX Improvements

Seven UX observations turned into focused subtasks. Work through them one at a time.

---

## Task 1 — Snippets: Remove source hyperlink from each card
**File:** `client/src/pages/HorizonSnippetsScreen.tsx`
- [x] Delete the `<a>` anchor element that renders the "Source" external link inside `SnippetCard`.
      Keep the `sourceUrl` field in the data type — it may be used elsewhere — just remove the rendered link.

---

## Task 2 — Snippets: Rename page header to "Information Snippets"
**File:** `client/src/pages/HorizonSnippetsScreen.tsx`
- [x] Change the breadcrumb label from `"Snippets"` → `"Information Snippets"`.
- [x] Change the `<div>` page title from `"Snippets"` → `"Information Snippets"`.
- [x] Change the subtitle description to match the new name if needed.

---

## Task 3 — Snippets: Make snippet quote a hyperlink to a read-only detail page
**Files:**
- `client/src/pages/HorizonSnippetsScreen.tsx`
- `client/src/pages/HorizonSnippetDetailScreen.tsx` ← new file
- `client/src/App.tsx`

- [x] Create `HorizonSnippetDetailScreen.tsx`: a read-only page at `/horizon/snippets/:id` that fetches and displays the full snippet (quote, source URL if present, analyst notes, linked indicator, date). Use the existing `horizon.snippets.list` query or add a `getById` procedure if needed.
- [x] Add a `getById` procedure to `horizonSnippets.router.ts` that returns a single snippet by id (with indicator name joined).
- [x] Register the route `/horizon/snippets/:id` in `client/src/App.tsx`.
- [x] In `SnippetCard`, wrap the blockquote text in a `<Link>` pointing to `/horizon/snippets/${snippet.id}` instead of rendering it as plain text.
- [x] Add a unit test for the new detail screen in `client/src/pages/HorizonSnippetDetailScreen.test.tsx`.

---

## Task 4 — Scenarios: Group the list by theme
**File:** `client/src/pages/HorizonScenariosListScreen.tsx`
- [x] Client-side: group the `rows` array by `themeName` (null/undefined → "Unassigned").
- [x] Render each theme group with a section heading above its scenario rows.
- [x] Preserve the existing table structure inside each group section.
- [x] Scenarios with no theme go into a final "Unassigned" group at the bottom.

---

## Task 5 — Scenarios: Replace Theme column with Indicator Count + drill-down link
**File:** `client/src/pages/HorizonScenariosListScreen.tsx`
- [x] Remove the "Theme" `<th>` / `<td>` cells (theme is now shown as the section heading from Task 4).
- [x] Add an "Indicators" column showing `scenario.indicatorCount`.
- [x] Render the count as a `<Link>` to `/horizon/scenarios/${scenario.id}` (the detail page already shows linked indicators at the bottom — the `#indicators` hash is optional but desirable if the anchor exists).
- [x] Show `—` when count is 0 (no link needed in that case).

---

## Task 6 — Snippets: Fix indicator dropdown to show scenario-linked indicators
**File:** `client/src/pages/HorizonSnippetsScreen.tsx`

The inline edit row and the "Add Snippet" dialog both call `trpc.horizon.signals.listIndicators`, which only returns indicators that are already joined through `scenarioIndicatorMap`. If none exist yet (or if the group's scenarios have no indicator links), the dropdown shows empty.

- [x] In `SnippetEditRow` and `AddSnippetDialog`, replace the `listIndicators` query with `trpc.horizon.signals.searchIndicators.useQuery({ q: "" })` so the full indicator pool (all indicators accessible to the group) is shown.
- [x] Because `searchIndicators` returns `{ id, name, category, strength }` (no `indicatorName` field on snippet), verify the `SelectItem` label still renders correctly — it uses `ind.name` which is present in both schemas.
- [x] Remove the `indicatorsQuery.isLoading` / `indicators.length === 0` placeholder text changes if they become redundant.

---

## Task 7 — Tests: Add E2E smoke test for snippet detail navigation
**File:** `e2e/` (Playwright)
- [ ] Add a Playwright test that:
  1. Logs in as a test user.
  2. Navigates to `/horizon/snippets`.
  3. Clicks the first snippet's quote link.
  4. Asserts the detail page URL matches `/horizon/snippets/:id`.
  5. Asserts key content (quote text) is visible on the detail page.
