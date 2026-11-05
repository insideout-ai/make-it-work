---
type: llm
focus: { source: file, path: "make-it-work/epic-*.md" }
weight: 2
---

Judge the saved epic Markdown supplied as evidence, regardless of which permitted tool wrote it. A direct `Write` call or transcript readback is not required. Missing, empty, or ambiguous artifact evidence fails. Heading capitalization and inline Markdown emphasis do not affect the criteria below.

Given the single vague sentence, a correct draft makes missing outcome, scope, behavior, and measurement decisions visible without manufacturing product requirements.

PASS only if the epic was saved and ALL of the following hold:
1. The document lists real open decisions, with their effect on scope, acceptance, or verification. Unknown content remains TBD; any proposed interpretation is clearly marked as provisional.
2. The Decision Log does not mark inferred choices Confirmed or fabricate user decisions. Unknowns and material assumptions leave associated readiness checks unresolved. Do not require an autopilot row when no automatic choice occurred.
3. The document still has all required top-level sections present (What & Why, Definition of Done, Problem & Value Proposition, Target Users & Permissions, KPIs & Success Metrics, Use Cases & Requirements, Rollout Plan, Open Items & Out of Scope) — sparse input is reflected in weaker/placeholder *content*, not missing *sections*.

List any of 1-3 that fail.
