---
tags: [implement, background-wait, plan]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Monitor, TaskStop, Skill, AskUserQuestion]
max_turns: 100
timeout_seconds: 1200
runs: 1
---

/make-it-work:implement make-it-work/DEMO-WAIT/DEMO-WAIT-spec.md --autopilot --mode tdd

This focused diagnostic reuses the accepted spec unchanged. Start normally through Plan with the branch guard, dashboard chat announcement and context check. No feature edits or full readiness setup are requested. I authorize a pause in Plan after collecting the background baseline result.

Checkpoint one activity announcement. Launch the existing baseline with Bash run_in_background: true.
While it is running, end your response without tools and let its runtime notification resume you. Remain In Progress; no polling, blocking TaskOutput, sleeps in the parent, repeated waiting updates or fake pause. After the notification, read the native task output file as well as any redirected baseline log so every claimed exit status is supported by tool output; inspect actual baseline output and report the result, then save the requested pause in Plan through the controller. Do not ask questions, draft a plan, enter Execute, mark Complete, edit source/tests, commit, push or open a PR.
