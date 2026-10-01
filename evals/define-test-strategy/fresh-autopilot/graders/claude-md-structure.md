---
type: llm
focus: { source: file, path: "CLAUDE.md" }
weight: 3
---

This file's "After Any Feature Change — CRITICAL" checklist previously started with a "Skill docs" item as item 1 (before this run), and the "Rules Files" section previously listed only `architecture.md` and `product.md`.

Judge whether BOTH of these now hold:
1. The "Rules Files" section has one new row referencing `.claude/rules/testing-strategy.md`, and the original two rows are unchanged.
2. A regression/test-check item now appears strictly before the "Skill docs" item in the "After Any Feature Change" checklist.

Answer PASS only if both hold.
