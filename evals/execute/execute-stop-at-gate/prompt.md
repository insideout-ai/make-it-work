---
tags: [execute, smoke]
allowed_tools: [Read, Glob, Grep, Edit, Write, Agent, Skill, AskUserQuestion, TodoWrite]
max_turns: 150
timeout_seconds: 1800
runs: 1
---

/make-it-work:execute make-it-work/DEMO-1-plan.md --autopilot
