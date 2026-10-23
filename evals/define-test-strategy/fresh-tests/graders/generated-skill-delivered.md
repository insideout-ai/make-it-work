---
type: llm
focus: trace
weight: 2
---

The run generated a test-strategy skill and either wrote it to
`.claude/skills/test-strategy/SKILL.md` or, when that write was denied or
failed, printed it in chat. Either is fine.

Find the generated content:
- **Written:** a `TOOL` call (Write, Edit or Bash) that writes
  `.claude/skills/test-strategy/SKILL.md`, with no `TOOL RESULT` showing that
  write was denied or failed. Grade the content in that call.
- **Blocked:** otherwise, an `ASSISTANT:` or `FINAL:` text with one fenced
  code block holding the generated file. Grade that block.

Answer PASS only if that content has at least the `## Repo ID`,
`## Test Locations` and `## How to Scan` headings. Answer FAIL if there is no
such content, or if a `TOOL` call writes it to any other path.
