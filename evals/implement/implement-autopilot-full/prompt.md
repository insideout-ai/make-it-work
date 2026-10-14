---
tags: [implement, autopilot]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
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

Complete implementation unattended. Once the run is marked Complete, offer the optional delivery question required by the skill. Do not answer it on the user's behalf, commit, push, or open a PR.
