# Testing Strategy

## Test Layers

- **Unit** — pure functions and isolated modules with mocked dependencies. Not for: anything that hits a real database, network call, or renders a component tree.

## Coverage Decision Tree

- Changed a pure function / isolated module with no external dependency → unit layer

## Commands

This is the section the `run-regression` skill reads to find "the full suite command".

- Full suite: `npm run test`
- Unit example: `node --test test/domain-billing.test.js`

## UC/Domain Tag Convention

- Use-case identifiers take the form `UC-{zero-padded-id}` (e.g. `UC-08`).
- Domain identifiers take the form `domain-{name}` (e.g. `domain-velocity`).
- A test file is tagged by its own path, never by anything parsed out of its content. A file carries a tag when the tag token appears as a substring of its path (directory name and/or filename) relative to the repo root, matched case-insensitively with `-`/`_` treated as interchangeable, and respecting the id's trailing-digit boundary (`UC-01` must never match inside `UC-010`).
- Mapping rule: a tag maps to `go-deep`'s own skill directory names by simple prefix/exact match — `UC-01` corresponds to a skill directory named `uc-01-<kebab-case-name>`, and `domain-velocity` corresponds exactly to a skill directory named `domain-velocity`.
- **Placeholder marker**: a scaffolded placeholder test additionally carries a marker as its file's very first line, e.g. `// baseline placeholder scaffolded by define-test-strategy — pending real coverage, not a forgotten test`.
