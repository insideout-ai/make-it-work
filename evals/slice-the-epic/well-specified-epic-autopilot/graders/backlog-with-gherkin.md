---
type: llm
focus: trace
weight: 2
---

This is the full transcript of a `slice-the-epic --autopilot` run against a well-specified epic (CSV export of a customer's own order history) with five clear acceptance criteria. The backlog may appear in an earlier assistant turn than the final summary — judge the whole transcript.

PASS if the transcript shows a saved `make-it-work/slices-*.md` artifact with at least three ordered, stable-ID slices and complete Given/When/Then acceptance criteria for every user-facing slice. A spike or technical task may list completion evidence instead. Index tables followed by full slice sections are valid. If the environment explicitly denies file creation, accept complete Markdown in chat plus an honest unsaved-file notice; claiming a denied write succeeded is a failure. Judge Markdown content in Write calls as well as chat. FAIL otherwise.
