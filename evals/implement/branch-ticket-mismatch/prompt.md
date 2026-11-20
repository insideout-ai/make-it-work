---
tags: [implement, workflow-followups]
allowed_tools: [Read, Glob, Grep, Bash, Skill, AskUserQuestion]
max_turns: 35
timeout_seconds: 420
runs: 1
---

/make-it-work:implement APP-12 --continue-here

Start a new Guided run for APP-12 with live refinement here in chat. Those startup choices are already selected; there is no tracker destination or ticket-write consent. Stop at the first unresolved branch decision and present it to me. Do not choose a branch on my behalf or start refinement.
