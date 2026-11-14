---
tags: [implement, autopilot, adaptive, lightweight]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 120
timeout_seconds: 1500
runs: 1
---

/make-it-work:implement DEMO-104 --autopilot

Ticket: Fix the typo in the access-denied message.

`src/messages.js` exports `DENIED_MESSAGE` as "Acess denied". It must read
"Access denied". No other text or behavior changes.

Complete implementation unattended and leave changes local. Once the run is
marked Complete, offer the optional delivery question required by the skill.
Do not answer it on the user's behalf, commit, push, or open a PR.
