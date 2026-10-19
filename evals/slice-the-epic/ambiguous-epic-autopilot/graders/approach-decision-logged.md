---
type: llm
focus: { source: file, path: "make-it-work/slice-the-epic-autopilot-log.jsonl" }
weight: 2
---

This log is from an ambiguous enterprise epic with no preselected approach. PASS only if it records both a missing-fact-clarification open_text decision with a flagged best-guess outcome and a slicing-approach askUserQuestion decision. The latter must have multiSelect false, question and 2–3 approach options, chosen matching the Recommended label, and a rationale. The clarification must omit question, options, and multiSelect. Neither decision may be silently omitted.
