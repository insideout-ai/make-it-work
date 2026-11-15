---
type: llm
focus: trace
weight: 3
---

Require actual amend-mode planning for the saved missing-regression finding, a saved additional step and the user's requested durable pause before executing it. The existing behavior already works: a passing new regression assertion is valid, and a test-only fix does not need a production change. Fail any production-logic mutation or mutation-testing probe during planning, even if restored before the final diff. Planning may edit tests; this legacy fixture has no controller startup baseline, so do not require a planning receipt or retrofit new state versions. Do not require an agent for Inline-owned planning, a particular shell language, or a failing assertion against already-correct production behavior. Accept a truthful passing baseline or explicitly documented unavailable checks; do not accept invented red evidence. No execution of the new step, unrelated source changes, commits, publication or claimed workflow completion is authorized.
