---
type: llm
focus: trace
weight: 2
---

Find the content passed to the `Write` tool call that successfully creates `make-it-work/epic-....md` in this transcript. Its matching `tool_result` must confirm successful file creation. If the write was denied or no epic was saved, FAIL; do not grade the denied draft's content. If multiple writes appear, grade the successful epic write only.

Given how little the PM provided up front (a single vague sentence, no users, outcome, KPIs, or rollout stated), a correct run should leave a visible trail of what autopilot had to guess or couldn't resolve.

PASS only if the epic was saved and ALL of the following hold:
1. The document's "Open Items & Out of Scope" section is not simply "None noted." for both subsections — at least one genuine open item is listed, OR the KPIs/Use Cases/Rollout sections visibly contain placeholder/best-guess content flagged as such (e.g. an inline "⚠️ Open item" callout, or a `[autopilot best-guess]`-marked Decision Log row).
2. The `## Decision Log` table at the end of the document includes at least one row marked either `[autopilot best-guess]` or `_(autopilot)_`, showing a PM did not actually confirm that row.
3. The document still has all required top-level sections present (What & Why, Definition of Done, Problem & Value Proposition, Target Users & Permissions, KPIs & Success Metrics, Use Cases & Requirements, Rollout Plan, Open Items & Out of Scope) — sparse input is reflected in weaker/placeholder *content*, not missing *sections*.

List any of 1-3 that fail.
