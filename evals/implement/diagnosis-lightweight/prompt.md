---
tags: [diagnosis, smoke]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 120
timeout_seconds: 1500
runs: 1
---

/make-it-work:implement DIAG-1 --autopilot

Resume the saved Lightweight run at its review-requested fix (operation fix), using the existing accepted spec, review report and implementation report. Complete the run and offer delivery without answering the optional delivery question on my behalf.

Leave changes local: do not commit, push, publish, or contact external services. The saved spec is accepted; preserve its behavior and all existing test assertions. The failure output under make-it-work/DIAG-1 is real fixture evidence.
