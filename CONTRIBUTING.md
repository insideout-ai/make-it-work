# Contributing to make-it-work

Thank you for helping improve `make-it-work`. Contributions can address plugin packaging, documentation, or the behavior of an individual skill.

Before starting substantial work, open an issue so the intended outcome and scope can be discussed. For vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Development setup

You need Git and an installed, authenticated version of [Claude Code](https://code.claude.com/docs/en/overview).

Fork and clone the repository, then create a focused branch from `main`:

```sh
git clone https://github.com/YOUR-USER/make-it-work.git
cd make-it-work
git switch -c your-change
```

Load the working tree directly in Claude Code:

```sh
claude --plugin-dir .
```

The local copy takes precedence over an installed marketplace copy for that session. After editing a plugin file, run `/reload-plugins` in Claude Code before testing again.

Maintainers who want smoke to run before every push should install the local
Git hook once:

```sh
bash scripts/install-pre-push-hook.sh
```

The hook runs the 12-skill smoke suite against a disposable snapshot of the
commit being pushed, using your existing Claude Code sign-in before each push.
It reports failures but does not block the push or PR. It does not request an
API key or run in CI. Installation is local to your clone; the installer
refuses to replace an existing hooks setup.

## Repository structure

- `.claude-plugin/plugin.json` defines the plugin identity and release version.
- `.claude-plugin/marketplace.json` defines the InsideOut AI marketplace listing.
- `skills/<skill-name>/SKILL.md` contains each user-facing workflow.
- `docs/` contains shared reference documentation for skill authors (e.g. the `--autopilot` decision-log schema), referenced from multiple skills' `SKILL.md` files rather than duplicated in each.
- `scripts/decision-log.mjs` validates and writes the shared autopilot JSONL log when Bash and `.claude/` writes are permitted.
- `.github/workflows/validate-plugin.yml` runs strict validation in CI.

Do not bump the plugin version as part of an ordinary contribution. Maintainers update versions when preparing a release.

## Validate your change

Run the same strict checks used by CI:

```sh
node --test skills/implement/scripts/*.test.mjs
claude plugin validate .claude-plugin/plugin.json --strict
claude plugin validate skills --strict
claude plugin validate .claude-plugin/marketplace.json --strict
node --test scripts/decision-log.test.mjs
git diff --check
node --test skills/execute/scripts/plan-status.test.mjs
node --test evals/grade-headless.test.mjs evals/run-batches.test.mjs
```

If you changed a skill, invoke it from a representative project and verify its checkpoints, expected output, and failure behavior. Describe that manual test in the pull request.

Before opening a pull request, run the 12-skill smoke suite with your existing Claude Code sign-in: `node evals/run-suite.mjs smoke`. Maintainers with the local hook installed get this automatically before each push; others can run it explicitly. Record its report path and investigate any failed grader in the PR description. The full plugin eval suite is available with `node evals/run-suite.mjs full` and is required before a release. See [evals/README.md](evals/README.md) for cost estimates and automatic headless grading. No model run is triggered by CI, and PR creation or merge is not gated on smoke evidence.

## Pull requests

Keep each pull request focused on one outcome. In the description, include:

- The problem and intended user outcome.
- The files and workflows affected.
- Validation commands and manual scenarios you ran.
- Screenshots or transcripts only when they add useful evidence, with sensitive data removed.
- Any compatibility or migration impact.

By contributing, you agree that your contribution is provided under this repository's [PolyForm Internal Use License 1.0.0](LICENSE).
