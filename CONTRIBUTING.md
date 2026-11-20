# Contributing to make-it-work

Thank you for helping improve `make-it-work`. Bug reports, feature requests, and suggestions are welcome. Code and documentation changes are currently maintained by Erez Morabia and Yael Morabia (Rabinovitz); external patches are not accepted at this time.

Before proposing substantial work, review the contribution policy below and open an issue so the intended outcome and scope can be discussed. For vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Maintainer development setup

You need Git and an installed, authenticated version of [Claude Code](https://code.claude.com/docs/en/overview).

Fork and clone the repository, then create a focused branch from `main`:

```sh
git clone https://github.com/YOUR-USER/make-it-work.git
cd make-it-work
git switch -c your-change
```

Execution requires applicable rights under the snapshot's license or separate written contributor permission. The commercial agreement applies only to versions expressly released under it. Once authorized, load the working tree directly in Claude Code:

```sh
claude --plugin-dir .
```

The local copy takes precedence over an installed marketplace copy for that session. After editing a plugin file, run `/reload-plugins` in Claude Code before testing again.

The optional local Git hook prints a smoke-readiness reminder and never starts
paid evaluations. Install it with `bash scripts/install-pre-push-hook.sh`.
Existing installations that point at `.githooks` pick up the new behavior.
The installer refuses to replace an existing hooks setup.

## Repository structure

- `.claude-plugin/plugin.json` defines the plugin identity and release version.
- `.claude-plugin/marketplace.json` defines the InsideOut AI marketplace listing.
- `skills/<skill-name>/SKILL.md` contains each user-facing workflow.
- `docs/` contains shared reference documentation for skill authors (e.g. the `--autopilot` decision-log schema), referenced from multiple skills' `SKILL.md` files rather than duplicated in each.
- `scripts/decision-log.mjs` validates and writes the shared autopilot JSONL log under `make-it-work/` when Bash writes are permitted.
- `scripts/test-map-report.mjs` generates the developer-facing `.claude/testing/TEST-MAP.md` from the saved index (`--write`) or checks report drift (`--check`), without editing JSON or running tests.
- `scripts/test-map.mjs` performs read-only test-index validation, freshness inspection and queries; `docs/test-map-contract.md` defines the shared non-intrusive mapping workflow.
- `scripts/` also contains deterministic policy, plan, regression, inventory and artifact helpers. Contracts live in `docs/deterministic-artifacts.md` and `docs/regression-runner.md`; implement/execute controller contracts live beside those skills. New helpers must be wired into their skill and covered by disposable-fixture tests, not just added as optional validators.
- `.github/workflows/validate-plugin.yml` runs strict validation in CI.

Do not bump the plugin version as part of an ordinary contribution. Maintainers update versions when preparing a release.

## Validate your change

Run the same strict checks used by CI:

```sh
node --test skills/write-the-tests/scripts/*.test.mjs skills/implement/scripts/*.test.mjs skills/execute/scripts/*.test.mjs scripts/*.test.mjs
claude plugin validate .claude-plugin/plugin.json --strict
claude plugin validate skills --strict
claude plugin validate .claude-plugin/marketplace.json --strict
git diff --check
node --test evals/*.test.mjs
```

If you changed a skill, invoke it from a representative project and verify its checkpoints, expected output, and failure behavior. Describe that manual test in the pull request.

Open a draft PR while implementation and review are in progress. Finish review
fixes and deterministic checks, commit the finished changes, then run smoke
**once per PR, immediately before marking it ready**:

```sh
node evals/run-suite.mjs smoke --pr=NUMBER --ready
```

If a case fails, inspect and fix it, commit the fix, then rerun only unresolved
cases. Previously passing cases are retained; another full smoke run is refused:

```sh
node evals/run-suite.mjs smoke --pr=NUMBER --ready --retry-failed
```

Record the initial report and retry reports in the PR. Every smoke case needs
passing evidence across this sequence before ready-for-review or merge. Never
waive failures as unrelated or rerun the whole suite to obtain one green report.
Do not run paid smoke on every push, edit, or review iteration. During development,
use deterministic checks and necessary focused cases (`full --case=NAME`).
Releases additionally need critical and change-specific/dependent-skill evidence;
reuse the release PR's smoke sequence. See [evals/README.md](https://github.com/insideout-ai/make-it-work/blob/d6160f8eed4c2f763cfcdab605349b15987fd99c/evals/README.md) for
ledger behavior and [the release checklist](docs/eval-release-checklist.md).
CI does not launch model evaluations.

## Pull requests

Keep each pull request focused on one outcome. In the description, include:

- The problem and intended user outcome.
- The files and workflows affected.
- Validation commands and manual scenarios you ran.
- Screenshots or transcripts only when they add useful evidence, with sensitive data removed.
- Any compatibility or migration impact.

## Contribution licensing policy

The [commercial agreement](LICENSE) is an approved outbound customer license, not a contributor assignment or CLA. Contributors retain ownership of their contributions. Earlier contributions remain subject to the terms under which they were submitted; this policy does not obtain retroactive relicensing consent.

For the initial commercial release, code and documentation changes are maintained by Erez Morabia and Yael Morabia (Rabinovitz). External code or documentation patches are deferred until a contributor agreement is ready and the contribution policy is explicitly reopened. Please use issues for bug reports, feature requests, and suggestions rather than submitting an external patch. Customer rights to make internal modifications under an applicable license and GitHub platform view/fork rights remain unaffected.

The maintainer's ownership and partner-permission confirmations are recorded in the [migration record](docs/licensing/MIGRATION.md) for legal review. Before reopening external patches, establish written contribution terms that address ownership and permission for commercial licensing and distribution (such as an appropriate CLA). No CLA execution, transfer of ownership, or relicensing consent is implied by opening an issue or PR.
