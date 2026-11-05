---
tags: [implement, dashboard, autonomous]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 40
timeout_seconds: 360
runs: 1
---

/make-it-work:implement DEMO-DASHBOARD

Ticket: Let administrators proceed through the policy-protected action while
preserving access for members and denying guests.

Use Autonomous mode, answer refinement questions here, and use the existing
`dashboard-eval` branch. Those startup choices are explicit; don't ask them again.
Start a fresh run through its initial context check, then stop before refinement
or implementation. Leave all source code unchanged and do not commit or publish.
