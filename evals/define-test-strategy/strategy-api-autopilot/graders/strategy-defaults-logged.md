---
type: llm
focus: trace
weight: 2
---

PASS if the unattended run does not ask the user or wait for confirmation,
constructs and resolves a substantive strategy question about unknown test
database availability/approach, and records its recommendation and uncertainty.
When log writes succeed, the JSONL must include a Phase 3a strategy-question-<n>
askUserQuestion record with actual question/options, multiSelect false, a chosen
option from that list and a rationale, plus a strategy-confirm checkpoint.
If log writing is explicitly denied, accept the documented denial plus labeled
defaults/assumptions in the generated strategy. Do not accept an invented claim
that the user approved database access, or an unacknowledged missing log.
