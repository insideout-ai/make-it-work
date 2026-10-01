# rr-scoped-unavailable fixture

A project with a perfectly runnable test suite but **no**
`.claude/rules/testing-strategy.md`. Invoked with an explicit
`domain-velocity` token, this must hit Phase 2's availability gate and
hard-stop — scoped mode is unavailable regardless of how it was invoked
(direct user token, or `execute`'s resolved argument) and regardless of
`--autopilot`. No Phase 5 block should ever be printed for this case.
