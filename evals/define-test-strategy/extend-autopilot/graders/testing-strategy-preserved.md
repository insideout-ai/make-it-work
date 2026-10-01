---
type: llm
focus: { source: file, path: ".claude/rules/testing-strategy.md" }
weight: 2
---

This file existed, complete and correct, before this run (extend mode with nothing missing). Judge whether it still satisfies ALL of the following:

1. It contains exactly these four headings, in this exact order: `## Test Layers`, `## Coverage Decision Tree`, `## Commands`, `## UC/Domain Tag Convention` — each appearing exactly once.
2. The first line of body content (right under the title) still states this is a starting point seeded by `define-test-strategy`, not a finished document.
3. The `## Commands` section still states that it is the section the `run-regression` skill reads to find the full suite command, and still names `npm test` as the full suite command.
4. The `## UC/Domain Tag Convention` section still documents the `UC-{zero-padded-id}` and `domain-{name}` tag forms and the placeholder marker phrase.
5. Nothing looks duplicated (no heading appears twice, no section repeated).

PASS only if all of 1-5 hold.
