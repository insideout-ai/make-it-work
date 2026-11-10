---
type: decision_log
path: "make-it-work/DEMO-2/execute-autopilot-log.jsonl"
skill: execute
site: mode-choice
options: ["Subagent-Driven (Recommended)", "Inline Execution"]
chosen: "Subagent-Driven (Recommended)"
weight: 2
---

The saved decision log must validate, record both enumerated option labels,
and choose the recommended Subagent-Driven mode. The writer supports option
strings and objects with labels/descriptions, independent of JSON field order.
An attempted write or a prose claim does not establish a saved log. The companion
no-step-review-log grader checks that continuation was not logged as a separate
autopilot decision.
