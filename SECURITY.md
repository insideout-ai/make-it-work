# Security Policy

## Supported versions

Security fixes are provided for the latest published release. Check the [releases page](https://github.com/insideout-ai/make-it-work/releases) before reporting or reproducing an issue. Marketplace catalogs can take additional time to synchronize a new release.

## Reporting a vulnerability

Do not open a public GitHub issue for a suspected vulnerability or include sensitive details in logs, screenshots, or example repositories.

Email [insideoutaitech@gmail.com](mailto:insideoutaitech@gmail.com) with the subject `[make-it-work security]` and include:

- The affected plugin version and installation channel.
- A description of the issue and its potential impact.
- Minimal reproduction steps or a proof of concept.
- Any known mitigations or workarounds.
- Whether and when you plan to disclose the issue publicly.

Do not include credentials, customer data, or unrelated private source code. Use sanitized examples whenever possible.

Please allow the maintainers time to investigate and release a fix before public disclosure. We will coordinate attribution and disclosure timing with the reporter when appropriate.

## Scope

Examples of issues that belong in this repository include:

- Plugin instructions that unexpectedly expose data or request unsafe actions.
- Bundled content that differs materially from the reviewed source.
- A packaging or marketplace configuration problem that causes untrusted content to load as part of `make-it-work`.

Issues in Claude Code itself, Anthropic services, third-party issue trackers, or separately installed integrations should be reported to their respective maintainers. General quality problems without a security impact belong in [GitHub Issues](https://github.com/insideout-ai/make-it-work/issues).
