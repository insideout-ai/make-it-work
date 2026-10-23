# `define-test-strategy` evaluations

The strategy skill and shared `.claude/testing/test-map.json` are the only testing
policy/mapping outputs. Discovery and refresh never change source/test files,
comments or filenames. Legacy import/conversion/cleanup is outside this release;
older projects regenerate the strategy/map from current evidence.

| Case | Behavior |
| --- | --- |
| `dts-fresh-tests` | Map asserted creation/deletion behavior to documented UCs/domains while excluding an unrelated build-label helper in the same module/test file; preserve source/tests and report unmapped behavior. |
| `fresh-autopilot` | Generate strategy plus an empty test catalog for configured tooling without inventing tests. |
| `define-test-strategy-negative-control` | Interactive checkpoint stops before metadata changes. |
| `dts-multi-repo` | Product-owned mappings reference sibling QA tests without editing either repo's tests or another product's metadata. |
| `dts-no-tooling` | Preserve proposed versus configured layers and pending setup. |
| `dts-strategy-api-autopilot` | Risk-based database/API strategy with explicit assumptions. |
| `dts-strategy-interactive` | Discuss consequential strategy choices before writes. |
| `dts-coverage-only` | Read-only report with no strategy interview or metadata persistence. |
| `dts-embedded-tests` | Discover separate, embedded and documentation tests uniformly; source/tests stay untouched and behavior evidence drives mappings. |
| `dts-embedded-coverage-only` | Missing-map discovery under the current strategy in memory without source or metadata changes. |
| `dts-strategy-mixed-autopilot` | Separate current, target and adoption coverage for mixed runtimes. |
| `dts-strategy-mixed-interactive` | Resolve scope/environment choices before individual test priorities. |
| `dts-selected-layers` | Preserve selected layers and project readiness into tables. |
| `dts-index-refresh` | Reuse a saved map, reassess changed label assertions, retain user rejection of checkout-to-refund mapping, and leave source/tests unchanged. |

Run with `node evals/run-suite.mjs full --case=<case-name>`; `dts-fresh-tests` is
also in `node evals/run-suite.mjs smoke`. See `evals/README.md` for sign-in,
budgets, disposable fixtures and grading. `node --test scripts/test-map.test.mjs`
covers deterministic freshness, queries, partial scope, missing repos, working
files, user decisions and non-intrusive helper behavior without model access.

## Written and blocked outcomes

Protected metadata writes can be denied in headless runs. A passing blocked run
prints BOTH complete proposed artifacts, leaves CLAUDE.md pointers unchanged,
reports any partially saved artifact explicitly, and continues with the in-memory
candidate. A written run saves and validates both artifacts before updating the
skill pointer. Neither outcome may change source/tests or bypass a denied write.
Historical grader filenames containing `tagged` now assert that unannotated
fixture tests remain unannotated.

For a full-write check, seed the selected case into a disposable `mktemp -d`
directory using its absolute `fixture.sh` path, then invoke the skill with the
local plugin. Verify the JSON schema through `scripts/test-map.mjs validate`,
the strategy's `## Test Map` and incremental `## How to Scan`, exact source/test
bytes before/after, preserved user decisions, and the conditional skill pointer.
Never seed fixtures into the plugin checkout or a user's project.

## Limits

Model-driven evidence checks establish expected behavior, not general semantic
coverage accuracy. The new helper never parses a language or judges assertions.
Byte/content freshness is deterministic; inferred relationships require semantic
review. Unsupported discovery/selection and unavailable repos remain unresolved,
not proof of absent coverage or passing verification. A live eval pass requires
an actual signed-in run; an authored grader or dry run is not a pass.
