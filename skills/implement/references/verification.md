# Verification evidence for new Implement runs

## Completion presentation

Workflow completion, acceptance verification and overall assurance are separate. The final package
and dashboard summarize the validated ledger by distinct criterion: all mapped
scenarios for a criterion need passing automated or manual evidence before it
counts as verified. A mix is **Partially verified**, with the number of pending
criteria and their scenarios/reasons visible; no verified criteria is **Pending
verification**. All recorded criteria verified is **Verified**. Missing/empty
evidence cannot establish verification. This summarizes plan-traceability
evidence, not deployment readiness or all possible behavior.

`final-package.mjs check` returns this derived `verification_summary` (labelled
**Acceptance verification**) for the
terminal chat/publication summary. It does not modify ledger statuses or the
workflow state, weaken manual-policy checks, or waive acceptance/package
approval. Ledger `unverified` values remain unchanged; views call them pending
verification. The checker also returns `assurance_summary` for every package, including
Lightweight and legacy packages. New builds opt into `assurance_version: 1`
in the package JSON, with **Assurance** as their first evidence headline. It is
`Limited` if acceptance is missing/pending, delivery review is unknown/partial,
browser checks are pending, no automated regression gate ran (including
Lightweight/manual acceptance), or open nits/known unrelated regressions remain.
Otherwise it says `Recorded checks complete`, which covers only the recorded
checks and never claims release readiness. Detailed reasons/evidence stay in
the package; passing acceptance does not imply browser or full-delivery review.

Completion chat and authorized tracker summaries use the returned assurance
headline before the separate acceptance count. The dashboard explicitly labels
its ledger-only summary **Acceptance verification**. These summaries introduce
no new gate or user approval. An existing package without `assurance_version`
keeps its exact legacy Markdown/JSON and approval hash during check; its returned
assurance summary still exposes limitations. A normal rebuild opts into the new
format and uses the existing approval-binding rules. Never rewrite saved
evidence to improve a headline.

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

## Clause evidence for fresh TDD runs

Fresh Implement runs additionally carry `acceptance_evidence_version: 1`. Keep the ledger schema `version: 1`; this additive contract requires a `Requirement clause` column between `Acceptance criterion` and `Test scenario` in the plan traceability table, and the exact `clause` text on every acceptance row. One scenario can map to several clauses, and one clause can need several scenarios. Every mapped combination must appear, including pending cases. Older runs are not silently opted in.

On each actual passing automated/manual check used to verify a clause, record an `assertions` array:

```json
{
  "type": "automated",
  "subject": "Prepaid total",
  "command": "node --test income.test.js",
  "result": "pass",
  "note": "Named test executed and passed",
  "assertions": [{
    "clause": "Include prepaid product value in income",
    "expected": "100 service plus 25 prepaid gives total 125",
    "observed": "total equals 125",
    "source": "app/test/income.test.js:42 — assert.equal(total, 125)"
  }]
}
```

Each assertion has exact `clause` text, the concrete `expected` behavior/value, the actual `observed` result and a `source` identifying the assertion in the executed test (repo/path:line plus test/assertion identity). For manual checks, source identifies the retained walkthrough/observation, with setup/actions and observed behavior. Write only evidence actually executed or observed. Test names, suite exit codes, source inspection, or a shared computation alone cannot establish an unasserted ordering, boundary, error-path or parity clause. An `exempt` check cannot carry assertions. Keep unrelated step checks without this array as appropriate.

An acceptance row such as `{ "criterion": "AC1 income", "clause": "Include prepaid product value in income", "scenario": "Prepaid total", "status": "automated", "step": 1, "note": "Exact total assertion passed" }` needs a passing check of the same type/subject on that step with an assertion for that exact clause. Otherwise record `status: "unverified"`, `step: null`, and a reason. A missing assertion blocks a verified claim; it does not require inventing a test or waiving a missing observation. Existing manual-policy completion rules still apply.

Pass `--require-clauses 1` to every verification helper call in a clause-contract run, including delegated partial checks; the parent also passes `--state` as usual. Controller plan/Execute handoff acceptance, dashboard validation and packaging independently enforce the state's contract. The final package shows each clause, pending reason, and verified assertion's source/expected/observed values. A criterion is verified only when all of its mapped clauses/scenarios are verified.

The deterministic checks establish that all planned clauses have matching concrete evidence records. They cannot establish semantic completeness or truth from strings: the independent reviewer must compare the inventory with the accepted spec and inspect the cited assertions/observations. Missing spec clauses or claims unsupported by the cited check are review findings. Never treat this ledger as a replacement for that inspection.

After every step entry and after the terminal gate/AC update, run:

`node "<implement-base>/scripts/verification.mjs" check --root <artifact-root> --file make-it-work/<TICKET>/<TICKET>-verification-v<plan_version>.json --ticket <TICKET> --plan-version <plan_version> [--plan <plan-path> --outcome <Execute-outcome>]`

Use `--plan` and `--outcome` on a terminal Execute result. In the main Implement session, also supply `--state <exact-state-path>` so a successful check records a typed Result with the ledger path/hash, gate result, and verified AC count. A partial check is labeled partial and does not claim terminal completion. The state must match the ticket and plan version; result retries for the same ledger/outcome are idempotent. Subagents omit `--state`; the parent records the validated shared ledger under its normal ownership rules.

The helper validates the schema, cross-checks AC evidence against step checks and the plan's traceability table, and rejects a gate/outcome disagreement. It never runs tests or edits the ledger. Without `--state`, it remains read-only; with it, the only additional mutation is the informational audit result and an existing dashboard refresh. A nonzero check blocks Progress or handoff as applicable; repair actual evidence or rerun the check. Neither a Result note nor a partial check substitutes for terminal validation.
