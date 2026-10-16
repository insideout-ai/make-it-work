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
runs the prompt headlessly, and grades `graders/*.md` automatically (regex
checks locally, `llm` checks with a separate judge, which runs only when every
regex check passes).
`dts-migrate-autopilot` is the skill's smoke case. The negative control writes
nothing, so it runs through plain `claude plugin eval`.

```sh
node evals/run-suite.mjs smoke --case=dts-migrate-autopilot
node evals/run-suite.mjs full --case=fresh-autopilot
node evals/run-suite.mjs full --case=dts-multi-repo
node evals/run-suite.mjs full --case=define-test-strategy-negative-control
bash evals/define-test-strategy/run-all.sh   # all four
```

All three headless cases allow Bash, so the skill can resolve the repo root
(`git rev-parse --show-toplevel`) and run its location and tag scans.

### Headless graders accept the written or the blocked outcome

Claude Code protects `.claude/`: no `--allowedTools` grant or
`--permission-mode acceptEdits` lets the Write or Edit tool write
`.claude/skills/test-strategy/SKILL.md` in a headless run, and the runner
never uses `--dangerously-skip-permissions`. Writes outside `.claude/` (test
tags, `make-it-work/` logs) work. The skill writes files only with Write and
Edit, so a headless run normally takes its "Write blocked" path: it prints the
generated skill in one fenced block, keeps the old rule file, skips Phase 6
(`CLAUDE.md` is not edited), still reports coverage, and says in its summary
that the write was blocked. A run can still end up writing the skill (one
smoke run wrote it through a Bash heredoc), and then it completes the
migration: old rule file deleted, `CLAUDE.md` updated.

So the headless graders accept either outcome, as long as it is consistent:

- **Written:** the skill file was written, the old rule file deleted (migration case), `CLAUDE.md` has the `/test-strategy` row (and, when migrating, lost the old Rules Files row and checklist item), and the summary says what was written.
- **Blocked:** the generated skill is printed in chat, the old rule file is kept, `CLAUDE.md` is unchanged, and the summary reports the blocked path.
- **Mixed** states fail, for example the old rule file deleted with no new skill written, or the `CLAUDE.md` pointer added while the skill is missing.

The skill file and the old rule file may each be absent, and a grader that
reads a missing file fails, so the outcome is judged from the transcript
(`focus: trace`: the tool calls, their results and the assistant text) and
from `CLAUDE.md`, which exists either way. The printed block is usually in an
earlier assistant message, not the final summary, which is another reason
these graders read the trace. Each case's "Manual full-write check" below
stays the thorough check of the written path. Run these checks only in a
`mktemp -d` directory, never in this repo. They use `$REPO` for this checkout:

```sh
REPO=/path/to/make-it-work
```

## `dts-migrate-autopilot`

The fixture is a mini task tracker where go-deep has run (UC-01 to UC-04,
domains `tasks` and `notifications`) and the old version of this skill left
its outputs. Autopilot takes "Refresh / migrate (Recommended)" at Phase 1,
auto-confirms the location (`location-confirm`) and the tag-and-migration
checkpoint (`tag-and-migration-confirm`). The graders accept the written or
the blocked outcome (see above):

- the path-tagged tests gain `@covers` tags (`uc01-tagged`, `helpers-tagged`);
- the placeholder stays as it is, untagged, with its marker line, and is listed for the user to delete (`placeholder-not-tagged`, `placeholder-kept`, `placeholder-listed`);
- the migration is all or nothing (`migration-consistent`, `focus: trace`): the new skill written, the old rule file deleted and `CLAUDE.md` edited, or none of the three, and the summary reports the same outcome;
- `CLAUDE.md` is either unchanged (old Rules Files row and checklist item still there, no `/test-strategy` row or `### Other Skills` table) or fully migrated (both removed, checklist renumbered from "Skill docs", exactly one `/test-strategy` row in an `### Other Skills` table), never a mix (`claude-md-consistent`); the SENTINEL line and quick-lookup table stay either way (`sentinel-survives`, `quick-lookup-table-preserved`);
- the generated skill, with at least `## Repo ID`, `## Test Locations` and `## How to Scan`, is either in the call that wrote `.claude/skills/test-strategy/SKILL.md` or, when that write was blocked, printed in one fenced block in the assistant text, and never written elsewhere (`generated-skill-delivered`, `focus: trace`);
- the summary fully describes one outcome: the skill written, old rule file deleted and `CLAUDE.md` updated, or the write blocked, the old rule file and `CLAUDE.md` left unchanged, and a re-run after allowing writes there (`outcome-reported`);
- no hook is offered or written (`no-hook`);
- the live coverage report lists UC-02 (placeholder only) and UC-03 (no test) as uncovered, plus the `notifications` domain, and never mentions scaffolding (`coverage-report-shown`);
- the summary names the autopilot log under the invocation root and says it was written, or that the write was denied and the run continued (`log-denial-handled-gracefully`).

### Manual full-write check

```sh
RUN_DIR=$(mktemp -d)
(cd "$RUN_DIR" && bash "$REPO/evals/define-test-strategy/dts-migrate-autopilot/fixture.sh")
(cd "$RUN_DIR" && claude -p "/make-it-work:define-test-strategy --autopilot" \
  --plugin-dir "$REPO" --dangerously-skip-permissions)
```

Then check in `$RUN_DIR`:

- [ ] `.claude/skills/test-strategy/SKILL.md` exists and has the template's eight `##` headings in order (`## Repo ID` to `## How to Scan`).
- [ ] `.claude/rules/testing-strategy.md` is deleted.
- [ ] `CLAUDE.md` has no Rules Files row naming `testing-strategy.md`, and no "check the regression/coverage status … before committing" checklist item; the checklist is renumbered from 1, starting with "Skill docs".
- [ ] `CLAUDE.md` has an `### Other Skills` table after the Domain and Use Case Skills tables, with exactly one `/test-strategy` row in the whole file.
- [ ] The SENTINEL line, quick-lookup table and "Run `npm test` before committing." guideline are unchanged.

## `fresh-autopilot`

`fixture.sh` copies the migration fixture, then removes the old rule file and
all tests, and strips the old Rules Files row and checklist item from
`CLAUDE.md` (renumbering the rest), so Phase 1 finds nothing. The graders
accept the written or the blocked outcome (see above):

- the generated skill, written to `.claude/skills/test-strategy/SKILL.md` or printed in the assistant text when that write was blocked (`test-strategy-skill-generated`, `focus: trace`): the template's eight fixed headings in order, no `## Pending`, row 1 Location `.`, a `node --test`-based command, no stored gap list, and a summary that names the path as written or says the write was blocked;
- the `CLAUDE.md` pointer was added only if the skill was written (`pointer-consistent`, `focus: trace`);
- that no test file was created (`no-new-test-files`);
- that `CLAUDE.md` has either no `/test-strategy` row and no `### Other Skills` table, or exactly one `/test-strategy` row in an `### Other Skills` table; in both cases no testing-strategy Rules row, and "Skill docs" still checklist item 1 (`claude-md-consistent`); the SENTINEL line also stays (`sentinel-survives`);
- no hook (`no-hook`);
- the autopilot log (`autopilot-log-content`): a `location-confirm` line, `go-deep-offer` only if reached, and no prior-output menu. With no tests to tag, a `tag-and-migration-confirm` line is not required.

### Manual full-write check

```sh
RUN_DIR=$(mktemp -d)
(cd "$RUN_DIR" && bash "$REPO/evals/define-test-strategy/fresh-autopilot/fixture.sh")
(cd "$RUN_DIR" && claude -p "/make-it-work:define-test-strategy --autopilot" \
  --plugin-dir "$REPO" --dangerously-skip-permissions)
```

Then check in `$RUN_DIR`:

- [ ] `.claude/skills/test-strategy/SKILL.md` exists, has the eight `##` headings in order and no `## Pending`, and its first Test Locations row has Location `.` and a `node --test`-based command.
- [ ] `CLAUDE.md` has an `### Other Skills` table with exactly one `/test-strategy` row, no testing-strategy Rules row, and "Skill docs" still checklist item 1.
- [ ] `__tests__/` still holds only `.gitkeep`.

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
The write to `payments-api/.claude/skills/test-strategy/SKILL.md` may be
written or blocked (see above); the graders check the tags and the detected
locations either way:

- `qa-location-detected` (`focus: trace`): the confirmed locations, read from the written or printed skill's Test Locations table or from the summary, include `.` and a `../qa-automation` location for repo `qa-automation`, because `qa-automation/tests/payments/withdraw.test.js` requires `../../../payments-api/src/withdraw.js` and exercises `/payments`.
- `qa-tagged-qualified`: that test gains `@covers payments-api:UC-08`.
- `qa-go-deep-warning`: the run says go-deep has not been run in `qa-automation`, and continues.
- `ledger-untouched`: `withdraw_ledger.test.js` exercises only `ledger-api`, so it never gets a `payments-api:` tag, although both repos have a UC-08.

After the strip, `limits_decoy.test.js` and `tests/e2e/flow.test.js` no longer
reference payments-api, so the skill is not expected to tag them.

### Manual full-write check

```sh
RUN_DIR=$(mktemp -d)
(cd "$RUN_DIR" && bash "$REPO/evals/define-test-strategy/dts-multi-repo/fixture.sh")
(cd "$RUN_DIR" && claude -p "/make-it-work:define-test-strategy payments-api --autopilot" \
  --plugin-dir "$REPO" --dangerously-skip-permissions)
```

Then check in `$RUN_DIR`:

- [ ] `payments-api/.claude/skills/test-strategy/SKILL.md` exists; its `## Test Locations` table has row 1 Location `.` for `payments-api`, and a row whose Location starts with `../qa-automation` and whose Repo is `qa-automation`.
- [ ] `payments-api/CLAUDE.md` has exactly one `/test-strategy` row in its `### Other Skills` table.
- [ ] `ledger-api/.claude/skills/test-strategy/SKILL.md` is unchanged, and `withdraw_ledger.test.js` has no `payments-api:` tag.

## Known gaps

- The "Coverage report only" path, refresh conflicts, and a refresh that keeps user edits are not covered by an eval case.
- The go-deep offer with an actual partial run (an onboarded repo without go-deep) is not covered; under autopilot it resolves to "Continue without it".
- The target-repo hard stop and a `CLAUDE.md` without `## Skills Reference` (row skipped and reported) have no deliberately broken fixture.
- Untaggable files (JSON, Postman collections) and PHP docblock placement are not exercised; every fixture test is JavaScript.
