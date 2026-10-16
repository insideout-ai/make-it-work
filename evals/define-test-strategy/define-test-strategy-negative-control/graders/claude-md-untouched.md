---
type: llm
focus: { source: file, path: "CLAUDE.md" }
weight: 3
---

Before this run, this `CLAUDE.md` contained a SENTINEL sentence, a "Rules
Files" row for `.claude/rules/testing-strategy.md`, and no `/test-strategy`
skill row. The run should have stopped before editing it.

Answer PASS only if ALL of these hold:
1. The sentence "SENTINEL: reminders always escalate overdue items to on-call staff within one hour." is present and intact.
2. The "Rules Files" section still has its row naming `.claude/rules/testing-strategy.md`.
3. No row or table anywhere names `/test-strategy` (or `test-strategy`) as a skill, and there is no `### Other Skills` table.

Otherwise answer FAIL.
