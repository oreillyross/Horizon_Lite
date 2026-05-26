# ALIGNMENT.md

## What Horizon_Lite Is NOT

These constraints are deliberate.
They exist to prevent architectural drift, UX bloat, and LLM-generated feature creep.

If a proposed feature conflicts with this document, this document wins.

---

## Horizon_Lite is NOT a generic intelligence platform

Do not build:
- plugin ecosystems
- user scripting systems
- workflow automation builders
- Zapier-style integrations
- multi-product platform abstractions
- "AI operating system" concepts

Horizon_Lite is a focused analyst workflow tool.

---

## Horizon_Lite is NOT a social platform

Do not build:
- social feeds
- likes
- comments
- reactions
- follower systems
- public profiles
- chat systems
- collaborative whiteboards
- activity feeds

The analyst's relationship is with evidence and scenarios, not with other users.

---

## Horizon_Lite is NOT a real-time operations center

Do not optimize for:
- millisecond latency
- websocket-heavy live dashboards
- tactical command-and-control workflows
- live map tracking
- streaming operational telemetry
- "war room" interfaces

Horizon is strategic and reflective, not tactical and real-time.

---

## Horizon_Lite is NOT an AI-first autonomous system

Do not build:
- autonomous scenario scoring
- autonomous decision-making
- autonomous report conclusions
- opaque AI weighting systems
- agent swarms making analyst decisions
- fully automated forecasting

AI assists.
Analysts judge.

All meaningful reasoning must remain legible and inspectable.

---

## Horizon_Lite is NOT a surveillance platform

Do not build:
- personal tracking
- facial recognition
- biometric analysis
- location tracking
- individual profiling
- social graph analysis
- private-data ingestion
- covert collection tooling

Focus on strategic environmental signals and open-source information only.

---

## Horizon_Lite is NOT an enterprise process machine

Do not build:
- excessive RBAC matrices
- enterprise workflow engines
- Jira-style process management
- approval bureaucracy
- complex admin consoles
- highly granular permissions
- configurable everything

Prefer:
- small surface area
- opinionated workflows
- sensible defaults
- analyst speed

---

## Horizon_Lite is NOT a data lake

Do not:
- ingest everything
- store unlimited raw feeds forever
- optimize for massive archival scale
- accumulate unused entities
- preserve low-value data indefinitely

The goal is analytical clarity, not maximum data retention.

---

## Horizon_Lite is NOT a dashboard collection

Do not create:
- disconnected widgets
- vanity metrics
- chart spam
- "single pane of glass" UX
- analytics for the sake of analytics

Every screen must strengthen:
theme → scenario → indicator → event reasoning.

---

## Horizon_Lite is NOT microservice-first

Do not prematurely introduce:
- distributed architectures
- event buses
- Kubernetes complexity
- service meshes
- separate API gateways
- unnecessary queues

Prefer:
- monolith first
- explicit flows
- direct database access
- operational simplicity

Complexity must be earned.

---

## Horizon_Lite is NOT configuration-driven everywhere

Do not turn every concept into:
- dynamic schemas
- admin-defined object systems
- visual builders
- infinitely configurable pipelines

Core concepts are fixed:
- themes
- scenarios
- indicators
- events
- links

The structure IS the product.

---

## Horizon_Lite is NOT optimized for infinite scale

Optimize for:
- one analyst
- then a small analyst team
- deep thinking
- clarity
- reliability
- maintainability

Not:
- millions of concurrent users
- hyperscale infra
- growth hacks
- engagement loops

---

## Technologies and Patterns We Avoid

Avoid introducing unless absolutely necessary:

- GraphQL
- Redux-scale global state
- ORM abstraction layers beyond Drizzle
- multiple API paradigms
- client-side AI calls
- websocket dependency
- excessive background job systems
- premature caching layers
- micro-frontends
- highly abstracted design systems

The current stack is intentionally constrained.

---

## UX Anti-Goals

Avoid:
- modal overload
- excessive nesting
- dense enterprise tables everywhere
- hidden state
- multi-step wizard fatigue
- unexplained AI outputs
- visual noise
- analyst cognitive overload

The UI should feel:
- calm
- legible
- deliberate
- information-dense without chaos
- closer to a research notebook than a corporate dashboard

---

## Decision Filter

When uncertain:

1. Prefer clarity over capability
2. Prefer legibility over automation
3. Prefer analyst judgement over AI autonomy
4. Prefer simplicity over flexibility
5. Prefer explicit structure over generic abstraction
6. Prefer operational calm over technical cleverness
7. Prefer maintainability over theoretical scalability