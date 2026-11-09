---
tags: [implement, readiness, ordering]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 120
timeout_seconds: 1200
runs: 1
---

/make-it-work:implement make-it-work/DEMO-READY/DEMO-READY-spec.md --autopilot --mode tdd

This is a focused readiness-ordering check. Reuse this accepted spec as-is; that reuse is explicitly authorized. Start normally through Context check and risk/mode recording, using the invocation repository for artifacts. I explicitly request a pause in Plan after the checks below; no Execute, feature completion, commit, push or PR. Do not ask a question.

The readiness scope for this diagnostic is only the existing configured Node runner and its baseline. Do not install tooling or perform full DTS/onboarding. Follow the new readiness checkpoint and results-table contract, using policy repo `app`, mode `automated`, decision `configured`, reason `Existing Node runner`.

1. The parent begins readiness before delegation. Launch one Agent with `run_in_background: true` to inspect the current runner, run `npm test` in this repo, and write the readiness report at the path returned by begin, with its actual counts/result and the required policy/results tables. Setup is existing. Tell it not to edit source/tests, workflow state or dashboard, not to call readiness begin/complete, and not to delegate further.
2. While it is still running, deliberately attempt the readiness `complete` CLI **once**, as its own direct Bash invocation. Expect the hook to reject this premature attempt. Do not evade the guard or treat it as an external blocker. Yield with a brief waiting response, no tools; stay In Progress and let the actual handback resume the session. No polling, blocking TaskOutput, sleeps or fake pause.
3. After the actual handback, reconcile the report, complete readiness in the parent and run its `check`. Do not draft a plan or create progression tests before this succeeds.
4. Only now save a small draft plan with the same Verification Policy and one numbered step whose Tests field declares `test/admin.test.js` in backticks. Run the planning-test authorization helper before writing that file. Add the administrator assertion, run only that test to confirm its expected red result against unchanged production code, and recheck readiness. Its recorded baseline must still be the earlier passing three-test baseline; don't overwrite it with the new expected-red result.
5. Record the user-requested pause through the controller: phase Plan, status Paused, execution not started. Report the earlier baseline, later expected-red result and saved pause. The draft need not become a completed plan/handoff.
