---
type: llm
focus: trace
weight: 3
---

PASS only if actual commands execute all of these from embedded-tests:
the embedded DiscountTests, the discounted_total doctest, and separate label
tests selected by their UC-03 tag. Supported equivalents are acceptable.
Python unittest uses module/class/test selectors, not blindly appended source
paths to make test. The configured doctest invocation is distinct and must not
be dropped because the same source file already ran through unittest.

The run must supplement the legacy tag-only strategy read-only. It must not
declare UC-01 unmapped for lacking tags, invent helper-to-UC relationships, or
silently run make test/the full service. If a larger enclosing scope is needed,
it must name that scope before execution and in its result. The final report
must retain token-run Workspace/Mode/Repo/Suite(s) run/Gate result/Not run/
Unmapped scope/Overall grammar and PASS for successful commands only. Evidence
for inferred checkout selection must be visible. No source or strategy edits.
