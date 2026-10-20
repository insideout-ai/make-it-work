---
tags: [define-test-strategy, embedded-tests]
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion]
max_turns: 90
timeout_seconds: 900
runs: 1
---

/make-it-work:define-test-strategy embedded-tests --autopilot

Refresh the existing generated strategy. Keep the saved runner and placement
decisions. Review its live use-case/domain coverage too.
