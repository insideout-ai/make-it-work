# Anthropic runtime distribution

The InsideOut AI marketplace continues following `main`. Anthropic's directory
can follow `anthropic-release`, an automatically generated plugin-only branch.
Both contain identical runtime files and use the source plugin's version and
license. Tests, evaluations and development tooling remain on `main`.

## Release flow

Make changes, bump the version using the existing maintainer release process,
push and open a PR. CI validates the source, builds a committed runtime export,
checks its dependencies, and installs it in a disposable local marketplace.
After merge, a successful main workflow publishes the export to
`anthropic-release`. Publication failures leave its previous commit untouched.
They do not change the publisher marketplace source or roll back `main`.

The release branch has independent, append-only history. Do not merge it into
main, edit it manually, or force-push it. Each commit records its source SHA,
tree and package digest. Concurrent runs recheck current main before pushing;
outdated runs skip. An unchanged package is a successful no-op. Runtime changes
still require the ordinary version bump for installed-plugin cache updates.

## Local preparation

From the source checkout, export an explicit committed SHA to a new directory:

```sh
node tools/anthropic-release/package.mjs build --source HEAD --output /tmp/miw-release/plugin --report /tmp/miw-release/report.json
node tools/anthropic-release/package.mjs verify --output /tmp/miw-release/plugin --report /tmp/miw-release/report.json
bash evals/end-to-end/clean-install.sh /tmp/miw-release/plugin
```

Use a new output directory on each build. The report stays outside the installed
package. It lists every file/hash/mode, source version, counts, and known policy
qualifications. Runtime bytes are preserved; public documentation links to
omitted development files are redirected to the immutable source commit.

The existing helper tests and required 14-case smoke/full release evaluations
remain source checks. Before the first directory switch, also rehearse successful
implementation and failure/resume using the exported plugin in disposable
projects, as described in the source repository's end-to-end instructions.

## Directory rollout

After the first generated branch passes local and CI checks, edit the existing
Make It Work submission in https://claude.ai/directory/manage. Keep its repository
and repository-root plugin path; set **Tracked branch or tag** to
`anthropic-release`. Select **Check for new commits** and verify the scanned SHA
matches the generated branch. Record the directory findings before and after.
Only request publication when the portal permits it, and verify the live SHA.

Packaging success is not directory approval. Executable helpers, hooks and
frontmatter remain present, so organization policy restrictions can still block
publication. A successful local CLI validation does not run all directory policy
checks. Scheduled checks pick up new commits; webhook setup is not required.

## Monitoring and recovery

Inspect the Validate plugin Actions run, its package-report artifact and publication
summary. Set repository Actions variable `ANTHROPIC_RELEASE_PAUSED` to `true` to
pause only publication; PR and main validation continue. Remove it or set it to
`false` to resume, then manually dispatch Validate plugin on `main` to retry.
No PAT or additional long-lived credential is required by the publisher job.

For a bad release, pause publication and restore a previously verified package
through a normal commit on `anthropic-release`, retaining the documented bot
identity and provenance trailers. A maintainer can use `git commit-tree` with
the known-good tree and the current release as parent. Do not rewrite history.
Fix and validate the generator/source on main before resuming. Unexpected branch
edits make automation fail rather than overwriting the branch.

To abandon the directory experiment, restore its prior tracked-branch setting.
This does not roll back an already-published version; verify the portal's live
version separately and request the supported recovery action from Anthropic.
The publisher marketplace remains on main throughout.
