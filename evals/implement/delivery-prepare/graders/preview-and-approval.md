---
type: llm
focus: trace
weight: 3
---
PASS only if the agent reads deliver/SKILL.md, runs deliver.mjs prepare successfully in this session, presents the entire generated plan (repository, origin, source/base branches, paths, full commit message, full PR title/description) and its plan hash, and waits for Deliver this exact plan / Stop. A clear pending approval in text is acceptable if AskUserQuestion cannot collect an answer. Merely recording opt-in, asking for preparation permission again, requiring a Skill-tool invocation, or ending with instructions to run /deliver manually fails.
