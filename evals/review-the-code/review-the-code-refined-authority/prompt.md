---
tags: [review-the-code, requirements-authority]
allowed_tools: [Read, Glob, Grep, Bash, Write, Skill]
max_turns: 60
timeout_seconds: 900
runs: 1
---

/make-it-work:review-the-code --autopilot

For this explicit user invocation, use the loaded skill's "When run by implement" mode with the dispatch inputs below. Use the Base directory of the loaded skill from the plugin under test; do not substitute a separately installed cached plugin or a different review skill. This is an independent review dispatch: ticket TASK-100, no PR, base main, review cycle 1, autonomy Autopilot, plan version 1. Requirements: make-it-work/TASK-100/TASK-100-spec.md. Plan: make-it-work/TASK-100/TASK-100-plan.md. Original ticket context: make-it-work/TASK-100/original-ticket.md. Known regressions and decided findings: empty. Review the working tree. Save the normal review report locally; do not edit source, specs or plans, and do not publish anything. No workflow state is supplied; return the legacy outcome line without a version-1 handoff.
