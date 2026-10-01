---
type: file_exists
path: .claude/run-regression-autopilot-log.jsonl
exists: true
weight: 1
---

Note: `.claude/` is a protected path that no tool grant unblocks inside
`claude plugin eval` — only `--dangerously-skip-permissions` does (see
`evals/go-deep/README.md`'s equivalent finding). This grader only scores
meaningfully on a manual `--dangerously-skip-permissions` run; treat it as
a checklist item when reading a manual run's output directly, the same
way `evals/go-deep`'s own log-existence graders are used.
