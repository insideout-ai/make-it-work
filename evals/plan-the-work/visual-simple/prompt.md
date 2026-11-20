---
tags: [plan-the-work, visuals]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit]
max_turns: 90
timeout_seconds: 900
runs: 1
---

/make-it-work:plan-the-work make-it-work/VIS-1/VIS-1-spec.md --autopilot

Planning only: leave runtime source, README, accepted spec and comparison baselines unchanged. Do not write tests, install dependencies, contact trackers, commit, push or execute the plan. Use the directly loaded plugin directory, not an installed cache.
