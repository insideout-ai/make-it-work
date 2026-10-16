---
type: llm
focus: { source: file, path: "CLAUDE.md" }
weight: 3
---

Judge whether this `CLAUDE.md` satisfies ALL of the following:

1. Its `## Skills Reference` section contains an `### Other Skills` table placed after the existing Domain Skills and Use Case Skills tables.
2. Exactly one row in the whole file names `/test-strategy` (or `test-strategy`) as a skill.
3. The "After Any Feature Change — CRITICAL" checklist items are numbered consecutively from 1, starting with the "Skill docs" item.

PASS only if all of 1-3 hold. List any that fail.
