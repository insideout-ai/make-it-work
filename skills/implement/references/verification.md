# Verification evidence for new Implement runs

This applies when the run state has `verification_version: 1`, and when a plan explicitly selects manual repos in `## Verification Policy` (including standalone execution). Older runs without that policy keep their current reports. Lightweight runs (`mode: lightweight`) have no plan and no ledger; an escalated run produces one from its TDD plan as usual.

`execute` maintains `make-it-work/<TICKET>/<TICKET>-verification-v<plan_version>.json`. Start a new file for each replan version; resume and fix steps in the same plan version update the same file. It is local run data. Use this shape:

```json
{
  "version": 1,
  "ticket": "DEMO-1",
  "plan_version": 1,
  "steps": [
    { "number": 1, "checks": [
      { "type": "automated", "subject": "Happy path", "command": "npm test -- happy.test.js", "result": "pass", "note": "Named test passed" }
    ] }
  ],
  "gate": null,
  "acceptance": []
}
```

One step entry is written **after its Verify and test/manual walkthrough actually pass, before its Progress line advances**. Record every check used to justify that step, including per-repo checks in a multi-repo step. `subject` should match the plan's `## Test Plan` Scenario text when the check proves an AC; other checks may use their test name. `command` is the exact command for automated checks, or `null` for manual/exempt checks. For an exempt step, use `type: "exempt"`, `result: "exempt"`, and put the plan's reason in `note`. For a manual check use `type: "manual"`, `result: "pass"`, `command: null`, and describe the observed result. Never record a failed attempt as a passing check. A failed attempt belongs in the ordinary stop/report path; a step without passing checks must not advance Progress.

Single-step subagents write their own step entry before their own Progress update. In a true concurrent batch, subagents do **not** write the shared file: the orchestrating Execute session collects their reports, writes all passing entries, validates the file, and only then advances batch Progress. Do not write a passing entry for a batch member when any batch member stopped. Use atomic file replacement where available; never overwrite entries for already completed steps on resume. If Progress says a step is complete but its evidence is absent, stop and repair the evidence from actual retained results or rerun that check; never invent a pass from Progress alone.

At the completion gate, set `gate` to `{ "mode": "none | full-suite | scoped | scoped+full", "result": "pass | fail | no-result | manual-accepted", "note": "actual command and concise result/reason" }`. `manual-accepted` is only for `mode: none` after the developer expressly chooses manual verification, either in readiness or the existing late walkthrough route. `mode: none` never has result `pass`. The gate's raw details remain in the Execute report. Do not run it a second time for this ledger.

An all-manual policy returns `VERIFIED_MANUALLY`, with gate `none`/`manual-accepted`. It requires the plan's explicitly authorized policy, actual passing manual checks for every manual Test Plan scenario, complete step evidence, and no unverified ACs. A mixed policy returns `PASSED` only after the automated gate passes and the same manual evidence check succeeds. Manual scenarios use the four-column `Scenario | Repo | Type | File / command` table and Type `Manual`; unique Scenario text is the evidence subject. A legacy late manual acceptance remains distinguishable as `GATE_NO_RESULT` with the developer's decision, and may retain visible unverified ACs.

For a concrete verification policy, also record `gate.full_suites`, one entry per automated product repo: `{ "repo": "api", "command": "<actual full-suite command(s)>", "result": "pass | fail | not-run", "note": "<run root(s) and observed result or reason>" }`. When a product repo has no local tests and uses a confirmed external suite, record that suite's actual command/root under the product repo it verifies. If several suites are required for one product repo, summarize all actual commands and roots, use `fail` when any failed, otherwise `not-run` when any was unavailable, otherwise `pass`. A shared QA suite may execute once and supply evidence for several product repos. A not-run entry has `command: null`. Scope runs remain in the Execute report. `PASSED` requires every required full suite to pass. With no automated repos, omit the array or use `[]`. Older plans without a policy need no array.

At terminal Execute, fill `acceptance` with one row for **every** pair in the plan's existing `**AC traceability:**` table: `{ "criterion": "exact AC text", "scenario": "exact scenario text", "status": "automated | manual | unverified", "step": 1 | null, "note": "evidence or reason" }`. `automated` and `manual` may cite only a passing check of that type on the named step whose `subject` exactly matches the scenario. `unverified` has `step: null` and states what remains open. Do not turn a passing full suite into a claim that every AC was verified. A manually accepted no-result gate should be accompanied by actual manual check entries where possible; otherwise mark the relevant ACs unverified.

After every step entry and after the terminal gate/AC update, run:

`node "<implement-base>/scripts/verification.mjs" check --root <artifact-root> --file make-it-work/<TICKET>/<TICKET>-verification-v<plan_version>.json --ticket <TICKET> --plan-version <plan_version> [--plan <plan-path> --outcome <Execute-outcome>]`

Use `--plan` and `--outcome` on a terminal Execute result. The helper validates the schema, cross-checks AC evidence against step checks and the plan's traceability table, and rejects a gate/outcome disagreement. It does not run tests or mutate any file. A nonzero check blocks Progress or handoff as applicable; repair actual evidence or rerun the check.
