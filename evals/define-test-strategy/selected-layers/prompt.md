---
tags: [define-test-strategy, strategy, refresh]
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion]
max_turns: 100
timeout_seconds: 1200
runs: 1
---

/make-it-work:define-test-strategy --autopilot

Refresh the existing strategy, preserving its recorded user decisions. Do not
install tooling or change production code during DTS.
