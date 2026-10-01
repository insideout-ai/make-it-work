# Tiny Greeter (with tests)

A minimal greeting helper with a real, if tiny, test framework: a plain `node`
script run via `npm test`. No `.claude/rules/testing-strategy.md` exists, so
`run-regression`'s discovery falls through to `package.json`'s `test` script
(package.json scripts / Makefile / CI-config discovery order).

- `src/greeting.js` exports `greet(name)`.
- `test.js` currently fails (`greetFormally` does not exist yet) — this is the
  pre-committed "progression red" state `plan-the-work` would have left
  behind after planning, before `execute` ever runs.
