---
name: test-strategy
description: Existing Node test setup for the sessions app.
---

# Test Strategy

## Repo ID

`sessions-app`

## Test Locations

| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | sessions-app | Unit | test/*.test.js | npm test | . |

## Layers

| Layer | Status | For | Not for | Location | Example command | Prerequisites |
| --- | --- | --- | --- | --- | --- | --- |
| Unit | configured | Formatting, billing rules and generated HTML strings | Browser interactions, layout | . | node --test test/views.test.js | Node 20+ |

## Run Prerequisites

No packages, credentials, env vars, external services or install step. Run locally.
For an optional browser walkthrough run `npm start` and visit the URL it prints.

## Where New Tests Go

Unit tests: `test/*.test.js`, Node's built-in test runner and strict assertions.

## Coverage Decision Guidance

Use existing Unit tests for display helpers and generated HTML. These are string
assertions, not a configured DOM/Component layer or browser verification.

## Test Map

Use the shared `.claude/testing/test-map.json` schema v1 and generated TEST-MAP.md.
The map is initially absent; inspect tests and domain/UC guidance in memory,
then persist evidence-backed affected mappings when required by the workflow.
Do not annotate production code or tests for mapping.

## How to Scan

Follow the plugin's docs/test-map-contract.md and scripts/test-map.mjs. Discover
`test/*.test.js` with Node test names and map only behavior-supported links.

## Strategy Decisions

Keep dependency-free Node tests. Browser verification requires actual browser
evidence; Node HTML assertions do not establish rendered behavior or layout.
