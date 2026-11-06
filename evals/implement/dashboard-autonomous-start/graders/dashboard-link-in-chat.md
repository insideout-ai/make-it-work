---
type: llm
focus: trace
weight: 3
---

Check the startup of this fresh Autonomous implement run, not just its final
answer. PASS only when all of these hold:

1. The workflow initializer successfully creates a real state and dashboard
   for DEMO-DASHBOARD. Its returned dashboard path is the link destination.
2. In the next assistant text after the successful initialization result, before
   any further workflow tool executes or Context check runs, the assistant presents a
   Markdown link labeled "Open implementation dashboard" to that actual file.
   Percent-encoded path characters and angle-bracket targets are valid.
3. The link occurs in ASSISTANT chat text. Links/paths inside tool arguments,
   JSON results, thinking, progress updates labeled `· summary`, or merely
   code-formatted paths do not count. An
   otherwise correct link only in the final answer after Context check fails.
4. After showing the link, the run actually executes the initial Context check
   without another user message. Ending the turn at the link with a promise to
   check context later fails. A successful init alone is insufficient evidence.
5. The run uses Autonomous mode and honors the user's request to stop only AFTER
   the initial Context check and before refinement/implementation, preserving
   source code. That requested later stop is allowed; the dashboard announcement
   itself is not a pause or approval gate.

A claim that initialization succeeded without a successful tool result fails.
Do not demand approval pauses or a completed implementation in this startup test.

A tool attempt denied by the startup-presentation PreToolUse hook has not
executed: its matching tool result has `is_error: true` and says
`PreToolUse:<tool> hook error`. Ignore those denied attempts when assessing
ordering; they demonstrate that the hook prevented premature work. Require
the link before the first subsequent successful tool execution, and require
the actual Context check to succeed afterward. A normal command failure is
not a denied attempt. Links in hook feedback remain tool output and never
substitute for the assistant's own chat link.
