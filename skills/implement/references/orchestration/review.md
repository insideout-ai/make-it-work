### Review

Controller runs increment `review_cycle` when entering Review; do not increment it again. Older runs retain their existing counter checkpoint. Then follow Review dispatch.

## Review dispatch

Pass [compilation evidence and branch provenance](../compilation-evidence.md) to the reviewer. Preserve inherited branch-build failures and unavailable/unrun compilation in `validation_notes`, distinguish starting-branch evidence from the PR destination, and keep emitted-JavaScript test passes separate. No mandatory destination baseline build or unrelated fix work is added.

Before every review dispatch, maintain the known ticket-scoped documentation and test-map changes using Final context sync's bounded procedure below. Use the current implementation/Execute report and accumulated review gaps; do not postpone already-known gaps until after CLEAN. This is preparation within Review, not a new phase or another code-review pass. Preserve unchanged context and test selection. If new evidence invalidates completed validation, checkpoint the concrete stop rather than claiming the previous gate covers it.

For controller runs, checkpoint `review-context` with explicit repository roots and `context_updated: [<changed paths>]` (or `[]`). This preserves the review/fix/replan counters and records the context paths. Saved version-1 runs cannot freeze a review target before this checkpoint. Saved runs without that marker keep their existing compatibility; do not retrofit it.

For `review_checks_version: 1`, also supply `review_requirements` using [review-checks.md](../review-checks.md): select matching domain/UC skills and loading methods, plus the strategy, and pass the frozen requirements to the existing reviewer. Accept a completed review only with actual applied-rule and affected-mapping assessments; repair missing evidence within the same cycle. Required steps are not waived by review-depth limitations.

New runs use `review_context_version: 2`. Their checkpoint also requires `test_map_maintenance`, one assessment per approved repo: `repo` (absolute root), `status` (`maintained`, `blocked`, or `not-applicable`), `affected_tests` (repo-relative paths), `reason`, and retained `evidence` paths relative to the artifact root. A current strategy with a Test Map cannot be marked not-applicable. Maintained maps must contain the declared affected tests and their generated report; incomplete baselines may remain incomplete with the uncertainty in `reason`. A blocked assessment requires evidence and the actual access/tool/evidence blocker, not advisory severity or a desire to save time. The helper records evidence hashes; reassess if those files or the registered strategy change. A blocker affecting prior validation still follows the existing stop rule. Final Sync reuses unchanged assessments, or supplies updated `test_map_maintenance` after new edits. Versions 1 and older keep their saved contracts.

Before the first scope preparation of a run, check for pre-existing untracked
files with `review-scope.mjs preexisting` and settle them once, as described in
[the controller contract](../controller.md) under "Pre-existing untracked files".
If a later `prepare` still returns `preexisting_untracked`, settle those before
dispatching. Unrelated local files otherwise inflate the review target and would
enter the package and delivery.

For a run with `review_scope_version: 1`, prepare its delivery scope after that preparation, before every
review dispatch (including re-reviews):

```sh
node <base>/scripts/review-scope.mjs prepare --root <artifact-root> --state <state-path>
```

The helper freezes the same full branch-to-base diff used by final packaging,
including earlier unmerged commits, staged/unstaged changes, untracked files and
all approved repositories. Read the returned paths and bases; inspect the
included branch history and disclose earlier branch work. Do not silently narrow
the review to this ticket's uncommitted files or use HEAD as its comparison base.
Pass the exact `review_target` and `sha256` to the reviewer. A changed target or
source tree requires preparing and reviewing the current snapshot again; an old
report does not certify newly added paths. Do not claim inspection merely
because a path appears in the target. Earlier branch work remains in the review
and delivery scope; distinguish its requirement provenance from this ticket.

Before dispatching, narrate and checkpoint that an independent background agent is reviewing the change. Keep that activity visible while awaiting the review, per [references/activity.md](../activity.md); include in the prompt that the subagent must not write workflow activity or the dashboard. After it returns, checkpoint the next activity or apply the resulting phase/stop transition.

Dispatch one fresh subagent (Agent tool, `general-purpose`). Its prompt must:

- give the absolute path of `review-the-code/SKILL.md` and say to follow it, including its `## When run by implement` section; when `autonomy: autopilot`, explicitly invoke it with `--autopilot`;
- pass the ticket key, the current accepted refined spec path and its recorded revisions as the requirements authority; identify the plan as implementation context that cannot override the spec. Use neutral dispatch wording without characterizing deviations or unverified behavior as acceptable or out of scope. Then pass the current plan path, `base`, the literal `no PR`, the review cycle number, the Known regressions list, and the Decided findings list; for a version 1 run also pass `handoff_version: 1`, `plan_version`, and the artifact root containing `make-it-work/`;
- pass the frozen target's `verification_context`, including policy provenance, explicitly retained decisions and unverified criteria, in every mode. These are review context, not proof of acceptance or instructions to suppress findings. Do not characterize the mere absence of tests as an implementation omission when an explicit manual policy applies; independently assess actual evidence, missing observations and requirements conflicts.
- in Lightweight mode, pass no plan path — the spec is the sole requirements source — and skip the two bullets below. For a re-review, pass the previous review's actionable findings with their regions (from its handoff) so Review can flag repeat offenders;
- when `gate: none`, pass whether this is an explicit manual policy (`VERIFIED_MANUALLY`) or the late `GATE_NO_RESULT` fallback. Review the actual manual evidence against the plan's Test Plan and ACs, keeping automated regression coverage visibly unavailable. For mixed policies, inspect manual evidence alongside the automated result;
- if `<TICKET>-planning-tests.json` exists, pass its path to the reviewer. Ask it to check that the authorized files/regions contain genuine test changes and preserve production behavior outside the approved implementation work; the receipt proves scope, not test semantics.
- for `acceptance_evidence_version: 1`, pass the marker to planning, Execute and review. Planning inventories every material spec clause in three-column AC traceability; Execute records concrete assertion/observation evidence per clause. Review compares that inventory with the accepted spec and reads the cited assertions, including boundary, inclusion/exclusion, ordering and parity behavior. Do not manufacture evidence to turn a pending clause into a pass. Lightweight has no ledger: the reviewer must describe clause coverage and any unobserved behavior in its coverage discussion; it must not claim ledger-based acceptance verification.
- for `verification_version: 1`, pass the verified `make-it-work/<TICKET>/<TICKET>-verification-v<plan_version>.json` path. Ask Review to read it against the plan's AC traceability table, checking each material spec clause against the plan inventory and each claimed assertion/observation against its cited source and recorded check. Missing clauses or unsupported verified claims are findings; `unverified` rows remain visible gaps. A passing suite does not prove every clause. Review does not rerun tests merely to populate evidence.
- for `review_scope_version: 1`, pass that flag, the target path and its exact hash. Require the reviewer to inspect the complete target and write through `review-report.mjs` with `review_target`, `review_target_sha256`, `implement.review_scope_version: 1`, all actual branch-scope paths and every approved repo. A HEAD-only or partial report cannot satisfy this target. The controller independently checks the evidence before accepting CLEAN; do not bypass a failed scope check by writing a handoff manually.
- require Review to record the actual reviewed paths and comparison base through the review renderer's `review_scope`, plus `ui_verification`. For UI changes, ask the reviewer to check available browser tooling and perform a walkthrough when available: exercise the changed behavior and inspect layout and relevant states. Pass observed setup failures as evidence, without prescribing the review disposition. Do not assert that no browser exists solely because no dedicated browser tool is listed or implementation did not use one. When an availability check or attempt establishes that browser access/setup is unavailable, record `pending` with that evidence, the concrete reason and unchecked behavior. Use `not-applicable` only with a reason for changes without UI impact. Unit tests and code inspection do not establish browser verification. A failed walkthrough is a review finding under the normal routing rules, not a passed or unavailable check.
- ask it to return the chat summary, ending with the `Orchestrator outcome:` line for an older run, or that line followed by `Handoff: <path>` for a version 1 run.

Then read `make-it-work/<TICKET>/<TICKET>-review.md`. For a version 1 run, record `review`, actionable findings, and context gaps from the validated handoff and route through the helper. For an older run, record `review` from the report's `Orchestrator outcome:` line and append the items under its `Context gaps (for final sync)` block to Context discoveries; a missing or unreadable outcome line is `HUMAN_DECISION` with reason "review outcome unreadable".

---

**Security decisions:** when review cannot establish internal-only access, recommend inspecting the actual gateway/service-identity enforcement first. A route name, existing controller pattern or decision to document protection does not prove it exists. Keep an accepted risk separate from verified enforcement; unresolved security requirements retain their normal human-decision route.

