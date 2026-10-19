# Test Strategy Template

Template for the file `define-test-strategy` generates at `.claude/skills/test-strategy/SKILL.md` in the onboarded repo. Reproduce this exact structure; never rename or reorder fixed headings — consumers locate sections by exact heading text. Keep every fixed section, writing `None` where empty rather than deleting it. After `## How to Scan`, include `## Recommended Setup` when automated tooling is absent, and `## Pending` only on a partial run.

Replace every `<placeholder>`. `<Repo ID>` is the value written under `## Repo ID`.

The generated file starts with this frontmatter:

```yaml
---
name: test-strategy
description: "Test strategy for `<Repo ID>`: where its tests live (including other repos), how to run them and what they need, where new tests go, and the `@covers` tag convention. Read before planning, writing, running, or reviewing tests for this repo."
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

Every place this repo's tests live, including other repos. `Location` is relative to this repo's root. `Test files` is a glob of that location's test files. `Run from` is that location's repo root, relative to this repo. The first data row is always this repo itself. When it has test tooling (a test runner or a test script) but no test files yet, still record its layers, `Test files` glob and full-suite command, since new tests go there. Only when it has neither test files nor test tooling is it the literal row `| . | <Repo ID> | none | none | none | . |`.

| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | <Repo ID> | <layers, comma-separated> | <glob, e.g. **/*.test.js> | <command> | . |
| <e.g. ../qa-automation/tests/payments> | <other repo ID> | <layers> | <glob> | <command> | <e.g. ../qa-automation> |

## Layers

Only layers whose tooling is present in a listed location.

| Layer | For | Not for | Location | Example command |
| --- | --- | --- | --- | --- |
| <e.g. Unit> | <what this layer tests> | <what belongs elsewhere> | `<Location from ## Test Locations>` | `<command running one file or test>` |

## Run Prerequisites

One `###` subsection per row of `## Test Locations`, headed by that row's `Location`. Write `None` where a bullet is empty. `Local run:` is exactly one of `yes`, `ci-only`, `slow` or `flaky` — consumers read it literally.

### <Location>

- **Env vars:** <names that must be set, or None>
- **Services:** <each service with its check command, e.g. `postgres` — `pg_isready -h localhost`, or None>
- **Credentials:** <what is needed and where it comes from, or None>
- **How to start:** <steps to bring the suite's dependencies up, or None>
- **Local run:** <yes | ci-only | slow | flaky>

## Where New Tests Go

| Layer | Repo | Directory | File naming |
| --- | --- | --- | --- |
| <layer from ## Layers> | `<repo ID>` | `<directory, relative to this repo's root>` | `<e.g. <module>.test.js>` |

## Coverage Decision Guidance

Which layer a change needs. Use only layers listed in `## Layers`.

- <kind of change, e.g. pure business logic> → <layer>
- <kind of change, e.g. new API endpoint> → <layer>

## Tag Convention

- **Form:** `@covers <Repo ID>:UC-<id> <Repo ID>:domain-<name>`, written as a single-line comment in the file's own comment syntax, directly above the test or suite it covers.
- **Qualified tokens:** every token is repo-qualified. `<id>` and `<name>` come verbatim from go-deep's skill directory names.
- **Several tokens:** a line may carry several tokens. A suite-level tag covers the whole suite.
- **Placeholders:** placeholder or skipped-scaffold files are never tagged.
- **Untaggable files:** files with no single-line comment form (e.g. JSON, Postman collections) are listed as untaggable and never edited.
- **PHP:** put the `//` tag line above any docblock, never inside it — PHPUnit parses `@covers` in docblocks.

## How to Scan

- Run once per row of `## Test Locations`, from this repo's root:
  `grep -rlIiE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.claude --exclude-dir=make-it-work '@covers([[:space:]].*)?[[:space:]]<repo>:<tag>([[:space:]]|$)' <Location>`
- Filter the output to paths matching that row's `Test files` glob.
- Before substituting, escape regex metacharacters in `<repo>`, and replace each `-` in `<repo>` and `<tag>` with `[-_]`.
- The matched files are the tests for that tag.
- Coverage gaps are always computed this way, live. Never store a gap list in this file.

## Recommended Setup

_Include only when no usable automated setup exists. This section is a proposal, not runnable configuration._

<repo-specific evidence, recommended tools/layers, proposed setup changes and commands, external-boundary handling, initial coverage priorities, and the first real behavior test, per recommend-initial-setup.md>

## Pending

_Include this section only on a partial run; omit it otherwise._

Tagging pending go-deep — run `/make-it-work:go-deep` in `<Repo ID>`, then re-run `/make-it-work:define-test-strategy`.

---

_Template note, not part of the generated file:_ any heading a team adds after `## How to Scan` is user content, and `define-test-strategy` preserves it on re-runs.
