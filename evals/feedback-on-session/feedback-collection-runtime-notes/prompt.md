---
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash]
max_turns: 65
timeout_seconds: 720
runs: 1
---

/make-it-work:feedback-on-session

Automatic implement terminal continuation. State: make-it-work/DEMO/DEMO-state.md. Available pre-feedback conversation: session.txt. An earlier draft is make-it-work/DEMO/earlier-draft.json. Inspect this run, then run the writer's read-only check on that exact earlier draft before retrieving evidence or drafting a replacement. Preserve the earlier draft and correct the input in a separate file. Run the check as a direct standalone node invocation using the resolved helper path and exact state/input paths. Continue the existing feedback step using its normal reference. Keep the run terminal and preserve supplied artifacts, apart from documented helper-owned feedback lifecycle notes and outputs. This is not a new implementation or a standalone review. Do not ask questions, run application checks, render HTML, implement recommendations or publish. Use this current session's runtime JSONL for writer prerequisites; session.txt is historical text, not runtime JSONL.
