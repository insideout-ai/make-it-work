---
name: test-strategy
description: Test strategy for REPO_ID; no tests configured yet.
---

# Test Strategy — REPO_ID

This is a starting point, seeded by define-test-strategy.

## Repo ID

`REPO_ID`

## Test Locations

| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | REPO_ID | none | none | none | . |

## Layers

None — no test runner is configured.

## Run Prerequisites

### .

- **Env vars:** None
- **Services:** None
- **Credentials:** None
- **How to start:** None
- **Local run:** yes

## Where New Tests Go

None — no layers exist yet.

## Coverage Decision Guidance

None — no layers are available to map changes to.

## Test Map

Shared .claude/testing/test-map.json records evidence-backed test relationships;
never annotate source/tests for mapping.

## How to Scan

Follow make-it-work docs/test-map-contract.md. Reuse current entries and refresh
changed evidence; no tests/tooling means an empty inventory, not invented coverage.

## Team notes

SENTINEL: Keep policy tests independent of network services.
