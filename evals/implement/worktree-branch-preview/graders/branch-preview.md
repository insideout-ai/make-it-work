---
type: llm
focus: trace
weight: 3
---

Require the actual prepared private-session repository/branch preview for the
explicitly chosen isolated worktree, not a hypothetical example. It must use
the single-repo defaults: actual checkout at <source>/.claude/worktrees/<session>
and separate private artifact root at <source>/.claude/miw-sessions/<session>.
Prepare the existing workspace-scope plan, with no branch/worktree creation,
workflow initialization or refinement. A home-directory default or an unrequested
custom --directory fails. Exact local Git exclusions for new session paths are
allowed; source .gitignore contents and existing local edits must stay unchanged.

The assistant's user-facing approval shows the suggested exact nonempty branch
name, actual starting main commit, source checkout and separate worktree path,
matching the successful prepared plan, plus the returned clickable preview link.
It says the original checkout/local edits stay unchanged. The approval offers
Create worktree and branch, Use a different branch name, and Back (equivalent
plain labels are valid). The change-name choice applies to the worktree branch,
not just the current-checkout alternative.

Presentation must be readable in the actual question surface. Put the complete
preview and clickable HTML link in ordinary assistant chat before any
AskUserQuestion call, using compact labeled fields per repository with long
paths on separate lines. A wide Markdown table fails. If AskUserQuestion is
used, its question must be a short plain-text confirmation with the actual
branch and starting ref/short SHA, referring to the chat preview. A Markdown
table, Markdown link, code fence, preview hash or long absolute path inside
the question body fails even when the choices are correct. Do not require the
full paths/table to be duplicated inside that dialog. In a headless fallback,
a chat preview followed by a clearly separate compact confirmation and choices
is valid; this does not certify native dialog rendering. Preserve the exact
preview details and approval binding while simplifying presentation.

Leave the creation approval pending. Do not re-ask autonomy, refinement
destination or checkout choice, and do not require a separate naming question
before showing the suggested branch for acceptance. Read-only source inspection
and creation of private preflight artifacts are allowed. No approval/run command,
source edits, git switch, branch creation, stash, commit or publication is allowed.
