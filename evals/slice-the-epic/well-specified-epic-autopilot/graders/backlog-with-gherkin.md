---
type: llm
focus: trace
weight: 2
---

This is the full transcript of a `slice-the-epic --autopilot` run against a well-specified epic (CSV export of a customer's own order history) with five clear acceptance criteria. The backlog may appear in an earlier assistant turn than the final summary — judge the whole transcript.

PASS if the transcript shows a shared overview and a separate Markdown file for each of at least three ordered, stable-ID slices, all directly under `make-it-work/`. The overview must link to every individual file; each individual file must link back to the overview and contain its own full story/objective, prerequisites, and complete Given/When/Then acceptance criteria for user-facing work (or completion evidence for a technical task/spike). A combined backlog alone, or individual files containing only links or summaries, fails. Relative links must identify the files actually written, and the same IDs must be used across the set. If the environment explicitly denies a write, accept complete missing Markdown in chat plus an accurate account of saved versus unsaved files; claiming a denied write succeeded is a failure. Judge Markdown content in tool calls as well as chat. FAIL otherwise.
