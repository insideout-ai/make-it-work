---
type: regex
target: { source: file, path: "__tests__/uc-01-create-task.test.js" }
pattern: "@covers"
match: not_contains
weight: 3
---

The existing UC-01 test remains unannotated; its relationship belongs in shared metadata.
