---
type: regex
target: { source: file, path: "make-it-work/DEMO-READY/hook-events.jsonl" }
pattern: '^(?=[^\n]*"kind"\s*:\s*"readiness-pending")(?=[^\n]*"phase"\s*:\s*"plan")'
flags: m
weight: 4
---
