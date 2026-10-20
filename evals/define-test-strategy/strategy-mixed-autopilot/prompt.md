---
tags: [define-test-strategy, strategy, existing-tooling]
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion]
max_turns: 100
timeout_seconds: 1200
runs: 1
---

/make-it-work:define-test-strategy --autopilot

Review the testing approach for this app. Deno is unavailable here. Do not
install dependencies, provision services or change production code during DTS.
