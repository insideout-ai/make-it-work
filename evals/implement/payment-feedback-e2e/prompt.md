---
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 180
timeout_seconds: 1500
runs: 1
---

/make-it-work:implement DEMO-PAYMENT --autopilot

add payment-details (that will show payment date) to the session line

Complete implementation unattended and leave changes local. Once the run is
marked Complete, offer the optional delivery question required by the skill.
Do not answer it on the user's behalf, commit, push, or open a PR.
