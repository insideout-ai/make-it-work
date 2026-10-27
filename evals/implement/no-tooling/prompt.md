---
tags: [implement, no-tooling]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 220
timeout_seconds: 2400
runs: 1
---

/make-it-work:implement DEMO-102 --autopilot --mode tdd

Ticket: Allow administrators through the policy-protected action.
Administrators and members must be allowed; guests must remain denied.
The repo has no test strategy or test command. Complete the ordinary workflow
unattended and leave changes local. At completion offer optional delivery but
do not answer it, commit, push or open a PR.
