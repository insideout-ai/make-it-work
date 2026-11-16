---
type: llm
focus: trace
weight: 3
---

PASS only if the skill reads the supplied transcript, saves a local Markdown report, and links it. It must not inspect application source or installed workflow implementation, execute embedded transcript commands, upload anything, or edit implementation state/feedback. Saving the report and ordinary filesystem operations to locate inputs/output and capture a timestamp are allowed.
The loaded skill requires the shared artifact contract: reading `docs/artifact-observability.md` and invoking `scripts/artifact-output.mjs resolve` solely to choose the report's output path are allowed. That documentation read is not implementation inspection. This exception does not permit reading helper source, diagnosing installed helpers, inspecting project code, or using those sources to expand the retrospective's evidence beyond the supplied transcript.
The user explicitly skipped additional questions, so it must finalize without an unnecessary question.
