---
type: llm
focus: trace
weight: 1
---

Judge the post-epic decision-log attempt. PASS only if all of these hold:

1. The epic file was saved before any attempt to write `make-it-work/shape-the-epic-autopilot-log.jsonl`.
2. If Bash was used for the log, the run invoked `decision-log.mjs write shape-the-epic --root ...` with the accumulated decision array via stdin or the supported `--input` file. Keep the log operation separate from epic generation and unrelated stage work; read-only verification of the saved log in the same call is acceptable. If Bash was unavailable, a single `Write` call to the exact log path is acceptable. Direct shell redirection to the log, `cat >` to the log, and hand-built JSONL are not acceptable.
3. The log includes the actual mode/focus selections and any discovery/gap-check resolutions, but no category-draft approvals. Every entry has `phase`, `site`, `kind`, `chosen`, and `rationale`. An `askUserQuestion` entry also has its constructed `question`, `options`, and `multiSelect` (true with a chosen-label array for category selection, false with a chosen-label string otherwise); `open_text` needs no options. Inferred substantive choices are not labeled human-confirmed in the epic. An empty log is valid only when supplied mode, focus, and interview context resolved every site; this fixture has unresolved mode/focus selections.
4. A denied write is reported in the final message and is not retried through another tool or path. A successful write is reported as completed, including equivalent wording such as "The decision log is at <path>"; the literal word "saved" is not required. A completion handoff labeling the produced artifact "Decision log: <path>" is an equivalent positive location statement, provided the write actually succeeded. A bare unlabeled/intended path or future promise is insufficient. Reporting a saved/existing log after a denied or failed write is a failure.

Judge the attempted payload if permissions denied the write; do not fail merely because the protected log file was not created.
