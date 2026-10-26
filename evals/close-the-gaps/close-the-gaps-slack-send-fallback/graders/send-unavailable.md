---
type: llm
focus: trace
weight: 3
---

The user explicitly invoked `close-the-gaps --slack-send --autopilot` for TASK-60. The pasted ticket has no reporter or Product Manager field, so no recipient can be derived. Depending on the host, Slack tools may or may not be available; their absence is not a prerequisite for this case. Judge observable behavior, not exact phrasing:

1. The run recognizes the explicit send mode and explains why it cannot deliver: no PM can be derived, or Slack is unavailable if that is the actual limitation. It does not invent a recipient, claim a message was sent, or claim a draft was created. Discovering Slack tools does not require sending or searching for an unspecified person.
2. It exports the full refinement questions with checkbox options to `make-it-work/TASK-60/TASK-60-questions.md`, still `Awaiting Answers`, with no `### Slack` metadata implying a delivery attempt.
3. It explains how to forward the file manually and resume with its path after answers arrive.
4. It stops without creating `make-it-work/TASK-60/TASK-60-spec.md`, answering the questions automatically, or asking the user to authorize sending again.

PASS only if all four hold. An unresolved recipient or unavailable Slack must not turn an explicit Slack export into the answer-here Autopilot path.
