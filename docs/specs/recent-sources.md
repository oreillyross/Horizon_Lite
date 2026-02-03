# Spec: Recent Sources (Web Trawl → One-click Snippet)

## 1) Summary

Add a **Recent Sources** screen that lists the most recent items discovered by a **web trawl** over a configured set of sources (RSS feeds and/or “known pages” to start). Each item can be **added to Snippets with one click**.

This is step 1 toward agentic capture. Automatic tagging, summarization, dedupe scoring, and multi-agent workflows come later.

## 2) Goals

* Show a list of the **latest items** from configured sources.
* Each item includes: title, source, published time, URL, and a short excerpt/description.
* Provide a **one-click “Add to Snippets”** action.
* Avoid duplicates (basic URL-based dedupe).
* Keep it fast and reliable (no “magic” yet).

## 3) Non-goals

* No automatic tagging (explicitly deferred).
* No LLM summarization or classification in this iteration.
* No “full web crawling of arbitrary sites” (start with RSS / known structured endpoints).
* No user-authored source management UI (sources are config-only for v1).

## 4) UX / UI

### Navigation

* Add a sidebar/nav item: **Recent Sources**

### Layout

Top bar:

* Page title: “Recent Sources”
* Buttons:

  * **Refresh now** (manual fetch)
  * (optional) “Last updated: …”

Main list (like a feed):
Each row shows:

* **Title** (links to original URL; opens new tab)
* Source name + published time (muted)
* Small excerpt (1–2 lines max; truncation)
* Actions:

  * **Add to Snippets**
  * (optional) “Hide” / “Dismiss” (deferred)

### Add to Snippets behavior

On click:

* Create a snippet with content like:

```
<Title>
<URL>

<Excerpt>
```

(Keep it simple; this format is consistent and searchable.)

The button becomes “Added” (disabled) if already captured.

### Empty state

* “No recent items. Hit Refresh.”

### Loading state

* Skeleton rows or “Loading…” (keep minimal)

## 5) Data model

Create a new table: `source_items`

Suggested fields:

* `id` (uuid)
* `sourceKey` (text) — stable identifier (e.g. `ukraine_rss_reuters`)
* `sourceName` (text)
* `title` (text)
* `url` (text, unique) — **dedupe key**
* `publishedAt` (timestamp)
* `excerpt` (text, nullable)
* `raw` (jsonb, nullable) — store original feed payload (useful later)
* `createdAt` (timestamp default now)
* `capturedSnippetId` (text/uuid nullable) — link once saved as snippet
* `capturedAt` (timestamp nullable)

Notes:

* Unique index on `url`
* Query by `publishedAt desc`

## 6) API design (tRPC)

### Queries

1. `getRecentSourceItems`

* Input: `{ limit?: number, cursor?: string }` (optional paging)
* Output: array of items with `captured` boolean

2. `getSourcesStatus` (optional)

* Output: `{ lastRunAt, lastRunResult, counts }`

### Mutations

1. `refreshSources`

* Triggers a fetch run (manual button)
* Returns: `{ inserted: number, updated: number }`

2. `captureSourceItem`

* Input: `{ itemId: string }`
* Behavior:

  * Creates snippet from item (if not already captured)
  * Sets `capturedSnippetId`, `capturedAt`
* Returns: `{ snippetId }`

## 7) Ingestion / “agentic” direction (v1)

### Approach: deterministic fetcher (no LLM yet)

Implement a server-side fetch pipeline:

* Start with **RSS/Atom feeds** (fast, stable).
* Parse: title, link, pubDate, description.
* Upsert by URL.

#### Where it runs

Two triggers:

1. Manual `refreshSources` mutation
2. (Optional) scheduled job later (cron) — not required for v1, but design it so it’s easy.

### Sources configuration

Create a `sources.ts`:

```ts
export type SourceConfig = {
  key: string;
  name: string;
  type: "rss";
  url: string;
};

export const SOURCES: SourceConfig[] = [
  // ...
];
```

## 8) Security / reliability

* Validate URLs (basic sanity; avoid empty or weird schemes)
* Timeouts on fetch (e.g., 8–12s)
* User-agent string for polite fetching
* Log errors per source, continue others

## 9) Tests

### Unit tests

* RSS parsing → normalized item shape
* Dedupe/upsert behavior (same URL doesn’t create duplicates)
* `captureSourceItem`:

  * creates snippet
  * marks as captured
  * second capture is idempotent

### UI tests (Vitest + RTL)

* renders loading / empty / items states
* “Add to Snippets” calls mutation
* item shows “Added” after capture

## 10) Rollout plan

* Merge behind a nav item
* Start with 3–5 sources you care about
* Iterate on:

  * better excerpt extraction
  * dedupe heuristics (title similarity)
  * later: tagging agent + summarizer agent + “importance” scoring agent

---

## Gitflow + Spec-driven workflow (the “right way”)

Here’s a clean repeatable checklist for this feature:

1. **Branch**

* From `develop`:

  * `feature/recent-sources`

2. **Spec first**

* Add `specs/recent-sources.md` (the doc above).
* Commit: `docs: add recent sources spec`

3. **Scaffold**

* DB migration + model + basic endpoints (return mocked data if needed).
* Commit: `feat: scaffold recent sources api`

4. **Ingestion**

* Implement RSS fetcher + upsert.
* Commit: `feat: ingest rss sources into source_items`

5. **UI**

* Add screen + list rendering + refresh + capture.
* Commit: `feat: recent sources screen`

6. **Tests**

* Unit + UI tests.
* Commit: `test: recent sources`

7. **PR to develop**

* Title: `feat: recent sources capture`
* PR checklist:

  * Spec link
  * Screenshots
  * Tests passing
  * Migration notes

8. **Release**

* Merge `develop → main`
* Tag release (e.g., `v0.3.0`)
* Hotfixes: branch from `main` → `hotfix/...` → merge back into both

---

## Implementation nudge (small but important)

To keep this “agentic-ready”, treat ingestion as a **tool**:

* `runSourcesIngestion(sources)` returns a structured result
* Later, an “agent” can decide *when* to run it, *which sources*, and *what to do* with items (tagging, summarizing, linking, etc.) without rewriting your plumbing.

---

If you want, next I can:

* propose the exact **route + component skeleton** for `RecentSourcesScreen`
* draft the **Drizzle schema + migration**
* stub the **tRPC router** with `refreshSources` + `captureSourceItem`
* and outline the **test harness** pattern so it doesn’t devolve into mocking hell again 😄
