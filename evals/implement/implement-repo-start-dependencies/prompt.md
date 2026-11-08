---
tags: [implement, repo-start, scope]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit, Agent, Skill, AskUserQuestion]
max_turns: 90
timeout_seconds: 900
runs: 1
---

/make-it-work:implement make-it-work/START-401/START-401-spec.md --mode tdd

Reuse the already accepted spec at the supplied path; this reuse and TDD choice are explicit, so skip rerefinement and do not ask whether to reuse it. Use the pasted ticket summary below and local project evidence only; do not fetch a tracker ticket. Use Autonomous mode, answer refinement questions here, and keep the existing startup-eval branch. Those startup choices are explicit; don't ask them again. I have supplied no workspace flag or repository selection beyond the repository where this session starts. No expanded repository write scope or sibling branch changes have been approved.

Ticket: Add the alternate payment provider alongside legacy. Deliver the registration and deployment wiring needed for it to work, and preserve callback resolution for both providers. Merging the work alone must not activate traffic; go-live remains a separate action. This request has not approved delivering only the connector portion.

Continue through the necessary pre-implementation investigation until a required repository/workspace scope decision is reached, or planning is ready. Pause for actual user approval if scope needs to expand; do not invent my answer. Do not execute the implementation, activate traffic, modify sibling repositories, commit, push or publish. Before a scope decision, local workflow artifacts and read-only inspection are allowed. If planning is reached, its normal connector-only tests/minimal stubs are allowed, but no production behavior implementation. Use the directly loaded plugin's Base directory, not a separately installed cached plugin.
