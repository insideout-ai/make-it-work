---
tags: [run-regression, test-map, read-only]
allowed_tools: [Read, Glob, Grep, Bash]
max_turns: 40
timeout_seconds: 420
runs: 1
---

/make-it-work:run-regression embedded-tests:UC-01 embedded-tests:UC-03 --autopilot
