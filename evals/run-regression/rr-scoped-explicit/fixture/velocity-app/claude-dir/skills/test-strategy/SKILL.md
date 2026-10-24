---
name: test-strategy
description: "Test strategy for `velocity-app`: where its tests live (including other repos), how to run them and what they need, where new tests go, and the maintained test map. Read before planning, writing, running, or reviewing tests for this repo."
---

# Test Strategy — velocity-app

This is a starting point, seeded by `define-test-strategy` — extend and edit it as the project's test approach evolves; it is not a finished document.

## Repo ID

`velocity-app` — the basename of this repo's git toplevel directory at onboarding.

Map tokens use this product Repo ID.

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
