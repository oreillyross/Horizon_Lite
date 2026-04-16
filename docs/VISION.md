# Horizon — Vision

> *"Investigating the future with confidence."*

## 1. What Horizon is

Horizon is a **structured environmental scanning and weak-signal detection system** for analysts who need to anticipate change rather than just react to it.

It ingests noisy open-source information, lets an analyst organise that noise into a disciplined structure of **themes → scenarios → indicators → events**, and helps them reason — probabilistically and iteratively — about which futures are becoming more or less likely.

It is not a news aggregator. It is not a dashboard of headlines. It is a **thinking tool** for people whose job is to be roughly right about the future when being precisely wrong is expensive.

## 2. Why it exists

Three problems motivate the project:

**The signal-to-noise problem.** The volume of information available is growing exponentially; the share of it that is useful is not. Analysts drown. Horizon's job is to help them separate signal from noise in a repeatable way.

**The confirmation-bias problem.** Analysts form hypotheses and then — unconsciously — hunt for confirming evidence. Horizon inverts this: the analyst commits to scenarios and indicators *in advance*, and the system objectively links incoming events to those pre-declared structures, forcing the analyst to confront evidence that contradicts their prior.

**The precision-vs-relevance problem.** Most forecasting tools either over-promise precision (point predictions, false confidence) or produce unreadable analytical sprawl. Horizon aims for the middle path: disciplined, Bayesian, weighted, time-decayed — but expressed in human-readable scenarios and plain-language indicators that a decision-maker can actually use.

## 3. Who it's for

The primary user is a **strategic analyst** — someone producing horizon-scan assessments for decision-makers in security, risk, policy, intelligence, corporate strategy, or crisis preparedness. They are comfortable with ambiguity, paid to have opinions, and accountable for them.

Secondary users are the **decision-makers themselves**, who consume Sentinel Assessments — on-demand reports summarising "what scenarios are getting warmer, what's getting colder, and on what evidence."

Horizon is deliberately **not** designed around personal data, individuals, or surveillance. It operates at the strategic level: conditions, trends, modus operandi, environmental shifts.

## 4. The core model

Horizon's data model is the whitepaper's contribution and remains the heart of the system:

- **Themes** — broad groupings of related futures (e.g. "Sahel instability", "AI governance fragmentation"). A theme hosts competing scenarios so analysts can compare and contrast.
- **Scenarios** — short, named, memorable stories about a possible future. Always held as a *set of at least four*, always *living* (revised, retired, replaced). Never a single prediction.
- **Indicators** — one-line descriptors of conditions that would make a scenario more or less likely. Each indicator has a strength (1–9), a time weight (day/week/month/year), and decays over time unless refreshed.
- **Events** — real-world occurrences extracted or captured from the information environment.
- **Links** — weighted, timestamped edges between scenarios↔indicators and indicators↔events, each carrying a strength score and a relevancy score. Links are first-class citizens, not metadata.

This structure is what turns a pile of snippets into a reasoning surface.

## 5. How it thinks

Horizon is **Bayesian in spirit**. It doesn't ask "is this scenario true?" — it asks "given what we've just seen, is this scenario more or less likely than it was yesterday?" Every new event updates the weight on linked indicators, which in turn updates the apparent likelihood of linked scenarios. Nothing is ever proved; everything is continuously re-weighted.

The system is designed to **hold many hypotheses at once**, track how each one moves over time, and make the movement legible.

## 6. What it produces

The primary output is the **Sentinel Assessment** — an on-demand report that answers:

- Which scenarios are trending warmer or colder, over what time window?
- What specific events drove those changes?
- What indicators are currently unfulfilled but would, if observed, materially shift the picture (i.e. a research agenda)?

Sentinel Assessments are the unit of value Horizon delivers to decision-makers.

## 7. Design principles

- **Structure over sprawl.** The data model is the product. No feature earns its place unless it strengthens themes, scenarios, indicators, events, or the links between them.
- **Analyst-in-the-loop, always.** Automation ingests, extracts, tags, and suggests. It does not score scenarios autonomously. Weight and relevancy are human judgements; the machine records and updates them.
- **Living, not archival.** Scenarios are revised, indicators decay, the set evolves. A Horizon instance that hasn't changed in three months is broken, not stable.
- **Legible reasoning.** Every claim in a Sentinel Assessment traces back to events, events to indicators, indicators to scenarios. No black boxes between input and output.
- **Open-source-first.** Horizon consumes open data streams. It does not aggregate personal data, and it is not a surveillance tool.
- **Low maintenance, highly configurable.** An analyst — not a platform engineer — should be able to run a Horizon instance.

## 8. What Horizon is *not*

- Not a news reader or feed aggregator.
- Not a black-box predictive model that outputs probabilities without showing its work.
- Not a surveillance or personal-data system.
- Not a replacement for analyst judgement — a scaffold for it.
- Not a one-shot tool; its value compounds the longer a scenario set is maintained.

## 9. The north star

A single analyst, working alone, should be able to maintain a living set of ~20 scenarios across ~5 themes, supported by a few hundred active indicators and a continuous stream of events — and produce a Sentinel Assessment on any of them in under five minutes, with every claim traceable to source.

If Horizon can do that reliably, it has succeeded.

## 10. What comes next

This VISION is the anchor. From here:

- **ROADMAP.md** — the sequence in which we rebuild `horizon_lite` toward this vision, in shippable MVP slices.
- **TECHSTACK.md** — the specific technical choices (ingestion, storage, NLP, UI) that serve the vision without over-committing.
- **TASKS.md** — the concrete, near-term work queue.

Nothing in those documents should contradict this one. If it does, this one wins — or this one gets rewritten first, deliberately.
