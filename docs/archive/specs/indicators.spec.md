# Spec: Indicators CRUD + Scenario Linking (Horizon Lite)

**Status:** Draft  
**Priority:** High (foundational for threat monitoring workflow)  
**Multi-tenant:** Yes, scoped by `analystGroupId`  
**Depends on:** scenarios.spec.md (Slice 1)

---

## Goals

- Add `analystGroupId` to the existing `indicators` table and implement full **CRUD** for indicators, scoped to analyst group.
- Replace the hardcoded stub data in `signalsRouter` with real DB-backed queries.
- Implement **Scenario–Indicator linking** via `scenario_indicator_links` join table, with a 1–9 integer strength weight.
- Update the existing **Signals list screen** (`/horizon/signals`) and **Indicator detail screen** (`/horizon/signals/:id`) to use real data.
- Keep UI dense and developer-tool-like (Linear/Vercel vibe), consistent with the Scenarios slice.

---

## Non-goals (for Slice 2)

- Automated threshold triggering / status transitions (driven by ingestion pipeline — future).
- Trend/time-series chart (placeholder exists in detail screen; real chart in v1.1).
- Evidence linking to indicators (GDELT ingestion layer — separate slice).
- Bulk import of indicators from CSV or external source.
- Indicator versioning / audit history.

---

## User Stories

1. As an analyst, I can **create a new indicator** with name, category, description, thresholds, and region scope.
2. As an analyst, I can **view all indicators** in my analyst group (the Signals screen).
3. As an analyst, I can **view a single indicator's detail**, edit it, and delete it.
4. As an analyst, I can **filter indicators** by status and category.
5. As an analyst, I can **link an indicator to one or more scenarios** with a 1–9 strength weight.
6. As an analyst, I can **unlink an indicator** from a scenario.
7. As an analyst, I can see **which scenarios** an indicator is mapped to (and vice versa).
8. As an analyst, I only see indicators in **my analyst group** (multi-tenant safety).

---

## Data Model

### Schema changes

#### 1. Migrate `indicators` table

The existing `indicators` table uses `text("id")` (not uuid) and has no `analystGroupId`. We add the group column and migrate the `id` to uuid.

```ts
// shared/db/tables/indicators.ts  (replace existing)

import { doublePrecision, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { analystGroups } from "./analysGroups";

export const indicators = pgTable(
  "indicators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analystGroupId: uuid("analyst_group_id")
      .notNull()
      .references(() => analystGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category", {
      enum: ["infoops", "political", "infra", "diplomatic"],
    }).notNull(),
    regionScope: text("region_scope").default("EU-wide").notNull(),
    description: text("description"),
    currentValue: doublePrecision("current_value").default(0).notNull(),
    baselineValue: doublePrecision("baseline_value").default(0).notNull(),
    accelerationScore: doublePrecision("acceleration_score").default(0).notNull(),
    thresholdWatch: doublePrecision("threshold_watch").default(1.5).notNull(),
    thresholdTrigger: doublePrecision("threshold_trigger").default(2.5).notNull(),
    status: text("status", { enum: ["normal", "watching", "triggered"] })
      .default("normal")
      .notNull(),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    groupIdx: index("indicators_group_id_idx").on(t.analystGroupId),
    statusIdx: index("indicators_status_idx").on(t.status),
  }),
);

export type IndicatorRow = typeof indicators.$inferSelect;
```

#### 2. Replace `scenario_indicator_map` with `scenario_indicator_links`

The existing `scenarioIndicatorMap` table uses `text` IDs and a `doublePrecision` weight. Replace with uuid FKs and a 1–9 integer strength.

```ts
// shared/db/tables/scenarioIndicatorLinks.ts  (new file, replaces scenarioIndicatorMap.ts)

import { integer, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { scenarios } from "./scenarios";
import { indicators } from "./indicators";

export const scenarioIndicatorLinks = pgTable(
  "scenario_indicator_links",
  {
    scenarioId: uuid("scenario_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),
    indicatorId: uuid("indicator_id")
      .notNull()
      .references(() => indicators.id, { onDelete: "cascade" }),
    strength: integer("strength").notNull().default(5),
    // 1 = weakly suggestive, 5 = moderate, 9 = near-definitive
  },
  (t) => ({
    pk: primaryKey({ columns: [t.scenarioId, t.indicatorId] }),
  }),
);

export type ScenarioIndicatorLinkRow = typeof scenarioIndicatorLinks.$inferSelect;
```

**Strength scale (1–9):**

| Value | Label |
|-------|-------|
| 1–2 | Weakly suggestive |
| 3–4 | Corroborating |
| 5–6 | Moderate |
| 7–8 | Strong |
| 9 | Near-definitive |

### Migration

```sql
-- 0016_indicators_and_links.sql

-- Step 1: drop old scenario_indicator_map
DROP TABLE IF EXISTS "scenario_indicator_map";
--> statement-breakpoint

-- Step 2: rebuild indicators table with uuid PK and analystGroupId
DROP TABLE IF EXISTS "indicators";
--> statement-breakpoint

CREATE TABLE "indicators" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "analyst_group_id" uuid NOT NULL REFERENCES "analyst_groups"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "region_scope" text NOT NULL DEFAULT 'EU-wide',
  "description" text,
  "current_value" double precision NOT NULL DEFAULT 0,
  "baseline_value" double precision NOT NULL DEFAULT 0,
  "acceleration_score" double precision NOT NULL DEFAULT 0,
  "threshold_watch" double precision NOT NULL DEFAULT 1.5,
  "threshold_trigger" double precision NOT NULL DEFAULT 2.5,
  "status" text NOT NULL DEFAULT 'normal',
  "last_triggered_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX "indicators_group_id_idx" ON "indicators"("analyst_group_id");
--> statement-breakpoint
CREATE INDEX "indicators_status_idx" ON "indicators"("status");
--> statement-breakpoint

-- Step 3: create scenario_indicator_links join table
CREATE TABLE "scenario_indicator_links" (
  "scenario_id" uuid NOT NULL REFERENCES "scenarios"("id") ON DELETE CASCADE,
  "indicator_id" uuid NOT NULL REFERENCES "indicators"("id") ON DELETE CASCADE,
  "strength" integer NOT NULL DEFAULT 5,
  PRIMARY KEY ("scenario_id", "indicator_id")
);
```

### Notes

- `indicators` is now fully multi-tenant via `analystGroupId`.
- Old `scenario_indicator_map` (text IDs, float weight) is dropped — it was never populated from real DB data.
- `strength` is integer 1–9 (not a float weight). The decimal weight used in the existing stubs was never persisted; this replaces it.
- Cascading deletes: removing a scenario or indicator automatically cleans up its links.

---

## tRPC API Spec

All routes live under `horizon.signals` (keeping the existing router namespace) and require `ctx.user` (auth middleware). All routes filter by `analystGroupId = ctx.user.analystGroupId`.

### Router: `signals` (extend existing)

---

#### `listIndicators({ status?, category?, q? })`

**Input:** (same as existing stub, no changes)
```ts
{
  status?: "normal" | "watching" | "triggered";
  category?: "infoops" | "political" | "infra" | "diplomatic";
  q?: string; // name search
}
```

**Output:**
```ts
Array<{
  id: string;
  name: string;
  category: string;
  regionScope: string;
  status: "normal" | "watching" | "triggered";
  currentValue: number;
  baselineValue: number;
  accelerationScore: number;
  lastTriggeredAt: string | null;
  linkedScenarioCount: number; // count of scenario_indicator_links rows
}>
```

**Behavior:**
- Returns all indicators for group, filtered by optional `status`, `category`, `q` (ILIKE name search).
- Sorted by `accelerationScore desc` by default.
- Includes `linkedScenarioCount` via subquery/join (no N+1).

---

#### `getIndicator({ indicatorId })`

**Input:**
```ts
{ indicatorId: string }
```

**Output:**
```ts
{
  indicator: IndicatorRow;
  linkedScenarios: Array<{
    scenarioId: string;
    scenarioName: string;
    strength: number;
  }>;
  trend: []; // stub — populated by ingestion pipeline later
  triggerHistory: []; // stub
  linkedEvidence: []; // stub
}
```

**Behavior:**
- Verify `analystGroupId` match.
- Fetch indicator + its linked scenarios (JOIN `scenario_indicator_links` → `scenarios`).
- Return stubs for trend/triggerHistory/linkedEvidence (keep existing screen sections intact).

---

#### `createIndicator({ name, category, regionScope?, description?, thresholdWatch?, thresholdTrigger? })`

**Input:**
```ts
{
  name: string;           // 1–120 chars, required
  category: "infoops" | "political" | "infra" | "diplomatic";
  regionScope?: string;   // default "EU-wide", max 80 chars
  description?: string;   // max 2000 chars
  thresholdWatch?: number;   // default 1.5, min 0
  thresholdTrigger?: number; // default 2.5, must be > thresholdWatch
}
```

**Output:** `IndicatorRow`

**Behavior:**
- Validate: `thresholdTrigger > thresholdWatch`.
- Create with `status = "normal"`, `currentValue = 0`, `baselineValue = 0`, `accelerationScore = 0`.
- `analystGroupId` set from `ctx.user.analystGroupId`.

---

#### `updateIndicator({ id, ...fields })`

**Input:**
```ts
{
  id: string;
  name?: string;
  category?: "infoops" | "political" | "infra" | "diplomatic";
  regionScope?: string;
  description?: string;
  thresholdWatch?: number;
  thresholdTrigger?: number;
  status?: "normal" | "watching" | "triggered"; // manual override allowed
}
```

**Output:** `IndicatorRow`

**Behavior:**
- Verify group access.
- Update only provided fields + set `updatedAt = now()`.
- If both `thresholdWatch` and `thresholdTrigger` provided, validate trigger > watch.

---

#### `deleteIndicator({ id })`

**Input:** `{ id: string }`

**Output:** `{ success: boolean; id: string }`

**Behavior:**
- Verify group access.
- Delete indicator (cascades to `scenario_indicator_links`).
- Return success.

---

#### `linkIndicatorToScenario({ scenarioId, indicatorId, strength })`

**Input:**
```ts
{
  scenarioId: string;
  indicatorId: string;
  strength: number; // integer 1–9
}
```

**Output:** `{ scenarioId: string; indicatorId: string; strength: number }`

**Behavior:**
- Verify both `scenarioId` and `indicatorId` belong to `ctx.user.analystGroupId`.
- Upsert link (insert or update strength if already exists).
- Return the link row.

---

#### `unlinkIndicatorFromScenario({ scenarioId, indicatorId })`

**Input:**
```ts
{ scenarioId: string; indicatorId: string }
```

**Output:** `{ success: boolean }`

**Behavior:**
- Verify group access on both sides.
- Delete the link row.
- If not found → still return success (idempotent).

---

## Frontend Spec

### Routes (existing — no new routes needed)

- `/horizon/signals` — indicator list (already exists, replace stub data)
- `/horizon/signals/:id` — indicator detail + edit (already exists, replace stub data)
- `/horizon/signals/new` — **NEW** create form (add this route)

### UI/UX

**Design target:** Dense, developer-tool dashboard (Linear/Vercel). Consistent with Scenarios screens.

---

#### `/horizon/signals` — Indicator List (update existing)

**Changes to existing `HorizonSignalsScreen`:**
- Wire `listIndicators` to real DB instead of stubs.
- Replace "Mapped Scenarios" column (shows raw IDs) with `linkedScenarioCount` badge.
- Add **"New Indicator"** button (top-right, primary).
- Add **actions menu (⋮)** per row: Edit → `/horizon/signals/:id`, Delete with confirmation.
- Filter controls (search, category, status) already exist — keep as-is.

**Column changes:**

| Before | After |
|--------|-------|
| Mapped Scenarios (raw IDs) | Scenarios (count badge) |
| — | Actions (⋮) |

---

#### `/horizon/signals/new` — Create Indicator (new page)

**Form:**

```
┌─────────────────────────────────────────────────────┐
│  ← Signals    New Indicator                         │
├─────────────────────────────────────────────────────┤
│ Name*                                               │
│ [Cross-language amplification             ]         │
│                                                     │
│ Category*          Region Scope                     │
│ [infoops     ▼]    [EU-wide          ]              │
│                                                     │
│ Description                                         │
│ [What does this indicator measure...              ] │
│                                                     │
│ Thresholds                                          │
│ Watch  [1.5]    Trigger  [2.5]                      │
│ (Trigger must be > Watch)                           │
│                                                     │
│              [Cancel]   [Create Indicator]          │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- On success: redirect to `/horizon/signals/:id`.
- On error: show toast, keep form intact.
- Cancel: return to `/horizon/signals`.

---

#### `/horizon/signals/:id` — Indicator Detail / Edit (update existing)

**Changes to existing `HorizonIndicatorDetailScreen`:**
- Wire `getIndicator` to real DB.
- Add **inline edit form** for all editable fields (same pattern as scenario detail screen).
- Add **Delete** button with confirmation dialog.
- Replace "Scenario impact" section with real linked scenario list from DB + **"Link Scenario"** UI.
- Keep Trend, Trigger History, Linked Evidence sections as stubs (existing empty-state boxes are fine).

**Scenario Linking panel:**

```
┌─────────────────────────────────────────────────────┐
│ Linked Scenarios                   [+ Link Scenario] │
├─────────────────────────────────────────────────────┤
│ Hybrid Warfare Campaign    Strength: [7]  [Unlink]  │
│ Supply Chain Breach        Strength: [5]  [Unlink]  │
│                                                     │
│ (empty state: "No scenarios linked yet.")           │
└─────────────────────────────────────────────────────┘
```

**"Link Scenario" flow:**
- Inline form below the list: scenario dropdown (from `trpc.horizon.scenarios.list`) + strength selector (1–9) + "Link" button.
- On submit: calls `linkIndicatorToScenario`; invalidates `getIndicator` query.
- Strength displayed as integer (1–9) with label hint.

---

### State Management

```tsx
// List
const useIndicators = (filters) => trpc.horizon.signals.listIndicators.useQuery(filters);

// Detail
const useIndicator = (id: string) =>
  trpc.horizon.signals.getIndicator.useQuery({ indicatorId: id }, { enabled: !!id });

// Create
const useCreateIndicator = () => {
  const utils = trpc.useUtils();
  return trpc.horizon.signals.createIndicator.useMutation({
    onSuccess: () => utils.horizon.signals.listIndicators.invalidate(),
  });
};

// Update
const useUpdateIndicator = () => {
  const utils = trpc.useUtils();
  return trpc.horizon.signals.updateIndicator.useMutation({
    onSuccess: (data) => {
      utils.horizon.signals.listIndicators.invalidate();
      utils.horizon.signals.getIndicator.invalidate({ indicatorId: data.id });
    },
  });
};

// Delete
const useDeleteIndicator = () => {
  const utils = trpc.useUtils();
  return trpc.horizon.signals.deleteIndicator.useMutation({
    onSuccess: () => utils.horizon.signals.listIndicators.invalidate(),
  });
};

// Link / Unlink
const useLinkIndicator = () => {
  const utils = trpc.useUtils();
  return trpc.horizon.signals.linkIndicatorToScenario.useMutation({
    onSuccess: (_, vars) =>
      utils.horizon.signals.getIndicator.invalidate({ indicatorId: vars.indicatorId }),
  });
};

const useUnlinkIndicator = () => {
  const utils = trpc.useUtils();
  return trpc.horizon.signals.unlinkIndicatorFromScenario.useMutation({
    onSuccess: (_, vars) =>
      utils.horizon.signals.getIndicator.invalidate({ indicatorId: vars.indicatorId }),
  });
};
```

---

## Acceptance Criteria

**Indicator List (`/horizon/signals`)**
- [ ] Displays all indicators for the user's analyst group from DB (not stubs).
- [ ] Filter by status, category, and name search works.
- [ ] Sorted by `accelerationScore desc` by default.
- [ ] "New Indicator" button navigates to `/horizon/signals/new`.
- [ ] Clicking a row navigates to `/horizon/signals/:id`.
- [ ] Actions menu (⋮) shows Edit and Delete.
- [ ] Delete confirmation dialog; on confirm calls `deleteIndicator`.
- [ ] `linkedScenarioCount` shown per row.
- [ ] Loading skeletons shown.
- [ ] Empty state when no indicators exist.

**Create Indicator (`/horizon/signals/new`)**
- [ ] Form has: Name, Category, Region Scope, Description, Threshold Watch, Threshold Trigger.
- [ ] Validates: name required, category required, trigger > watch.
- [ ] On success, redirects to `/horizon/signals/:id`.
- [ ] Cancel returns to `/horizon/signals`.

**Indicator Detail / Edit (`/horizon/signals/:id`)**
- [ ] Shows real data from DB (not stubs).
- [ ] Shows name, category, region scope, description, thresholds, status, timestamps.
- [ ] Inline edit for all fields; Save calls `updateIndicator`.
- [ ] Delete action with confirmation.
- [ ] 404 state if indicator not found or wrong group.
- [ ] "Linked Scenarios" panel shows real links from `scenario_indicator_links`.
- [ ] "Link Scenario" inline form: scenario dropdown + strength 1–9.
- [ ] Unlink button removes link.
- [ ] Trend / Trigger History / Linked Evidence sections remain as stubs.

**Scenario–Indicator Linking**
- [ ] `linkIndicatorToScenario` creates or updates a link.
- [ ] `unlinkIndicatorFromScenario` removes a link.
- [ ] Both verify group ownership of scenario AND indicator.
- [ ] Deleting either a scenario or indicator cascades to clean up links.
- [ ] Scenario detail screen (`/horizon/scenarios/:id`) shows indicator count (from `scenario_indicator_links`).

**Multi-tenant Safety**
- [ ] All operations filtered by `analystGroupId`.
- [ ] Cross-group link attempts (scenario from group A, indicator from group B) → 403.

**Performance**
- [ ] `listIndicators` uses indexed query on `analyst_group_id` + `status`.
- [ ] `getIndicator` fetches linked scenarios in a single JOIN (no N+1).

---

## Rollout Plan

### PR1: Schema + Migration

**Branch:** `feature/indicators-schema`

**Commits:**
1. `feat: rebuild indicators table with uuid PK and analystGroupId`
2. `feat: scenario_indicator_links join table (replaces scenario_indicator_map)`
3. `database: migration 0016 — indicators + links`

---

### PR2: tRPC Router

**Branch:** `feature/indicators-api`

**Commits:**
1. `feat: indicators CRUD in signals router (list, getById, create, update, delete)`
2. `feat: scenario-indicator link/unlink endpoints`

---

### PR3: Frontend

**Branch:** `feature/indicators-ui`

**Commits:**
1. `feat: /horizon/signals/new — create indicator form`
2. `feat: update HorizonSignalsScreen — real data, actions menu, counts`
3. `feat: update HorizonIndicatorDetailScreen — edit form, delete, linked scenarios panel`
4. `feat: update HorizonScenarioDetailScreen — show real indicator count`

---

## Key Files to Create / Modify

```
shared/db/tables/indicators.ts              ← Rebuild with uuid + analystGroupId
shared/db/tables/scenarioIndicatorLinks.ts  ← New join table (replaces scenarioIndicatorMap.ts)
shared/db/tables/index.ts                   ← Export new file, remove old
shared/validators/indicator.schema.ts       ← Zod input schemas
shared/validators/index.ts                  ← Export new schema
migrations/0016_indicators_and_links.sql    ← Migration
server/routers/signals.router.ts            ← Replace stubs with DB queries + new CRUD + link ops
client/src/pages/HorizonSignalsScreen.tsx   ← Wire real data, add actions, new indicator button
client/src/pages/HorizonSignalNewScreen.tsx ← New create form page
client/src/pages/HorizonIndicatorDetailScreen.tsx ← Inline edit, delete, linking panel
client/src/pages/HorizonScenarioDetailScreen.tsx  ← Update indicator count stub
client/src/App.tsx                          ← Add /horizon/signals/new route
```

---

## Open Questions

1. **Status transitions — manual or automatic?**  
   For Slice 2, allow manual override (`updateIndicator` can set `status`). Automated transitions (based on `currentValue` vs thresholds) come with the ingestion pipeline.
   - **Decision:** Manual override for now.

2. **`currentValue` / `baselineValue` — editable by analyst?**  
   These are normally set by the ingestion pipeline, but until that exists analysts need to seed data.
   - **Decision:** Include them as optional editable fields in `updateIndicator`, hidden behind an "Advanced" section in the UI to avoid confusion.

3. **Strength display — integer or named label?**  
   Spec uses 1–9 integer. The existing stub used a 0–1 float weight.
   - **Decision:** Integer 1–9 in DB and UI, with label hint shown alongside the selector.

4. **Scenario dropdown in link form — paginated or full list?**  
   Groups likely have <50 scenarios at this stage.
   - **Decision:** Load full list; add search/pagination later if needed.

5. **`scenarioIndicatorMap` table — safe to drop?**  
   It was created in a migration but only used in stub data (never written to from the app).
   - **Decision:** Safe to drop; confirmed no app code reads or writes it outside the stub router.

---

## Future Slices

### Slice 3: Automated Status Transitions
- Ingestion pipeline sets `currentValue` and `accelerationScore`.
- `status` transitions automatically: `normal → watching` when `accelerationScore >= thresholdWatch`, `watching → triggered` when `>= thresholdTrigger`.
- Trigger event written to a `signal_events` table (table already exists in schema).

### Slice 4: Theme Grouping
- Add optional `themeId` FK to both `scenarios` and `indicators`.
- Filter views by theme.
- Theme detail screen shows all scenarios + indicators for that theme.

### Slice 5: Trend / Evidence
- Wire up `trend` array from `signal_events` table.
- Populate `linkedEvidence` from GDELT ingestion.
- Render line chart in indicator detail screen.
