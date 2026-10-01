---
type: regex
target: trace
pattern: "test: step \\d+ .+\\(red state\\)"
weight: 3
---

This case's fixture has a configured test framework (Node's built-in `node --test`). Per the
`### Writing and confirming each step's tests` sub-phase, any test-required step must be committed
with the exact message format `test: step <N> — <short step title> (red state)`. This regex
confirms the model actually ran `git commit` with that message, not just wrote it into the plan.
