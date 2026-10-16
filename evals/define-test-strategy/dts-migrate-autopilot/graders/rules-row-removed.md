---
type: regex
target: { source: file, path: "CLAUDE.md" }
pattern: "testing-strategy\\.md"
match: not_contains
weight: 2
---

The old Rules Files row (and the old checklist item, which also names the
file) are gone from `CLAUDE.md`.
