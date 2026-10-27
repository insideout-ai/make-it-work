---
tags: [implement, adaptive, escalation]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 120
timeout_seconds: 1800
runs: 1
---

/make-it-work:implement DEMO

Resume the saved Guided run; keep Guided and do not offer an autonomy change.
Review cycle 2 already finished: its report and handoff
(`make-it-work/DEMO/DEMO-handoffs/review-2.json`) are saved and its outcome is
recorded in the state, so route from that result instead of reviewing again.
For testing readiness: this repo's `test/*.test.js`, run with `npm test`, is
the only test location; keep that automated setup. Accept the proposed test
strategy and test map as-is, and the recommended option for any planning
question.
Leave every approval pending for me; an unavailable prompt tool does not imply
approval. Do not commit, push or open a PR.
