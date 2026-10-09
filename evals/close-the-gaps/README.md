# `close-the-gaps` autopilot smoke test

Four cases exercising `skills/close-the-gaps/SKILL.md`'s `--autopilot` flag:

- **`close-the-gaps-live-autopilot`** — a pasted ticket, `--autopilot`, no prior state. Exercises the normal Phase 1 → 6 flow end to end: skills loading (none available in this tiny fixture), code exploration, gap analysis, every gap auto-resolved via `(Recommended)` without ever calling `AskUserQuestion`, and the final refined ticket with a Gherkin acceptance-criteria block and a Decision Log where every autopilot-resolved row carries the `_(autopilot)_` marker. Its fixture (`src/orders/model.js` + `status.js`) deliberately has no "admin" role, only "owner" — the ticket's "the admin should mark the order as refunded" is a real gap the skill must surface and resolve one way or another; the grader checking for this accepts any reasonable gap-type label (`Code conflict`, `Missing actor/trigger`, etc.) across three real runs the model used different-but-equally-defensible labels for the same underlying gap.
- **`close-the-gaps-stale-questions-file`** — the fixture pre-seeds a stale `make-it-work/TASK-99-questions.md` (`**Status:** Awaiting Answers`) before the run starts, then pastes a *new* ticket for the same `TASK-99` ID. This exercises the skill's Phase 1 hard-stop: autopilot must detect the pending export and stop, never silently picking "resume," "overwrite," or "abort" on its own, and never deleting the stale file.
- **`close-the-gaps-offline-injection`** — invokes the questions-file path form (`close-the-gaps make-it-work/TASK-50-questions.md --autopilot`) against a hand-authored, partially-answered Phase 5B export: one question already answered by a human (a non-Recommended choice, which must be preserved verbatim), one left blank (which autopilot must resolve via its Recommended option and mark `_(autopilot)_`), and one conditional question whose gate isn't met (which must be excluded from the final Decision Log entirely).
- **`close-the-gaps-negative-control`** — the same ticket as `live-autopilot`, no `--autopilot`. Confirms the skill still announces its questions and does not fabricate a finished refined ticket when nothing is there to answer them live.

## Running all four at once

```
bash evals/close-the-gaps/run-all.sh
```

All four run fully through plain `claude plugin eval` — no `--dangerously-skip-permissions` needed for any of them. `run-all.sh` runs every case even if an earlier one scores imperfectly (so one weak case doesn't hide the rest), then exits non-zero overall if any case did. See "Why one check still needs a manual run" below for the one thing this suite does *not* verify automatically.

## `.claude/`-exposure: why this skill is mostly plain-eval-testable

Before this work, `close-the-gaps` wrote nothing under `.claude/` at all. Adding `--autopilot` adds exactly one such path: the decision log, `make-it-work/close-the-gaps-autopilot-log.jsonl` (per the shared convention — see `skills/close-the-gaps/SKILL.md`'s Autopilot Mode section). Everything else the skill writes — `make-it-work/<TICKET>-questions.md`, `make-it-work/<TICKET>-spec.md` — is a normal, unblocked path. That puts this skill in the "one specific blocked path among otherwise-unblocked output" bucket (the same bucket `define-test-strategy` is in for its `.claude/rules/testing-strategy.md`), not the "substantially under `.claude/`" bucket `go-deep` was in.

Run each case like this:

```
claude plugin eval . --case close-the-gaps-live-autopilot --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish
```

(swap the case name for the other three). `AskUserQuestion` is listed in `allowed_tools` for every case even though autopilot shouldn't call it — same reasoning as `go-deep`: if the model deviates and calls it anyway, we want that visible as a grader failure, not an unrelated tool-denial error.

## Why one check still needs a manual run

Claude Code treats `.claude/` as a protected path everywhere — confirmed during the `go-deep` work and unchanged here: no tool grant (including `Write`/`Edit` via `--allow-tools`) unblocks writing there under plain `claude plugin eval`; only `--dangerously-skip-permissions`, run by a human, does. That means the plain-eval runs above can verify everything close-the-gaps actually produces as a deliverable, but **cannot** verify that `make-it-work/close-the-gaps-autopilot-log.jsonl` itself gets created with the right schema — that write will be silently denied in the sandbox.

`close-the-gaps-live-autopilot/graders/autopilot-log-referenced.md` is a low-weight regex check on the *trace* (not the file) confirming the skill at least attempts/narrates the write — useful signal, not proof the file lands correctly. To actually verify the log's existence and schema, run:

```
bash evals/close-the-gaps/manual-log-check.sh
```

This reuses `close-the-gaps-live-autopilot`'s own fixture and prompt in a disposable `mktemp` dir, runs it with `--dangerously-skip-permissions` (the only thing that unblocks a `.claude/` write), diffs this repo's `git status` before/after to confirm nothing leaked into it, and prints the run dir so you can inspect `make-it-work/close-the-gaps-autopilot-log.jsonl` and `make-it-work/TASK-77-spec.md` by hand. Run it yourself (via `!` in a Claude Code session, or directly in a shell/CI) — not something to hand to an agent, since an agent operating under this harness's own auto-mode safety net can't invoke or grant itself `--dangerously-skip-permissions`.

This is the only case in this suite that needs that manual step, and it's an addendum to `close-the-gaps-live-autopilot`'s own fixture/prompt, not a separate case — everything else that case checks is already covered by the plain-eval run.

## Known gaps in this suite (by design, not oversight)

- Doesn't cover the Phase 1 "ticket-fetch failure with nothing pasted" hard-stop (no MCP tracker integration is configured in this eval sandbox to begin with, so exercising a *failed fetch* specifically would require mocking one) — the hard-stop is documented in `SKILL.md`'s Autopilot Mode section but not separately eval-covered here.
- Doesn't cover the Phase 5C "conflicting checkboxes" hard-stop (more than one box checked on the same question) — a plausible fifth case, omitted here to keep the suite to the same size as the branches `go-deep`'s pilot covered; worth adding if this suite grows.
- `close-the-gaps-live-autopilot` and `close-the-gaps-negative-control` share one fixture (same ticket, same tiny fixture repo) — intentional, mirrors how `go-deep`'s `fresh-onboarding`/`negative-control` share a fixture.
- `AskUserQuestion`'s availability inside `claude plugin eval` sandboxes is itself environment-dependent (see `evals/go-deep/README.md`'s note); this skill's autopilot path never calls it on the happy path anyway, so it mainly affects how `close-the-gaps-negative-control` behaves once it reaches a question it can't resolve unattended.
