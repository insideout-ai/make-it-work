---
type: tool_used
tool: Bash
input_match: "decision-log\\.mjs"
min: 1
weight: 1
---

The Bash-granted happy path should initialize its empty autopilot log with
the shared writer, not hand-edit JSONL.
