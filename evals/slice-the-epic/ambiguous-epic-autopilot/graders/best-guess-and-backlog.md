---
type: llm
focus: trace
weight: 3
---

This is the full transcript of a `slice-the-epic --autopilot` run against "Make the platform better for enterprise customers." Judge the whole transcript, including Markdown artifact content in Write calls; the final summary need not repeat the backlog.

PASS only if ALL of the following hold:
1. The response states an assumption about what outcome "better for enterprise customers" should resolve to, clearly marked as a best guess (the prefix `[autopilot best-guess]` or equivalent plain language making clear this is an autopilot-made assumption, not a user-confirmed fact).
2. Despite the ambiguity, it offers 2–3 concrete approach choices, selects the recommendation, and produces a shared overview plus one complete Markdown file per stable-ID slice, directly under `make-it-work/`. The overview links all individual files and contains the dependency map and implementation stages. Each slice file contains its complete story/objective, acceptance criteria or completion evidence, prerequisites, and a link back to the overview. A combined backlog alone fails. If a write is explicitly denied, complete missing Markdown in chat and an accurate saved/unsaved report are acceptable. It does NOT stop and wait for an answer.
3. The backlog is internally consistent with the stated assumption (it isn't guessing one thing and then slicing something unrelated).
4. The dependency map and recommended implementation stages agree with the stories' prerequisite fields. It distinguishes hard dependencies from preferred sequencing and identifies parallel work when available.
5. It skips Jira creation without asking Jira questions or making remote mutations, and states the skip in its completion message. It flushes the decision log after all deliverables or their denied-write fallbacks have been delivered.
6. The saved overview and the completion response itself both include a matching summary table with every slice's stable ID, concise outcome/title, hard prerequisites, optional recommended predecessors, and implementation stage. Independent slices remain visible with None for absent dependencies, and optional recommendations are not hard blockers. A link to the file, diagram, relationship-only table, or table shown only in tool calls does not replace the terminal summary. The tables must agree with the individual prerequisites, dependency map, and flow.

FAIL if it asked the user a question and stopped, or if it silently invented an outcome without flagging it as an assumption at all.

List any that fail, quoting the relevant part of the message.
