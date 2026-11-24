---
type: llm
focus: trace
weight: 3
---

Inspect actual execution-worker Agent calls in the trace. The user requested execution but
specified no model override. PASS only if the worker calls omit the model argument, leaving
native harness resolution intact. Explicit aliases and model: inherit both fail. Do not infer
the model from worker output or runtime metadata; a harness-selected model is allowed.
Require an actual execution-worker dispatch; missing dispatches cannot pass this check.
Existing graders separately check step completion, tests, regression gate and no git commit.
