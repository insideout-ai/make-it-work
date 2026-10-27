# Test Strategy Template

Template for the file `define-test-strategy` generates at `.claude/skills/test-strategy/SKILL.md` in the onboarded repo. Reproduce this exact structure; never rename or reorder fixed headings — consumers locate sections by exact heading text. Keep every fixed section, writing `None` where empty rather than deleting it. After `## How to Scan`, include `## Strategy Decisions` when strategy was discussed (or preserve it from a prior run), then `## Recommended Setup` when tooling is absent or justified capability additions are proposed, and `## Pending` only on a partial run.

Replace every `<placeholder>`. `<Repo ID>` is the value written under `## Repo ID`.

The generated file starts with this frontmatter:

```yaml
---
name: test-strategy
description: "Test strategy for `<Repo ID>`: testing approach and priorities, where tests live (including other repos), how to run them and what they need, where new tests go, and the maintained non-intrusive test map. Read before planning, writing, running, or reviewing tests for this repo."
---
```

Everything below this line is the body of the generated file.

---

# Test Strategy — <Repo ID>

This is a starting point, seeded by `define-test-strategy` — extend and edit it as the project's test approach evolves; it is not a finished document.

## Repo ID

`<Repo ID>` — the basename of this repo's git toplevel directory at onboarding.

Map tokens use this ID. If this repo is cloned under a different directory name, existing repo-name resolution may not match — clone it as `<Repo ID>`.

## Test Locations

Every place this repo's tests live, including other repos. `Location` is relative to this repo's root. `Test files` identifies separate test files and implementation files containing embedded tests; list their globs separately when both exist, and record the embedded discovery procedure under How to Scan. A source glob alone does not establish that a file contains tests. `Run from` is that location's repo root, relative to this repo. The first data row is always this repo itself. When it has configured test tooling but no test files yet, still record its layers, `Test files` glob and full-suite command, since new tests go there. A runtime's built-in runner alone does not count as configured tooling: require an actual test script, runner config, CI test command or real tests, not a proposed command or stale reference to a missing script. Only when it has neither test files nor configured test tooling is it the literal row `| . | <Repo ID> | none | none | none | . |`.

| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | <Repo ID> | <layers, comma-separated> | <glob, e.g. **/*.test.js> | <command> | . |
| <e.g. ../qa-automation/tests/payments> | <other repo ID> | <layers> | <glob> | <command> | <e.g. ../qa-automation> |

## Layers

Include configured layers and every layer selected in Strategy Decisions, including planned and deferred layers. `Status` is exactly `configured`, `planned` or `deferred`: configured tooling exists; planned coverage is selected for adoption but needs setup; deferred coverage is intentionally postponed. A configured layer may still need environment prerequisites before running. A recommendation not selected for adoption belongs in Strategy Decisions, not this table. In older strategies without Status, rows have the previous configured-only meaning; do not infer readiness for missing layers from them.

| Layer | Status | For | Not for | Location | Example command | Prerequisites |
| --- | --- | --- | --- | --- | --- | --- |
| <e.g. Unit> | configured | <what this layer tests> | <what belongs elsewhere> | `<Location from ## Test Locations>` | `<configured command running one file or test, or none if unknown>` | <environment requirements, or None> |
| <e.g. Component> | planned | <selected behavior to cover> | <what belongs elsewhere> | <intended location> | none | <missing dependencies/configuration; proposed command in Recommended Setup> |

Write `none` for planned/deferred Example commands; place any proposed commands in Recommended Setup. Test Locations continues to describe only actual tests/configured tooling and runnable command sources; selecting a layer does not add it to that table. Write plain `None` here only when no configured or selected layers exist, not merely because setup is missing.

## Run Prerequisites

One `###` subsection per row of `## Test Locations`, headed by that row's `Location`. Write `None` where a bullet is empty. `Local run:` is exactly one of `yes`, `ci-only`, `slow` or `flaky` — consumers read it literally.

### <Location>

- **Env vars:** <names that must be set, or None>
- **Services:** <each service with its check command, e.g. `postgres` — `pg_isready -h localhost`, or None>
- **Credentials:** <what is needed and where it comes from, or None>
- **How to start:** <steps to bring the suite's dependencies up, or None>
- **Local run:** <yes | ci-only | slow | flaky>

## Where New Tests Go

Include a destination row for every layer in Layers, carrying the same Status. A planned or deferred directory need not exist yet: record the agreed destination and naming. If undecided, write `TBD` and record the unresolved choice rather than omitting the layer. A Status describes the layer's setup/adoption state, not whether the directory already exists.

When the project embeds tests in implementation files, name that placement and its convention (including executable documentation examples) in Directory/File naming. Embedded versus separate placement is independent of the test layer.

| Layer | Status | Repo | Directory | File naming |
| --- | --- | --- | --- | --- |
| <layer from ## Layers> | <same status as Layers> | `<repo ID>` | <existing or planned directory, relative to this repo's root; or TBD> | <agreed naming, e.g. <module>.test.js; or TBD> |

## Coverage Decision Guidance

Which layer a change needs. Use the configured and selected layers in Layers. For planned layers, name the layer and its setup prerequisite rather than substituting a configured layer; for deferred layers, state the remaining risk and revisit condition. Layer selection alone does not make a command runnable.

- <kind of change, e.g. pure business logic> → <layer>
- <kind of change, e.g. new API endpoint> → <layer>
- <kind of change needing a selected planned layer> → <layer> (planned; <setup required>)

## Test Map

- **Shared index:** `.claude/testing/test-map.json`, schema version 1, owned by `<Repo ID>`. UC/domain tokens are `<Repo ID>:UC-<id>` and `<Repo ID>:domain-<name>` from go-deep's actual inventory. Tests in external repos use the product repo's tokens. Both query directions derive from the same relationships.
- **Test layers:** record each test's `layer` using the strategy's labels and actual asserted boundary; `unknown` means classification is unresolved. Older schema-v1 entries without a layer display as Unknown. Placement and runner do not determine the layer.
- **Developer report:** root `TEST-MAP.md` is generated from the saved JSON with layer counts, feature behavior/layer lists, unresolved mappings and a collapsed evidence catalog. Regenerate after every authorized map save using `node "<resolved make-it-work scripts>/test-map-report.mjs" --root "<repo-root>" --write` (substitute the resolved path; record a project refresh command instead when installed). It is a saved snapshot, not a freshness, coverage-sufficiency or pass/fail result. Standalone report-only/regression/review workflows do not save it unless explicitly requested.
- **Non-intrusive:** never add, maintain or remove source/test comments or rename/move tests for mapping. Separate, embedded, documentation and comment-free formats use the same evidence-backed mapping contract; placement is independent of layer. Existing annotations and legacy filenames remain untouched. Placeholders are excluded from coverage.
- **Evidence:** identify actual tests/suites and inspect their assertions against documented/traced behavior. Record supporting file/symbol dependencies. Shared-module ownership alone cannot map every test to every UC. Ambiguity stays unresolved. A relationship is relevance evidence, not sufficient coverage or a passing result.
- **Maintenance:** use make-it-work's `docs/test-map-contract.md` and read-only `scripts/test-map.mjs`. Onboarding/planning/implementation save reviewed metadata changes; standalone regression/review and report-only requests use in-memory refreshes. Preserve user confirmations/rejections. Do not rewrite unchanged entries or store live gap/pass-fail lists in the strategy.

## How to Scan

1. Check current strategy registrations/vocabulary against the map. Use the shared helper's `inspect --root <this repo>` to detect changed tracked/untracked inputs, then follow the contract's targeted/rebuild instructions. Reuse unchanged relationships without rereading every assertion. Missing/malformed maps require temporary discovery, not source annotations.
2. <Per-location separate-file discovery using configured runner patterns, plus actual embedded declarations/executable documentation discovery in configured source roots; identify tests, not arbitrary source files. Record configuration files and discovery-directory prefixes for the map. Write None for absent placements.>
3. Reassess changed tests and evidence against UC/domain behavior, preserving user decisions and unrelated entries. Unknown impact/configuration changes rebuild affected locations. Missing repos, incomplete discovery and ambiguous candidates remain unresolved; never stamp snapshots without finishing the required reassessment.
4. Query each requested token through `query --root <this repo> --token <repo>:<token>` (or `--test <identity>` for the reverse view). Use the in-memory candidate through stdin for read-only workflows. Return file, identity/selector, provenance and evidence; retain unresolved portions even when other tests match.
5. <Runner-supported selectors from actual configuration, including distinct documentation commands and any selection limitation. Separate files may run whole; disclose the smallest supported enclosing scope for embedded/documentation tests. Never pass source paths to a runner expecting package/module selectors. If reliable selection is unavailable, report not run and the verification required.>

Only report a token uncovered after complete current assessment across every location and no matching or unresolved candidate. Compute gaps on demand; do not store a gap list in this file or treat mapped tests as proof of passing behavior.

## Strategy Decisions

_Include when strategy was discussed, or preserve the existing section. This section records direction; proposed capabilities are not active configuration._

### Current Coverage

<repo evidence, important risks, existing layers and what they actually exercise; distinguish configured tooling from tests or verification that have actually run>

### Recommended Target Coverage

<risk-based layers and rationale independent of currently installed tooling; real versus mocked boundaries, fixtures/data and local/CI approach; proposed status and prerequisites for missing capabilities>

### First Adoption Phase

<selected initial subset and why it is feasible; first behavior tests with expected observations; subsequent adoption order; deferred risks and revisit conditions; proposed production refactoring separate from tooling setup>

| Decision | Choice and rationale | Source |
| --- | --- | --- |
| <material strategy decision> | <choice and tradeoffs> | <user, project policy with path, repo evidence, autopilot default, autonomous default, or assumption> |

<unresolved assumptions and decisions, per strategy-discussion.md. Do not store a live coverage-gap list or describe unperformed manual checks as verified.>

## Recommended Setup

_Include when no usable automated setup exists, or when the strategy discussion selects justified capability additions. This section is a proposal, not runnable configuration._

<repo-specific evidence, recommended tools/layers, proposed setup changes and commands, external-boundary handling, initial coverage priorities, and the first real behavior test, per recommend-initial-setup.md>

## Pending

_Include this section only on a partial run; omit it otherwise._

UC/domain mapping pending go-deep — run `/make-it-work:go-deep` in `<Repo ID>`, then re-run `/make-it-work:define-test-strategy`. The map may inventory tests without inventing product tokens.

---

_Template note, not part of the generated file:_ any heading a team adds after `## How to Scan` is user content, and `define-test-strategy` preserves it on re-runs.
