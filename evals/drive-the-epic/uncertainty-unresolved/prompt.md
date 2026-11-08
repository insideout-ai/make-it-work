---
tags: [drive-the-epic, uncertainty]
allowed_tools: [Read, Write, Bash, AskUserQuestion]
max_turns: 70
timeout_seconds: 900
runs: 1
---

/make-it-work:drive-the-epic --resume the run recorded in run-location.txt

Continue the saved Autopilot preparation from its slicing stage using the latest
saved epic and recorded decisions. Finish the local handoff with a complete
slice set. Preserve the current requirement; do not publish Jira or start
implementation. No new product answers are supplied in this request.
