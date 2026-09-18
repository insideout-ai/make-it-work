## Summary

<!-- What changed, and what user outcome does it improve? -->

## Scope

<!-- Name the affected plugin metadata, documentation, or skills. Link the related issue when one exists. -->

Change type:

- [ ] Plugin or marketplace packaging
- [ ] Documentation
- [ ] Skill behavior
- [ ] Bug fix
- [ ] Other

## Validation

<!-- Check the validations you ran. Explain anything that does not apply. -->

- [ ] `claude plugin validate .claude-plugin/plugin.json --strict`
- [ ] `claude plugin validate skills --strict`
- [ ] `claude plugin validate .claude-plugin/marketplace.json --strict`
- [ ] `git diff --check`
- [ ] I loaded the plugin with `claude --plugin-dir .` and manually tested the affected workflow, or explained below why manual testing does not apply.

Manual test and result:

<!-- Include a concise scenario and outcome. Remove private source code, credentials, and customer data. -->

## Compatibility and migration

<!-- Note any changed command, workflow, output, dependency, or user action required after updating. Write "None" when there is no compatibility impact. -->

## Checklist

- [ ] This pull request is focused on one outcome.
- [ ] User-facing behavior and installation guidance are documented where needed.
- [ ] I did not bump the plugin version unless this pull request prepares a maintainer-approved release.
- [ ] I removed sensitive information from descriptions, logs, screenshots, and fixtures.
- [ ] I followed [SECURITY.md](../SECURITY.md) for any vulnerability-related details.
