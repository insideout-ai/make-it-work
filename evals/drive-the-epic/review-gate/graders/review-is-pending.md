---
type: regex
target: { source: file, path: "make-it-work/drive-*/state.json" }
pattern: '(?=[\s\S]*^  "phase": "epic-review")(?=[\s\S]*^  "status": "Paused")(?=[\s\S]*"kind": "epic-review")(?=[\s\S]*"slices": \[\])[\s\S]+'
flags: m
weight: 3
---
Require an actual pending full-epic review with no slices generated.
