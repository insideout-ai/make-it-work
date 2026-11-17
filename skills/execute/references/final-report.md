<!-- Procedures relocated from the parent SKILL.md without policy changes. -->

Read this guide only at the loading point in [the skill entrypoint](../SKILL.md). `<base>` and bare relative paths in prose or code below refer to the parent skill directory; Markdown links resolve from this file. Phase and step names refer to the complete workflow in that entrypoint and its linked guides.

## Phase 5 — Final report

Phase 5 is reached only when Phase 4's automated completion gate reads `PASS` (`Gate result: PASS` for a single-repo run, or `Overall gate result: PASS` for a workspace or token run). Explicit all-manual plans finish with the separate report in `references/verification-policy.md`. For automated or mixed plans, print the fixed report block below and include a separate manual-evidence line when applicable.

Print, verbatim in shape, filling in every bracketed field:

```
Plan: <resolved plan path>
Mode: <Subagent-Driven | Inline>
Steps completed: <M> of <M>
Completion gate: <Full suite | Scoped + full (<repos>)> — <PASS>
[Not run: <entries>]
Changes are uncommitted in the working tree — review and commit when ready.
```

- **`Plan:`** — the plan file path Phase 0 point 2 resolved (`make-it-work/<TICKET>/<TICKET>-plan.md`, or the explicit path argument), exactly as it was used throughout this run.
- **`Mode:`** — the `Mode` Phase 0 point 3 resolved for this run, printed exactly as one of the two literal values `Subagent-Driven` or `Inline` (not the longer descriptive sentence recorded in the plan file's `## Execution Status → Mode` line — just the mode name).
- **`Steps completed:`** — `<M> of <M>`, where `M` is the plan's own total step count, the same `M` that appears throughout `## Execution Status → Progress` ("Step N of M complete"). By the time this phase runs, Progress reads "Step M of M complete," so both numbers here are that same `M` — every step, not merely the ones this particular invocation itself executed (a resumed run that only executed the tail of the plan still reports the plan's true total here).
- **`Completion gate:`** — first `Full suite` or `Scoped + full (<repos>)`, matching whichever branch Phase 4's "Resolving scope" section actually took for this run (conditions (a) and (b) both holding → `Scoped + full`, with `<repos>` the comma-separated product repos passed as `full:<repo>`, e.g. `Scoped + full (payments-api, ledger-api)`; either failing → `Full suite`), then ` — PASS` (this line is only ever printed once the gate has already been confirmed to read PASS, so the result half of it is always `PASS`, never `FAIL`).
- **`Not run:`** — printed only when `run-regression`'s report listed any entry on its `Not run:` or `Unmapped scope (not run)` line; omit the line entirely when both read `None`. Copy those entries, joined with `; `, each with its reason (e.g. `Not run: payments-api: ../qa-automation/tests/e2e — ci-only; ledger-api:UC-03 — no test strategy`). These never affect the PASS on the line above.
- **`Changes are uncommitted in the working tree — review and commit when ready.`** — printed verbatim, unchanged, every time: this skill never runs `git commit` on the user's behalf, per Phase 1's "Never git-commit" rule, so this line is a constant, not a field to fill in.

### This is the terminal, successful-completion message

This report is one of exactly three distinct, mutually exclusive ways a run of `execute` can end — never more than one of them in the same run:

1. **A Phase 3 report** (Case 1 — Guardrail fired, or Case 2 — Retry limit reached) — printed when a stop condition fires mid-plan, in Phase 2. Per Phase 3's own "terminal outcome" rule, a run that ends this way never reaches Phase 4, and never reaches this Phase 5 report either.
2. **Phase 4's completion-gate FAIL report** — printed when every step passed but `run-regression`'s gate itself comes back FAIL (or never produces a result line at all). Per Phase 4's own instructions, a run that ends this way prints `run-regression`'s full report verbatim and stops there; it never falls through to this Phase 5 report in the same run.
3. **This Phase 5 report** — printed only when every step passed *and* the completion gate came back PASS. This is the sole successful, fully-terminal outcome of a run of `execute`.

The explicit-policy manual terminal report is a fourth successful terminal path, with outcome `VERIFIED_MANUALLY`. Print only the applicable terminal report, never an automated PASS for an all-manual plan.
