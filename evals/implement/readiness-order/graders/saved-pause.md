---
type: regex
target: { source: file, path: "make-it-work/DEMO-READY/DEMO-READY-state.md" }
pattern: '^(?=[\s\S]*^status: Paused$)(?=[\s\S]*^phase: plan$)(?=[\s\S]*^execution: not-started$)'
flags: m
weight: 3
---
