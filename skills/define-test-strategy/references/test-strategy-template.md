# Test Strategy Template

Template for the file `define-test-strategy` generates at `.claude/skills/test-strategy/SKILL.md` in the onboarded repo. Reproduce this exact structure; never rename or reorder fixed headings — consumers locate sections by exact heading text. Keep every fixed section, writing `None` where empty rather than deleting it. After `## How to Scan`, include `## Strategy Decisions` when strategy was discussed (or preserve it from a prior run), then `## Recommended Setup` when tooling is absent or justified capability additions are proposed, and `## Pending` only on a partial run.

Replace every `<placeholder>`. `<Repo ID>` is the value written under `## Repo ID`.

The generated file starts with this frontmatter:

```yaml
---
name: test-strategy
description: "Test strategy for `<Repo ID>`: testing approach and priorities, where tests live (including other repos), how to run them and what they need, where new tests go, and the `@covers` tag convention. Read before planning, writing, running, or reviewing tests for this repo."
---
```

Everything below this line is the body of the generated file.

---

# Test Strategy — <Repo ID>

This is a starting point, seeded by `define-test-strategy` — extend and edit it as the project's test approach evolves; it is not a finished document.

## Repo ID

`<Repo ID>` — the basename of this repo's git toplevel directory at onboarding.

Tags use this ID. If this repo is cloned under a different directory name, tags stop matching — clone it as `<Repo ID>`.

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

## Tag Convention

- **Placement:** tag tests in separate test files, including colocated files and files in other repos. Do not add or maintain `@covers` comments for tests embedded in implementation files or their executable documentation examples; infer those relationships through the containing module under How to Scan. Placement does not determine whether a test is unit, integration, property-based, or another layer/style.
- **Form for separate files:** `@covers <Repo ID>:UC-<id> <Repo ID>:domain-<name>`, written as a single-line comment in the file's own comment syntax, directly above the test or suite it covers.
- **Qualified tokens:** every token is repo-qualified. `<id>` and `<name>` come verbatim from go-deep's skill directory names.
- **Several tokens:** a line may carry several tokens. A suite-level tag covers the whole suite.
- **Placeholders:** placeholder or skipped-scaffold files are never tagged.
- **Untaggable files:** separate test files with no single-line comment form (e.g. JSON, Postman collections) are listed as untaggable and never edited. Embedded tests are exempt, not untaggable.
- **PHP:** put the `//` tag line above any docblock, never inside it — PHPUnit parses `@covers` in docblocks.

## How to Scan

Scan both sources below for each token, once per row of Test Locations. Return the file, test/suite or runner selector, mapping kind (`explicit` or `inferred`), and evidence. Keep unresolved relationships separate. Mapping establishes a relationship, not adequate behavioral coverage or a passing test result.

### Separate test files — explicit mappings

- Run from this repo's root:
  `grep -rlIiE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.claude --exclude-dir=make-it-work '@covers([[:space:]].*)?[[:space:]]<repo>:<tag>([[:space:]]|$)' <Location>`
- Filter the output to separate test files matching that row's `Test files` globs; comments in implementation files do not create explicit mappings.
- Before substituting, escape regex metacharacters in `<repo>`, and replace each `-` in `<repo>` and `<tag>` with `[-_]`.
- The matched separate files are the tests explicitly mapped to that token.

### Embedded tests — inferred mappings

- <Per-location discovery commands/procedure from the actual language and runner configuration, including executable documentation tests when configured; or None — no embedded tests found. Identify real test declarations/examples, not arbitrary implementation files.>
- Inspect the actual assertions and code exercised. Map a test through its containing module only when UC/domain documentation or traced code establishes that the behavior it verifies belongs to that token. Record the evidence path/symbol and test identity. A module used by several UCs does not map every embedded test to every UC; names or directory proximity alone are insufficient.
- <Runner-supported selectors and commands for the discovered embedded tests, derived from project configuration; include distinct unit/documentation commands when needed, or state the selection limitation. Do not pass implementation file paths to a runner that expects module/package/test selectors.>
- Revalidate discoveries and their evidence live. Missing or ambiguous module relationships, or an incomplete discovery, are unresolved mappings; identify affected tokens/candidates and what is missing. Existing embedded `@covers` comments are not a substitute for evidence and are left untouched on refresh.
- If precise selection is unavailable, identify the smallest supported enclosing module/package/suite and disclose its broader scope before running it. If no reliable selector or bounded enclosing command can be established, report the tests as not run and explain the required broader verification.

Compute coverage gaps live from both sources, distinguishing explicit, inferred, and unresolved mappings. Only label a token uncovered when the scan is complete and neither source maps a test; an unresolved candidate is not evidence of absence. Never store a gap list in this file.

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

Tagging pending go-deep — run `/make-it-work:go-deep` in `<Repo ID>`, then re-run `/make-it-work:define-test-strategy`.

---

_Template note, not part of the generated file:_ any heading a team adds after `## How to Scan` is user content, and `define-test-strategy` preserves it on re-runs.
