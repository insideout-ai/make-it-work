---
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, SendMessage, ListAgents, TaskOutput, Skill, AskUserQuestion]
max_turns: 120
timeout_seconds: 1200
runs: 1
---

/make-it-work:implement DEMO-REFINE --autopilot --refinement-worker

Ticket: Allow administrators through src/policy.js canProceed while preserving member access and guest denial. Use the existing admin role identifier `admin`. This is a local single-repository run; no external research, messages or publication is requested.

The exact administrator role must instead come from `config/required-role-map.json`, which is mandatory authoritative input. Do not infer an identifier or make a best guess if it cannot be read. Stop with the precise blocker; do not create an accepted spec, implement, run tests, commit, push or publish.
