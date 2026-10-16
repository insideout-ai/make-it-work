# rr-scoped-unavailable fixture

A one-repo workspace (root `CLAUDE.md` naming `velocity-app`) whose repo has
a perfectly runnable test suite but **no** `.claude/skills/test-strategy/SKILL.md`.
Invoked with an explicit `velocity-app:domain-velocity` token, prefix
resolution finds `velocity-app/`, and the run must hit Phase 2's availability
gate and hard-stop — scoped mode is unavailable regardless of how it was
invoked (direct user token, or `execute`'s resolved argument) and regardless
of `--autopilot`. No Phase 5 block should ever be printed for this case.
