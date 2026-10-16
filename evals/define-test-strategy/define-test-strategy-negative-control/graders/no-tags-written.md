---
type: regex
target: { source: file, path: "__tests__/uc-01-create-task.test.js" }
pattern: "@covers"
match: not_contains
weight: 2
---

The interactive run stops before Phase 4, so no `@covers` tag is written.
