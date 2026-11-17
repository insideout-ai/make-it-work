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

Judge the actual phase and current contract, not the programming language or whether the caller is the main session. For new runs with test_writing_version: 1, planning declares coverage without writing tests or stubs; require Plan approval (or the recorded Autopilot skip) before Write Tests, parent preauthorization and a fresh test-writing worker, current revision-bound preparation evidence, and its accepted tests handoff before Execute. Legacy runs without this marker retain inline planning test authoring. Planning-test receipts become unnecessary after the startup guard is released, without granting production-edit permissions to planning or test preparation. Evidence-backed gate/acceptance ledger writes prescribed by verification.md are allowed; do not require a nonexistent controller setter. Production-logic edits during planning, including temporary mutation probes later restored, remain violations of the existing Modify-row planning boundary.

Refinement and planning run inline under the stage integration contract: the main session reads each complete stage skill, follows its phase procedure and writes its spec/plan and handoff. Do not require a separate Skill invocation, subagent, or distinct author identity for these inline stages. Main-session authorship is not evidence of a skipped or fabricated stage. Still require the actual refinement output, readiness checkpoint, plan/verification evidence and ordered gates above; missing substantive work or an admitted bypass fails. Independent review does require its separate reviewer.
