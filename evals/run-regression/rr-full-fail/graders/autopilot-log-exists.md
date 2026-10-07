---
type: file_exists
path: .claude/run-regression-autopilot-log.jsonl
exists: true
weight: 1
---

Same permission caveat as `rr-full-pass`: inspect the trace if the protected
log write is denied. A Bash-granted eval can grade this file when the shared
writer's operation succeeds.
