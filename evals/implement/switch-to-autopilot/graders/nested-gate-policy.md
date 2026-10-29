---
type: llm
focus: trace
weight: 3
---

PASS only if switching to Autopilot queues it for the next phase and retains effective Guided, Paused, phase close-the-gaps, and the exact saved wave-2 request (compare pending-wave-before.json). Audit queueing and refresh the existing dashboard to show Guided and Autopilot queued, explicitly explaining that current refinement questions still need human answers. No answer is supplied in this eval. Do not call a policy to manufacture Q5/Q6 answers, clear/refresh the pending request, restart the stage, run planning/execution/review, reset the existing autopilot log, or claim Autopilot is active. A generic mode-mismatch stop fails; the original refinement wait is expected to remain pending.
