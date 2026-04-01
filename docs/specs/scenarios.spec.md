# Spec: Scenarios CRUD (Horizon Lite)

**Status:** Draft  
**Priority:** High (foundational for threat intelligence workflow)  
**Multi-tenant:** Yes, scoped by `analystGroupId`

---

## Goals

- Add a **Scenarios** table and full CRUD UI scoped to analyst group.
- Each scenario is a concise threat narrative (1–4 word title, 1 paragraph description).
- Scenarios are the **core unit of threat monitoring** in Horizon.
- Prepare the data model for later **Indicator linking** (separate task).
- Keep UI dense and developer-tool-like (Linear/Vercel vibe).

---

## Non-goals (for Slice 1)

- Indicator linking (comes next slice).
- Theme grouping / categorization (optional later).
- Scenario versioning / audit history (future).
- Risk/impact scoring on scenarios (deferred to admin config).
- Automated scenario generation from signals (that's agentic layer, way later).

---

## User Stories

1. As an analyst, I can **create a new scenario** with a title and description.
2. As an analyst, I can **view all scenarios** in my analyst group.
3. As an analyst, I can **view a single scenario's detail** and edit it.
4. As an analyst, I can **rename/update** a scenario's description.
5. As an analyst, I can **delete a scenario** (with confirmation).
6. As an analyst, I can see **indicator count** per scenario (once indicators exist).
7. As an analyst, I only see scenarios in **my analyst group** (multi-tenant safety).

---

## Data Model

### Drizzle Schema

```ts
// shared/schema.ts

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const scenarios = pgTable("scenarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  analystGroupId: uuid("analyst_group_id")
    .notNull()
    .references(() => analystGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // 2–4 words, e.g. "Hybrid Warfare Campaign"
  description: text("description").notNull(), // one paragraph (~100–500 chars)
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Index for multi-tenant queries
export const scenariosGroupIdx = createIndex("scenarios_group_id_idx").on(
  scenarios.analystGroupId
);
```

### Migration

```sql
-- Up
CREATE TABLE scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analyst_group_id uuid NOT NULL REFERENCES analyst_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX scenarios_group_id_idx ON scenarios(analyst_group_id);

-- Down
DROP TABLE scenarios;
```

### Notes

- `analystGroupId` is **NOT NULL** → every scenario must belong to a group.
- Cascading delete: if group is deleted, scenarios are cleaned up automatically.
- No `themeId` yet (add in Slice 3 if needed).
- No soft-delete (if you need audit trail later, add `deletedAt`).

---

## tRPC API Spec

### Router: `scenarios`

All routes require `ctx.user` (authentication middleware).
All routes filter/set `analystGroupId = ctx.user.analystGroupId`.

#### `list()`

**Input:** (none)

**Output:**
```ts
Array<{
  id: string;
  name: string;
  description: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  indicatorCount?: number; // optional, computed later
}>
```

**Behavior:**
- Returns all scenarios for `ctx.user.analystGroupId`, sorted by `updatedAt desc` (most recently modified first).
- Fast query; no joins yet.

---

#### `getById({ id })`

**Input:**
```ts
{ id: string }
```

**Output:**
```ts
{
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  // later: indicators?: Indicator[]
}
```

**Behavior:**
- Returns scenario detail.
- Verify `analystGroupId` matches `ctx.user.analystGroupId` (prevent cross-group access).
- If not found or wrong group → throw 404.

---

#### `create({ name, description })`

**Input:**
```ts
{
  name: string; // 1–100 chars, required
  description: string; // 1–2000 chars, required
}
```

**Output:** (same as getById)

**Behavior:**
- Validate inputs (name and description present, reasonable length).
- Create scenario with `analystGroupId = ctx.user.analystGroupId`.
- Return created scenario.

**Error handling:**
- If `name` or `description` empty → validation error.
- If user not authenticated → 401.

---

#### `update({ id, name, description })`

**Input:**
```ts
{
  id: string;
  name?: string; // optional; if omitted, keep existing
  description?: string; // optional
}
```

**Output:** (same as getById)

**Behavior:**
- Fetch scenario; verify group access.
- Update only provided fields.
- Set `updatedAt = now()`.
- Return updated scenario.

**Validation:**
- If `name` provided and empty → error.
- If `description` provided and empty → error.

---

#### `delete({ id })`

**Input:**
```ts
{ id: string }
```

**Output:**
```ts
{ success: boolean; id: string }
```

**Behavior:**
- Fetch scenario; verify group access.
- Delete scenario (cascading deletes any future indicator links).
- Return success.
- If not found or wrong group → 404.

---

## Frontend Spec

### Routes

- `/scenarios` — list view
- `/scenarios/:id` — detail/edit view
- `/scenarios/new` — create form (optional: inline in list or dedicated page)

### UI/UX

**Design target:** Dense, developer-tool dashboard (Linear/Vercel). One screen, no modals.

#### `/scenarios` — Scenario List

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Scenarios                      [+ New Scenario]    │ ← Header
├─────────────────────────────────────────────────────┤
│ Name                 Description       Updated      │ ← Table header
├─────────────────────────────────────────────────────┤
│ Hybrid Warfare       One paragraph...   2h ago  [⋮] │ ← Row
│ Supply Chain Breach  One paragraph...   1d ago  [⋮] │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

**Components:**

- **Header:** Title + "New Scenario" button (primary, top-right)
- **Table:**
  - Columns: Name, Description (preview, truncated), Updated (relative time), Actions menu
  - Sorting: default = `updatedAt desc`
  - Responsive: stack on mobile (optional for v1; table is fine)
- **Actions menu (⋮):**
  - Edit → `/scenarios/:id`
  - Delete → confirmation modal, then delete

**Empty state:**
- "No scenarios yet. Create your first threat narrative."
- CTA: "New Scenario"

**Loading state:**
- Skeleton rows (5–10 placeholders)

---

#### `/scenarios/new` or inline create

**Option A (simpler):** Inline form in a modal or collapsible section on the list page.

**Option B (cleaner):** Dedicated `/scenarios/new` page with form.

**Recommendation:** Start with **Option B** (dedicated page), then collapse to modal later if list gets crowded.

**Form:**

```
┌─────────────────────────────────────────────────────┐
│  New Scenario                                       │
├─────────────────────────────────────────────────────┤
│ Name*                                               │
│ [Hybrid Warfare Campaign                   ]        │ ← max 100 chars
│ Guidance: 2–4 words, memorable, clear               │
│                                                     │
│ Description*                                        │
│ [One paragraph describing the threat scenario...  ] │ ← textarea, 1–2000 chars
│ Guidance: Who? What? When? Where? Why?             │
│                                                     │
│              [Cancel]    [Create Scenario]          │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Submit calls `trpc.scenarios.create.useMutation`
- On success:
  - Redirect to `/scenarios/:id` (auto-generated)
  - OR redirect to `/scenarios` with toast "Scenario created"
- On error:
  - Show validation message
  - Keep form intact

---

#### `/scenarios/:id` — Scenario Detail / Edit

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  ← Back    Hybrid Warfare Campaign         [⋮ Delete]│ ← Header
├─────────────────────────────────────────────────────┤
│ Created: 3 days ago | Updated: 2h ago               │
│                                                     │
│ Edit Mode (inline):                                 │
│                                                     │
│ Name*                                               │
│ [Hybrid Warfare Campaign                   ]        │
│                                                     │
│ Description*                                        │
│ [One paragraph describing the threat scenario...  ] │
│                                                     │
│                          [Cancel]  [Save Changes]   │
│                                                     │
│ ─────────────────────────────────────────────────── │
│ Indicators (future slice)                           │
│ [0 indicators linked yet]                           │
│                                                     │
│ Add indicator link: [+ Link Indicator] (future)     │
└─────────────────────────────────────────────────────┘
```

**Behavior:**

- **Read mode (default):** Show name, description, timestamps; "Edit" button (or inline edit toggle).
- **Edit mode:** Form fields editable; Cancel/Save buttons.
- **Delete:** Menu action → confirmation modal → delete.
- **Back button:** Return to `/scenarios`.
- **Indicators section (stub for now):** Placeholder text "Indicators coming soon" or show count (0 initially).

**Error handling:**
- If scenario not found or wrong group → show 404 page.
- If save fails → show error toast, keep form intact.

---

### State Management

**Using React Query + tRPC:**

```tsx
// Hook example
const useScenarios = () => {
  return trpc.scenarios.list.useQuery();
};

const useScenarioById = (id: string) => {
  return trpc.scenarios.getById.useQuery({ id });
};

const useCreateScenario = () => {
  const utils = trpc.useUtils();
  return trpc.scenarios.create.useMutation({
    onSuccess: () => {
      utils.scenarios.list.invalidate();
    },
  });
};

const useUpdateScenario = () => {
  const utils = trpc.useUtils();
  return trpc.scenarios.update.useMutation({
    onSuccess: (data) => {
      utils.scenarios.list.invalidate();
      utils.scenarios.getById.invalidate({ id: data.id });
    },
  });
};

const useDeleteScenario = () => {
  const utils = trpc.useUtils();
  return trpc.scenarios.delete.useMutation({
    onSuccess: () => {
      utils.scenarios.list.invalidate();
    },
  });
};
```

---

## Acceptance Criteria

**Scenario List**
- [ ] `/scenarios` displays all scenarios for the user's analyst group.
- [ ] Scenarios sorted by `updatedAt desc`.
- [ ] Name, description preview, and relative timestamp visible.
- [ ] "New Scenario" button takes user to `/scenarios/new`.
- [ ] Click row or name → navigates to `/scenarios/:id`.
- [ ] Actions menu (⋮) shows Edit and Delete.
- [ ] Empty state displays when no scenarios exist.
- [ ] Loading state shows skeletons.

**Create Scenario**
- [ ] `/scenarios/new` form has Name and Description fields.
- [ ] Form validates: both fields required, reasonable lengths.
- [ ] Submit calls `trpc.scenarios.create`.
- [ ] On success, redirect to `/scenarios/:id` (or `/scenarios` with toast).
- [ ] Form preserves on validation error.
- [ ] Cancel returns to `/scenarios`.

**Scenario Detail / Edit**
- [ ] `/scenarios/:id` displays scenario detail.
- [ ] Shows created/updated timestamps.
- [ ] Edit form allows updating Name and Description inline.
- [ ] Save calls `trpc.scenarios.update` and updates query cache.
- [ ] Delete action shows confirmation modal.
- [ ] Confirming delete calls `trpc.scenarios.delete` and redirects to `/scenarios`.
- [ ] Back button returns to `/scenarios`.
- [ ] 404 page if scenario not found or user lacks access.

**Multi-tenant Safety**
- [ ] All list/read/mutate operations filter by `analystGroupId`.
- [ ] User can only see/edit scenarios in their group.
- [ ] Deleting a scenario does not affect other groups' data.

**Performance**
- [ ] List query finishes in <500ms (no N+1, index on `analyst_group_id`).
- [ ] Mutations are optimistic (UI updates instantly; rollback on error).

---

## Rollout Plan (Spec-Driven Commits)

### PR1: Schema + Migrations

**Branch:** `feature/scenarios-schema`

**Commits:**
1. `docs: add scenarios spec`
2. `feat: scenarios table + drizzle schema`
3. `database: migration for scenarios table`

**Checklist:**
- Drizzle schema compiles
- Migration runs locally: `DATABASE_URL=... npm run db:migrate`
- Index created and verified

---

### PR2: tRPC Routes

**Branch:** `feature/scenarios-api`

**Commits:**
1. `feat: scenarios router (list, getById, create, update, delete)`
2. `test: scenarios router unit tests`

**Checklist:**
- All routes require auth
- All routes filter by `analystGroupId`
- Create validates inputs
- Delete cascades correctly
- Tests pass

---

### PR3: Frontend UI

**Branch:** `feature/scenarios-ui`

**Commits:**
1. `feat: scenarios list screen (/scenarios)`
2. `feat: scenarios new/edit screens (/scenarios/new, /scenarios/:id)`
3. `feat: add Scenarios nav link`
4. `test: scenarios screens (integration tests)`

**Checklist:**
- Routes render
- Create/update/delete flows work end-to-end
- Error states handled
- Multi-tenant filtering works (simulate different groups)

---

### PR4: Polish + Tests

**Branch:** `feature/scenarios-polish`

**Commits:**
1. `refactor: extract scenarios hooks and components`
2. `test: scenarios UI edge cases (empty, loading, errors)`
3. `ux: add confirmations, toasts, 404 page`

**Checklist:**
- All acceptance criteria met
- E2E test one flow (create → edit → delete)
- UI matches design guidelines (dense, dev-tool vibe)

---

## Future Slices (Out of Scope for Now)

### Slice 2: Indicator Linking

- Create `scenario_indicator_links` join table.
- Add strength weighting (1–9 scale from whitepaper).
- UI: drill-down view showing linked indicators per scenario.
- Bulk link/unlink interface.

### Slice 3: Theme Grouping

- Add `themeId` FK (optional, nullable).
- Scenarios grouped by theme on list view.
- Theme detail shows all scenarios.

### Slice 4: Scenario Versioning / Audit

- Store interpretation changes over time.
- Show "evolution" of scenario description as evidence accumulates.
- Audit trail: who changed what, when.

---

## Open Questions (Defaults Assumed)

1. **Soft delete?** Currently hard-delete (cascade). If you need audit, add `deletedAt` nullable timestamp.
   - **Decision:** Hard delete for now; add soft-delete if compliance requires it.

2. **Scenario ordering?** Currently `updatedAt desc` (most recent first).
   - **Decision:** Sensible default; add manual reordering later if needed.

3. **Name uniqueness within group?** Currently allows duplicate names.
   - **Decision:** Allow duplicates (analysts may create "similar" scenarios while exploring). Add unique constraint later if it becomes a problem.

4. **Description format?** Currently free text.
   - **Decision:** Plain text MVP. Later: Markdown or rich text if analysts want formatting.

5. **Inline create vs. separate page?** Currently separate page (`/scenarios/new`).
   - **Decision:** Start separate. Collapse to modal if list page gets crowded.

---

## Implementation Notes

### Key files to create/modify

```
shared/schema.ts                    ← Add scenarios table + index
server/routes/scenarios.ts          ← tRPC router
client/pages/ScenariosPage.tsx       ← List screen
client/pages/ScenarioNewPage.tsx     ← Create screen
client/pages/ScenarioDetailPage.tsx  ← Detail/edit screen
client/components/ScenarioTable.tsx  ← Reusable table
client/hooks/useScenarios.ts         ← React Query hooks
client/App.tsx                       ← Route wiring
docs/specs/scenarios.md              ← This spec
```

### Dependencies (already in your stack)

- Drizzle ORM (migrations)
- tRPC (API)
- React Query (caching)
- React Router / Wouter (navigation)
- shadcn/ui (components)
- Tailwind CSS (styling)

### No new packages needed.

---

## Questions for You

Before you start coding:

1. **Confirm multi-tenant filtering approach:** Only `analystGroupId` in schema, or also add `createdByUserId` for audit?
   - Recommendation: Add `createdByUserId` optional, nice to have but not blocking.

2. **Form validation library?** Using Zod + React Hook Form or something else?
   - Recommendation: Match what you're using elsewhere (likely shadcn default patterns).

3. **Toasts/notifications?** Sonner, react-hot-toast, or shadcn `useToast`?
   - Recommendation: Whatever you're using in the auth flow.

4. **Route structure?** My suggestion was `/scenarios/new` + `/scenarios/:id`. Does this fit your app's routing style?

---

## Success Metrics (Post-Merge)

- Analysts can create and manage scenarios for their group.
- Scenario list renders <500ms even with 100+ scenarios.
- Multi-tenant isolation verified (write a test: user A cannot see user B's scenarios).
- Code is clean, testable, and ready for indicator linking in Slice 2.

---

Done! This spec is ready to code. Pick whichever PR you want to start with (schema → API → UI is the natural flow), and I'll give you the exact component/file scaffolds.

Which slice sounds good to start with?
