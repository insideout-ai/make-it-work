---
type: file_exists
path: .claude/run-regression-autopilot-log.jsonl
exists: true
weight: 1
---

The shared writer can initialize this protected-path log in a Bash-granted
eval when the sandbox allows it. If the grader fails, inspect the trace to
distinguish a permission denial from a skill regression; do not retry a
denied write through a different tool or path.
