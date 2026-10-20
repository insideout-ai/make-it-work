---
tags: [define-test-strategy, strategy, interaction]
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion]
max_turns: 40
timeout_seconds: 600
runs: 1
---

/make-it-work:define-test-strategy

The current repo is the target. I confirm the detected test locations; use this
repo itself and add another only if you find actual referencing tests. There
is no prior strategy. Help me decide the testing approach. I have not decided
whether the team can run local or CI test databases. Discuss that choice with me.
