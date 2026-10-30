---
type: regex
target: { source: file, path: ".claude/testing/test-map.json" }
pattern: '(?=[\s\S]*"complete": false)(?=[\s\S]*"snapshots": \{\})(?=[\s\S]*"file": "test/policy-boundary.test.js")(?=[\s\S]*"test": "privacy-hidden")[\s\S]+'
weight: 3
---
