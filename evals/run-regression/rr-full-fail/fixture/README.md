# rr-full-fail fixture

Same shape as `rr-full-pass`, except `test/sample.test.js` contains one
deliberately failing assertion, so `npm test` exits nonzero. Exercises
Phase 4's plain exit-code FAIL path and Phase 5's captured-output-tail
reporting.
