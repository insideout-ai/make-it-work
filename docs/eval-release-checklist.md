# Plugin eval release checklist

Copy this checklist into the release preparation record. Do not commit a
completed checklist with private transcripts or test-account data.

- Release commit SHA:
- Plugin version and Claude Code version:
- `node evals/validate.mjs` result:
- `node evals/run-suite.mjs full` report path and reported usage:
- All headless cases automatically graded (record any failures and investigation):
- Failing LLM graders, transcript evidence, and disposition:
- Disposable end-to-end workflow result (including failure and resume):
- Clean-install smoke result:
- Live integration smoke result using existing test accounts:
- Reviewer and date:

A release is ready only after every case has a recorded pass or an explained
grader-noise disposition. A confirmed skill defect requires a fix and a new
regression case before the checklist can be closed.
