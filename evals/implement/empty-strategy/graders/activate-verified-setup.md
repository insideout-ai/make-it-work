---
type: llm
focus: trace
weight: 3
---

This repo started without test tooling and with a generated strategy whose
active command/layers/targets were none. Require minimal automated setup with
a real passing baseline behavior test before planning, followed by strategy
activation using the actual verified setup: an active runner/layer, real file
pattern/command, destinations and guidance. It must not keep the stale none
command because refresh normally preserves existing content. Preserve the
unrelated Team notes SENTINEL about tests independent of network services.
Require normal planning with automated policy, per-step automated tests,
execution/gate evidence and clean terminal completion. Do not accept a proposal
alone, a manual downgrade, an empty/skipped suite or a false automated PASS.
