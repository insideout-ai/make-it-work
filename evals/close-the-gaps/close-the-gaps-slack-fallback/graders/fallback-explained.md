---
type: llm
weight: 3
---

`close-the-gaps` was run with `--slack --autopilot` on a pasted ticket (TASK-60), in a session with **no Slack MCP integration available**. Its Phase 5D says that when Slack can't be used it must say exactly what failed, fall back to the Phase 5B offline export (writing `make-it-work/TASK-60/TASK-60-questions.md` with no `### Slack` block), tell the user to forward that file to the Product Manager manually, and stop without writing a refined spec.

Judge the run against ALL of the following:

1. The chat output states that Slack could not be used (e.g. no Slack integration available) — it does not claim a Slack draft or message was created.
2. The chat output tells the user to forward the exported questions file to the Product Manager (or otherwise get it answered) and re-invoke `close-the-gaps` with that file's path.
3. The questions file contains gap-analysis questions with checkbox options, and does NOT contain a `### Slack` section.
4. No refined spec (`make-it-work/TASK-60/TASK-60-spec.md`) was written, and the run did not call `AskUserQuestion`.

PASS only if all of 1-4 hold. Quote the relevant output and explain any failure.
