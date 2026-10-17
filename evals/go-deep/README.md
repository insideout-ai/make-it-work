# `go-deep` autopilot smoke test

Three cases exercising `skills/go-deep/SKILL.md`'s `--autopilot` flag: `fresh-onboarding` (first run), `repair-path` (prior-run repair, with one deliberately missing skill), `negative-control` (no `--autopilot`, confirms the interactive path still blocks).

## Running the cases

`fresh-onboarding` (the skill's smoke case) and `repair-path` are listed under `headless` in `evals/suites.json`: the runner seeds a disposable fixture, runs the prompt headlessly, and grades `graders/*.md` automatically (regex checks locally, `llm` checks with a separate judge, which runs only when every regex check passes). `negative-control` only needs to prove the run never completes unattended, so it runs through plain `claude plugin eval`:

```
node evals/run-suite.mjs smoke --case=fresh-onboarding
node evals/run-suite.mjs full --case=repair-path
claude plugin eval . --case negative-control --scaffold --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish
```

`bash evals/go-deep/run-all.sh` runs `negative-control` through `claude plugin eval`, then `fresh-onboarding` and `repair-path` with `--dangerously-skip-permissions` in `mktemp -d` directories, for the manual full-write checks below. Run it yourself (via `!` in a Claude Code session, or directly in a shell): an agent working under this harness's auto-mode safety net can't grant itself `--dangerously-skip-permissions`.

## Headless graders accept the written or the blocked outcome

Almost everything `go-deep` writes lives under `.claude/` (rules files and skill files). Claude Code protects `.claude/`, both inside `claude plugin eval`'s sandbox and in plain headless mode. A probe on Claude Code 2.1.285 found that `claude -p` blocks every write under `.claude/` with `--allowedTools Write`, `Write(.claude/**)` or `Write(./.claude/**)`, and with `--permission-mode acceptEdits`. Writes outside `.claude/` work once `Write` is allowed. An earlier version of this README said a plain `claude -p --allowedTools Write` probe could write under `.claude/`; that is not true on 2.1.285. The runner never uses `--dangerously-skip-permissions`.

So a headless `fresh-onboarding` run can write `CLAUDE.md` (repo root) and the decision log (`make-it-work/go-deep-autopilot-log.jsonl`), but normally not `.claude/rules/architecture.md`, `.claude/rules/product.md` or the `.claude/skills/domain-*` and `uc-*` skills. The skill writes only with Write and Edit and never retries a blocked write through Bash, but a run can still end up writing under `.claude/`. The headless graders therefore accept either outcome, as long as it is consistent and reported truthfully: the `.claude/` files all written, or all blocked and reported as blocked. A mix, or a blocked file written through another tool, fails. The content of the `.claude/` files is checked by hand, using each case's "Manual full-write check" below, which stays the thorough check of the written path. Run these checks only in a `mktemp -d` directory, never in this repo. They use `$REPO` for this checkout:

```sh
REPO=/path/to/make-it-work
```

## `fresh-onboarding`

The fixture is "Mini Task Tracker": a `package.json`, a README, and source for task management, notifications and a small user model, with no `CLAUDE.md` and no `.claude/`. Its prompt allows `Write`, `Edit` and `Bash`, so `CLAUDE.md` and the decision log can be written and the shared decision-log writer can run. The graders check:

- `CLAUDE.md` was written, with a `Skills Reference` heading (`claude-md-written`, regex);
- `CLAUDE.md` has the Skill Loading Gate before Quick Reference, a Rules Files section, Domain and Use Case Skills tables, and After Any Feature Change as its last section (`claude-md-structure`);
- the decision log was written and has a Phase 3 Confirm Scope `checkpoint` line (`autopilot-log-written`, regex);
- the log's lines follow the schema, it has at least one Phase 2 `askUserQuestion` line with `(Recommended)` first and `Skip — clear from code` last, and nothing chose "Run fresh onboarding" (`autopilot-log-content`);
- the `.claude/` writes are all written or all blocked, no blocked path is written through another tool, and the end-of-run summary matches the transcript: `CLAUDE.md` and the log written, the `.claude/rules/` and `.claude/skills/` files reported as written or as blocked (with a re-run after allowing writes), and which phases completed (`writes-reported`, `focus: trace`). go-deep is not expected to print blocked files in chat; there are too many.

### Manual full-write check

```sh
RUN_DIR=$(mktemp -d)
(cd "$RUN_DIR" && bash "$REPO/evals/go-deep/fresh-onboarding/fixture.sh")
(cd "$RUN_DIR" && claude -p "/make-it-work:go-deep --autopilot" \
  --plugin-dir "$REPO" --dangerously-skip-permissions \
  --output-format stream-json --verbose > "$RUN_DIR.transcript.jsonl")
```

Check `git status` on this repo before and after (it must not change). Then check in `$RUN_DIR`:

- [ ] `.claude/rules/architecture.md` exists, uses tables and bullets rather than long prose, and has a Functional Domains table with columns `Domain | Purpose | Key Components | Key Functions`. It lists task management and notifications, optionally a user-model domain for `src/models/user.js`, and nothing unrelated.
- [ ] `.claude/rules/product.md` exists and has a use-case table with columns `ID | Use Case | Actor | Trigger | Domains`. It lists create a task, complete a task and receive an overdue reminder, optionally Create User, and nothing unsupported. Its Domains values cover task management and notifications (a separate user domain is fine).
- [ ] `.claude/skills/` has one `domain-*/SKILL.md` per Functional Domains row and one `uc-{id}-{kebab-case-name}/SKILL.md` per use case, and every skill named in `CLAUDE.md`'s Skills Reference has a matching directory.
- [ ] `CLAUDE.md`'s Rules Files section lists both rules files, and the decision log meets `autopilot-log-content`.

## `repair-path`

The fixture is a prior go-deep run ("Mini Task Tracker" with `CLAUDE.md`, both rules files and every skill except one) and a single backdated commit, so the staleness re-scan flags nothing. `domain-notifications` is referenced in `CLAUDE.md`'s Skills Reference and `architecture.md`'s Functional Domains table but missing from `.claude/skills/`. `CLAUDE.md` carries a `SENTINEL:` sentence that the repair must not remove. Its prompt allows `Write`, `Edit` and `Bash`, so the decision log and any `CLAUDE.md` edit can be written and the shared decision-log writer can run. The repair's only `.claude/` write is the missing skill, which a headless run normally can't create. The graders check:

- the decision log was written and has a Phase 0 `workflow-choice` line choosing "Repair existing docs" (`autopilot-log-written`, regex);
- `CLAUDE.md` still has the `SENTINEL:` sentence (`sentinel-survives`, regex);
- the log chose "Repair existing docs (Recommended)", selected the Missing skills repair, reported zero stale skills for the staleness window, and never chose "Run fresh onboarding" (`autopilot-log-content`);
- the run identified `domain-notifications` as missing and either wrote `.claude/skills/domain-notifications/SKILL.md`, or tried to, was denied, didn't get around the denial through another tool or path, and named the path as blocked with re-run advice (`missing-skill-handled`, `focus: trace`);
- the `.claude/` writes are all written or all blocked, and the end-of-run summary matches the transcript: the decision log written, every written file listed, every blocked path reported as blocked, and which repairs or phases completed (`writes-reported`, `focus: trace`).

### Manual full-write check

```sh
RUN_DIR=$(mktemp -d)
(cd "$RUN_DIR" && bash "$REPO/evals/go-deep/repair-path/fixture.sh")
(cd "$RUN_DIR" && claude -p "/make-it-work:go-deep --autopilot" \
  --plugin-dir "$REPO" --dangerously-skip-permissions \
  --output-format stream-json --verbose > "$RUN_DIR.transcript.jsonl")
```

Check `git status` on this repo before and after (it must not change). Then check in `$RUN_DIR`:

- [ ] `.claude/skills/domain-notifications/SKILL.md` exists, with `name: domain-notifications` and a `description` in its frontmatter, within the domain size target (60–120 lines, 500 max), and covers `src/notifications/sendReminder.js` (the reminder shape, overdue check and admin escalation flag) without code snippets or ASCII diagrams.
- [ ] `CLAUDE.md`'s Skills Reference still lists `domain-notifications` with `src/notifications/` as its key code area, and every skill named there, in `architecture.md`'s Functional Domains table and in `product.md`'s use-case table has a matching `.claude/skills/` directory.
- [ ] `CLAUDE.md` still has the `SENTINEL:` sentence, and no other existing skill or rules file was rewritten (`git status` in `$RUN_DIR` shows only the new skill, the decision log and any cross-reference edits).
- [ ] The decision log meets `autopilot-log-content`.

## Known gaps in this suite (by design, not oversight)

- Doesn't cover the destructive "Run fresh onboarding" path, 2 of 4 repair-action types, or the single-choice-plus-filler repair-action variant — see the implementation plan's coverage discussion.
- `AskUserQuestion`'s availability is itself environment-dependent: unreachable inside `claude plugin eval` sandboxes (even when granted) and inside `--plugin-dir` headless runs (`TaskCreate`/`TaskUpdate` also weren't available there) — `go-deep` degrades gracefully in both cases. Worth a `SendFeedback` note; not a blocker for this plugin's own behavior.
