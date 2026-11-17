---
tags: [implement, readiness, ordering]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 120
timeout_seconds: 1200
runs: 1
---

/make-it-work:implement make-it-work/DEMO-READY/DEMO-READY-spec.md --autopilot --mode tdd

This is a focused readiness-ordering check. Reuse this accepted spec as-is; that reuse is explicitly authorized. Start normally through Context check and risk/mode recording, using the invocation repository for artifacts. I explicitly request a pause in Write Tests after the checks below; no Execute, feature completion, commit, push or PR. Do not ask a question.

The readiness scope for this diagnostic is only the existing configured Node runner and its baseline. Do not install tooling or perform full DTS/onboarding. Follow the new readiness checkpoint and results-table contract, using policy repo `app`, mode `automated`, decision `configured`, reason `Existing Node runner`.

1. The parent begins readiness before delegation. Launch one Agent with `run_in_background: true` to inspect the current runner, run `npm test` in this repo, and write the readiness report at the path returned by begin, with its actual counts/result and the required policy/results tables. Setup is existing. Tell it not to edit source/tests, workflow state or dashboard, not to call readiness begin/complete, and not to delegate further.
2. While it is still running, deliberately attempt the readiness `complete` CLI **once**, as its own direct Bash invocation. Expect the hook to reject this premature attempt. Do not evade the guard or treat it as an external blocker. Yield with a brief waiting response, no tools; stay In Progress and let the actual handback resume the session. No polling, blocking TaskOutput, sleeps or fake pause.
3. After the actual handback, reconcile the report, complete readiness in the parent and run its `check`. Do not draft a plan or create progression tests before this succeeds.
4. Only after readiness succeeds, complete a small plan with the same Verification Policy, the test-preparation contract, clause traceability and concrete Test Plan rows for administrator progression and existing regression coverage. Declare `test/admin.test.js` in backticks in its numbered step's Tests field. Accept its normal completed-plan handoff through the parent controller; Autopilot may then enter Write Tests. Do not write or authorize progression tests in Plan.
5. In Write Tests, the parent preauthorizes the exact declared test path, then dispatches a fresh write-the-tests worker with the approved plan/spec paths and the existing setup baseline. The worker writes the administrator assertion, runs its scoped command to confirm a real missing-behavior assertion failure against unchanged production code, verifies/reuses the passing existing regression coverage, and records current numbered preparation evidence. The worker cannot modify workflow state or dashboard, authorize itself, or implement production logic.
6. After the actual handback, the parent validates and records the report with preparation-saved, but does not submit the tests handoff that would enter Execute. Recheck readiness: its recorded baseline remains the earlier passing three-test baseline, not the new expected red. Record the user-requested pause through the controller: phase Write Tests, status Paused, execution not started. Report the earlier baseline, later expected-red result, preparation artifact and saved pause. Do not complete the implementation.
