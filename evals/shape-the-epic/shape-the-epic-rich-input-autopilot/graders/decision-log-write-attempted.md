---
type: llm
focus: trace
weight: 1
---

Judge the post-epic decision-log attempt. PASS only if all of these hold:

1. The epic file was saved before any attempt to write `make-it-work/shape-the-epic-autopilot-log.jsonl`.
2. If Bash was used for the log, the run invoked `decision-log.mjs write shape-the-epic --root ...` in its own Bash call with the accumulated decision array on stdin. If Bash was unavailable, a single `Write` call to the exact log path is acceptable. Direct shell redirection, `cat >`, and hand-built JSONL are not acceptable.
3. The log includes the actual mode/focus selections and any discovery/gap-check resolutions, but no category-draft approvals. Every entry has `phase`, `site`, `kind`, `chosen`, and `rationale`. An `askUserQuestion` entry also has its constructed `question`, `options`, and `multiSelect` (true with a chosen-label array for category selection, false with a chosen-label string otherwise); `open_text` needs no options. Inferred substantive choices are not labeled human-confirmed in the epic. An empty log is valid only when supplied mode, focus, and interview context resolved every site; this fixture has unresolved mode/focus selections.
4. A denied write is reported in the final message and is not retried through another tool or path. A successful write is reported as saved.

Judge the attempted payload if permissions denied the write; do not fail merely because the protected log file was not created.
