# REALIGNMENT_TASKS.md

> Work through these one subtask at a time, in order.
> Mark each `- [x]` when complete, commit, then stop and report.
> Do not start the next subtask until the user confirms.

---

## Drift 1 — Theme Screen: replace snippets with scenario/indicator composition

The ThemeViewScreen currently shows snippets. It must show the analyst's reasoning chain: linked scenarios and indicator counts, not raw snippet cards.

- [x] **1.1** Remove the snippets section from `ThemeViewScreen`.
- [x] **1.2** Fetch and display linked scenarios for the theme (scenario name, probability tag if present, indicator count). Each scenario row must be a hyperlink to its detail screen.
- [x] **1.3** Display aggregate indicator count per scenario as a secondary stat alongside the scenario name.
- [x] **1.4** Add a "Capture Scenario" button (primary CTA) on `ThemeViewScreen` that navigates to `HorizonScenarioNewScreen` with the current `themeId` pre-filled.
- [x] **1.5** Verify the Synopsis + Refresh Synopsis + "Synopsis updated" section is preserved and unchanged.

---

## Drift 2 — Scenario creation: fix mutation bug and add theme linkage

The create-scenario mutation errors out. Scenario creation must also support linking a theme.

- [ ] **2.1** Debug and fix the tRPC `horizon.scenarios.create` mutation — identify the root cause (schema mismatch, missing field, Zod validation failure, DB constraint) and correct it.
- [ ] **2.2** Add a `themeId` field to the scenario schema (`shared/db/tables`) if not already present; generate and apply a migration (`npm run db:generate && npm run db:migrate`).
- [ ] **2.3** Add a "Linked Theme" dropdown to `HorizonScenarioNewScreen` populated by `horizon.themes.list`. Field is optional so standalone scenario creation still works.
- [ ] **2.4** When `HorizonScenarioNewScreen` is reached via the "Capture Scenario" button added in task 1.4 (i.e. `themeId` is in the route params or query), pre-select that theme in the dropdown and make the field read-only.
- [ ] **2.5** Confirm `HorizonScenarioListScreen` displays the linked theme name alongside each scenario row.

---

## Drift 3 — Scenario Detail Screen: confirm state and add backlinks

- [ ] **3.1** Open `HorizonScenarioDetailScreen` against a real scenario and document what is actually rendered (screenshot or written description shared with user).
- [ ] **3.2** Add a backlink breadcrumb to the linked theme at the top of the screen (visible only when `themeId` is set).
- [ ] **3.3** Ensure indicators linked to this scenario are listed with name, status/trend, and a hyperlink to the indicator detail screen.
- [ ] **3.4** Add a "Add Indicator" button that navigates to `HorizonIndicatorsNewScreen` with `scenarioId` pre-filled.
- [ ] **3.5** Remove any widget or panel that does not directly serve the scenario → indicator → event reasoning chain.

---

## Drift 4 — Indicators: fix mutation bug and add scenario linkage

The create-indicator mutation errors out. Indicators must be linkable to a scenario at creation time.

- [ ] **4.1** Debug and fix the tRPC `horizon.indicators.create` mutation — same diagnostic approach as task 2.1.
- [ ] **4.2** Confirm `scenarioId` foreign key exists on the indicators table; if not, add it, generate and apply migration.
- [ ] **4.3** Add a "Linked Scenario" dropdown to `HorizonIndicatorsNewScreen` populated by `horizon.scenarios.list`.
- [ ] **4.4** When `HorizonIndicatorsNewScreen` is reached via the "Add Indicator" button from the Scenario Detail Screen (task 3.4), pre-select that scenario and make the field read-only.
- [ ] **4.5** Verify `HorizonIndicatorsListScreen` shows the linked scenario name for each indicator.

---

## UX Cleanup (after Drifts 1-4 are resolved)

- [ ] **5.1** Audit every screen for modal overload — collapse any nested modal flows into inline panels or dedicated routes.
- [ ] **5.2** Remove dashboard widgets that do not directly surface theme → scenario → indicator → event data.
- [ ] **5.3** Review navigation hierarchy — ensure every screen has a clear "up" link in the analyst reasoning chain.
- [ ] **5.4** Reduce visual noise: remove decorative chart panels, vanity stats, or section headers that add no analytical value.

---

## Architecture Cleanup (after UX pass)

- [ ] **6.1** Grep for any raw `fetch` calls on the client — replace with tRPC hooks.
- [ ] **6.2** Identify and remove dead/experimental code files (components, utilities, router procedures) that are no longer referenced.
- [ ] **6.3** Consolidate any duplicated utility functions (date formatting, status labels, colour mapping) into a single shared location.
- [ ] **6.4** Review the tRPC router — remove any procedures not called by any client component.

---

## Data Model Audit (after Architecture pass)

- [ ] **7.1** List every database table and confirm each maps to a core entity: `themes`, `scenarios`, `indicators`, `events`, `links`.
- [ ] **7.2** For any table that does not map to a core entity, decide: remove, merge, or demote (document decision and get user sign-off before acting).
- [ ] **7.3** Confirm all AI-generated fields (synopsis text, scores) are stored alongside a `generatedAt` timestamp and are surfaced as "AI suggestion, analyst reviews" — never as ground truth.

---

## Exit Criteria

Realignment is complete when all tasks above are checked and:

- the analyst can move from Theme → Scenario → Indicator without hitting a dead-end or broken mutation
- every major screen has a clear backlink up the reasoning chain
- no screen shows data that does not serve the core reasoning model
- the app feels calm, legible, and deliberate
