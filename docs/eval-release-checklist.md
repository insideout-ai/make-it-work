# Plugin eval release checklist

Copy this checklist into the local release preparation record. Do not commit
private transcripts or test-account data.

Smoke is the only required model-evaluation tier for a release. Reuse the release
PR's initial smoke run and targeted failed-case retries; do not start another
full run because of a version bump or release. Existing deterministic CI checks,
manifest validation, and packaging checks remain unchanged.

## Required release evidence

- Release source commit SHA, plugin version and Claude Code version:
- Deterministic helper/controller/eval-runner checks and strict validation:
- `node evals/validate.mjs` result:
- Release PR smoke ledger, initial report and failed-case retry reports, per-case source commits and reported usage:
- Every smoke case has passing evidence across that sequence; no incomplete, budget-exhausted or unknown result is presented as passing:
- Every smoke failure disposition cites requirement, fixture, artifact and/or transcript evidence:
- Packaging and clean-install results from existing CI checks:
- Reviewer and date:

A standalone partial smoke run does not satisfy coverage. Use the initial full
inventory plus targeted retries recorded in the PR ledger. Cases with broken
graders require repair and authorized failed-case retries before their contract
can be certified. Record infrastructure, budget and grader problems separately
from behavior failures, leaving unclassified failures unresolved until inspected.
A confirmed relevant behavior defect remains a blocker; it cannot be waived by
calling its tier optional or relabeling an observed failure as passing.

## On-demand evaluations

Run `critical`, `extended`, `full`, focused changed-behavior/dependent-skill cases,
disposable TDD/failure-resume rehearsals, or live integration evaluations only
when the maintainer explicitly requests them. A version bump, release, changed
skill, or this checklist does not authorize these runs. Their absence does not
block release readiness.

For requested runs, record the request, selected cases, source commit, reports,
reported usage, and unresolved results. A partial selection does not certify a
complete tier. Preserve original failures and qualify interrupted or incomplete
runs. Inventory retention is not certification of reliability. Do not install
recurring evaluations as part of release preparation.
