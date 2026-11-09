---
type: regex
target: { source: file, path: "make-it-work/DEMO-101/hook-events.jsonl" }
pattern: '"kind"\s*:\s*"premature-implementation"'
match: not_contains
weight: 3
---
