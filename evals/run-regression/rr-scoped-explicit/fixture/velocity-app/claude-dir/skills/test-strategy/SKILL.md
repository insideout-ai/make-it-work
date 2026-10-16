---
name: test-strategy
description: "Test strategy for `velocity-app`: where its tests live (including other repos), how to run them and what they need, where new tests go, and the `@covers` tag convention. Read before planning, writing, running, or reviewing tests for this repo."
---

# Test Strategy — velocity-app

This is a starting point, seeded by `define-test-strategy` — extend and edit it as the project's test approach evolves; it is not a finished document.

## Repo ID

`velocity-app` — the basename of this repo's git toplevel directory at onboarding.

Tags use this ID. If this repo is cloned under a different directory name, tags stop matching — clone it as `velocity-app`.

## Test Locations

Every place this repo's tests live, including other repos. `Location` is relative to this repo's root. `Test files` is a glob of that location's test files. `Run from` is that location's repo root, relative to this repo. The first data row is always this repo itself; if this repo holds no tests, it is the literal row `| . | velocity-app | none | none | none | . |`.

| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | velocity-app | unit | test/*.test.js | npm run test | . |

## Layers

Only layers whose tooling is present in a listed location.

| Layer | For | Not for | Location | Example command |
| --- | --- | --- | --- | --- |
| Unit | Pure billing and velocity logic | Anything that hits a real database or network call | `.` | `npm run test -- test/sprint.test.js` |

## Run Prerequisites

One `###` subsection per row of `## Test Locations`, headed by that row's `Location`. Write `None` where a bullet is empty. `Local run:` is exactly one of `yes`, `ci-only`, `slow` or `flaky` — consumers read it literally.

### .

- **Env vars:** None
- **Services:** None
- **Credentials:** None
- **How to start:** None
- **Local run:** yes

## Where New Tests Go

| Layer | Repo | Directory | File naming |
| --- | --- | --- | --- |
| Unit | `velocity-app` | `test/` | `<module>.test.js` |

## Coverage Decision Guidance

Which layer a change needs. Use only layers listed in `## Layers`.

- Pure invoice or velocity calculation logic → Unit

## Tag Convention

- **Form:** `@covers velocity-app:UC-<id> velocity-app:domain-<name>`, written as a single-line comment in the file's own comment syntax, directly above the test or suite it covers.
- **Qualified tokens:** every token is repo-qualified. `<id>` and `<name>` come verbatim from go-deep's skill directory names.
- **Several tokens:** a line may carry several tokens. A suite-level tag covers the whole suite.
- **Placeholders:** placeholder or skipped-scaffold files are never tagged.
- **Untaggable files:** files with no single-line comment form (e.g. JSON, Postman collections) are listed as untaggable and never edited.
- **PHP:** put the `//` tag line above any docblock, never inside it — PHPUnit parses `@covers` in docblocks.

## How to Scan

- Run once per row of `## Test Locations`, from this repo's root:
  `grep -rlIiE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.claude --exclude-dir=make-it-work '@covers([[:space:]].*)?[[:space:]]<repo>:<tag>([[:space:]]|$)' <Location>`
- Filter the output to paths matching that row's `Test files` glob.
- Before substituting, escape regex metacharacters in `<repo>`, and replace each `-` in `<repo>` and `<tag>` with `[-_]`.
- The matched files are the tests for that tag.
- Coverage gaps are always computed this way, live. Never store a gap list in this file.
