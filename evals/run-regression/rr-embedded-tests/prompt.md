---
tags: [run-regression, embedded-tests]
allowed_tools: [Read, Glob, Grep, Bash]
max_turns: 60
timeout_seconds: 600
runs: 1
---

/make-it-work:run-regression --autopilot embedded-tests:UC-01 embedded-tests:UC-03
