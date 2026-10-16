---
name: test-strategy
description: "Test strategy for `ledger-api`: where its tests live (including other repos), how to run them and what they need, where new tests go, and the `@covers` tag convention. Read before planning, writing, running, or reviewing tests for this repo."
---

# Test Strategy — ledger-api

This is a starting point, seeded by `define-test-strategy` — extend and edit it as the project's test approach evolves; it is not a finished document.

## Repo ID

`ledger-api` — the basename of this repo's git toplevel directory at onboarding.

Tags use this ID. If this repo is cloned under a different directory name, tags stop matching — clone it as `ledger-api`.

## Test Locations

Every place this repo's tests live, including other repos. `Location` is relative to this repo's root. `Test files` is a glob of that location's test files. `Run from` is that location's repo root, relative to this repo. The first data row is always this repo itself; if this repo holds no tests, it is the literal row `| . | ledger-api | none | none | none | . |`.

| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | ledger-api | none | none | none | . |
| ../qa-automation/tests/payments | qa-automation | behavior | **/*.test.js | npm test -- | ../qa-automation |

## Layers

Only layers whose tooling is present in a listed location.

| Layer | For | Not for | Location | Example command |
| --- | --- | --- | --- | --- |
| Behavior | Ledger entries posted for money movements, exercised from the QA repo | Anything not observable through ledger-api | `../qa-automation/tests/payments` | `npm test -- tests/payments/withdraw_ledger.test.js` (from `../qa-automation`) |

## Run Prerequisites

One `###` subsection per row of `## Test Locations`, headed by that row's `Location`. Write `None` where a bullet is empty. `Local run:` is exactly one of `yes`, `ci-only`, `slow` or `flaky` — consumers read it literally.

### .

- **Env vars:** None
- **Services:** None
- **Credentials:** None
- **How to start:** None
- **Local run:** yes

### ../qa-automation/tests/payments

- **Env vars:** None
- **Services:** None
- **Credentials:** None
- **How to start:** None
- **Local run:** yes

## Where New Tests Go

| Layer | Repo | Directory | File naming |
| --- | --- | --- | --- |
| Behavior | `qa-automation` | `../qa-automation/tests/payments/` | `<flow>_ledger.test.js` |

## Coverage Decision Guidance

Which layer a change needs. Use only layers listed in `## Layers`.

- New or changed ledger entry posting → Behavior

## Tag Convention

- **Form:** `@covers ledger-api:UC-<id> ledger-api:domain-<name>`, written as a single-line comment in the file's own comment syntax, directly above the test or suite it covers.
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
