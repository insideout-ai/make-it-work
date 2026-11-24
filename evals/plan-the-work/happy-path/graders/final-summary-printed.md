---
type: llm
focus: trace
weight: 2
---

Check the assistant's final user-facing planning summary, not quoted skill instructions or tool output.
It must identify the saved plan, summarize its overall risk and context updates, and direct the
user to test preparation before execution. No model-tier recommendation is required.
Fail if no such final summary is presented. Judge meaning, not exact wording.
