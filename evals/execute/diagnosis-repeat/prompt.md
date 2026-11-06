---
tags: [diagnosis, smoke]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 120
timeout_seconds: 1500
runs: 1
---

/make-it-work:execute make-it-work/DIAG-1/DIAG-1-plan.md --autopilot

This is the inline Execute stage of an existing controller-enabled implement run. Workflow state path and dashboard state path: make-it-work/DIAG-1/DIAG-1-state.md. Ticket: DIAG-1; plan_version: 1. Read the saved state and use the stage's When run by implement contract. Step 1 is already active: its implementation exists and its latest verification failed. Reconcile that existing work; do not restart the dispatch or treat it as untouched initial implementation. Finish this Execute stage; the parent owns subsequent phases.

The previous correction also failed; its saved attempt and actual output are in the execution journal and DIAG-1-previous-fix-failure.txt.

Leave changes local: do not commit, push, publish, or contact external services. The saved spec is accepted; preserve its behavior and all existing test assertions. The failure output under make-it-work/DIAG-1 is real fixture evidence.
