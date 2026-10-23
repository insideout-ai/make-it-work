---
name: test-strategy
description: "Test strategy for `ledger-api`: where its tests live (including other repos), how to run them and what they need, where new tests go, and the maintained test map. Read before planning, writing, running, or reviewing tests for this repo."
---

# Test Strategy — ledger-api

This is a starting point, seeded by `define-test-strategy` — extend and edit it as the project's test approach evolves; it is not a finished document.

## Repo ID

`ledger-api` — the basename of this repo's git toplevel directory at onboarding.

Map tokens use this product Repo ID.

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
