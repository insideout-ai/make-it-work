---
type: regex
target: trace
pattern: '\\"site\\":\\"step-review\\"'
match: not_contains
weight: 1
---

Subagent-Driven continuation is identical with and without autopilot, so it
must not create a separate `step-review` decision-log entry.
