---
type: llm
focus: last_message
weight: 3
---

This run migrated a repo whose old-version outputs included a placeholder test
for UC-02 (`__tests__/uc-02-complete-task.test.js`, never tagged) and no test
at all for UC-03. The coverage report comes from a live `@covers` tag scan.

Answer PASS only if this message's coverage report satisfies ALL of these:
1. UC-02 and UC-03 are both listed as uncovered use cases.
2. The `notifications` domain is listed as uncovered.
3. Nothing in the message says a test file was scaffolded or a placeholder test was created by this run.

Otherwise answer FAIL.
