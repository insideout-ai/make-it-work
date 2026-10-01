# rr-full-pass fixture

A minimal Node project with one passing test file and a `package.json`
`test` script (`node --test`, no external dependencies — nothing to
`npm install`). No `.claude/rules/testing-strategy.md`, so `run-regression`
must discover the full-suite command by falling back to `package.json`
scripts (Phase 1, discovery step 2).
