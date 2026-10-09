---
tags: [review-the-pr, smoke]
allowed_tools: [Read, Glob, Grep, Bash, Write, Skill]
max_turns: 60
timeout_seconds: 900
runs: 1
---

Please review this PR: https://github.com/example-org/mini-task-tracker/pull/7

Requirements (TASK-100): "Completing a task should clear its `assignedTo`
field so the task returns to the pool for someone else to pick up."

/make-it-work:review-the-pr --autopilot

You are authorized to write the skill's review report and autopilot decision
log inside this local fixture. Save and confirm both files before finishing.
Do not edit product code or post to the PR.
