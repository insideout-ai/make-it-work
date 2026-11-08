---
type: llm
focus: last_message
weight: 2
---

Judge the final handoff for the complete draft.

PASS only if ALL of the following hold:
1. It identifies the saved epic so the user can review the whole artifact and provide consolidated comments, without requesting section-by-section approval.
2. It identifies material open decisions if any remain, without implying human sign-off. It reports the actual self-answered Part A count (0–6) and whether discovery exited early or reached the cap, consistent with the trace. Equivalent plain language counts: "no self-answered turns because the brief already covered the interview" reports count 0 and an early exit unambiguously. Do not require the literal label "exit: early" when that same meaning is stated. Zero turns alone without a reason/exit meaning is insufficient; a cap-reached run must identify that limit and remaining discovery threads.
3. It reports the decision-log outcome in ordinary language. A positive statement
   that the log exists at a path (for example, "The decision log is at <path>")
   counts as reporting success, just as "Decision log: saved to <path>" does.
   Do not require the literal word "saved". A path explicitly labeled "Decision log:" among the produced artifact locations also reports a positive location; a separate verb is not required. A bare unlabeled/intended path or a future intention
   such as "I plan to save the log to <path>" does not report a completed write.
   If the write was denied or otherwise failed, it must say so accurately;
   contradictory claims of both failure and a saved log fail. The separate
   decision-log-write-attempted grader checks the reported outcome against the
   actual write evidence; this final-message grader checks the handoff wording.

List any failures with evidence. Do not require a particular sentence or word count.
