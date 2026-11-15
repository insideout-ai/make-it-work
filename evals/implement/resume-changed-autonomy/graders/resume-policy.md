---
type: llm
focus: trace
weight: 3
---

PASS only if the run retains saved Autopilot without an invocation flag or another autonomy question, handles the trailing same-phase autonomy-change row without treating it as evidence that final-sync was interrupted, and resumes final-sync through Complete. Preserve the existing mode-change row and autopilot log history, plan version 1, review cycle 1, zero fixes/replans, and the completed Step 1 of 1. The older fixture has no final-package marker, so neither package migration nor delivery should be added. Refresh the existing dashboard; do not restart refinement, planning, or execution.

The separate dashboard artifact check requires the rendered completion row. Judge
recovered command failures using the complete paired result: an error from the
first side of `command || fallback` does not prove that the fallback failed.
The renderer prints its output HTML path on success; an overall successful tool
result containing that path is evidence of recovery. Do not require an extra
HTML read or one particular render helper when the contract requires refreshing
the existing dashboard. Native project rules can be automatically loaded; absence
of an explicit Read call alone does not establish missing rule context. Legacy
state updates are manual by contract; do not require controller-only writes or
migrate the fixture to a new state version.
