---
tags: [implement, worktree, workspace, approval]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit, Skill, AskUserQuestion]
max_turns: 80
timeout_seconds: 720
runs: 1
---

/make-it-work:implement DEMO-201 --worktree

Ticket: In api and web, allow admin roles through src/policy.js canProceed while
preserving member access and guest denial. The invocation directory is the
multi-repo workspace boundary. Assess it, including unrelated, with find-the-repos.

Use Guided mode with refinement questions here in chat. I select isolated
worktrees and the normal default location; I have not supplied a custom sessions
directory. Prepare the repository/branch creation preview, then leave its exact
approval unanswered. No repository/branch creation is approved. Do not create
worktrees, initialize the workflow, implement, commit, push or publish.
