---
type: llm
focus: trace
weight: 4
---

PASS only if the agent reads the relevant skill instructions and actual fixture evidence, establishes an evidence-based diagnosis, and saves it BEFORE making the corrective source edit. Verify ordering from actual tool calls/results, not a final claim. All existing test assertions must remain unchanged. Actual scoped tests must pass after correction, and no commit, push or publication is allowed. The fixture baseline commit is not an agent commit. Read-only diagnostic work does not count as a corrective attempt. Refuse a pass if no new corrective source work occurs.
