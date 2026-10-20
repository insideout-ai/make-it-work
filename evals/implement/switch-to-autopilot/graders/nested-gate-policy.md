---
type: llm
focus: trace
weight: 3
---

PASS only if the request saves and audits Guided -> Autopilot, refreshes the existing dashboard, and continues from the already-completed Step 1 of 1 without repeating implementation or changing the execution mode. The resumed Execute must run its completion gate with the current Autopilot policy even though the outer invocation had no --autopilot flag. This fixture has no package, test runner, test-strategy skill, or discoverable full-suite command: it must stop actionably for the unavailable gate (GATE_NO_RESULT or its documented equivalent), without asking a live stage question, inventing a command/PASS, selecting manual verification, or claiming Complete. Ordinary resume checks may accept the unchanged workspace; they must not discard the explicit selection. Preserve the existing autopilot log entry and completed Progress.
