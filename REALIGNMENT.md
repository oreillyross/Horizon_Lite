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

## Drift 1 — UI becoming dashboard-heavy

Symptoms:
- too many disconnected cards
- visual fragmentation
- weak information hierarchy
- increasing "enterprise dashboard" feel

Correction:
- consolidate related information
- reduce card proliferation
- emphasize analytical flow over widget density
- prefer narrative analytical surfaces

---

## Drift 2 — Too much abstraction in ingestion pipeline

Symptoms:
- unnecessary indirection
- hard-to-follow flow
- premature extensibility
- difficult debugging

Correction:
- flatten ingestion path
- make data flow explicit
- reduce abstraction layers
- optimize for inspectability

---

## Drift 3 — AI features becoming too central

Symptoms:
- analyst workflow depends on AI output
- generated summaries dominate screens
- system becoming "AI-first"

Correction:
- AI suggestions must remain secondary
- evidence and indicators stay primary
- analyst judgement visually centered
- preserve explainability

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