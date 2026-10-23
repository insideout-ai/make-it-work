---
name: test-strategy
description: Test strategy for FIXTURE_REPO_ID.
---

# Test Strategy

## Repo ID

`FIXTURE_REPO_ID`

## Test Locations

| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | FIXTURE_REPO_ID | Unit | src/**/*.test.js | npm test | . |

## Layers

Only layers whose tooling is present in a listed location.

| Layer | For | Not for | Location | Example command |
| --- | --- | --- | --- | --- |
| Unit | Pure helpers | Component rendering | . | npm test -- src/lib/lineTotal.test.js |

## Run Prerequisites

### .

- **Env vars:** None
- **Services:** None
- **Credentials:** None
- **How to start:** npm install, then npm test
- **Local run:** yes

## Where New Tests Go

| Layer | Repo | Directory | File naming |
| --- | --- | --- | --- |
| Unit | FIXTURE_REPO_ID | src/lib/ | <module>.test.js |

## Coverage Decision Guidance

- Pure logic → Unit
- Component behavior → no configured layer; see Recommended Setup

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

### Current Coverage

Only helper-unit tests, with the existing Vitest node configuration.

### Recommended Target Coverage

Unit and component tests first. Backend handler integration later.

### First Adoption Phase

The user selected unit PLUS component coverage, accepting new dev dependencies.
Component tests go alongside src/PurchaseForm.jsx as PurchaseForm.test.jsx.
Backend integration is deferred until backend work resumes.

| Decision | Choice and rationale | Source |
| --- | --- | --- |
| Initial layers | Unit plus Component | user |
| Backend integration | Deferred until backend work resumes | user |
| Keep runner | Vitest | user |

## Recommended Setup

Proposed: add jsdom and Testing Library, configure component files to use jsdom,
and include src/**/*.test.jsx in the runner. No setup has been performed.

## Team Notes

SENTINEL: preserve the user's first-phase component selection.
