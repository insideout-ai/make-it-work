---
type: regex
target: { source: file, path: "__tests__/uc-01-create-task.test.js" }
pattern: "@covers [^\\n]*:UC-01"
weight: 3
---

The old path-tagged UC-01 test now carries a repo-qualified `@covers` tag.
