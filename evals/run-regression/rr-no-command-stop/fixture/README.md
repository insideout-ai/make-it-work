# rr-no-command-stop fixture

A tiny project with `build` and `lint` package.json scripts but
deliberately **no test script**, no `Makefile`, no CI config under
`.github/workflows/`, and no `.claude/rules/testing-strategy.md`. This
means Phase 1 cannot discover a full-suite test command from either
source and must hit the Stop-and-ask fallback.

This is the fixture that exercises the one case the implementation spec
calls out as needing special care: under `--autopilot`, this site is
explicitly **exempted** from the general `open_text` best-guess rule —
the skill must never invent a test command here (e.g. `npm run build`,
`echo ok`, or anything else), since a guessed command could produce a
false PASS/FAIL unrelated to this project's real (nonexistent) suite.
The correct autopilot behavior is to print the stop message verbatim and
end the run with no Phase 5 block and no command ever executed.
