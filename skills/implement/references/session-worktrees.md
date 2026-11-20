# Private workspaces for concurrent sessions

For a fresh run, offer **Use isolated worktree (Recommended)** first. The second
option names the actual current-checkout action: **Create branch in current
checkout** on base, or **Use current branch: <branch>** on a suitable feature
branch. Do not label it "Continue here"; preserve any unresolved ticket-mismatch
choice. Only isolation is recommended; a base branch or local edits do not
reverse it. `--worktree` selects isolation; `--continue-here` keeps its existing
current-checkout meaning. Strip these flags before resolving the ticket or invoking stages. Reuse an explicit choice.
In Autopilot, retain current checkout behavior unless isolation was explicitly
selected; never add a checkout question solely for this feature. The existing
exact repository/branch approval still applies to worktree creation in every
mode. Show checkout choice, source/destination paths, branch and starting commit
together in that approval; do not add a second approval for unchanged facts.

## Resume before allocating

Resolve the invocation with `scripts/workspace.mjs resolve`. Inside a session's
worktree, the marker routes back to its private artifact root automatically.
From the original checkout, after resolving the ticket, discover only matching
managed sessions:

```sh
node <plugin>/scripts/session-workspace.mjs list --cwd <source-root> --ticket <ticket>
```

An explicit saved state wins. Inspect a matching saved run/preflight and follow
normal Resume or existing interrupted-selection recovery before creating another
session. Multiple matching runs use the existing ambiguity question; never guess
the newest. A discovery warning is not proof that no run exists. Use the exact
returned state/root, including `--saved-root` when resolving from the original
checkout. Existing runs are never relocated or opted in on Resume.

## Prepare an isolated fresh run

```sh
node <plugin>/scripts/session-workspace.mjs allocate --cwd <source-root> --ticket <ticket>
```

For an explicitly resolved multi-repo boundary also pass `--workspace <source-root>`.
Use the returned artifact root and repository paths; do not reconstruct them.
Fresh defaults are:

```text
Single repo:
  <repo>/.claude/worktrees/<session>/                 # actual Git checkout
  <repo>/.claude/miw-sessions/<session>/              # private preflight root
    make-it-work/<TICKET>/                          # state/reports/dashboard

Multi-repo workspace:
  <workspace>/<repo-id>/.claude/worktrees/<session>/  # one checkout per selected repo
  <workspace>/.claude/miw-sessions/<session>/         # shared private preflight root
    make-it-work/<TICKET>/                          # shared state/reports/dashboard
```

The session name is unique even for the same ticket. Single-repo preflight is
separate so approval can be prepared while the future checkout path stays empty.
Local Git exclusions cover only that new session's paths without rewriting the
source `.gitignore` or hiding unrelated local files. Allocation creates private
storage and `miw-session.json`, never branches, worktrees or workflow state.
For multi-repo runs, allocation touches only the shared workspace storage;
preparing the selected preview creates parent directories and exact local
exclusions in those selected repos only. Shared records bind each repo-local
checkout to the same workflow root. Resume from either worktree uses that saved
binding, not a fresh guess at which repositories belong together. All repo-local
checkout folders share the session name; use the saved repository ID for review,
diff and package names, never the checkout directory's basename. New multi-repo
contracts record this naming rule; existing packages and saved runs keep their
previous names.
Describe this as preserving existing source files, index and current branch;
preflight itself creates the selected private directories and local exclusion
entries. Do not promise that no filesystem/Git-metadata writes occur. If the
user explicitly prohibits even that bookkeeping, explain the conflict before
allocation and honor the restriction through the existing startup choice.

An explicit `--directory <sessions-parent>` keeps the existing external container
layout (`<session>/repos/<repo-id>` plus `<session>/make-it-work/<TICKET>`); choose
a durable directory outside Git checkouts. Existing saved sessions retain their
paths, including `~/.make-it-work/sessions` and older workspace-grouped
`.claude/worktrees/<session>/repos/` sessions. Default discovery checks the new
local parent, the former grouped workspace parent, and the old home parent;
use `--directory` for other saved custom parents. Do not relocate a saved session or reinterpret its marker format.

A setup failure retains the current-checkout route as an option. Honor an
explicit isolation requirement rather than silently falling back or changing
its location. Conflicting explicit unignore rules need resolution or an explicit
custom location; never modify tracked ignore files to force the local default.

Assess source repositories read-only. Workspace runs retain find-the-repos;
single-repo runs use the explicitly selected repository without inventing a
multi-repo assessment. Save the assessment in the private artifact root with
`repo-assessment.mjs report --root <source-root> --artifact-root <session-root>
--input <assessment.json>`. Its existing report input/returned paths apply.

Use the normal `workspace-scope.mjs prepare|approve|run` commands with
`--root <session-root>`, including for a single isolated repo. Pass the saved
report's root-relative path and selected source inventory IDs, roles, reasons
and per-repo bases. The marker binds source repositories to private destinations.
New branch names default to the unique session name; existing branch names are
never forced or reset. The start defaults to the resolved base commit; an
explicit `start_ref` selects another commit. Show the actual returned SHA and
any inherited history in the same preview before approval. Source dirty work is
not copied, stashed or moved.

In the existing creation approval, show each actual proposed branch name,
starting ref/commit and worktree location, plus the source checkout that stays
unchanged. Present the full preview and clickable HTML link in assistant chat
before calling `AskUserQuestion`. For one repo, use labeled Branch, Start,
Source checkout and Worktree fields, putting full paths on their own lines.
Keep source-status notes, evidence/role, inherited-history/base comparisons and
the saved preview hash with those chat details. For multiple repos, use one
compact field list per repo. Do not put a Markdown table or link in the dialog.

Keep the dialog's question plain and brief, for example:

```text
Create this worktree and branch?

Branch: PAY-123-a7f2
Start: local main at abc1234

Your current checkout stays unchanged. Full details are in the preview above.
```

Use the actual prepared branch/ref/SHA in that summary. For multiple repos,
refer to the displayed selection rather than duplicating all its paths. The
full preview still discloses local-base lag, unavailable remote freshness,
inherited commits and local edits before approval; compact presentation does
not change the selected starting point or authorize a fetch/reset. No extra
user reply is needed between the chat preview and its confirmation dialog.
Offer **Create worktree and branch**, **Use a different branch name**,
and **Back**. Accepting the preview approves the suggested names without another
naming question. On a rename request, ask only for the desired name (and repo if
ambiguous), set that selection's `target_branch`, and prepare again using the
same allocated session. Show the refreshed name, location, starting commit and
returned hash/link for approval before creation; the prior hash cannot approve
the changed branch. If the name is invalid or taken, show that actual error and
let the user choose another; never force/reset a branch or silently guess a name.
Back returns to checkout selection with no branch/worktree creation; retain the
preflight artifacts without automatic cleanup. Custom naming does not require
renaming or reallocating the private session directory. Include the
current-checkout alternative's actual branch action in the startup choice; that route follows its existing guard.

After applying, initialize with the private root and exactly the selected target
roots from the plan. This saves the normal workspace contract, even with one
repo, and preserves startup dashboard/continuation behavior. All stages, workers,
tests, review, packaging and delivery use that contract's target paths. Reassess
source-derived assumptions against the actual worktrees. Missing ignored local
setup follows existing readiness rules; isolation does not authorize copying
credentials or unrelated local changes.

Partial creation retains its journal and completed worktrees. Retry the same
approved plan after repairing the actual cause; recovery accepts only the exact
recorded creation intent, never resets a branch or deletes an occupied path.
Original checkout activity does not invalidate a pinned worktree start. Resume
and packaging check target paths and Git repository identity as well as existing
branch/fingerprint checks. Keep worktrees and artifacts after completion; this
route adds no automatic cleanup, merge, commit or push. Git refs/configuration
and external services remain shared; worktrees isolate checkout state, not every
runtime resource. Worker evidence filenames still follow the separate-file rule.
