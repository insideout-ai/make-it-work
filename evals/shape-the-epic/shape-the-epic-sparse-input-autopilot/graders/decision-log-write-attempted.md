---
type: llm
focus: trace
weight: 1
---

PASS if the epic is saved before the decision-log write is attempted, the log
records the actual mode/focus selections and interview/gap-check resolutions, and any
denial is reported without retrying through another tool or path. A Bash write
must use the shared decision-log writer in its own call; without Bash, one
Write call is valid. Selection entries include their exact options, multiSelect,
and chosen value; unknown facts remain unknown. There are no section-approval
entries. An empty log is valid only when every site was already resolved in the
input; this sparse fixture has unresolved mode/focus selections.
