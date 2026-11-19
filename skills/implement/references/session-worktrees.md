# Private workspaces for concurrent sessions

For a fresh run, offer **Use isolated worktrees (Recommended)** first and **Continue
here** second with the existing startup/branch selection. Only the worktree
checkout option is recommended; a base branch or local edits do not reverse it.
`--worktree` selects the
isolated route; `--continue-here` selects current checkout behavior. Strip these
flags before resolving the ticket or invoking stages. Reuse an explicit choice.
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
`--directory <sessions-parent>` overrides the default
`~/.make-it-work/sessions`; choose a durable directory outside Git working trees.
Allocation creates only private preflight storage and `miw-session.json`; no
branch, worktree or workflow state is created. A setup failure retains Continue
here as an option. Honor an explicit requirement for isolation rather than
silently falling back. Each allocation has a unique suffix, even for the same
ticket. The layout is:

```text
<session-root>/repos/<repo-id>/          # selected Git worktrees
<session-root>/make-it-work/<TICKET>/   # private state, reports and dashboard
```

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
not copied, stashed or moved. Include the current-checkout alternative's actual
branch action in the startup choice; Continue here follows its existing guard.

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
