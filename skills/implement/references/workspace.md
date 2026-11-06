# Workspace scope and branch approval

This contract applies to new `implement` workspace runs (`workspace_version: 1`)
and overrides standalone stage root-detection rules. Single-repo runs retain
their existing branch guard, autonomy, artifact paths and context requirements.
Never add the version field to a legacy run on resume.

## Resolve before Git startup checks

Run `node <plugin>/scripts/workspace.mjs resolve --cwd <invocation-dir>`.
For an explicit workspace or an existing workspace run, supply `--workspace
<root>` or `--saved-root <root>`. `implement` accepts `--workspace <path>`;
strip it before resolving the ticket argument and pass it to this helper.

A directory of immediate Git checkouts is a workspace even without a root
`CLAUDE.md`, service map or `.git`. Read grouping metadata when available, but
never require it or infer ticket relevance from sibling location. Inside a
repository or subdirectory, default to its Git root; widen only from an explicit
workspace boundary or the saved run. Recognize `.git` files as well as directories.
If a user says this is a workspace but its boundary is ambiguous, clarify the path.
Never scan arbitrary ancestors. No usable repositories is an actionable stop.

Use the returned artifact root for state lookup, decision logs and all ticket
artifacts. On resume from inside a service, locate the explicitly identified
state first and pass its saved artifact root; do not create a duplicate run there.

## Assess, preview, confirm, apply

For `layout: workspace`, read and follow `../../find-the-repos/SKILL.md` inline
before refinement. Do not invoke it through Skill. Pass the resolved boundary,
ticket content/identity, artifact root and existing report if any. Its assessment
is read-only apart from the report/log; no branches, code or tests change.
Assess every candidate unless the user restricted the scope. Preserve Definite,
Possible, unavailable and external gaps; do not silently promote Possible matches.
No Definite matches means explain the gaps and obtain an explicit selection.

In this orchestration, return the assessment before standalone shortlist
confirmation. The parent owns one combined **repository and branch approval**.
An Auto-confirmed standalone report never authorizes branch operations.

Save a preview-input JSON:

```json
{
  "ticket": "PAY-123",
  "report": "make-it-work/PAY-123/PAY-123-repos.md",
  "repos": [
    { "id": "payments-api", "role": "product", "reason": "src/policy.js:42 implements the affected rule" },
    { "id": "qa-automation", "role": "test", "reason": "tests/withdraw.spec.js:10 exercises the workflow", "base": "develop", "target_branch": "PAY-123" }
  ]
}
```

`role` is `product`, `test` or `support`. Optional base/target overrides must come
from evidence or the user. The helper defaults base per repository from origin/HEAD
or main, verifies it resolves, keeps an existing feature branch, and suggests an
unused ticket branch when on base. Detached HEAD stops before mutation. Existing
target branches are explicitly shown as switches. Continuing on base requires
`proceed_on_base: true` in that row and the same explicit approval; delivery will
still refuse base-branch delivery.

Run `node <implement>/scripts/workspace-scope.mjs prepare --root <artifact-root>
--input <preview-input.json>`. Share the returned HTML link and the full proposed
table: repository, evidence, role, current branch, base, proposed action/branch.
Ask the user to approve this exact selection, change repositories/branches,
reassess, or stop. Save the displayed hash. **Wait for an explicit answer in all
autonomy modes, including Autopilot.** Existing workflow autonomy never supplies
this answer. Preparing a preview creates only local preflight artifacts, not a
workflow state or a branch. A separate preflight dashboard is replaced by the
workflow dashboard on successful init, using the same HTML path.

For revisions, update the assessment in place when needed and prepare again;
the old hash cannot authorize a revised plan. After the explicit approval, save
`{"source":"user","via":"chat"}` (or `via: question` for an actual question
answer), then run:

```
node <implement>/scripts/workspace-scope.mjs approve --root <root> --ticket <ticket> --hash <shown-hash> --input <answer.json>
node <implement>/scripts/workspace-scope.mjs run --root <root> --ticket <ticket> --hash <shown-hash>
```

The helper rechecks all selected repositories, assessment hash, bases and target
refs before mutation. Any change needs a refreshed preview and approval. It
records partial success without undoing branches. On failure report the actual
repository/result and journal; reconcile the cause and retry the same approved
plan only if still current. Never guess another branch name after approval.

Initialize the controller with **exactly** the approved repository roots and the
normal autonomy/destination fields plus `branch_guard` describing the confirmed
selection. It derives per-repo bases from the applied approval; a global base
is not required. Send init's startup message immediately, then continue Context
check as normal. An unresolved workspace approval is a genuine pre-init wait.
The fresh-init startup hooks do not apply before init. A resumed preflight uses
`inspect`, verifies current state and retains the actual approval status.

## Stage inputs and path ownership

Pass `workspace_contract`, `artifact_root` and state path to **every** inline or
delegated stage, including readiness, Lightweight fixes, independent review,
regression and final sync. Read saved state for each dispatch. Its `repos` are
the authoritative allowed write scope; inventory is not write scope.

- Artifact paths are relative to artifact root; shared specs/plans/reports,
  ledgers, handoffs and logs stay in its `make-it-work/<TICKET>/` directory.
- Product/test paths are relative to the named repository root. Resolve all
  repository tokens by contract ID, never by whichever cwd happens to be active.
- Run every Git, build, test and documentation command from its explicit repo
  root (`git -C <repo>`). There is no workspace current branch or shared base.
- Use repository-qualified paths in reports, findings and changed-path lists.
  Preserve verification schema; full-suite rows already carry `repo` IDs and
  step-check subjects/notes should identify the repository.
- Context check runs the existing inventory helper once per affected repository;
  no workspace-root context files are required. Unselected siblings do not block.
  Repos without required context return the existing external-onboarding stop.
- Readiness/verification policy lists every affected product repo and required
  test locations. A bare workspace `full` gate means the approved product scope,
  not all checkouts. Include selected test repos through their recorded locations.
  Do not run or mutate unselected siblings as a side effect of detection.
- Review evaluates every affected repo against its own base and explicitly
  checks cross-repo contracts. Final sync evaluates documentation per affected repo.

## Scope changes and resume

Every controller checkpoint enforces the approved repo set and branches. Ordinary
resume also checks each saved HEAD/worktree and the spec/plan hashes. Legacy
single-value branch/base/head fields remain compatibility display fields for the
first repository; they are never the authority for workspace Git operations.

If any stage discovers another affected repo or a different branch is needed,
stop dependent work **before edits there**. Resolve any existing blocking input,
checkpoint `pause` with the discovery, revise the report and prepare the complete
proposed selection. Keep existing repos selected unless removal is explicitly
requested and no implementation/test changes would be omitted; never remove a
repo with ticket changes merely to clear a blocker. Repeat exact user approval,
apply branches, then controller `scope-update` with `source: user`, `via`, `reason`
and the full repository roots. It captures the approved contract, increments plan
version, invalidates execution/review/readiness and returns to Context check.
Revalidate the retained spec, assess risk and build a new plan; old evidence and
package approvals cannot complete this revision. Loop limits remain in force.
The controller retains `scope_previous_plan` and `scope_change_reason`. Pass them,
the revised assessment report and any Lightweight report to planning as a scope
revision. It writes `-plan-v<N>.md`, preserving earlier plan artifacts. An expansion
before the first plan still uses this versioned output without inventing an older
plan or a review/gate feedback report. Once the revised plan exists, later ordinary
replans use their normal previous-plan and feedback inputs.
Autopilot pauses for repository/branch approval; it does not stop merely because
that required user decision is pending. Other Autopilot hard stops still apply.

Completed runs cannot change scope. Keep their package and separate delivery
journal intact. Broader follow-up work needs another run.

## Completion and HTML

Build the package with every approved repository, even unchanged supporting repos,
and its individual base. The builder rejects omissions, extras and branch/base
changes. Unchanged repos remain bound by approval but delivery skips them; no
changed repositories yields a clear no-delivery result. Deliver still requires
its own exact-plan approval; scope consent never approves commits, pushes or PRs.

One pipeline tracks shared phases. The Repositories panel shows approved scope,
roles, branch/base/HEAD and evidence. Proposed revisions are visibly separate
until registered. Scope history preserves earlier selections. Verification is
shown only from recorded evidence, never inferred from a shared phase or review.
Repository-qualified activity and findings go through the existing activity/audit
helpers. Single-repo dashboards keep their existing compact layout.
