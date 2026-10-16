# rr-scoped-explicit fixture

A one-repo workspace: a root `CLAUDE.md` naming `velocity-app`, and the
repo itself under `velocity-app/` with its own `.claude/skills/test-strategy/SKILL.md`
(stored here as `velocity-app/claude-dir/`; `fixture.sh` renames it to
`.claude` and commits the repo). The strategy records Repo ID `velocity-app`,
one location `.` with `Test files` `test/*.test.js`, command `npm run test`
and `Local run: yes`. `velocity-app/.claude/rules/product.md` /
`architecture.md` are the UC/domain inventory fallback (no
`.claude/skills/uc-*`/`domain-*` directories here).

Tests are mapped by content tags, not paths: `test/invoice.test.js`
carries `// @covers velocity-app:domain-billing` and `test/sprint.test.js`
carries `// @covers velocity-app:domain-velocity`, both passing.
`test/notes.test.js` mentions velocity only in plain text and is untagged.
The eval case requests only `velocity-app:domain-velocity` from the fixture
root, so a correct scoped run executes `npm run test -- test/sprint.test.js`
from `velocity-app` and never touches the invoice or notes test files.
