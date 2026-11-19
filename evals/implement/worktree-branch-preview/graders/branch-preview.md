---
type: llm
focus: trace
weight: 3
---

Require the actual prepared private-session repository/branch preview for the
explicitly chosen isolated worktree, not a hypothetical example. It must use
the recorded external sessions parent and prepare the existing workspace-scope
plan, with no branch/worktree creation, workflow initialization or refinement.

The assistant's user-facing approval shows the suggested exact nonempty branch
name, actual starting main commit, source checkout and separate worktree path,
matching the successful prepared plan, plus the returned clickable preview link.
It says the original checkout/local edits stay unchanged. The approval offers
Create worktree and branch, Use a different branch name, and Back (equivalent
plain labels are valid). The change-name choice applies to the worktree branch,
not just the current-checkout alternative.

Leave the creation approval pending. Do not re-ask autonomy, refinement
destination or checkout choice, and do not require a separate naming question
before showing the suggested branch for acceptance. Read-only source inspection
and creation of private preflight artifacts are allowed. No approval/run command,
source edits, git switch, branch creation, stash, commit or publication is allowed.
