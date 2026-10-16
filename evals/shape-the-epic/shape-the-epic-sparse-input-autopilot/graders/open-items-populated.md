---
type: llm
focus: trace
weight: 2
---

Find the content passed to the `Write` tool call that successfully creates `make-it-work/epic-....md` in this transcript. Its matching `tool_result` must confirm successful file creation. If the write was denied or no epic was saved, FAIL; do not grade the denied draft's content. If multiple writes appear, grade the successful epic write only.

Given the single vague sentence, a correct draft makes missing outcome, scope, behavior, and measurement decisions visible without manufacturing product requirements.

PASS only if the epic was saved and ALL of the following hold:
1. The document lists real open decisions, with their effect on scope, acceptance, or verification. Unknown content remains TBD; any proposed interpretation is clearly marked as provisional.
2. The Decision Log does not mark inferred choices Confirmed or fabricate user decisions. Unknowns and material assumptions leave associated readiness checks unresolved. Do not require an autopilot row when no automatic choice occurred.
3. The document still has all required top-level sections present (What & Why, Definition of Done, Problem & Value Proposition, Target Users & Permissions, KPIs & Success Metrics, Use Cases & Requirements, Rollout Plan, Open Items & Out of Scope) — sparse input is reflected in weaker/placeholder *content*, not missing *sections*.

List any of 1-3 that fail.
