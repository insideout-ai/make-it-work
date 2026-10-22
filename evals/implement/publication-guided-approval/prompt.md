---
tags: [implement, ticket-publication, approval]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Skill, AskUserQuestion]
max_turns: 50
timeout_seconds: 600
runs: 1
---

/make-it-work:implement DEMO

Continue the saved Guided run from its current checkpoint. I have not yet approved the refined spec. Retain the existing ticket-publication policy; do not ask me to choose it again. This is a disposable fixture: the tracker.example.test destination is unavailable and no live tracker calls may be made. An unavailable prompt tool should leave the spec approval pending, not imply approval.
