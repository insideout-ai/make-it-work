# `define-test-strategy` eval cases

Four cases exercising `skills/define-test-strategy/SKILL.md`. The skill writes
one per-repo test-strategy skill at `.claude/skills/test-strategy/SKILL.md`
(structure fixed by `skills/define-test-strategy/references/test-strategy-template.md`),
tags existing tests with repo-qualified `@covers <Repo ID>:UC-<id>` comments,
adds one `/test-strategy` row to `CLAUDE.md`'s `### Other Skills` table, and
reports coverage from a live tag scan. It never scaffolds placeholder tests,
never writes or offers a git hook, never adds a `CLAUDE.md` checklist item, and
never commits.

| Case | Invocation | Exercises |
|---|---|---|
| `dts-migrate-autopilot` | `--autopilot` | Migration of an old-version repo: `.claude/rules/testing-strategy.md`, path-tagged tests (`uc-01-create-task.test.js`, `domain-tasks-helpers.test.js`), a placeholder test (`uc-02-complete-task.test.js`), and the old `CLAUDE.md` Rules Files row and "check regression status before committing" checklist item. |
| `fresh-autopilot` | `--autopilot` | The same go-deep-shaped project with none of the old outputs and no tests: Phase 1 finds nothing (no menu), the skill is generated from scratch, and no test file is created. |
| `define-test-strategy-negative-control` | no `--autopilot` | The migration fixture run interactively: the skill must stop at the refresh/migrate question (or the location confirmation) before writing anything. |
| `dts-multi-repo` | `payments-api --autopilot`, from a workspace root | Cross-repo detection over `evals/fixtures/multi-repo-workspace/`: the `[repo]` argument, a sibling QA repo found by its test files' references, repo-qualified tags, the go-deep warning for a repo without go-deep, and a same-numbered UC in another repo left alone. |

## Running the cases

`dts-migrate-autopilot`, `fresh-autopilot` and `dts-multi-repo` are listed
under `headless` in `evals/suites.json`: the runner seeds a disposable fixture,
runs the prompt headlessly, and grades `graders/*.md` automatically (regex and
`file_exists` checks locally, `llm` checks with a separate judge).
`dts-migrate-autopilot` is the skill's smoke case. The negative control writes
nothing, so it runs through plain `claude plugin eval`.

```sh
node evals/run-suite.mjs smoke --case=dts-migrate-autopilot
node evals/run-suite.mjs full --case=fresh-autopilot
node evals/run-suite.mjs full --case=dts-multi-repo
node evals/run-suite.mjs full --case=define-test-strategy-negative-control
bash evals/define-test-strategy/run-all.sh   # all four
```

`dts-migrate-autopilot` and `dts-multi-repo` allow Bash, so the skill can
delete the old rule file and run its location and tag scans. A permission
refusal in a headless run is an incomplete case, not a pass (see
`evals/README.md`).

## `dts-migrate-autopilot`

The fixture is a mini task tracker where go-deep has run (UC-01 to UC-04,
domains `tasks` and `notifications`) and the old version of this skill left
its outputs. Autopilot takes "Refresh / migrate (Recommended)" at Phase 1,
auto-confirms the location (`location-confirm`) and the tag-and-migration
checkpoint (`tag-and-migration-confirm`). The graders check that:

- the path-tagged tests gain `@covers` tags (`uc01-tagged`, `helpers-tagged`);
- the placeholder stays as it is, untagged, with its marker line, and is listed for the user to delete (`placeholder-not-tagged`, `placeholder-kept`, `placeholder-listed`);
- `.claude/rules/testing-strategy.md` is deleted (`old-rule-file-deleted`);
- the old Rules Files row and checklist item are removed and the checklist renumbered, while the SENTINEL line, quick-lookup table and the unrelated "Run `npm test` before committing." guideline stay (`rules-row-removed`, `checklist-item-removed`, `sentinel-survives`, `quick-lookup-table-preserved`);
- `CLAUDE.md` gets exactly one `/test-strategy` row (`other-skills-row-once`), and no hook is offered or written (`no-hook`);
- the live coverage report lists UC-02 (placeholder only) and UC-03 (no test) as uncovered, plus the `notifications` domain, and never mentions scaffolding (`coverage-report-shown`);
- the autopilot log is written under the invocation root (`log-denial-handled-gracefully`).

## `fresh-autopilot`

`fixture.sh` copies the migration fixture, then removes the old rule file and
all tests, and strips the old Rules Files row and checklist item from
`CLAUDE.md` (renumbering the rest), so Phase 1 finds nothing. The graders check
the generated skill (`test-strategy-skill-generated`: the template's eight
fixed headings in order, no `## Pending`, row 1 Location `.`, a
`node --test`-based command, no stored gap list), that no test file was
created (`no-new-test-files`), the single Other Skills row with no Rules row or
checklist item added (`claude-md-structure`), no hook (`no-hook`), the
SENTINEL line, and the autopilot log (`autopilot-log-content`: a
`location-confirm` line, `go-deep-offer` only if reached, and no prior-output
menu). With no tests to tag, a `tag-and-migration-confirm` line is not
required.

## `define-test-strategy-negative-control`

Same fixture as `dts-migrate-autopilot`, no `--autopilot`. It passes when the
run stops at the refresh/migrate question or at location confirmation
(`blocks-before-proceeding`), `CLAUDE.md` still has its SENTINEL line and old
Rules Files row and no `/test-strategy` row (`claude-md-untouched`), and no
`@covers` tag was written (`no-tags-written`).

## `dts-multi-repo`

`fixture.sh` copies the shared multi-repo workspace (`payments-api`,
`qa-automation`, `ledger-api`), removes payments-api's test-strategy skill,
strips every `@covers` line from `qa-automation/tests`, keeps ledger-api's
strategy, and gives each repo its own `.claude/` and one commit. The run starts
at the workspace root, which has no `.git`, and names `payments-api` as the
target. payments-api has go-deep output, so the go-deep offer is not reached.

- `qa-location-detected`: payments-api's new skill lists a `../qa-automation` location, because `qa-automation/tests/payments/withdraw.test.js` requires `../../../payments-api/src/withdraw.js` and exercises `/payments`.
- `qa-tagged-qualified`: that test gains `@covers payments-api:UC-08`.
- `qa-go-deep-warning`: the run says go-deep has not been run in `qa-automation`, and continues.
- `ledger-untouched`: `withdraw_ledger.test.js` exercises only `ledger-api`, so it never gets a `payments-api:` tag, although both repos have a UC-08.

After the strip, `limits_decoy.test.js` and `tests/e2e/flow.test.js` no longer
reference payments-api, so the skill is not expected to tag them.

## Known gaps

- The "Coverage report only" path, refresh conflicts, and a refresh that keeps user edits are not covered by an eval case.
- The go-deep offer with an actual partial run (an onboarded repo without go-deep) is not covered; under autopilot it resolves to "Continue without it".
- The target-repo hard stop and a `CLAUDE.md` without `## Skills Reference` (row skipped and reported) have no deliberately broken fixture.
- Untaggable files (JSON, Postman collections) and PHP docblock placement are not exercised; every fixture test is JavaScript.
