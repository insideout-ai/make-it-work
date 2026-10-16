---
type: llm
focus: trace
weight: 3
---

`define-test-strategy` generated a test-strategy skill from scratch for a
single-repo Node.js project whose only test tooling is `node --test`
(`package.json`'s `test` script), with go-deep already run (UC-01 to UC-04).
The run either wrote it to `.claude/skills/test-strategy/SKILL.md` or, when
that write was denied or failed, printed it in a fenced block in its
assistant text. Either is fine.

Find the generated content:
- **Written:** a `TOOL` call (Write, Edit or Bash) that writes
  `.claude/skills/test-strategy/SKILL.md`, with no `TOOL RESULT` showing that
  write was denied or failed. Grade the content in that call.
- **Blocked:** otherwise, the fenced block printed in `ASSISTANT:` or
  `FINAL:` text. Grade that block.

Answer PASS only if ALL of these hold:
1. The content has these eight `##` headings, in this order, each once: `## Repo ID`, `## Test Locations`, `## Layers`, `## Run Prerequisites`, `## Where New Tests Go`, `## Coverage Decision Guidance`, `## Tag Convention`, `## How to Scan`.
2. It has no `## Pending` heading.
3. The first `## Test Locations` data row has Location `.`, and its full-suite command is `npm test`, `npm run test` or a `node --test` command.
4. It stores no list of coverage gaps or uncovered use cases.
5. The `FINAL` summary matches the outcome: it names `.claude/skills/test-strategy/SKILL.md` as written (written), or says that write was blocked and the content printed (blocked).

List any that fail.
