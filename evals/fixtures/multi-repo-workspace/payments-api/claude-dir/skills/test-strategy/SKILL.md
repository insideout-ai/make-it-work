---
name: test-strategy
description: "Test strategy for `payments-api`: where its tests live (including other repos), how to run them and what they need, where new tests go, and the maintained test map. Read before planning, writing, running, or reviewing tests for this repo."
---

# Test Strategy — payments-api

This is a starting point, seeded by `define-test-strategy` — extend and edit it as the project's test approach evolves; it is not a finished document.

## Repo ID

`payments-api` — the basename of this repo's git toplevel directory at onboarding.

Map tokens use this product Repo ID.

## Test Locations

Every place this repo's tests live, including other repos. `Location` is relative to this repo's root. `Test files` is a glob of that location's test files. `Run from` is that location's repo root, relative to this repo. The first data row is always this repo itself; if this repo holds no tests, it is the literal row `| . | payments-api | none | none | none | . |`.

| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | payments-api | unit | test/**/*.test.js | npm test | . |
| ../qa-automation/tests/payments | qa-automation | behavior | **/*.test.js | npm test -- | ../qa-automation |
| ../qa-automation/tests/e2e | qa-automation | e2e | **/*.test.js | npm test -- | ../qa-automation |

## Layers

Only layers whose tooling is present in a listed location.

| Layer | For | Not for | Location | Example command |
| --- | --- | --- | --- | --- |
| Unit | Pure withdrawal and limit logic in `src/` | HTTP behavior, cross-service flows | `.` | `npm test -- test/limits.test.js` |
| Behavior | `/payments` endpoint behavior, exercised from the QA repo | Pure function edge cases | `../qa-automation/tests/payments` | `npm test -- tests/payments/withdraw.test.js` (from `../qa-automation`) |
| E2E | Full withdrawal flow against the deployed stack | Anything checkable without the stack | `../qa-automation/tests/e2e` | `npm test -- tests/e2e/flow.test.js` (from `../qa-automation`, CI only) |

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

### ../qa-automation/tests/e2e

- **Env vars:** None
- **Services:** None
- **Credentials:** None
- **How to start:** CI deploys the full stack before this suite runs.
- **Local run:** ci-only

## Where New Tests Go

| Layer | Repo | Directory | File naming |
| --- | --- | --- | --- |
| Unit | `payments-api` | `test/` | `<module>.test.js` |
| Behavior | `qa-automation` | `../qa-automation/tests/payments/` | `<flow>.test.js` |
| E2E | `qa-automation` | `../qa-automation/tests/e2e/` | `<flow>.test.js` |

## Coverage Decision Guidance

Which layer a change needs. Use only layers listed in `## Layers`.

- Pure withdrawal or velocity-limit logic → Unit
- New or changed `/payments` endpoint behavior → Behavior
- Change to the end-to-end withdrawal flow across services → E2E

## Test Map

Shared .claude/testing/test-map.json records evidence-backed test identities and
product-qualified UC/domain relationships. Source/tests are never annotated.

## How to Scan

Follow make-it-work docs/test-map-contract.md and scripts/test-map.mjs. Inspect
registrations and freshness; reuse unchanged relationships and reassess affected
tests/evidence. If the map is absent, discover tests using the configured runner
and Test Locations patterns, inspect assertions and trace behavior to product
and domain documentation. Use runner-supported file/test selectors, not tags.
No tests/tooling means an empty inventory, not an invented test command.
