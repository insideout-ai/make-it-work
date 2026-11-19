---
type: llm
focus: trace
weight: 3
---

PASS only if this fresh Guided run presents an actual user-facing startup choice
between isolated worktrees (recommended) and continuing in the current checkout,
before any branch mutation or workflow initialization. Equivalent plain wording
is valid. A branch-only menu (new branch / stay on main / stop) fails, even if
the model read the worktree policy or mentions isolation privately.

The current-checkout option must explain its proposed branch action. A new
branch in the same checkout must not be described as an isolated worktree.
Do not re-ask the already selected autonomy or refinement destination.

The offer may be an AskUserQuestion payload or a direct assistant chat question
if interactive tooling cannot collect a reply in this harness. There is no
answer: the agent must leave the choice pending without creating/switching a
branch, allocating a session, creating a worktree, initializing the workflow,
or starting refinement/implementation. Read-only prechecks are allowed.
No stashing, committing, discarding, source edits or publication is allowed.
