---
type: llm
focus: trace
weight: 3
---

This is an interactive slice-the-epic run with a concrete, coherent CSV-export requirement and no selected slicing approach. Assess the whole transcript, including any question tool call.

PASS if it offers 2–3 meaningfully different approaches or combinations tailored to this epic, explains why each fits and the tradeoff, gives 2–3 concrete example slice titles per candidate, recommends one, and asks the user to choose before producing a completed backlog or saving one. Either an AskUserQuestion call or a numbered-choice fallback when unavailable is acceptable. Previews of candidate slice titles do not count as a completed backlog.

FAIL if it silently chooses an approach, writes the completed story backlog, asks for unrelated information already supplied, or ends without giving the user a choice. The user has not approved autopilot.
