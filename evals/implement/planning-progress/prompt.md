---
tags: [implement, plan, activity]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 180
timeout_seconds: 1800
runs: 1
---

/make-it-work:implement make-it-work/DEMO-PROGRESS/DEMO-PROGRESS-spec.md --autopilot --mode tdd

Reuse the accepted local spec as-is; that reuse is explicitly authorized. Complete normal startup, testing readiness and initial planning. The configured Node test runner is sufficient for this small policy change; do not install tooling or create a test-strategy skill or test map. Keep all workflow artifacts under the invocation repository.

After the initial plan has passed validation and its handoff is accepted, pause in Plan before entering Execute. This pause is explicitly requested, including in Autopilot. Do not implement the feature, publish to a tracker, commit, push or open a PR. Leave the planned tests and their actual baseline/red evidence available for inspection. Do not ask a question.
