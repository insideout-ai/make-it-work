---
type: llm
focus: last_message
weight: 3
---

Judge whether this message shows the `define-test-strategy` skill stopping to ask the user how to proceed (e.g. "Extend existing strategy file" vs "Re-check coverage only", or an equivalent Phase 1 decision prompt) — WITHOUT having already scaffolded any test file or reported a finished coverage report. Answer PASS if the message is a genuine unanswered question/checkpoint. Answer FAIL if the message instead reports that test files were scaffolded, `CLAUDE.md` was edited, or Phase 3/4/5 work was completed.
