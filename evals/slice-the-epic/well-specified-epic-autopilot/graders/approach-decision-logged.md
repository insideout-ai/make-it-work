---
type: llm
focus: { source: file, path: "make-it-work/slice-the-epic-autopilot-log.jsonl" }
weight: 2
---

This log is from a coherent, fully specified CSV-export epic with no preselected slicing approach. PASS only if it contains exactly one decision: phase "Choose an approach", site "slicing-approach", kind "askUserQuestion", multiSelect false, a nonempty question, 2–3 concrete approach options, chosen matching the Recommended option label, and a rationale. It must not invent a missing-fact clarification or use an empty log. Option values may be strings or objects with labels and descriptions according to the shared schema.
