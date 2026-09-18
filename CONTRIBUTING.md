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

## Repository structure

- `.claude-plugin/plugin.json` defines the plugin identity and release version.
- `.claude-plugin/marketplace.json` defines the InsideOut AI marketplace listing.
- `skills/<skill-name>/SKILL.md` contains each user-facing workflow.
- `.github/workflows/validate-plugin.yml` runs strict validation in CI.

Do not bump the plugin version as part of an ordinary contribution. Maintainers update versions when preparing a release.

## Validate your change

Run the same strict checks used by CI:

```sh
claude plugin validate .claude-plugin/plugin.json --strict
claude plugin validate skills --strict
claude plugin validate .claude-plugin/marketplace.json --strict
git diff --check
```

If you changed a skill, invoke it from a representative project and verify its checkpoints, expected output, and failure behavior. Describe that manual test in the pull request.

## Pull requests

Keep each pull request focused on one outcome. In the description, include:

- The problem and intended user outcome.
- The files and workflows affected.
- Validation commands and manual scenarios you ran.
- Screenshots or transcripts only when they add useful evidence, with sensitive data removed.
- Any compatibility or migration impact.

By contributing, you agree that your contribution is provided under this repository's [MIT License](LICENSE).
