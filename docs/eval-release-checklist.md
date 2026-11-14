# Plugin eval release checklist

Copy this checklist into the local release preparation record. Do not commit
private transcripts or test-account data.

- Release source commit SHA, plugin version and Claude Code version:
- Deterministic helper/controller/eval-runner checks and strict validation:
- `node evals/validate.mjs` result:
- Complete `smoke` report, exact source commit and reported usage:
- Complete `critical` report, exact source commit and reported usage:
- Focused changed-behavior and dependent producer/consumer cases, with selection rationale:
- All selected cases graded; no incomplete, budget-exhausted or unknown result presented as passing:
- Every failure disposition cites requirement, fixture, artifact and/or transcript evidence:
- Known extended-suite maintenance items and release impact assessed:
- Disposable TDD workflow including failure/resume (cite existing critical/focused evidence rather than repeat equivalent runs):
- Clean-install smoke:
- Live integration smoke using existing test accounts:
- Reviewer and date:

Release readiness requires the maintained tiers and focused evidence above;
`full` is optional archive-wide investigation, not a prerequisite to run all
historical cases at once. Partial smoke/critical runs do not satisfy their
complete-tier requirements. Cases with broken graders require repair and rerun
before they can certify a required contract. A confirmed relevant skill defect
requires a fix and regression evidence; tier placement cannot waive it. Record
infrastructure, budget and grader problems separately from behavior failures,
leaving unclassified failures unresolved until inspected.

Extended batches can run periodically using `extended --shard=I/N`. Record the
commit, selected cases and unresolved issues; never claim archive-wide coverage
from a single batch. Inventory retention is not certification of reliability.
