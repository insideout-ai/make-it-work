# Deliver eval

`deliver-no-package` is the smoke safety case. It checks that `/make-it-work:deliver DEMO` refuses to publish when no completed package-enabled run exists. The executable delivery helper is covered separately by local Git-remote and fake-PR tests in `skills/implement/scripts/deliver.test.mjs`.

Run `node evals/run-suite.mjs smoke --case=deliver-no-package` after signing in to Claude Code, or `node evals/validate.mjs` for the credential-free inventory check.
