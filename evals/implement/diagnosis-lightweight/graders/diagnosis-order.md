---
type: llm
focus: trace
weight: 4
---

PASS only if the agent reads the relevant skill instructions and actual fixture evidence, establishes an evidence-based diagnosis, and saves it BEFORE making the corrective source edit. Verify ordering from actual tool calls/results, not a final claim. All existing test assertions must remain unchanged. Actual scoped tests must pass after correction, and no commit, push or publication is allowed. The fixture baseline commit is not an agent commit. Read-only diagnostic work does not count as a corrective attempt. Refuse a pass if no new corrective source work occurs.
The parent must save a diagnosis summary in the existing audit before fix dispatch; the fresh fix executor must preserve the diagnosis in the existing report and then verify the correction. No TDD plan is needed for this local pure-helper fix.

The trace must show successful lightweight-fix.mjs checkpoint and inspect calls before the fresh fix-agent dispatch. Diagnosis appended only after a source edit, or a helper call made only to repair a rejected completion afterward, does not meet this requirement.
