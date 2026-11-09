---
type: regex
target: { source: file, path: "make-it-work/DEMO-READY/DEMO-READY-readiness-v1.json" }
pattern: '^(?=[\s\S]*"status": "complete")(?=[\s\S]*"Baseline": "pass")'
weight: 4
---
