---
type: llm
focus: last_message
weight: 2
---

The autopilot decision log goes to
`make-it-work/define-test-strategy-autopilot-log.jsonl`, which is writable in
a headless run. If the environment denies that write, the skill must say so in
its summary and keep going.

Answer PASS if this end-of-run summary names that log path and either says the
log was written, or says writing it was denied while the run still finished
(for example it reports map results or a coverage report). Answer FAIL if the
summary does not mention the log, or says the log was written somewhere else.
