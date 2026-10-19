# Recommend an initial test setup

Use when no usable automated setup exists. Inspect the repo's runtime, package manager, build configuration, architecture, dependency boundaries, and go-deep use cases/domains when available. Prefer existing conventions and the smallest setup that can exercise the repo's real behavior. Do not select a framework solely from the language or prescribe every possible test layer.

Write a concrete proposal containing:

- Evidence for the choice: relevant manifest/config paths and architectural constraints.
- A recommended runner and initial layer(s), what each verifies, and what is deferred. Explain an alternative only when it changes the decision materially.
- Proposed dependency/config/script changes, run roots, directories, file naming, and commands. Label these as proposed and unverified until setup runs successfully.
- How external boundaries will be handled: isolated tests, local dependencies, or an existing QA repo. Name credentials/services that prevent a local test; do not assume access.
- Initial coverage priorities from important use cases and failure paths. When invoked for a ticket, start with changed behavior and nearby regression risks rather than proposing coverage of the entire app.
- A first real behavior test to validate the setup, plus the expected observable result. An empty suite, skipped placeholder, unconditional assertion, or lint/type/build success does not validate a test setup.

If there are no tests but usable tooling exists, document that tooling in the active strategy instead. Recommend only a missing capability justified by the task; do not replace an established runner just because another one is familiar.

Keep `## Test Locations`, `## Layers`, `## Where New Tests Go`, and `## Coverage Decision Guidance` factual. A recommendation becomes active only after the dependencies/configuration exist and a real test has run through the recorded command.
