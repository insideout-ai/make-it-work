---
tags: [review-the-code, verification-evidence]
allowed_tools: [Read, Glob, Grep, Bash, Write, Skill]
max_turns: 60
timeout_seconds: 900
runs: 1
---

/make-it-work:review-the-code --autopilot

For this explicit invocation, use the loaded skill's "When run by implement" mode. Use that loaded skill's Base directory from the plugin under test, not a separately installed cached plugin.

Dispatch inputs: ticket PAY-200; no PR; base main; review cycle 1; plan version 1; autonomy Autopilot. Accepted refined spec: make-it-work/PAY-200/PAY-200-spec.md. Current plan: make-it-work/PAY-200/PAY-200-plan.md. Verification ledger: make-it-work/PAY-200/PAY-200-verification-v1.json. Saved test output: make-it-work/PAY-200/PAY-200-test-output.txt. Known unrelated regressions and decided findings: empty.

Review the working tree and save the normal review report. Do not edit source, tests, the spec, plan or ledger; do not publish anything. No workflow state is supplied: return the legacy outcome line without a version-1 handoff.
