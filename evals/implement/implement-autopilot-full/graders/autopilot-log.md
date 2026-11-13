---
type: regex
target: { source: file, path: "make-it-work/DEMO-101/implement-autopilot-log.jsonl" }
pattern: "^\\{[^\\n]*\"site\"\\s*:\\s*\"startup-branch\"[^\\n]*\"chosen\"\\s*:\\s*\"DEMO-101: branch DEMO-101; base main\"[^\\n]*\\}$"
flags: m
weight: 2
---

New controller startup must retain its actual branch/base checkpoint, not merely mention branch somewhere in another decision.
