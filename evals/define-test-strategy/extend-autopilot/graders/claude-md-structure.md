---
type: llm
focus: { source: file, path: "CLAUDE.md" }
weight: 3
---

This file's "After Any Feature Change — CRITICAL" checklist previously started with a "Skill docs" item as item 1 (before this run). Phase 5 of the `define-test-strategy` skill should have inserted one new item about checking the project's regression/test status before every commit, placed FIRST in that checklist — ahead of "Skill docs".

Answer one question: in the current checklist, does a regression/test-check item appear strictly before the "Skill docs" item? Answer PASS if yes, FAIL if "Skill docs" still comes first or no regression-check item exists at all.
