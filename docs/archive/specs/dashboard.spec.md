# Dashboard Screen Spec (Horizon Lite)

**Design target:** Modern developer-tool dashboard (Linear/Vercel/Supabase vibe) – dense-but-readable, quick actions, stat cards, recent activity.

## Route + Purpose

**Route:** `/`

**Goal:** "Command center" that answers in <3 seconds:
- What's going on? (counts + recency)
- What should I do next? (quick actions)
- What did I touch recently? (recent snippets)

## Data Requirements (MVP)

**tRPC queries:**
- `getDashboardSummary`
  ```ts
  {
    snippetCount: number;
    tagCount: number;
    lastUpdatedAt: string | null; // ISO
  }

Array<{
  id: string;
  contentPreview: string;  // first ~120 chars, server-generated
  updatedAt: string;       // ISO
  createdAt: string;       // ISO
  tags: Array<{ label: string; slug: string }>; // or strings if not migrated
}>

```markdown
# Dashboard Screen Spec (Horizon Lite)

**Design target:** Modern developer-tool dashboard (Linear/Vercel/Supabase vibe) – dense-but-readable, quick actions, stat cards, recent activity.

## Route + Purpose

**Route:** `/`

**Goal:** "Command center" that answers in <3 seconds:
- What's going on? (counts + recency)
- What should I do next? (quick actions)
- What did I touch recently? (recent snippets)

## Data Requirements (MVP)

**tRPC queries:**
- `getDashboardSummary`
  ```ts
  {
    snippetCount: number;
    tagCount: number;
    lastUpdatedAt: string | null; // ISO
  }
  ```
- `getRecentSnippets`
  Latest 5 (or 10) by `updatedAt` (fallback `createdAt`):
  ```ts
  Array<{
    id: string;
    contentPreview: string;  // first ~120 chars, server-generated
    updatedAt: string;       // ISO
    createdAt: string;       // ISO
    tags: Array<{ label: string; slug: string }>; // or strings if not migrated
  }>
  ```

If no `updatedAt` yet, use `createdAt` for sorting but keep field for future UI compatibility.

## Layout

**Page shell:**
- Main container: `max-w-7xl mx-auto px-6 lg:px-8 py-6`
- Vertical spacing: `space-y-6` / `gap-6`

**Top bar:**
- Left: **Dashboard** (`text-3xl font-semibold`)
- Right: Primary **New Snippet** button → `/snippets/new`
- Optional: "View all snippets" link/button

## Stat Cards

**Grid:** `grid grid-cols-1 md:grid-cols-3 gap-6`

| Card | Value | Subtext |
|------|--------|---------|
| Snippets | `snippetCount` | "Total snippets" |
| Tags | `tagCount` | "Unique tags" |
| Last updated | relative time ("2h ago", hover for exact) or "—" | - |

**Styling:** `p-4` or `p-6`, clear hierarchy, minimal decoration.

## Quick Actions

Slim row or small card with 2–4 buttons:
- **New Snippet** (primary)
- Browse Snippets
- Manage Tags (→ tags screen)

Reinforces immediate functionality access.

## Recent Snippets

**Title:** "Recent snippets" (`text-xl font-medium`)

**Render:** Table (desktop), stacked list (mobile)

**Columns/Row:**
- Content preview (monospace optional for dev-tool feel)
- Tags (pills, clickable → `/?tag=slug`)
- `updatedAt` (relative)

**Actions:** Row click → `/snippets/:id` (detail/edit)

**Empty state:** "No snippets yet" + "Create your first" CTA

**Loading:** Skeletons (cards + 5 rows)

## UX Rules

- One screen, no modals (v1)
- Parallel query loading
- Partial rendering: cards independent, list after
- Tag clicks: `/?tag=slug` (use Wouter `useSearch`)

## Acceptance Criteria

- `/` shows title + "New Snippet"
- Stats: snippet/tag count, last updated
- Recent: 5 items (preview/tags/timestamp)
- Snippet click → detail/edit
- Tag pill → filtered view
- Empty/loading states
- Inter/JetBrains fonts, consistent spacing

**Implementation order:**
1. Route + shell + static UI
2. `getDashboardSummary`
3. `getRecentSnippets`
4. Loading/empty
5. Tag links

Start coding – paste your current routes/App.tsx, and I'll provide exact components + tRPC.
```

Copy-paste ready! 🚀


