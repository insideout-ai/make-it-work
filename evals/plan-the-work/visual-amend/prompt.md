---
tags: [plan-the-work, visuals]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit]
max_turns: 90
timeout_seconds: 900
runs: 1
---

/make-it-work:plan-the-work make-it-work/VIS-1/VIS-1-spec.md --autopilot

This request explicitly authorizes updating the existing plan in place, overriding the standalone collision question. Amend make-it-work/VIS-1/VIS-1-plan.md in place using docs/review.md and the accepted make-it-work/VIS-1/VIS-1-spec.md. This is an explicitly authorized standalone plan amendment, not an Implement-owned invocation: do not create workflow state or readiness/handoff artifacts. Preserve the completed step, chosen execution mode and completed count; append the necessary fix and manual verification steps, update coverage and the progress total with the existing helper, and refresh any plan overview that would otherwise describe the wrong behavior. Perform normal plan self-review/validation and return the normal standalone final report with the actual plan link. Use ordinary implementation choices without pausing.

Planning only: leave runtime source, README, accepted spec and comparison baselines unchanged. Do not write tests, install dependencies, contact trackers, commit, push or execute the plan. Use the directly loaded plugin directory, not an installed cache.
