# Testing readiness before planning

Run inside `implement`'s Plan phase, before invoking `plan-the-work`, and before entering Execute with a reused standalone plan. The branch guard, workflow state, dashboard and spec already exist. Read the spec to identify affected product repos; inspect only relevant test locations. This is setup owned by the orchestrator, outside planning's read-only investigation. Keep the dashboard in Plan while doing it.

## Inspect and choose

For each affected repo, inspect its strategy when present, relevant external test locations, and actual manifests, runner config, test files and CI. A missing strategy is not a blocker. Neither a `none` row nor a stale strategy overrides newly configured tooling during this readiness check. Lint, type checking, builds and placeholder test scripts do not constitute testing infrastructure. An existing QA repo can provide the usable setup even when the product repo's own row is `none`; retain that arrangement.

Reuse Strategy Decisions, the Status in Layers and Where New Tests Go, Coverage Decision Guidance and Recommended Setup when forming the setup proposal. Identify the selected layers needed for the ticket's changed behavior, not merely whether some runner exists. A selected `planned` component layer required by a UI change is a readiness gap even when unit tests already run. Resolve that layer's prerequisites through the setup flow below, retaining the chosen destination and existing runner where suitable. Deferred or unrelated future layers do not expand this ticket's setup; revisit a deferral explicitly if the requirement now needs it. Legacy rows without Status keep their configured-only interpretation. When invoking DTS, pass the ticket scope, prior strategy/readiness decisions and caller autonomy so its discussion does not repeat resolved questions on refresh. A planned destination alone never makes a layer ready or changes the automated/manual verification policy.

- **Usable tooling exists:** retain it. Inspect the maintained test map per `../../../docs/test-map-contract.md`; reuse unchanged relationships rather than repeating full semantic discovery. Inventory or refresh its strategy by reading and following `../../define-test-strategy/SKILL.md` relative to this reference's directory. Use the repo root and the original invocation root, and the caller's autonomy per that skill's `When run by implement`. Record configured layers/commands even if the first tests have yet to be written. If required selected layers remain planned, use the next branch for those missing capabilities. Do not install a redundant second framework or require unrelated suites to pass here; existing regression failures follow planning's baseline policy.
- **No usable setup, or a required selected layer needs setup:** read the repo's Recommended Setup if present and `../../define-test-strategy/references/recommend-initial-setup.md`. Produce the repo-specific proposal for the missing capabilities, using the ticket's relevant behaviors and selected layers as the initial scope. Existing automated layers stay in place. In Guided mode ask once with **Set up automated tests (Recommended)** / **Use manual verification**. In Autonomous or Autopilot choose minimal automated setup without asking, unless the user already explicitly selected manual verification for this repo/run. Log that default with its rationale; Autopilot uses site `testing-readiness` and the ordinary decision-log schema. Reuse an explicit project instruction requiring manual verification as a user policy, naming its path.

Write `make-it-work/<TICKET>/<TICKET>-testing-readiness.md` before setup changes. Include evidence, proposal, selected mode, decision source and reason per repo, and a setup status (`pending`, `ready`, `manual`, or `blocked`). Set the state's `testing_readiness` to this path. Checkpoint the choice as a same-phase decision row and regenerate the dashboard before installing/configuring anything. On resume, inspect actual files and the saved decision; do not repeat successful setup or silently change a recorded manual choice. Newly affected repos on replan receive their own readiness check.

## Establish a minimal automated setup

Use the repo's package manager/runtime and lockfile conventions. Add only dependencies, runner config, scripts and a real test of relevant existing behavior needed to establish the chosen initial layer. Avoid production changes to make setup pass. Use a built-in runner when it actually fits the source/runtime, rather than choosing it solely to avoid installation.

Run the exact recorded command and confirm a nonempty, non-skipped behavior test actually executed and passed for each newly established required layer. Then follow `define-test-strategy` inline, passing the selected automated policy, the retained pre-setup strategy, exact setup changes and actual successful test result. Its verified-setup rule promotes corresponding planned layer/destination rows to configured and updates Test Locations, commands, globs and prerequisites; it preserves unrelated user content and other planned/deferred layers. Confirm every required selected layer is configured and the strategy names its real command rather than retaining `none` under the ordinary refresh-conflict default. A proposal alone never activates a layer. Record setup files, strategy/map metadata, executed command, actual result and final `ready` status in the readiness artifact; refresh affected map registrations/evidence after setup, and never add mapping annotations to source/tests; refresh `head` and `worktree_fingerprint`. These changes are intentional workflow changes, so pass their paths to planning as the accepted baseline rather than demanding a clean worktree or discarding them.

If setup cannot be established, record the concrete reason. Guided and Autonomous may ask **Use manual verification** / **Stop**. Autopilot checkpoints `Stopped` with remediation unless manual verification was already explicitly authorized. A denied installation, unavailable service, broken runner, or failed real test is not permission to silently downgrade verification or repeatedly try different frameworks. Keep a partial setup listed as partial; active strategy entries must still reflect actual configuration. Do not commit setup changes.

## Manual verification

Record manual mode only from a user's choice or explicit project policy, never from absence of tests or a failed setup alone. If the strategy is missing, generate its inventory/proposal with `define-test-strategy` inline; keep it factual (`none` where appropriate) and retain its recommendations. Planning must provide executable manual scenarios with setup, actions and expected observations for each relevant AC and regression path. Execution must perform them and record observed results; source inspection alone is not a manual behavior check. Unavailable access or an unperformed scenario stops execution with the missing evidence; it never counts as verified.

## Handoff to planning

Pass the readiness artifact, setup baseline file paths, and this table (one row per affected product repo) to `plan-the-work`:

```markdown
## Verification Policy

| Repo | Mode | Decision | Reason |
| --- | --- | --- | --- |
| example-api | automated | configured | Existing runner, strategy refreshed |
| example-ui | manual | user | User deferred tooling setup for this run |
```

`Mode` is `automated` or `manual`. `Decision` is `configured`, `user`, `project-policy`, or `autonomy-default`; manual permits only `user` or `project-policy`. Include the actual decision/policy reference in Reason. Recommendations and pending setup cannot be recorded as automated readiness.

Require the same table in the plan, and check it with `node "<implement-base>/scripts/testing-policy.mjs" check --plan <plan-path> --required`. Replans and fix plans retain the choices unless the user changes them or newly affected repos require setup. For a reused plan, add/resolve this policy before execution, update the plan hash, and apply the normal Guided plan approval. Existing resumed runs without readiness/policy keep their legacy gate behavior; do not retrofit setup during execution.

Execution runs the full suites for automated repos and all manual scenarios for manual repos. An all-manual plan returns `VERIFIED_MANUALLY`, with automated gate `none`, after evidence validation. A mixed plan still requires its automated gate to PASS and its manual evidence to be complete. Failure or unavailability of a planned automated suite follows existing gate failure/no-result handling; it never converts the repo to manual mode automatically.
