---
type: llm
focus: { source: file, path: "CLAUDE.md" }
weight: 3
---

Before this run, this `CLAUDE.md`'s "Rules Files" listed only
`architecture.md` and `product.md`, and its "After Any Feature Change —
CRITICAL" checklist started with the "Skill docs" item as item 1. The run
adds a `/test-strategy` pointer only if it wrote the new skill, so the file
may or may not have one.

Answer PASS only if ALL of these hold:
1. Either no row names `/test-strategy` and there is no `### Other Skills` table (pointer not added), or an `### Other Skills` table holds a `/test-strategy` row and `/test-strategy` appears in exactly one row in the whole file (pointer added).
2. "Rules Files" has no row for any testing-strategy file.
3. The checklist still starts with the "Skill docs" item as item 1, with no regression, test-check or coverage item added.

Answer FAIL otherwise, naming the point that fails.
