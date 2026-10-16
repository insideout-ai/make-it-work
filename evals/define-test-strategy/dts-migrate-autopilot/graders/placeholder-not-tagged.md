---
type: regex
target: { source: file, path: "__tests__/uc-02-complete-task.test.js" }
pattern: "@covers"
match: not_contains
weight: 3
---

Placeholder files are never tagged.
