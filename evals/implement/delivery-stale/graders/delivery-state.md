---
type: regex
target: { source: file, path: "make-it-work/DEMO/DEMO-delivery-progress.json" }
pattern: '(?=[\s\S]*"status": "failed")(?=[\s\S]*"error": "[^"]*[Ss]tale)[\s\S]+'
weight: 3
---
