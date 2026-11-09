---
type: regex
target: { source: file, path: "make-it-work/DEMO-WAIT/hook-events.jsonl" }
pattern: '^(?=[^\n]*"kind"\s*:\s*"agent-wait")(?=[^\n]*"phase"\s*:\s*"plan")'
flags: m
weight: 4
---
