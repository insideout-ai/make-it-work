---
tags: [drive-the-epic]
allowed_tools: [Read, Write, Bash, AskUserQuestion]
max_turns: 60
timeout_seconds: 600
runs: 1
---

/make-it-work:drive-the-epic --resume the run recorded in run-location.txt

Continue the saved autopilot run. The saved revision affects only S-2: its start and end date boundaries are inclusive. Preserve the accepted epic and S-1 requirements, retain stable IDs, and finish the slice revision with the dashboard reflecting its progress. No Jira or implementation execution.
