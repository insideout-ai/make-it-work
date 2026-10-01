---
type: llm
weight: 3
---

This is a trace of an agent invoked with `/make-it-work:run-regression` (no argument, no `--autopilot`). Per its own instructions, with no argument it must ask the user, via `AskUserQuestion` (or, if that tool is unavailable in this environment, by presenting the equivalent choice in plain text), whether to run the full test suite or a scoped subset — labeled along the lines of "Full suite" and "Scoped to specific domain(s)/use-case(s)" — and then stop and wait, without running anything.

Judge whether the trace satisfies ALL of the following:

1. The agent presents (via a tool call or plain text) a choice between running the full suite and a scoped/specific-domain-or-use-case subset, before doing anything else irreversible.
2. The agent does NOT execute any test-running command (no `npm test`, `node --test`, or equivalent).
3. The agent's response contains no "Gate result:" line (the skill's own fixed report block is never reached in this run, since the mode choice is never resolved).

PASS only if all of 1-3 hold. List any that fail.
