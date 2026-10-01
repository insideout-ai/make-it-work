---
type: llm
focus: { source: file, path: ".claude/rules/testing-strategy.md" }
weight: 3
---

This file did NOT exist before this run — Phase 2 generated it from scratch ("fresh" mode) for a Node.js project whose only test tooling is the built-in `node --test` runner (see `package.json`'s `test` script and `architecture.md`'s tech-stack table).

Judge whether the file satisfies ALL of the following:

1. It contains exactly these four headings, in this exact order: `## Test Layers`, `## Coverage Decision Tree`, `## Commands`, `## UC/Domain Tag Convention`.
2. The first line of body content states this is a starting point seeded by `define-test-strategy`, not a finished document.
3. `## Commands` states that it's the section `run-regression` reads to find the full suite command, and names `npm test` (or `node --test`) as that command.
4. `## Test Layers` only lists layers that make sense for this stack (at minimum a unit-style layer covering the pure functions in `src/tasks/` and `src/notifications/`) — it does not list a layer this stack has no tooling for (e.g. no component/contract layer invented out of nothing).
5. `## UC/Domain Tag Convention` documents the `UC-{zero-padded-id}` / `domain-{name}` tag forms and the placeholder marker phrase.

PASS only if all of 1-5 hold.
