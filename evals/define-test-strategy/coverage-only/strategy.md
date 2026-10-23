---
name: test-strategy
description: Test strategy for the report-only fixture.
---

# Test Strategy

## Repo ID

`report-only-fixture`

## Test Locations

| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | report-only-fixture | none | none | none | . |

## Layers

None

## Run Prerequisites

### .

- **Env vars:** None
- **Services:** None
- **Credentials:** None
- **How to start:** None
- **Local run:** yes

## Where New Tests Go

None

## Coverage Decision Guidance

None

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

## Strategy Decisions

SENTINEL: The user deferred setup discussion until after this coverage report.

## Recommended Setup

Proposed and unverified: use node --test with real task-creation behavior tests.
