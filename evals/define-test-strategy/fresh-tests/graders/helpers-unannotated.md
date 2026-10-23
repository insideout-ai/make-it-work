---
type: regex
target: { source: file, path: "__tests__/domain-tasks-helpers.test.js" }
pattern: "@covers"
match: not_contains
weight: 2
---

The existing domain test remains untouched; relationships belong in the map.
