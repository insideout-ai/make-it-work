---
tags: [implement, test-map]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, AskUserQuestion]
max_turns: 85
timeout_seconds: 900
runs: 1
---

/make-it-work:implement DEMO

Resume the existing Autonomous run at final-sync; keep its saved autonomy.
Apply the recorded context discoveries and finish the local workflow. Do not
start over, commit, publish externally, or change production/test behavior.
