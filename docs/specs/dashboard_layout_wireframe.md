Information Architecture

Primary navigation (sidebar):

Overview (home)

Themes (starts with “Hybrid Warfare — Europe”)

Scenarios (drill-down view per scenario)

Signals (indicator radar + thresholds)

Updates (Bayesian timeline / decision log)

Reports (1-click “Sentinel Brief” export view)

Settings (sources, regions, thresholds)

Rule: Executives land on Overview, not “data”.

Overview Page Wireframe
Top Bar

Title: Hybrid Warfare Early Warning — Europe

Right side:

“Last update: 09:45”

Confidence pill (Low / Medium / High)

Primary action button: Generate Sentinel Brief

Row 1 — Scenario Probability Board (the hero)

4 equal cards (your 4 scenarios), each card shows:

Scenario name

Probability %

7-day delta (↑/↓)

Momentum indicator (Calm / Building / Accelerating)

“Top drivers” (max 3 indicators, short labels)

Clicking a scenario opens the Scenario Detail page.

This is the “so what” layer. No feeds. No charts first.

Row 2 — Momentum & Pressure

Two panels side-by-side:

A) Momentum Timeline (7–30 days)

A single clean line chart showing:

Overall “Hybrid Pressure Index” (composite)

Optional: overlay scenario probability for the top scenario

Hover reveals: date + key indicator spikes

B) Weak Signal Radar

List of 5–10 items, sorted by “acceleration”

Each row:

Indicator name

Acceleration (e.g., “+2.1σ vs baseline”)

Region tag (e.g., “EU-wide”, “CEE”, “Nordics”)

Freshness timestamp

Clicking an indicator opens Indicator Detail.

Row 3 — Geographic Pulse

One wide panel:

Europe map (simple choropleth or cluster dots)

Toggle: Volume / Acceleration / Emotion shift

Right-side mini list: “Hotspots” (top 5 regions/countries)

Executives love spatial grounding, but keep it simple.

Row 4 — “Why did this change?” (Explainability block)

This is the trust engine.

A compact “Evidence stack” showing 3–5 entries:

“Indicator: Undersea cable references ↑”

“Indicator: Fear emotion velocity ↑”

“Indicator: Public sector cyber incidents clustered”
Each entry:

short summary

confidence tag

link to evidence list (sources/articles/events)

This directly expresses the whitepaper’s explainable belief updating idea, without showing the guts. 

Horizon Whitepaper.docx

Scenario Detail Page Wireframe

Top:

Scenario name + probability + delta

“What would we expect to see next?” (3 bullets)

“What would falsify this?” (3 bullets)

Body (2 columns):

Left: Indicator Contributions

stacked list of indicators with weights + time decay

Right: Evidence Feed (curated)

10–30 evidence items, deduped

each item: title, source, country, timestamp, relevance score

capture/flag buttons: “Key evidence”, “Noise”

Bottom:

“Belief update log” (audit trail): prior → evidence → posterior

Signals Page Wireframe

Purpose: analyst/operator view without corrupting the executive home.

Sections:

Indicator list with filters:

category: InfoOps / Political stress / Infrastructure / Diplomatic

region

threshold state: Normal / Watching / Triggered

Each indicator row:

current value vs baseline

acceleration

last triggered

mapped scenarios (chips)

Updates Page Wireframe

A chronological “decision intelligence ledger”:

Each entry:

timestamp

scenario affected

change (32% → 41%)

drivers (indicator chips)

short narrative

“Analyst note” field (optional)

This is the page a senior person screenshots.

Reports Page Wireframe

“Sentinel Brief” generator view:

auto-built sections:

Executive summary (3 bullets)

Top scenario shifts

Key indicators triggered

Geographic hotspots

What to watch next (next 7 days)

export buttons (later): PDF / share link

UI Tone Rules (non-negotiable for execs)

No dense tables on Overview (only curated lists)

Always show delta + momentum, not just counts

“Why” visible within one scroll

Calm color palette, sparse animations (loading + fade) 

design_guidelines

Everything clicks into depth; nothing overwhelms

Your “Delusional Edge” UX Hook

On the Overview hero area, add one line:

“Narrative pressure is shifting toward: Infrastructure Disruption Campaign (Accelerating)”

It frames the whole dashboard as a living strategic story.