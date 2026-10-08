# Verification evidence for new Implement runs

This applies only when the run state has `verification_version: 1`. Older runs and standalone `execute` keep their current reports. No new tests or validation phase are introduced.

`execute` maintains `make-it-work/<TICKET>-verification-v<plan_version>.json`. Start a new file for each replan version; resume and fix steps in the same plan version update the same file. It is local run data. Use this shape:

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

At the completion gate, set `gate` to `{ "mode": "full-suite | scoped | none", "result": "pass | fail | no-result | manual-accepted", "note": "actual command and concise result/reason" }`. `manual-accepted` is only for `mode: none` after the developer expressly chooses the existing manual walkthrough route. The gate's raw details remain in the Execute report. Do not run it a second time for this ledger.

At terminal Execute, fill `acceptance` with one row for **every** pair in the plan's existing `**AC traceability:**` table: `{ "criterion": "exact AC text", "scenario": "exact scenario text", "status": "automated | manual | unverified", "step": 1 | null, "note": "evidence or reason" }`. `automated` and `manual` may cite only a passing check of that type on the named step whose `subject` exactly matches the scenario. `unverified` has `step: null` and states what remains open. Do not turn a passing full suite into a claim that every AC was verified. A manually accepted no-result gate should be accompanied by actual manual check entries where possible; otherwise mark the relevant ACs unverified.

After every step entry and after the terminal gate/AC update, run:

`node "<implement-base>/scripts/verification.mjs" check --root <artifact-root> --file make-it-work/<TICKET>-verification-v<plan_version>.json --ticket <TICKET> --plan-version <plan_version> [--plan <plan-path> --outcome <Execute-outcome>]`

Use `--plan` and `--outcome` on a terminal Execute result. The helper validates the schema, cross-checks AC evidence against step checks and the plan's traceability table, and rejects a gate/outcome disagreement. It does not run tests or mutate any file. A nonzero check blocks Progress or handoff as applicable; repair actual evidence or rerun the check.
