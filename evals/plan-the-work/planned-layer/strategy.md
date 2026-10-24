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

| Layer | Status | For | Not for | Location | Example command | Prerequisites |
| --- | --- | --- | --- | --- | --- | --- |
| Unit | configured | Pure helpers | React interaction | . | npm test -- src/lib/lineTotal.test.js | None |
| Component | planned | React forms and interaction | Real platform API | . | none | jsdom, Testing Library, JSX test include and DOM environment |

## Run Prerequisites

### .

- **Env vars:** None
- **Services:** None
- **Credentials:** None
- **How to start:** npm install, then npm test
- **Local run:** yes

## Where New Tests Go

| Layer | Status | Repo | Directory | File naming |
| --- | --- | --- | --- | --- |
| Unit | configured | FIXTURE_REPO_ID | src/lib/ | <module>.test.js |
| Component | planned | FIXTURE_REPO_ID | src/ alongside the component | <Component>.test.jsx |

## Coverage Decision Guidance

- Pure helper logic → Unit
- React form state, button behavior and displayed feedback → Component (planned; configure jsdom, Testing Library and JSX test inclusion first)

## Test Map

Shared .claude/testing/test-map.json records evidence-backed test relationships;
never annotate source/tests for mapping.

## How to Scan

Follow make-it-work docs/test-map-contract.md. Inspect map freshness and reuse
unchanged entries; a missing map requires discovery using real runner configuration
and assertion/behavior evidence. No use-case inventory exists yet.

## Strategy Decisions

The user selected Unit plus Component in the first phase. Keep Vitest. Component
setup has not been established. Its agreed destination is next to PurchaseForm.
Do not replace component interaction checks with arithmetic helper tests.

## Recommended Setup

Proposed only: add jsdom and Testing Library and configure JSX component tests.
