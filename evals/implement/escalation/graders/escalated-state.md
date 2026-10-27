---
type: regex
target: { source: file, path: "make-it-work/DEMO/DEMO-state.md" }
pattern: '^(?=[\s\S]*^adaptive_version: 1\b)(?=[\s\S]*^risk: \w)(?=[\s\S]*^mode: tdd\b)(?=[\s\S]*^mode_source: assessed\b)(?=[\s\S]*^escalations: 1\b)(?=[\s\S]*^review_cycle: 0\b)(?=[\s\S]*^fix_cycle: 0\b)(?=[\s\S]*^implementation_report: make-it-work/DEMO/DEMO-lightweight\.md\b)'
flags: m
weight: 3
---
