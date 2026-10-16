# Testing Strategy

This is a starting point, seeded by `define-test-strategy` — extend and edit it as the project's test approach evolves; it is not a finished document.

## Test Layers

| Layer | For | Not for |
|---|---|---|
| Unit | Pure functions and isolated modules with mocked dependencies (e.g. `createTask`, `completeTask`, `deleteTask`, `sendReminder`). | Anything that hits a real database, network call, or spans multiple domains. |
| Behavior | A flow spanning a full use-case path (e.g. creating a task and then completing it). | Isolated pure-function logic already covered at the unit layer. |

## Coverage Decision Tree

- Changed a pure function / isolated module with no external dependency (e.g. `src/tasks/*.js`, `src/notifications/sendReminder.js`) → unit layer.
- Changed a cross-service or end-to-end behavior (a flow spanning the full UC path) → behavior layer.

## Commands

This is the section the `run-regression` skill reads to find the full suite command.

- Full suite: `npm test` (runs `node --test`)
- Unit layer example: `node --test __tests__/uc-01-create-task.test.js`
- Behavior layer example: `node --test __tests__/domain-tasks-helpers.test.js`

## UC/Domain Tag Convention

- Use-case identifiers take the form `UC-{zero-padded-id}` (e.g. `UC-01`).
- Domain identifiers take the form `domain-{name}` (e.g. `domain-tasks`).
- A test file is tagged by its own path, never by anything parsed out of its content. A file carries a tag when the tag token appears as a substring of its path (directory name and/or filename) relative to the repo root, matched case-insensitively with `-`/`_` treated as interchangeable, and respecting the id's trailing-digit boundary (`UC-01` must never match inside `UC-010`).
- Mapping rule: a tag maps to `go-deep`'s own skill directory names by simple prefix/exact match — `UC-01` corresponds to `.claude/skills/uc-01-create-task`, `domain-tasks` corresponds exactly to `.claude/skills/domain-tasks`. Name every test file — scaffolded or hand-written — after the matching skill directory, so the tag is simply "born" in the filename; no separate in-content annotation is ever required or read.
- **Placeholder marker**: a scaffolded placeholder test additionally carries a marker as its file's very first line, written as a single-line comment in that file's own language, e.g. `// baseline placeholder scaffolded by define-test-strategy — pending real coverage, not a forgotten test` in a C-style language. This is checked by reading the file's first line as plain text — never by inspecting test-runner state.
