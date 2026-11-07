---
tags: [plan-the-work, fact-handoff]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit, Agent, Skill]
max_turns: 90
timeout_seconds: 900
runs: 1
---

/make-it-work:plan-the-work make-it-work/FACT-500/FACT-500-spec.md --autopilot

Use the accepted refined spec at that explicit local path. This is a single-repo task. Earlier investigation and contract snapshots are under docs/; follow relevant local project guidance. Plan using the existing skill, including its tests/minimal stubs when appropriate. Do not implement production behavior, change existing assertions, modify the accepted spec or comparison evidence, install dependencies, access external services, commit, push or publish. Leave outputs in the normal planning artifacts and final response. Use the directly loaded skill's Base directory, not an installed cached plugin.
