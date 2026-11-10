---
tags: [feedback-on-session, implement, terminal-feedback]
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash, Agent]
max_turns: 65
timeout_seconds: 900
runs: 1
---

/make-it-work:feedback-on-session

Automatic implement integration mode: the workflow has just checkpointed Complete in make-it-work/DEMO/DEMO-state.md and handed off to feedback. Its controller handoff is in feedback-handoff.json. Continue that terminal step now using the implement feedback reference and the available conversation evidence in session.txt. This is not a new implement Start/Resume or a standalone review. Preserve the terminal state and captured run version. Finish with an accurate completion summary; delivery is not requested and Autopilot must not wait for optional feedback. Do not implement recommendations or publish anything.
