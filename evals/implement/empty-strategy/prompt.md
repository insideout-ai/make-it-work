---
tags: [implement, no-tooling, empty-strategy]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 220
timeout_seconds: 2400
runs: 1
---

/make-it-work:implement DEMO-103 --autopilot --mode tdd

Ticket: Allow administrators through the policy-protected action.
Administrators and members must be allowed; guests must remain denied.
An earlier define-test-strategy run recorded no testing infrastructure.
Complete the ordinary workflow unattended and leave changes local. Offer
optional delivery only after completion; do not answer it or commit/push/open a PR.
