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

## Tag Convention

Use repo-qualified `@covers REPO_ID:domain-demo` single-line comments.

## How to Scan

Scan test files for repo-qualified @covers tokens; compute gaps live.

## Team notes

SENTINEL: Keep policy tests independent of network services.
