---
tags: [run-regression, multi-repo]
allowed_tools: [Read, Glob, Grep, Bash]
max_turns: 30
timeout_seconds: 300
runs: 1
---

/make-it-work:run-regression --autopilot payments-api:UC-08 ledger-api:UC-08 full:payments-api full:ledger-api
