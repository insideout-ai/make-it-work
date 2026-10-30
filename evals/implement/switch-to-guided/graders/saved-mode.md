---
type: regex
target: { source: file, path: "make-it-work/DEMO/DEMO-state.md" }
pattern: '(?=[\s\S]*^autonomy: autopilot$)(?=[\s\S]*^queued_autonomy: guided$)[\s\S]+'
flags: m
weight: 2
---
