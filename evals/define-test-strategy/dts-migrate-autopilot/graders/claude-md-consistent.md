---
type: llm
focus: { source: file, path: "CLAUDE.md" }
weight: 3
---

This `CLAUDE.md` started with a "Rules Files" row naming
`.claude/rules/testing-strategy.md` and an "After Any Feature Change"
checklist item 1 about checking the regression/coverage status before
committing. It must end in exactly one of these two states.

**Unchanged** (the new skill could not be written):
1. The Rules Files row naming `.claude/rules/testing-strategy.md` is present.
2. The regression/coverage checklist item is present.
3. No row names `/test-strategy` as a skill, and there is no `### Other Skills` table.

**Migrated** (the new skill was written):
1. No Rules Files row names `testing-strategy.md`.
2. No checklist item about checking the regression/coverage status; the checklist is numbered from 1 and starts with the "Skill docs" item.
3. An `### Other Skills` table holds a `/test-strategy` row, and `/test-strategy` appears in exactly one row in the whole file.

Answer PASS only if every point of one state holds. Answer FAIL on any mix,
for example a `/test-strategy` row added while the old Rules Files row is
still there. Name the state you matched, or the points that fail.
