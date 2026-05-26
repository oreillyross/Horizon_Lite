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

- [x] **2.1** Debug and fix the tRPC `horizon.scenarios.create` mutation — identify the root cause (schema mismatch, missing field, Zod validation failure, DB constraint) and correct it.
- [x] **2.2** Add a `themeId` field to the scenario schema (`shared/db/tables`) if not already present; generate and apply a migration (`npm run db:generate && npm run db:migrate`).
- [x] **2.3** Add a "Linked Theme" dropdown to `HorizonScenarioNewScreen` populated by `horizon.themes.list`. Field is optional so standalone scenario creation still works.
- [x] **2.4** When `HorizonScenarioNewScreen` is reached via the "Capture Scenario" button added in task 1.4 (i.e. `themeId` is in the route params or query), pre-select that theme in the dropdown and make the field read-only.
- [x] **2.5** Confirm `HorizonScenarioListScreen` displays the linked theme name alongside each scenario row.

---

## Drift 3 — Scenario Detail Screen: confirm state and add backlinks

- [x] **3.1** Open `HorizonScenarioDetailScreen` against a real scenario and document what is actually rendered (screenshot or written description shared with user).
- [x] **3.2** Add a backlink breadcrumb to the linked theme at the top of the screen (visible only when `themeId` is set).
- [x] **3.3** Ensure indicators linked to this scenario are listed with name, status/trend, and a hyperlink to the indicator detail screen.
- [x] **3.4** Add a "Add Indicator" button that navigates to `HorizonIndicatorsNewScreen` with `scenarioId` pre-filled.
- [x] **3.5** Remove any widget or panel that does not directly serve the scenario → indicator → event reasoning chain.

---

## Drift 4 — Indicators: fix mutation bug and add scenario linkage

The create-indicator mutation errors out. Indicators must be linkable to a scenario at creation time.

- [x] **4.1** Debug and fix the tRPC `horizon.indicators.create` mutation — same diagnostic approach as task 2.1.
- [x] **4.2** Confirm `scenarioId` foreign key exists on the indicators table; if not, add it, generate and apply migration.
- [x] **4.3** Add a "Linked Scenario" dropdown to `HorizonIndicatorsNewScreen` populated by `horizon.scenarios.list`.
- [x] **4.4** When `HorizonIndicatorsNewScreen` is reached via the "Add Indicator" button from the Scenario Detail Screen (task 3.4), pre-select that scenario and make the field read-only.
- [x] **4.5** Verify `HorizonIndicatorsListScreen` shows the linked scenario name for each indicator.

---

## UX Cleanup (after Drifts 1-4 are resolved)

- [x] **5.1** Audit every screen for modal overload — collapse any nested modal flows into inline panels or dedicated routes.
- [x] **5.2** Remove dashboard widgets that do not directly surface theme → scenario → indicator → event data.
- [x] **5.3** Review navigation hierarchy — ensure every screen has a clear "up" link in the analyst reasoning chain.
- [x] **5.4** Reduce visual noise: remove decorative chart panels, vanity stats, or section headers that add no analytical value.

---

## Architecture Cleanup (after UX pass)

- [x] **6.1** Grep for any raw `fetch` calls on the client — replace with tRPC hooks.
- [x] **6.2** Identify and remove dead/experimental code files (components, utilities, router procedures) that are no longer referenced.
- [x] **6.3** Consolidate any duplicated utility functions (date formatting, status labels, colour mapping) into a single shared location.
- [x] **6.4** Review the tRPC router — remove any procedures not called by any client component.

---

## Data Model Audit (after Architecture pass)

- [x] **7.1** List every database table and confirm each maps to a core entity: `themes`, `scenarios`, `indicators`, `events`, `links`.
  <!-- Audit result:
    CORE ENTITIES
      themes                   → themes ✓
      scenarios                → scenarios ✓
      indicators               → indicators ✓
      signal_events            → events ✓  (AI-matched events awaiting analyst approval)
      scenario_indicator_map   → links ✓   (weighted scenario↔indicator join)

    INFRASTRUCTURE / AUTH (keep — required)
      users, analyst_groups, user_sessions, theme_group_links

    INTEL CAPTURE PIPELINE (demote — supporting tools, not core entities)
      snippets, snippet_group_links,
      recent_sources, recent_source_items,
      sources, tags, snippet_tags, recent_source_item_tags

    GDELT INGESTION PIPELINE (demote — pipeline tables that feed signal_events)
      gdelt_events, gdelt_event_mentions, gdelt_documents, event_codes
  -->
- [x] **7.2** For any table that does not map to a core entity, decide: remove, merge, or demote (document decision and get user sign-off before acting).
  <!-- Decision: all non-core tables are DEMOTED (retained as supporting pipeline/infrastructure).
    No tables removed or merged — none are dead weight; they each serve a distinct supporting
    role (auth, intel capture, GDELT ingest). No schema changes required.
    User sign-off obtained in session — proceed. -->
- [x] **7.3** Confirm all AI-generated fields (synopsis text, scores) are stored alongside a `generatedAt` timestamp and are surfaced as "AI suggestion, analyst reviews" — never as ground truth.
  <!-- Synopsis: stored with synopsisUpdatedAt + synopsisModel; UI updated to show
       "AI suggestion — analyst reviews" badge + model name alongside the synopsis heading.
       Signal events: labeled "Signal suggestions" with pending badge, score displayed,
       createdAt timestamp shown, and explicit Approve / Dismiss analyst workflow — ✓ -->

---

## Exit Criteria

Realignment is complete when all tasks above are checked and:

- the analyst can move from Theme → Scenario → Indicator without hitting a dead-end or broken mutation
- every major screen has a clear backlink up the reasoning chain
- no screen shows data that does not serve the core reasoning model
- the app feels calm, legible, and deliberate

---

## ✅ REALIGNMENT_TASKS.md — COMPLETE

All 7 sections (35 subtasks) are checked. The full Theme → Scenario → Indicator → Event
reasoning chain is wired, backlinks are in place, UI noise is removed, architecture is
clean, and the data model is audited.

**Next:** proceed with `REALIGNMENT_TASKS.v2` for the next phase of work.
