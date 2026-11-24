---
tags: [plan-the-work, fact-handoff]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit, Skill]
max_turns: 90
timeout_seconds: 900
runs: 1
---

/make-it-work:plan-the-work make-it-work/BOUNDARY-1/BOUNDARY-1-spec.md --autopilot

Plan the accepted local requirements using the existing implementation and tests as the baseline. Prior-report.md is previous investigation, not requirements authority. Inspect relevant local code and assertions. Apply the Implement integration guide's affected-requirement coverage discipline for this isolated planning exercise. Do not implement production behavior, modify existing tests or the accepted spec, install dependencies, access external services, commit or publish. Leave the actionable plan in normal planning artifacts. Use the directly loaded plugin rather than an installed cache.
