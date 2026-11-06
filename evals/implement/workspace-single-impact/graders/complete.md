---
type: regex
target: { source: file, path: "make-it-work/DEMO-201/DEMO-201-state.md" }
pattern: '^(?=[\s\S]*^workspace_version: 1\b)(?=[\s\S]*^status: Complete\b)(?=[\s\S]*^mode: tdd\b)(?=[\s\S]*^review: clean\b)'
flags: m
weight: 4
---
