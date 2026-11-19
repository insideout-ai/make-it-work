---
tags: [implement, worktree, startup, approval]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit, Skill, AskUserQuestion]
max_turns: 60
timeout_seconds: 600
runs: 1
---

/make-it-work:implement add-payment-date-to-session-line --worktree

Ticket: Show the payment date in each paid session's table row; leave unpaid rows blank.

Use Guided mode with refinement questions here in chat. This is a fresh local
request with no tracker destination. I select an isolated worktree for this
repository. Use the external disposable sessions directory recorded in
`.eval-session-parent` for private preflight storage.

Prepare the normal repository/branch creation preview and stop at its unanswered
approval. I have not supplied a branch name or approved any creation. Do not
choose the approval for me, create a branch/worktree, initialize the workflow,
or start refinement. Leave this checkout and its existing local edits unchanged.
