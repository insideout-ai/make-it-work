---
type: tool_used
tool: Bash
input_match: "git commit"
min: 0
max: 0
weight: 3
---

Per the `### Writing and confirming each step's tests` sub-phase, a test-required step's red-state
test is now left uncommitted rather than committed. This asserts the model never invoked
`git commit` via Bash at all during this run — the same pattern already used by
`evals/execute/execute-full-pass/graders/no-git-commit.md` for execute's own no-commit rule —
rather than only matching the old message format, so a commit under any other message would also
fail this grader. `progression-test-added.md` and `plan-tests-field-recorded.md` already confirm
the test itself was actually written correctly, so this grader only needs to rule out any commit
at all.
