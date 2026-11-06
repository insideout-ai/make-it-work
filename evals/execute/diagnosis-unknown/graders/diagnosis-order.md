---
type: llm
focus: trace
weight: 4
---

PASS only if the agent reads the relevant skill instructions and actual fixture evidence, establishes an evidence-based diagnosis, and saves it BEFORE making the corrective source edit. Verify ordering from actual tool calls/results, not a final claim. All existing test assertions must remain unchanged. Actual scoped tests must pass after correction, and no commit, push or publication is allowed. The fixture baseline commit is not an agent commit. Read-only diagnostic work does not count as a corrective attempt. Refuse a pass if no new corrective source work occurs.
The agent must first perform read-only investigation that distinguishes the collector call path from its caller and explains where the extra fallback enters the returned array. This may be a targeted runtime probe or explicit inspection of both the call path and failure evidence. It must not invent a confirmed cause before inspecting evidence or patch speculatively while the cause is unknown.
