---
tags: [define-test-strategy, strategy, interaction]
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion]
max_turns: 40
timeout_seconds: 600
runs: 1
---

/make-it-work:define-test-strategy

The current repo is the target. I confirm this repo as the test location unless
actual referencing tests are found elsewhere. Review the testing approach; no
prior generated strategy exists. Deno is unavailable here. We have not decided
whether to add test dependencies or a backend test environment, and production
refactoring has not been approved. Discuss the choices with me before writing.
