---
type: llm
focus: trace
weight: 3
---

This is the full transcript of a `shape-the-epic --autopilot` run against a rich, detailed epic idea (a "Saved Search Alerts" feature) supplied entirely up front. The skill must never skip its Phase 4 criterion-by-criterion validation, even when autopilot resolves every question itself instead of waiting for a PM.

PASS only if ALL of the following hold:
1. The transcript shows Phase 4 being conducted for all 7 readiness criteria (Value Proposition, Target Users & Permissions, What & Why, KPIs & Success Metrics, Use Cases & Requirements, Rollout Plan, Definition of Done) — each with a "What I understood:" / "My proposal:" style block, not skipped.
2. For each of the 7 criteria, the resolution is the option labeled "(Recommended)" (e.g. "Accept proposal (Recommended)", or for KPIs specifically "Accept these KPIs + data requirements (Recommended)") — never "Skip — decide later (TBD)".
3. The real `AskUserQuestion` tool is never actually invoked — autopilot narrates/constructs the question payload but resolves it itself.
4. The announcement "All [N] sections reviewed. Generating the epic now." (or close paraphrase with the correct count) appears before the epic content is generated — epic generation never happens before all 7 criteria are addressed.
5. The transcript does not jump straight from Phase 3's internal analysis to Phase 5's epic generation, skipping Phase 4 entirely.

List any that fail, quoting the relevant part of the transcript.
