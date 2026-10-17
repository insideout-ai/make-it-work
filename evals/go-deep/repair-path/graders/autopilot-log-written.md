---
type: regex
target: { source: file, path: "make-it-work/go-deep-autopilot-log.jsonl" }
pattern: "\"site\":\\s*\"workflow-choice\"[^\\n]*\"chosen\":\\s*\"Repair existing docs|\"chosen\":\\s*\"Repair existing docs[^\\n]*\"site\":\\s*\"workflow-choice\""
weight: 3
---

The decision log sits outside `.claude/`, so a headless run with Bash allowed
can write it. The Phase 0 workflow choice is resolved before any repair write,
so a written log always has a `workflow-choice` line choosing "Repair existing
docs".
