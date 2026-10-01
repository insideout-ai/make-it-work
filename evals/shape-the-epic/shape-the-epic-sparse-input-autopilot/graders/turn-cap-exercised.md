---
type: llm
focus: trace
weight: 3
---

This is the full transcript of a `shape-the-epic --autopilot` run against a deliberately vague, one-line epic idea ("Make exports better for our enterprise customers" — no users, outcome, KPIs, or scope stated). This fixture exists to exercise Phase 2 Part A's 6-turn self-interview cap and bounding policy under minimal input.

Note: autopilot is allowed to judge almost any Part A topic as "rich enough" to construct 2-3 plausible multiple-choice options (an `askUserQuestion`-style turn), even under this vague a prompt — that's a legitimate per-turn judgment call, not a defect, and such turns do **not** count against the 6-turn cap by design. So a correct run may show either several `askUserQuestion`-style turns, some `open_text` best-guess turns, or a mix — do not fail solely because zero turns happened to be `open_text`.

PASS only if ALL of the following hold:
1. The end-of-run summary states a specific number of self-answered (`open_text`) Part A turns, and that number is **no greater than 6** — the cap must never be exceeded. (A count of 0 is valid and should not fail this check, per the note above.)
2. The run did not hard-stop or ask a real question and wait — it proceeded through Part B, Phase 3, and Phase 4 to produce a complete epic regardless of how many open threads remained.
3. If the summary indicates the cap was reached with threads still open, it names which threads remain open, and those threads are reflected somewhere in the final epic (either as a Phase 2B gap-check question, or as an Open Item / TBD in the epic's Decision Log or Open Items section) — they are not silently dropped. (If the cap was never reached, this check is vacuously satisfied.)

List any of 1-3 that fail, quoting the relevant part of the transcript.
