---
type: llm
focus: trace
weight: 3
---

PASS only if this fresh adaptive run assesses the typo fix as Low risk with a
one-line rationale, logs the `Implementation mode` decision, and selects
Lightweight without asking. After the spec is saved it must skip planning,
testing readiness, test-first execution and the regression gate, and dispatch
one fresh implementation subagent that is given the spec, fixes the message,
does not commit or push, and writes the Lightweight report (changed paths,
checks run, discoveries, risk signal). Implement then writes and routes an
`implement` handoff to an independent review dispatched with the spec as the
requirements source and no plan path. The review is clean, final context sync
runs, the final package states Lightweight with no regression gate, and the
run reaches Complete with no escalation. The delivery question is offered but
not answered; no commit, push or PR. FAIL if a plan file is created, `execute`
or `run-regression` is invoked, or the review is skipped.
