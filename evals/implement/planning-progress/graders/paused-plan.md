---
type: regex
target: { source: file, path: "make-it-work/DEMO-PROGRESS/DEMO-PROGRESS-state.md" }
pattern: '^(?=[\s\S]*^status: Paused$)(?=[\s\S]*^phase: plan$)(?=[\s\S]*^execution: not-started$)(?=[\s\S]*^current_activity: none$)'
flags: m
weight: 3
---
