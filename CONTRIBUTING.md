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

Maintainers who want smoke to run before every push should install the local
Git hook once:

```sh
bash scripts/install-pre-push-hook.sh
```

The hook runs the 14-skill smoke suite against a disposable snapshot of the
commit being pushed, using your existing Claude Code sign-in before each push.
It reports failures but does not block the push or PR. It does not request an
API key or run in CI. Installation is local to your clone; the installer
refuses to replace an existing hooks setup.

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
node --test skills/implement/scripts/*.test.mjs skills/execute/scripts/*.test.mjs scripts/*.test.mjs
claude plugin validate .claude-plugin/plugin.json --strict
claude plugin validate skills --strict
claude plugin validate .claude-plugin/marketplace.json --strict
git diff --check
node --test evals/*.test.mjs
```

If you changed a skill, invoke it from a representative project and verify its checkpoints, expected output, and failure behavior. Describe that manual test in the pull request.

Before opening a pull request, run the 14-skill smoke suite with your existing Claude Code sign-in: `node evals/run-suite.mjs smoke`. Maintainers with the local hook installed get this automatically before each push; others can run it explicitly. Each PR must have a complete passing 14-case smoke run before it is marked ready for review or merged. Record its report path and investigated failures in the PR description. Focused reruns help diagnose fixes but do not replace a passing full smoke run; do not waive failures as unrelated. The full plugin eval suite is available with `node evals/run-suite.mjs full` and is required before a release. See [evals/README.md](evals/README.md) for cost estimates and automatic headless grading. No model run is triggered by CI. Draft PRs may be opened while fixes or smoke results are pending; readiness and merge require the passing full smoke evidence above.

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

For a focused change, select relevant pre-push smoke cases explicitly, for example:

```sh
MIW_SMOKE_CASES=drive-the-epic-autopilot git push
```

Use comma-separated case names for multiple smoke cases. The hook still tests a committed snapshot and records its report; an unset selection runs the full suite. Document the selected scope in the PR.
