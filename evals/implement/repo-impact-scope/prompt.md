---
tags: [implement, repo-impact]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit]
max_turns: 100
timeout_seconds: 900
runs: 1
---

/make-it-work:implement IMPACT-1

Resume the synthetic saved Implement run at make-it-work/IMPACT-1/IMPACT-1-state.md using the directly loaded plugin. Scope and spec are already accepted; do not restart intake, approvals or refinement. Follow its repository-impact contract: inspect the accepted spec, repo contracts and current code, then save the impact assessment and carry out only the necessary existing-tool readiness. Stop after reporting the assessment/readiness outcome; do not draft the plan, author tests or implement production behavior. All repositories are synthetic; there are no external services or credentials. Do not install dependencies, generate strategy/map metadata in unchanged repos, or contact trackers.

Parent-owned readiness checkpoints are in scope: begin readiness, save its report, and complete/check it only when all required capabilities exist. A baseline pass or impact event alone does not complete readiness. If a required check is unavailable, record it explicitly and leave readiness pending with a blocked report; do not call a consumer ready merely because another repo has a partial test.
