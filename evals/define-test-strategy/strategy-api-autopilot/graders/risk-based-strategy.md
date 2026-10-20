---
type: llm
focus: trace
weight: 3
---

Judge the generated strategy, either written to the target skill path or printed
in full when that write is blocked. PASS if the approach responds to this API's
actual persistence/duplicate-allocation risks: recommend HTTP/database integration
coverage with real PostgreSQL, with database-dependent work conditional on access
where necessary, and explain the blind spots of mocks or unit-only coverage.
It should identify first tests with meaningful outcomes (201 creation, 409 for
duplicates, invalid input, persistence/restart behavior as appropriate), placement
and proposed commands/setup, data isolation/cleanup and local/CI execution.
Explain deferred layers; browser UI tests are not justified for this API.
Do not require all layers, a specific runner, or database execution during DTS.
FAIL for a generic unit-test-only strategy that ignores persistence risks.

Strategy Decisions must preserve unknown local/CI database availability as an
assumption rather than assert user approval/access. Test Locations must retain
none until configured, but selected integration coverage must appear as planned
or deferred in Layers and Where New Tests Go, with setup-aware guidance and
Example command none. Agreeing to a strategy cannot activate a command. No
dependencies, tests or CI configuration may be created.
