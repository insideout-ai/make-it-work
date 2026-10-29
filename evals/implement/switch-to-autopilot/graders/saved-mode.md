---
type: regex
target: { source: file, path: "make-it-work/DEMO/DEMO-state.md" }
pattern: '(?=[\s\S]*^autonomy: guided$)(?=[\s\S]*^queued_autonomy: autopilot$)(?=[\s\S]*^status: Paused$)[\s\S]+'
flags: m
weight: 2
---
