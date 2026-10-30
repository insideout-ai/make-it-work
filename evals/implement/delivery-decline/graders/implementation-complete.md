---
type: regex
target: { source: file, path: "make-it-work/DEMO/DEMO-state.md" }
pattern: '(?=[\s\S]*^status: Complete$)(?=[\s\S]*^phase: complete$)[\s\S]+'
flags: m
weight: 2
---
