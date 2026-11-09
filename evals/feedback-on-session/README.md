# Session feedback evaluations

The smoke case checks redundant approval questions, unsupported verification claims,
redaction and transcript instruction isolation. Full-suite cases additionally cover
an ordinary successful session and an incomplete Claude Code JSONL export with
separately attributed user feedback. A handoff case checks admitted omissions,
captured run provenance, deliberately approved scope, and unsupported causal speculation.
An evidence-limits case covers truncated query output, unseen hook internals,
existing narration requirements and harness reminders without timings or user complaints.
Every case has a report-only standalone-readability grader; the handoff accuracy
grader separately checks the synthetic source facts. No private user transcript
is included in fixtures. Run them with the existing suite runner.

Manual interactive checks before review readiness:

- Invoke without a transcript in a conversation with observable workflow friction.
  Verify only available pre-invocation context is assessed and locators are useful.
- Supply pasted text. Confirm it takes precedence over unrelated current context.
- Leave the feedback invitation unanswered, then resume with a correction. Verify
  the same provisional file is updated, contradicted findings are revised and
  user-only experiences remain attributed. Explicitly skip to complete it.
- Deny the output write; verify the skill reports the missing/stale durable report
  and provides available feedback in chat without bypassing the denial.
- Repeat within the same timestamp: existing reviews must remain intact.

These interactive and permission scenarios are not established by a headless pass.
