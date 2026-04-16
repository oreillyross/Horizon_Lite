That’s *very* cool — and it’s also one of the cleanest ways to add “LLM magic” without making Horizon feel random.

You’re basically inventing **living dossiers**: a Theme is a container with a continuously refreshed narrative built from your evolving evidence (snippets). That’s a legit product mechanic.

Below is a strong “build on what you suggest” plan: DB + API + UI + LLM refresh strategy.

(And it fits your current “dense dev-tool UI” vibe. )

---

## 1) Data model

### Tables

**themes**

* `id` (uuid)
* `name` (text, unique-ish)
* `description` (text, optional — this is your *human* framing)
* **LLM-generated fields** (recommended)

  * `synopsis` (text) ← generated narrative
  * `synopsisUpdatedAt` (timestamp)
  * `synopsisModel` (text) (optional but helpful for debugging)
  * `synopsisVersion` (int) (optional)

**snippets**

* add `themeId` nullable FK → themes.id
* constraint: many snippets can share a theme, but each snippet has **at most one** theme (that’s naturally enforced by a single nullable FK)

### Drizzle schema sketch

```ts
// shared/schema.ts (or wherever you define drizzle tables)
import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";

export const themes = pgTable("themes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  synopsis: text("synopsis"),
  synopsisUpdatedAt: timestamp("synopsis_updated_at", { withTimezone: true }),
  synopsisModel: text("synopsis_model"),
  synopsisVersion: integer("synopsis_version").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// snippets table: add this column
themeId: uuid("theme_id").references(() => themes.id, { onDelete: "set null" }),
```

Also consider an index on `snippets.theme_id` for fast grouping.

---

## 2) Core UX (minimal but powerful)

### Theme screen

* Table of themes: name, snippet count, synopsisUpdatedAt
* Clicking a theme shows:

  * description (human)
  * synopsis (LLM)
  * list of snippets in theme (existing SnippetTable filtered)

### Snippet create/edit

* Add a simple Theme selector (dropdown)
* Allow “no theme”

### Extra: “Unassigned” view

* A filter for snippets with `themeId IS NULL`

This keeps it “developer tool” efficient: compact rows, strong grouping, no fluff. 

---

## 3) The LLM feature: “Refresh synopsis”

### The key design choice

Don’t “feed all snippets forever” blindly. Themes can grow. You want:

* **Deterministic inputs**
* **Cost control**
* **Reproducibility**
* **Citations/backlinks**

### Best practice approach

Generate synopsis from **structured excerpts** + **small context**:

1. Build a “theme corpus” as:

   * snippets ordered by recency
   * each snippet as:

     * id
     * createdAt
     * tags
     * content (possibly truncated)
2. Ask LLM to produce:

   * synopsis (1–3 paragraphs)
   * bullet “key points”
   * “open questions”
   * optionally: “timeline highlights”
   * and **cite snippet ids** per point

That last part is huge: it makes the synopsis auditable and trustworthy.

### Prompt shape (server-side)

* System: “You are an analyst… only use provided snippets… cite snippet ids…”
* User: theme name + description + snippet list

Output as JSON so you can render cleanly.

---

## 4) Refresh logic (how to make it feel “alive”)

### Option A (simple + good): manual refresh button

* Button: **Refresh synopsis**
* Runs mutation: `trpc.refreshThemeSynopsis({ themeId })`
* UI shows spinner, then updated synopsis + updatedAt

This is the easiest “wow” moment.

### Option B (next step): auto-refresh when theme changes

Whenever a snippet is created/updated/deleted and its theme changed:

* mark theme “dirty”
* refresh later (debounced or scheduled)

You can implement “dirty” with:

* `themes.synopsisVersion` increment on changes, and store which version synopsis was computed from.

**Why this matters:** avoids refreshing 12 times while you’re editing tags/snippets.

---

## 5) tRPC routes you’ll want

**Theme CRUD**

* `getThemes()` → with snippet counts
* `getThemeById(id)` → includes synopsis + list of snippets (or fetch snippets separately)
* `createTheme({name, description})`
* `updateTheme({id, name, description})`
* `deleteTheme({id})`

**Theme synopsis**

* `refreshThemeSynopsis({ themeId })` → calls LLM, stores `synopsis`, sets `synopsisUpdatedAt`, sets `synopsisModel`, increments or stamps version.

**Snippets**

* `updateSnippet` / `createSnippet` accept optional `themeId`

---

## 6) A pragmatic “LLM scaling” plan

If themes get large:

* cap snippet content per item (e.g. 800 chars)
* cap number of snippets (e.g. last 100) *or*
* do a 2-stage summary:

  1. summarize each snippet into 1–2 sentences stored as `snippet.summary`
  2. theme synopsis uses those summaries + only pulls full content for “top N” important ones

That keeps token usage stable as your knowledgebase grows.

---

## 7) The really fun part: “interpretation drift”

Your exact idea (synopsis changes as evidence changes) is the feature.

To make it *feel intentional*:

* show `synopsisUpdatedAt`
* optionally store `synopsisHistory` (separate table) so you can “rewind” how your interpretation evolved over time

That turns Horizon into a **living narrative tracker**.

---

If you want, I can jump straight into implementation with you in the repo order that keeps momentum:

1. migration + drizzle schema for `themes` + `snippets.themeId`
2. tRPC routes (themes + refresh synopsis stub)
3. Theme UI screen + snippet theme selector
4. Wire refresh button (LLM call)

Say “start with db” or “start with UI” and I’ll write the exact files/patches.
