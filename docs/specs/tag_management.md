

# Spec: Managing / Viewing / Consolidating Tags

## Goal

Provide a **single place** to:

1. see all tags used across snippets
2. understand tag usage (counts)
3. **rename/merge** tags to consolidate duplicates (e.g. `js` → `javascript`)
4. optionally delete a tag from all snippets

This should make the app feel more “real” and prevents tag entropy.

## Non-goals (for v1)

* Full-text search across snippet content by tag combos (can come later)
* Tag descriptions, colors, hierarchies
* Auto-synonyms or AI-based tag suggestions

---

## User Stories

* As a user, I can view a list of all tags and how many snippets use each.
* As a user, I can click a tag and see all snippets that contain it.
* As a user, I can rename a tag globally (every snippet updated).
* As a user, I can merge tags (map multiple old tags → one canonical tag).
* As a user, I can remove a tag from all snippets.

---

## Tag Rules

### Normalization (canonical form)

Define one canonical representation everywhere:

* stored as lowercase
* trimmed whitespace
* no leading `#`
* internal spaces convert to `-` (optional, choose now)

  * ex: `"machine learning"` → `"machine-learning"`

**Decision:** treat tags as case-insensitive; store canonical form only.

### Uniqueness

* within a snippet: tags must be unique (set semantics)

---

## UX / Screens

### A) Tags Index Screen (`/tags`)

Layout (dashboard style):

* Header: “Tags”
* Search/filter input: “Search tags…”
* Table/list:

  * Tag name (monospace badge)
  * Count of snippets
  * Actions: Rename, Merge, Delete/Remove
* Sorting:

  * default: count desc
  * optional: alphabetical

Empty state:

* “No tags yet” with CTA to create a snippet.

### B) Tag Detail Screen (`/tags/:tag`)

* Header: `#tagname` + count
* List of snippets filtered by that tag
* (Optional) quick actions: Rename tag, Merge into…

### C) Consolidation Modal(s)

**Rename tag modal**

* Input: new tag name
* Preview: “This will update N snippets”
* Confirm / Cancel

**Merge tags modal**

* “From” tags: multi-select (or allow entering comma-separated tags)
* “Into” tag: single canonical target
* Preview: shows:

  * tags to be removed
  * final tag result
  * affected snippet count
* Confirm / Cancel

**Delete/remove tag modal**

* Removes tag from all snippets (does not delete snippets)
* Confirm phrasing: “Remove tag from N snippets”

---

## Backend / Data Changes

### Current model assumption

Snippets currently store `tags: string[]`.

We’ll support tag management even without a separate Tag table by computing aggregates.

### Option 1 (v1, simplest): compute tags on the fly

* Aggregate tags by scanning all snippets and counting.
* Rename/merge operations update snippets’ tags arrays.

Pros: minimal schema change
Cons: O(n) scan; fine for MVP

### Option 2 (v2): add tags table + join

Not needed for v1.

**Decision for v1:** Option 1.

---

## tRPC API

### `getTags`

Returns all tags with counts.

**Output**

```ts
type TagSummary = { tag: string; count: number };
TagSummary[]
```

### `getSnippetsByTag`

Input: `{ tag: string }` (accepts non-canonical; normalize server-side)
Output: snippet list (same shape as existing list view)

### `renameTag`

Input:

```ts
{ from: string; to: string }
```

Behavior:

* normalize `from` and `to`
* for every snippet containing `from`:

  * remove `from`
  * add `to` (dedupe)
* return affected count (and/or updated tags)

### `mergeTags`

Input:

```ts
{ from: string[]; to: string }
```

Behavior:

* normalize all
* for every snippet:

  * remove any tags in `from`
  * add `to` if any were present
* return affected count

### `deleteTag`

Input:

```ts
{ tag: string }
```

Behavior:

* normalize
* remove tag from every snippet
* return affected count

### Error handling

* if `to` is empty after normalization → validation error
* if `from` tag doesn’t exist → return affected `0` (no-op), show toast “No snippets affected”
* prevent merging a tag into itself (no-op)

---

## Client Implementation Notes

### Routing

* Add `/tags` and `/tags/:tag`

### UI Components

* Use shadcn table/list patterns and badges
* Keep actions in dropdown / icon menu per row
* Toast feedback for each mutation:

  * “Renamed tag in N snippets”
  * “Merged tags in N snippets”
  * “Removed tag from N snippets”

### Cache invalidation

After rename/merge/delete:

* invalidate `getSnippets`
* invalidate `getTags`
* invalidate `getSnippetsByTag` for affected tags

---

## Acceptance Criteria

* `/tags` shows all tags with accurate counts.
* Searching tags filters list client-side (v1).
* Clicking a tag navigates to `/tags/:tag` and lists relevant snippets.
* Rename updates tags everywhere and dedupes per-snippet.
* Merge updates tags everywhere and dedupes per-snippet.
* Delete removes tag everywhere.
* All operations are resilient to mixed case / `#` prefixes / whitespace.
* Unit/integration tests cover normalization + mutation behavior.

---

## Edge Cases

* Renaming `js` → `javascript` when snippet already has `javascript`:

  * result should contain only `javascript` once
* Merging `["js","javascript"]` → `javascript` should not create duplicates
* Tags with commas/spaces entered by user:

  * client should sanitize OR server normalizes and rejects invalid patterns
* Tag not found:

  * no-op with toast

---

## Testing Plan

### Server tests

* normalization helper
* renameTag:

  * affects correct snippets
  * dedupes correctly
* mergeTags:

  * removes multiple tags, adds canonical tag
* deleteTag:

  * removes everywhere

### Client tests

* tags screen renders from mocked `getTags`
* rename flow calls mutation with normalized values
* merge flow calls mutation and invalidates queries

---

## Phased Delivery

**PR1**

* `getTags`, `/tags` UI read-only + search/sort

**PR2**

* `/tags/:tag` + snippet list filtering

**PR3**

* rename/merge/delete modals + mutations + tests

---

If you want, I can also:

* draft the **normalization helper** (shared client/server) so you never get drift
* propose the exact UI layout using your existing shadcn patterns (table + dropdown + dialog)
* scope the PR1 tasks into a punch-list with file paths + component names


