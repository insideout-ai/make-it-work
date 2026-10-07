---
tags: [implement, autopilot]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill]
max_turns: 200
timeout_seconds: 2400
runs: 1
---

/make-it-work:implement DEMO-101 --autopilot

Ticket: Allow administrators to proceed through the policy-protected action.

Acceptance criteria:
- Administrators are allowed.
- Members remain allowed.
- Guests remain denied.

Complete the unattended workflow. Do not ask questions, commit, push, or open a PR.
