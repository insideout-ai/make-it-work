---
tags: [feedback-on-session, implement, dashboard-html, required-checks]
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash, Agent]
max_turns: 70
timeout_seconds: 900
runs: 1
---

/make-it-work:feedback-on-session

Automatic implement terminal continuation. State is make-it-work/DEMO/DEMO-state.md; available conversation is session.txt. An earlier preparation is make-it-work/DEMO/weak-review.json. First inspect the run, then run the feedback writer's read-only `check --state ... --session-review make-it-work/DEMO/weak-review.json` on that exact existing file before retrieving evidence or drafting a replacement. Preserve that file and report its actual validation result. Preserve supported observations and correct unsupported ones in a separate input. Complete the existing feedback step, keep the run terminal and preserve all supplied artifacts. Do not implement recommendations, render HTML, ask questions or publish. This is not a new implement run or a standalone report.
