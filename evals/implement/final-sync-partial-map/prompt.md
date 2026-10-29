---
tags: [implement, test-map, partial]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, AskUserQuestion]
max_turns: 65
timeout_seconds: 900
runs: 1
---

/make-it-work:implement DEMO

Resume the existing Autonomous run at final-sync. Apply its recorded context discoveries and finish the local workflow. Keep its autonomy. Do not restart implementation, change source/tests, commit, or publish externally. Full test-map onboarding is not part of this task; no further answer is supplied in this eval.
