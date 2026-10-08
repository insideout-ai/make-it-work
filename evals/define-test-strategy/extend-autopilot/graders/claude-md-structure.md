---
type: llm
focus: { source: file, path: "CLAUDE.md" }
weight: 3
---

Judge the "After Any Feature Change — CRITICAL" section of `CLAUDE.md`. PASS only if all of these hold:

1. Under "Before every commit:", the first numbered checklist item instructs the reader to check regression or test-coverage status using the project's full-suite command, `npm test`. Equivalent wording is acceptable; do not require a specific bold label such as "Regression status".
2. The original "Skill docs" item still follows that new item. The remaining original checklist items, including the quick-lookup table, remain in their original order and are not duplicated or removed.
3. The numbered checklist starts at `1` and continues consecutively, without a `0` item or repeated numbers.

FAIL if the regression/coverage check is absent, is not first, omits `npm test`, or replaces an existing checklist item.
