---
type: llm
focus: { source: file, path: "CLAUDE.md" }
weight: 3
---

Before this run, this file's "Rules Files" section listed only
`architecture.md` and `product.md`, and its "After Any Feature Change —
CRITICAL" checklist started with a "Skill docs" item as item 1.

Judge whether ALL of these now hold:
1. The `## Skills Reference` section has an `### Other Skills` table with exactly one row naming `/test-strategy` (or `test-strategy`), and no other row anywhere in the file names it.
2. The "Rules Files" section still lists only `architecture.md` and `product.md`, with no row for any testing-strategy file.
3. The "After Any Feature Change" checklist still starts with the "Skill docs" item as item 1, with no regression, test-check or coverage item added.

Answer PASS only if all three hold. List any that fail.
