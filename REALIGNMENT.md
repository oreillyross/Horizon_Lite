# REALIGNMENT.md

## Purpose

This document exists to reduce drift between the current implementation and the core Horizon vision.

The goal is not feature expansion.

The goal is:
- coherence
- clarity
- analyst workflow quality
- architectural simplicity
- reduction of cognitive load
- reinforcement of the core reasoning model

If a task increases complexity without strengthening:
theme → scenario → indicator → event reasoning,
it should not be done.

---

# Current Drift

## Drift 1 — Theme Screen not composed with Scenarios and indicators

Current state:
- ThemeViewScreen shows Synopsis, Refresh Synopsis button, Synopsis updated info (GOOD)
- ThemeViewScreen shows snippets (OUTDATED)
- 
Symptoms:
- Not following theme - scenarios - indicator - event flow
- visual fragmentation
- weak information hierarchy

Correction:
- Show the linked scenarios, and some information about the indicators count per scenario 
- Ensure every uesfule piece of derived state from the indicator counts, or scenario counts are hyperlinked to their respective detail screens.
- emphasize analytical flow over widget density
- prefer narrative analytical surfaces
- Show a capture Scenario button from this point. Then its intuitive user sees a theme detail and can create scenarios from this.

---

## Drift 2 — Scenarios

Current state:
- HorizonScenarioNewScreen allows capture of scenario name and description (GOOD) 
- HorizonScenarioListScreen shows an empty no scenarios yet with headers name description, updated (GOOD)
- HorizonScenarioListScreen shows new scenario button (GOOD)


Symptoms:
- lack of coherence with Theme linkages
- hard-to-follow flow
- Need to know which sceneario links to which themes, themes - scenario flow

Correction:
- Allow Themes to be linked from the created scenario
- Allow a dropdown for the linked theme.
- Make the Create Scenario button work. The mutation to create a scenario errors out.
  
---

## Drift 3 — Scenario Detail Screen

Current state:
- HorizonScenarioDetailScreen appears to show a lot of detail (TO BE CONFIRMED)
- 
Symptoms:
- To BE confirmed based on review of Current state

Correction:
- Refine the screen based on above scenario - indicator linkages, as well as backlinks to linked themes.
  

## Drift 4 — Indicators Screen

Current state:
- HorizonIndicatorsDetailScreen, HorizonIndicatorsNewScreen, HorizonIndicatorsListScreen exist (GOOD)
- Unclear if the Theme - Scenario - Indicator flow is being respected.
  
Symptoms:
- Indicator creation seems disconnected from flow of the Scenario screen button to create indicators, then automatically and logically link the indicators to a scenario.

Correction:
- Allow a drop down in indicators new screen to link a scenario.
- Allow a indicator to be automatically linked if the create indicator button in the Scneario detail screen is clicked.
- The create indicator button in new indicator screen errors out, probably the same as new scenario trpc / postgres backend issue.

---

# Realignment Tasks

## UX

- Reduce nested modal flows
- Remove unnecessary dashboard widgets
- Simplify theme overview layout
- Increase scenario visibility
- Improve evidence trace readability
- Reduce visual noise
- Make scenario movement easier to interpret

---

## Architecture

- Audit unnecessary abstractions
- Remove dead experimental code
- Consolidate duplicate utilities
- Standardize server-side data flow patterns
- Reduce router complexity where possible
- Prefer explicit over generic

---

## Data Model

- Re-check all entities against core model:
  - themes
  - scenarios
  - indicators
  - events
  - links

If an entity does not strengthen the reasoning model:
- remove it
- simplify it
- merge it
- or demote it

---

## AI Usage

- Ensure all AI output is traceable
- Remove opaque scoring logic
- Keep analyst approval mandatory
- Prevent autonomous workflow branching

---

## Performance

Do NOT optimize for:
- hyperscale
- real-time streaming
- ultra-low latency

Optimize for:
- analyst responsiveness
- cognitive smoothness
- operational simplicity

---

# Things We Will Not Build During Realignment

- new major features
- plugin systems
- realtime collaboration
- workflow automation
- enterprise admin tooling
- advanced permissions
- complex notification systems

Focus is refinement, not expansion.

---

# Exit Criteria

Realignment is complete when:

- the app feels coherent again
- analyst flow feels calm and legible
- every major screen reinforces the core model
- AI supports rather than dominates
- architectural complexity feels intentional
- new contributors can understand the system quickly