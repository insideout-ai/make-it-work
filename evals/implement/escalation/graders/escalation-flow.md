---
type: llm
focus: trace
weight: 3
---

The fixture is a Guided adaptive run in Lightweight mode whose saved second
review (`review-2.json`) reports finding #2 in `src/policy.js:canProceed`,
introduced by the fix of #1 in the same region. PASS only if the resumed run
routes that saved review through the handoff helper, recognizes the repeat
offender and escalates Lightweight → TDD without asking the user (Guided shows
and logs escalations; it does not ask), rather than dispatching another
Lightweight fix, replanning, or stopping. The escalation checkpoint must log a
`review → plan` row whose reason starts with `Escalation:` and names the
repeat offender, set `mode: tdd` and `escalations: 1`, reset the review/fix
counters, and leave `replans_used` and `plan_version` unchanged. Plan must run
testing readiness and then `plan-the-work` in initial mode with the input
`escalation baseline: make-it-work/DEMO/DEMO-lightweight.md`. The uncommitted
Lightweight change to `src/policy.js` must be kept as an accepted baseline (not
reverted, stashed or committed); the plan treats already-built behavior as
baseline whose tests must pass and keeps the remaining work, including the
deny-by-default fix, test-first. The run then stops at Guided plan approval
without approving it or starting execution. No commit, push or PR.
