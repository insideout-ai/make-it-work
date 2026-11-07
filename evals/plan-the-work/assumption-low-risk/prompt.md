---
tags: [plan-the-work, assumptions]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit, Skill, AskUserQuestion]
max_turns: 100
timeout_seconds: 1200
runs: 1
---

/make-it-work:plan-the-work make-it-work/ASSUME-1/ASSUME-1-spec.md --autopilot

Prepare the implementation plan against the accepted spec and this project's
actual code and guidance. This is planning only. No tracker, network access,
external service calls, dependency installation or production implementation is
authorized. The fixture has no test framework; retain that setup. Leave the
accepted spec, provider contract and existing source intact.
