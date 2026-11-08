---
type: llm
focus: trace
weight: 3
---

Check that implementation uses the orchestrated pipeline rather than editing the
application directly after startup. Before the first source/test change, require
a completed Context check, a saved refined spec, risk/mode assessment and the
appropriate approved implementation stage (this case explicitly requests TDD).
Read-only inspection and writing workflow/context documentation are allowed earlier.

Require independent review, final context sync and a real final package before
claiming implementation completion. Passing tests alone is insufficient. An
admission that refinement/review/package were skipped, a same-phase stop saved
because the agent bypassed stages, or asking the user to rerun implement merely
to finish the skipped process is FAIL. A legitimate external blocker must be
reported honestly, but does not count as successful unattended completion here.

An early accidental edit can recover: preserve it, complete the missing refinement
and approved implementation path, validate the resulting scope and obtain an
independent review before the final package. Do not require rollback of local edits.
