---
type: llm
focus: trace
weight: 3
---

This run started with an empty `__tests__/` directory (only a `.gitkeep`) in a
repo with four go-deep use cases (UC-01 to UC-04) and no tests. The skill must
never scaffold placeholder or new test files; it only tags existing tests and
reports gaps.

Answer PASS only if the run never wrote or created any test file (for example
anything under `__tests__/`, or any `*.test.js` / `*.spec.js` file anywhere).
Writing `.claude/skills/test-strategy/SKILL.md`, editing `CLAUDE.md` and
writing the autopilot log are expected and fine. Answer FAIL if any test file
was created, naming it.
