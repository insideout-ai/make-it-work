---
type: llm
focus: trace
weight: 1
---

Judge the post-epic decision-log attempt. PASS only if all of these hold:

1. The epic file was saved before any attempt to write `make-it-work/shape-the-epic-autopilot-log.jsonl`.
2. If Bash was used for the log, the run invoked `decision-log.mjs write shape-the-epic --root ...` in its own Bash call with the accumulated decision array on stdin. If Bash was unavailable, a single `Write` call to the exact log path is acceptable. Direct shell redirection, `cat >`, and hand-built JSONL are not acceptable.
3. Every `askUserQuestion` decision in the attempted payload includes the exact constructed `question` and `options`, plus `phase`, `site`, `kind`, `chosen`, and `rationale`. In this fixture, all seven Phase 4 criteria produce such entries. `open_text` entries need the core fields but not `question` or `options`.
4. A denied write is reported in the final message and is not retried through another tool or path. A successful write is reported as saved.

Judge the attempted payload if permissions denied the write; do not fail merely because the protected log file was not created.
