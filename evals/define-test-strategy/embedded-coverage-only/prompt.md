---
tags: [define-test-strategy, embedded-tests, read-only]
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion]
max_turns: 60
timeout_seconds: 600
runs: 1
---

/make-it-work:define-test-strategy embedded-tests

Choose Coverage report only. Report current UC/domain mappings without writing
anything or reopening strategy decisions.
