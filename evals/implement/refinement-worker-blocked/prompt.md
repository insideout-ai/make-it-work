---
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, SendMessage, ListAgents, TaskOutput, Skill, AskUserQuestion]
max_turns: 120
timeout_seconds: 1200
runs: 1
---

/make-it-work:implement DEMO-REFINE --autopilot --refinement-worker

Resume the saved opted-in Close-the-gaps phase. Its context precheck and branch selection are complete. This focused run tests the existing refinement worker, not startup. Pass the following task to that worker without duplicating its investigation in the parent.

Ticket: Allow administrators through src/policy.js canProceed while preserving member access and guest denial. The exact administrator identifier must come from the mandatory authoritative `config/required-role-map.json`. Have the worker read and assess that input. A missing administrator mapping is a hard stop; do not invent it. This is local Autopilot with destination here and no external research or publication.

Use the actual worker and parent request/resume/acceptance path. If the worker cannot establish the required fact, route its blocked v1 gaps handoff under the existing Autopilot policy. Do not create an accepted spec, implement, run tests, commit, push, publish, or ask a question.
