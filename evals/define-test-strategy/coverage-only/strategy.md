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

## Tag Convention

Use single-line `@covers report-only-fixture:UC-<id>` comments above real tests.

## How to Scan

Run once per vocabulary token from this repo root:
`grep -rlIiE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.claude --exclude-dir=make-it-work '@covers([[:space:]].*)?[[:space:]]<repo>:<tag>([[:space:]]|$)' .`
Filter to the location's test files; there are none configured here.

## Strategy Decisions

SENTINEL: The user deferred setup discussion until after this coverage report.

## Recommended Setup

Proposed and unverified: use node --test with real task-creation behavior tests.
