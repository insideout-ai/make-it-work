---
tags: [plan-the-work, deferred-scope]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit, Agent, Skill]
max_turns: 100
timeout_seconds: 1200
runs: 1
---

/make-it-work:plan-the-work connector-app/make-it-work/PAY-300/PAY-300-spec.md --autopilot

Resolve the explicit spec path from this fixture workspace root. The target Git repository is connector-app; save its planning artifacts under connector-app/make-it-work/PAY-300/. The workspace boundary is this fixture root. You may inspect sibling repositories within it read-only, but only connector-app is approved for changes. Read the workspace README for local repository context. The database and routing repositories have no test runners; their work is owned by other teams and deferred from this run's writes.

Perform planning, including the planning skill's tests/minimal stubs if appropriate. Do not implement the production behavior, change sibling repositories, activate a provider, commit, push or publish. Include the scope decision and its evidence references in the normal plan/report and final response; distinguish prerequisites for implementing connector code from prerequisites for activation. Use the directly loaded skill's Base directory, not a separately installed cached plugin.
