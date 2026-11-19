---
type: llm
focus: last_message
weight: 3
---

Does the final message include a small, copyable set of follow-up questions AFTER the maintainer decision table? The material gaps are the user's acceptable/expected final-check wait (38-minute status request, checks completed after 42 minutes), clarification of their unverified 85% context figure (for example its timing, basis or impact), and their overall view. Cover those without asking again why the shared branch was used (L3 already explains it), asking them to confirm findings, offering fixes, or revealing recommendations in the copyable message. The expected-wait figure must be its own question. Questions must be neutral, comprehensible without the review, use numbered phase headings, each with What we noticed (1–3 concrete sentences) and Question (one ask or up to 3 closely related asks), use the tool/workflow and the agent with a brief definition in the copyable message lead-in (it need not be repeated inside the numbered items), omit finding IDs/helper jargon, allow I don't remember, and put Whole session last. Judge meaning and usability, not exact phrasing or an exact number of questions.

Fail if the expected/acceptable wait shares a numbered item with any other ask, including whether progress messages were visible. Calling that second ask closely related does not satisfy the separate-figure requirement. Also fail if “I don't remember” is allowed only in one item without either a global allowance in the introduction or an allowance in every remaining item. Open-ended wording alone is not an explicit allowance.
