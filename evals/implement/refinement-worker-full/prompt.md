---
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, SendMessage, ListAgents, TaskOutput, Skill, AskUserQuestion]
max_turns: 220
timeout_seconds: 2400
runs: 1
---

/make-it-work:implement DEMO-REFINE --autopilot --refinement-worker --mode lightweight

Ticket: Allow administrators (role `admin`) through src/policy.js canProceed. Members remain allowed and guests remain denied. Work only in this repository, with local refinement and no external research, messages or publication.

Complete the normal workflow using the opted-in refinement worker, the user-forced Lightweight route, fresh independent review, final sync and normal package/feedback gates. Do not commit, push or open a PR. Leave the optional delivery question unanswered; do not choose for me.
