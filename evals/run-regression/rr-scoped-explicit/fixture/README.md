# rr-scoped-explicit fixture

A tiny Node project with `.claude/rules/testing-strategy.md` (documenting
the full-suite command `npm run test` and the UC/Domain tag convention),
plus `.claude/rules/product.md` / `architecture.md` as the UC/domain
inventory fallback (no `.claude/skills/uc-*`/`domain-*` directories here).

Two domains exist: `billing` (`test/domain-billing.test.js`) and
`velocity` (`test/domain-velocity.test.js`), both passing. The eval case
requests only `domain-velocity`, so a correct scoped run executes
`npm run test -- test/domain-velocity.test.js` and never touches the
billing test file.
