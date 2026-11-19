---
tags: [implement, worktree, startup]
allowed_tools: [Read, Glob, Grep, Bash, Skill, AskUserQuestion]
max_turns: 35
timeout_seconds: 420
runs: 1
---

/make-it-work:implement add-payment-date-to-session-line

Ticket: Show the payment date in each paid session's table row; leave unpaid rows blank.

Use Guided mode with refinement questions here in chat. This is a fresh local
request with no tracker destination. Stop at the first unresolved startup
decision and present it to me. No answer to that decision is supplied yet;
do not choose on my behalf, initialize the workflow, or start refinement.
Leave project files and Git state unchanged.
