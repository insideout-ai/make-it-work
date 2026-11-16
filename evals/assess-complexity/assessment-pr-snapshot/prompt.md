---
tags: [assess-complexity]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit, Skill]
max_turns: 50
timeout_seconds: 900
runs: 1
---

Assess the accessible PR snapshot supplied in pr.json and this local repository. For this offline evaluation, pr.json and the local git objects are the supplied PR contents and exact fetched refs; no remote lookup is needed. Use identifier ASSESS-1 and this directory as artifact root. Produce separate reports for that PR scope.
