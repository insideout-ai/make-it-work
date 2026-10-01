---
type: llm
focus: last_message
weight: 2
---

`shape-the-epic`'s Autopilot Mode bounds Phase 2 Part A's self-interview to at most 6 self-answered (`open_text`) turns, and requires the end-of-run summary to state how many were used and why Part A ended (either no significant open threads remained, or the cap was reached).

PASS only if ALL of the following hold:
1. The final message includes a line reporting the number of self-answered Part A turns used, and that number is **no greater than 6**.
2. The line also states why Part A ended — either that no significant open threads remained (early exit) or that the 6-turn cap was reached (and, if so, which threads remain open).
3. The message also references the decision log file path (`.claude/shape-the-epic-autopilot-log.jsonl`), even if the write itself may have been denied by the sandbox.

Given how much concrete context the PM provided up front in this run (a fully detailed idea with users, KPIs, edge cases, and rollout already stated), an early exit with a low turn count (0–3) is the expected, correct outcome here — but do not fail the run solely for using more turns than that, as long as the count is ≤ 6 and the reason given is coherent. List any of 1–3 that fail, quoting the relevant text.
