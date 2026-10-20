---
type: llm
focus: trace
weight: 3
---

PASS only if the explicit request switches the existing DEMO run from Autopilot to Guided despite the startup --autopilot flag, records a new same-phase autonomy decision with a captured host timestamp, and regenerates the existing dashboard to show Guided. It must retain spec-approval and wait for an explicit spec approval, not treat the mode request as approval or ask Choose autonomy again. No plan/execution/review work may start, and Progress, counters, branch, hashes and existing history must be preserved. If AskUserQuestion cannot collect an answer in headless mode, a clear pending spec-approval question and a Paused checkpoint are acceptable. A flag-mismatch stop or refusal merely because the last row is a mode change fails.
