---
type: llm
focus: trace
weight: 2
---

Judge the shared overview and individual slice files in Markdown tool calls, or the complete chat fallback for any explicitly denied writes. PASS if the overview includes a Slice summary table with one row per slice, linking the stable ID to its file and showing a concise outcome/title, hard prerequisites, optional recommended predecessors, and implementation stage. Independent slices must appear with None for absent dependencies. Its Mermaid dependency map must include every stable slice ID, its separate readable relationship table must distinguish hard prerequisites from recommended sequencing (or explicitly state there are no relationships), and its implementation stages must respect the prerequisites in the individual files while identifying parallel opportunities and a useful MVP boundary. The summary table must agree with the files, map, relationship table, and flow. FAIL on missing referenced slice files, contradictory dependencies, cyclic hard prerequisites, or absent summary/map/flow.
