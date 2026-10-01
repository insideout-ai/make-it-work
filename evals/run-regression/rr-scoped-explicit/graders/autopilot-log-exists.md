---
type: file_exists
path: .claude/run-regression-autopilot-log.jsonl
exists: true
weight: 1
---

Checklist-only, same caveat as `rr-full-pass`'s identical grader: only
meaningful on a manual `--dangerously-skip-permissions` run, since
`.claude/` writes aren't unblocked by any `claude plugin eval` tool grant.
