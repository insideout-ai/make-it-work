# Execute a resolved verification policy

This path applies only when the plan has a concrete `## Verification Policy` table. Use `node "<execute-base>/../implement/scripts/testing-policy.mjs" check --plan <plan-path>` to validate it and read the automated/manual repo lists. A malformed policy stops before code changes. A missing/`None` policy uses the legacy execution and gate rules unchanged.

Pass the policy and repo-specific verification requirements to each step executor. Automated repos retain their named test commands. Manual repos use their corresponding `## Test Plan` rows, with actual setup/actions/observations. Never infer a manual check from reading code, a build, or another repo's passing suite. Unavailable access or unperformed checks stop execution with the concrete reason; they are not exempt checks.

For every concrete policy, maintain the ledger in `../../implement/references/verification.md` relative to this reference, even for standalone execution. Use the plan's ticket and version. Record actual passing checks after each step and validate before advancing Progress. The final manual verification step also requires evidence. All acceptance criteria and every scenario for a manual repo must have passing evidence before successful completion; the validator checks both against the plan. Record each automated repo's actual full-suite result in `gate.full_suites` per that contract. Do not add a manual scenario late merely to relabel a failed automated suite.

## Completion gate

After every numbered step is complete:

- **All repos manual:** do not invoke `run-regression`. Record `gate: { mode: "none", result: "manual-accepted", note: "<decision reference and actual manual verification summary; automated regression unavailable>" }`, map the AC evidence and validate the ledger using `--plan` and `--outcome VERIFIED_MANUALLY`. Only after validation succeeds print the manual terminal report below. This is the policy selected before planning, so no late fallback question is needed, including in Autopilot when that choice was explicitly authorized.
- **Some or all repos automated:** invoke `run-regression` once, with `full:<repo>` for each automated product repo that owns a configured suite, plus the plan's touched UC/domain tokens for those repos that have a strategy. If a product repo's own strategy row is `none` because its tests live externally, use explicit `full:<test-repo>` for the confirmed external suite(s) providing its automation; deduplicate a shared QA suite and record the actual run root in evidence. Never require inventing a local suite when real tests already live elsewhere. Never include a manual product repo's tokens or full-suite request and never use a bare `full` that would inadvertently include manual/unrelated repos. The gate mode is `scoped+full` when scope tokens are included, otherwise `full-suite`. Preserve actual FAIL handling. If any required automated suite did not execute, return `GATE_NO_RESULT` rather than allowing another repo's passing run to stand in for it. A missing command or unavailable suite never changes the selected policy. When all required automated suites PASS, validate the manual evidence too before the normal Phase 5 report. Describe manual verification separately from the automated result.

If terminal evidence validation fails, repair it from actual retained observations or perform the missing check. If that cannot be done, return `EXECUTE_STOPPED` with the missing evidence, never a passing handoff. Existing guardrail and retry limits still govern real failing checks. Legacy `GATE_NO_RESULT` fallback remains available through `implement` where documented, but is not an automatic substitute for this policy.

## Manual terminal report

```text
Plan: <path>
Steps: <M> of <M> complete
Verification: Manual verification completed; automated regression unavailable
Completion gate: None — explicit manual verification policy
Evidence: <ledger path and concise observed results>
Limitations: <automated coverage gaps and any retained limitations>
```

End a run called by `implement` with `Execute outcome: VERIFIED_MANUALLY` and its normal Discoveries line. Its handoff has `data.gate: "none"`, an empty `failing_tests` list, and the validated verification artifact. Do not print the normal `Completion gate: … PASS` report for this path.
