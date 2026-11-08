---
type: regex
target: { source: file, path: "make-it-work/drive-*/state.json" }
pattern: '^  "phase": "complete",\r?\n  "status": "Complete"'
flags: m
weight: 3
---
Require an actually saved preparation-complete checkpoint.
