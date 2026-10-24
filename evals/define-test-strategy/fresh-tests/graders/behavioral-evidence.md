---
type: llm
focus: trace
weight: 3
---

Inspect the saved or fully printed map and the actual test/documentation evidence.
PASS only if both the positive and negative examples are handled correctly:

- The trimmed-title/open-status and empty-title assertions map to UC-01 and
  domain-tasks, and the deleteTask assertion maps to UC-04 and domain-tasks.
  Evidence connects the assertion, exercised creation/validation/deletion behavior,
  and the documented UC/domain responsibility. The domain skill explicitly owns
  task creation, completion and deletion; that behavioral definition is sufficient
  when matched to the test, without a separate domain-specific assertion. A
  documented UC-to-domain association is also valid; retain cited files as evidence.
- The `formats a build label` test is inventoried but has no mapped relationship
  to any product UC/domain. It exercises formatBuildLabel, a documented build-tool
  utility outside the product vocabulary. Sharing createTask.js, its test file,
  an import or the tasks directory is not behavioral relevance. Do not copy
  UC-01/domain-tasks edges onto it or claim it proves task behavior.

FAIL for missing valid relationships, directory-only inference, undocumented
relationships, or treating mapped relevance as adequate behavioral coverage.
