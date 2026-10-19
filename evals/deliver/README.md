# Deliver eval

`deliver-no-package` is the smoke safety case. It checks that `/make-it-work:deliver DEMO` refuses to publish when no completed package-enabled run exists. The executable delivery helper is covered separately by local Git-remote and fake-PR tests in `skills/implement/scripts/deliver.test.mjs`.

Those local tests also exercise delivery-driven dashboard updates: offer/decline,
approval, live running snapshots, commit-hook stops, PR failures, multi-repo
partial completion, legacy journal resume, and final delivery links. They verify
that implementation state and package approval remain unchanged, rendering
failure stops further publication, and runs without HTML are not backfilled.

Run `node evals/run-suite.mjs smoke --case=deliver-no-package` after signing in to Claude Code, or `node evals/validate.mjs` for the credential-free inventory check.
