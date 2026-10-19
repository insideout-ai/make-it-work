---
tags: [execute, manual]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Skill, AskUserQuestion]
max_turns: 100
timeout_seconds: 1200
runs: 1
---

/make-it-work:execute make-it-work/MANUAL-1/MANUAL-1-plan.md --autopilot

I explicitly selected manual verification for this plan. Keep that choice and
defer test tooling. Exercise the actual exported function and observe outputs;
leave code changes uncommitted.
