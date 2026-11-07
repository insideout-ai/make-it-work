# `close-the-gaps` autopilot smoke test

## Decision sources and Product communication

Three prepared headless regression cases cover the narrow decision-context
instruction update. They use saved local refinement sessions and synthetic
receipts; no live Slack or tracker connection is needed or authorized.

| Case | Expected outcome |
| --- | --- |
| `close-the-gaps-mixed-sources` | Preserve a user/chat answer, a previously confirmed PM/Slack answer and its recorded reference, a new Autopilot answer, and a checked answer whose author is unknown. Attribute each accurately in the existing Decision Log without inventing roles or a live Slack lookup. |
| `close-the-gaps-pm-followup` | Complete locally resolved user answers while prominently distinguishing them from PM confirmation in the spec and final response. Preserve sent metadata and the last-known/unverified reply state, without an automatic FYI or an unrequired approval gate. |
| `close-the-gaps-stale-recommendation` | A user accepts earlier recommendations, but the current export contract makes automatic pagination infeasible. Revisit that question with the changed evidence; retain the unchanged CSV-only choice as user-approved without asking for it again. |

The first two cases use `--autopilot`; the stale-recommendation case is
interactive and supplies the user's explicit blanket answer in its prompt.
Graders require authored decisions/artifacts rather than only printed seed
facts. They accept unknown attribution and unavailable current PM status when
those are the actual evidence limits. A saved PM reply is historical provenance,
not proof of a new live service lookup. These cases do not test tracker
publication, live messaging or the complete implement controller.

Run the credential-free fixture checks with:

```sh
node --test evals/decision-context-fixtures.test.mjs
```

Fixture tests check real question-parser states and distinguish a last-known
sent/no-reply thread from locally answered questions. They also execute the
current export helper: pagination arguments return the same first 100 of 150
orders, proving the old recommendation's premise is false in the fixture.
Protected-file hashes and Git state are retained for future post-run inspection;
questions-file annotations/status and newly generated refinement artifacts may
change. Repeat seeding refuses an existing Git repository.

Local fixture checks alone do not establish that the updated skill follows the
rules. Paid runs require separate budget approval.
After approval, select the cases with `node evals/run-suite.mjs full
--case=<case-name> --max-cost-usd=<approved-cap>` from a frozen snapshot, retain
original grading results, and inspect source/contract hashes and Git history.

Live validation on 2026-11-07: all three cases passed against a frozen snapshot
of base `872b1ec` with the proposed instruction/eval changes overlaid. The mixed
case preserved all four source categories; the PM case included the communication
note in the spec and final response without inventing approval or sending a
message; the stale case stopped for Q1 while retaining CSV-only as user-approved.
No instruction or grader correction was needed during this run. Source/contract/
prior-session hashes, Git HEADs/branches and tracked working trees stayed
unchanged in all fixtures, and the plugin snapshot was unchanged.

All **65 local checks passed** (58 eval-harness tests plus seven question-helper
tests). Model usage was **$0.84** (exact cost in the local report), bringing
tracked cumulative usage to approximately **$12.74 of the newly approved $14**.
Summary: `evals/results/decision-context-verification-2026-11-07/summary.json`.
Coverage is standalone refinement from seeded sessions, not live Slack/tracker
integration, publication-summary behavior or full implement orchestration. The
stale case stops for input; it does not test resume after that product answer.

## Existing smoke coverage

Seven cases exercising `skills/close-the-gaps/SKILL.md`'s `--autopilot` flag and Slack delivery modes:

- **`close-the-gaps-live-autopilot`** — a pasted ticket, `--autopilot`, no prior state. Exercises the normal Phase 1 → 6 flow end to end: skills loading (none available in this tiny fixture), code exploration, gap analysis, every gap auto-resolved via `(Recommended)` without ever calling `AskUserQuestion`, and the final refined ticket with a Gherkin acceptance-criteria block and a Decision Log where every autopilot-resolved row carries the `_(autopilot)_` marker. Its fixture (`src/orders/model.js` + `status.js`) deliberately has no "admin" role, only "owner" — the ticket's "the admin should mark the order as refunded" is a real gap the skill must surface and resolve one way or another; the grader checking for this accepts any reasonable gap-type label (`Code conflict`, `Missing actor/trigger`, etc.) across three real runs the model used different-but-equally-defensible labels for the same underlying gap.
- **`close-the-gaps-stale-questions-file`** — the fixture pre-seeds a stale `make-it-work/TASK-99/TASK-99-questions.md` (`**Status:** Awaiting Answers`) before the run starts, then pastes a *new* ticket for the same `TASK-99` ID. This exercises the skill's Phase 1 hard-stop: autopilot must detect the pending export and stop, never silently picking "resume," "overwrite," or "abort" on its own, and never deleting the stale file.
- **`close-the-gaps-offline-injection`** — invokes the questions-file path form (`close-the-gaps make-it-work/TASK-50/TASK-50-questions.md --autopilot`) against a hand-authored, partially-answered Phase 5B export: one question already answered by a human (a non-Recommended choice, which must be preserved verbatim), one left blank (which autopilot must resolve via its Recommended option and mark `_(autopilot)_`), and one conditional question whose gate isn't met (which must be excluded from the final Decision Log entirely).
- **`close-the-gaps-slack-fallback`** — a pasted ticket with `--slack --autopilot` in a session with no Slack integration. Exercises Phase 5D's fallback: the skill must say Slack couldn't be used, write the ordinary Phase 5B questions file (still `Awaiting Answers`, no `### Slack` block), tell the user to forward it to the Product Manager, and stop without a spec. Slack itself can't be reached from a headless eval, so the draft and thread-reply paths are checked manually.
- **`close-the-gaps-slack-send-fallback`** — a pasted ticket with no PM or reporter, invoked with `--slack-send --autopilot`. Whether the host exposes Slack tools or not, the run must explain the missing recipient or unavailable integration, export the questions for the PM, and stop without inventing a recipient, claiming delivery, or resolving the questions automatically.
- **`close-the-gaps-slack-send-resume`** — resumes a questions file whose earlier send has unknown delivery status, with no Slack integration. It must preserve that metadata, explain why replies cannot be read, keep the recorded human answer, resolve remaining questions under Autopilot, and never resend or mark delivery confirmed. Both new cases run with the headless runner and semantic grading.
- **`close-the-gaps-negative-control`** — the same ticket as `live-autopilot`, no `--autopilot`. Confirms the skill still announces its questions and does not fabricate a finished refined ticket when nothing is there to answer them live.

## Running the cases

Run the two send cases through the headless runner:

```sh
node evals/run-suite.mjs full --case=close-the-gaps-slack-send-fallback --case=close-the-gaps-slack-send-resume
```

Run the original five plugin-eval cases:

```
bash evals/close-the-gaps/run-all.sh
```

The original five run fully through plain `claude plugin eval` — no `--dangerously-skip-permissions` needed for any of them. `run-all.sh` runs every original case even if an earlier one scores imperfectly (so one weak case doesn't hide the rest), then exits non-zero overall if any case did. See "Why one check still needs a manual run" below for the one thing this suite does *not* verify automatically.

For a live Slack check, use a test recipient: select **Draft in Slack** and verify a draft with the ticket link/disclosure is created without sending; select **Send via Slack**, confirm that recipient, and verify a single message is sent after the preview without another send question. Resume with the questions file to verify it reads that thread without sending again. Also check that legacy `--slack` stays draft-only and Autopilot without an explicit send choice never sends. Live Slack delivery cannot be exercised by these offline fixtures.

For Jira recipient discovery, use a disposable ticket whose **Product Manager custom field** differs from its built-in Reporter. Verify the skill resolves the custom field's actual name-to-`customfield_<id>` mapping and uses its populated value, including when omitted from the initial issue response. A confirmed missing/empty PM field permits a clearly labeled Reporter fallback; unavailable or ambiguous field discovery must ask for the PM (or export offline in Autopilot), without treating omission as empty or guessing a custom-field ID. These are manual connector checks, not automated coverage.

For partial-answer refinement, check these scenarios in a disposable project (Slack delivery requires a test recipient):

- Answer one question, skip another, and skip a gate with dependent questions. Verify independent questions continue, dependents remain unresolved, and the final choice offers exactly **Proceed with TBDs** and **Pause and send to Product**.
- Choose **Proceed with TBDs**. Verify the spec preserves the answer and lists both skipped and blocked items with their conditions. Unasked dependent questions have no Decision Log row; no message is drafted or sent.
- Choose **Pause and send to Product** in a fresh run. Verify the saved file retains answered selections and original Q-numbers, clears only deferred selections for Product to answer, and the message asks only unresolved questions with answered decisions as context. No spec is generated. With Slack unavailable, verify the same preserved file is offered for manual forwarding without claiming delivery.
- Resume that file with Product replies, then without replies and choose to answer unresolved questions live. Verify existing answers survive both paths and dependent questions become applicable only after their gate resolves. A second unresolved handoff requires a fresh explicit selection; an unknown delivery is reconciled without resending.
- Answer everything. Verify no unresolved-items choice appears. Under Autopilot, resume a file with a checked Skip and verify it proceeds with TBDs without sending. Under implement, verify a partial handoff pauses via `QUESTIONS_SENT`, while proceeding returns `SPEC_SAVED` with the unresolved count for existing readiness gates.

These interaction scenarios are manual coverage; `scripts/questions.test.mjs` covers skipped-gate propagation, counts, and preserving answers when the gate is later resolved.

## `.claude/`-exposure: why this skill is mostly plain-eval-testable

Before this work, `close-the-gaps` wrote nothing under `.claude/` at all. Adding `--autopilot` adds exactly one such path: the decision log, `make-it-work/<TICKET>/close-the-gaps-autopilot-log.jsonl` (per the shared convention — see `skills/close-the-gaps/SKILL.md`'s Autopilot Mode section). Everything else the skill writes — `make-it-work/<TICKET>/<TICKET>-questions.md`, `make-it-work/<TICKET>/<TICKET>-spec.md` — is a normal, unblocked path. That puts this skill in the "one specific blocked path among otherwise-unblocked output" bucket (the same bucket `define-test-strategy` is in for its `.claude/skills/test-strategy/SKILL.md`), not the "substantially under `.claude/`" bucket `go-deep` was in.

Run each case like this:

```
claude plugin eval . --case close-the-gaps-live-autopilot --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish
```

(swap the case name for any of the other four). `AskUserQuestion` is listed in `allowed_tools` for every case even though autopilot shouldn't call it — same reasoning as `go-deep`: if the model deviates and calls it anyway, we want that visible as a grader failure, not an unrelated tool-denial error.

## Why one check still needs a manual run

Claude Code treats `.claude/` as a protected path everywhere — confirmed during the `go-deep` work and unchanged here: no tool grant (including `Write`/`Edit` via `--allow-tools`) unblocks writing there under plain `claude plugin eval`; only `--dangerously-skip-permissions`, run by a human, does. That means the plain-eval runs above can verify everything close-the-gaps actually produces as a deliverable, but **cannot** verify that `make-it-work/<TICKET>/close-the-gaps-autopilot-log.jsonl` itself gets created with the right schema — that write will be silently denied in the sandbox.

`close-the-gaps-live-autopilot/graders/autopilot-log-referenced.md` is a low-weight regex check on the *trace* (not the file) confirming the skill at least attempts/narrates the write — useful signal, not proof the file lands correctly. To actually verify the log's existence and schema, run:

```
bash evals/close-the-gaps/manual-log-check.sh
```

This reuses `close-the-gaps-live-autopilot`'s own fixture and prompt in a disposable `mktemp` dir, runs it with `--dangerously-skip-permissions` (the only thing that unblocks a `.claude/` write), diffs this repo's `git status` before/after to confirm nothing leaked into it, and prints the run dir so you can inspect `make-it-work/<TICKET>/close-the-gaps-autopilot-log.jsonl` and `make-it-work/TASK-77/TASK-77-spec.md` by hand. Run it yourself (via `!` in a Claude Code session, or directly in a shell/CI) — not something to hand to an agent, since an agent operating under this harness's own auto-mode safety net can't invoke or grant itself `--dangerously-skip-permissions`.

This is the only case in this suite that needs that manual step, and it's an addendum to `close-the-gaps-live-autopilot`'s own fixture/prompt, not a separate case — everything else that case checks is already covered by the plain-eval run.

## Known gaps in this suite (by design, not oversight)

- Doesn't cover the Phase 1 "ticket-fetch failure with nothing pasted" hard-stop (no MCP tracker integration is configured in this eval sandbox to begin with, so exercising a *failed fetch* specifically would require mocking one) — the hard-stop is documented in `SKILL.md`'s Autopilot Mode section but not separately eval-covered here.
- Doesn't cover the Phase 5C "conflicting checkboxes" hard-stop (more than one box checked on the same question) — a plausible fifth case, omitted here to keep the suite to the same size as the branches `go-deep`'s pilot covered; worth adding if this suite grows.
- `close-the-gaps-live-autopilot` and `close-the-gaps-negative-control` share one fixture (same ticket, same tiny fixture repo) — intentional, mirrors how `go-deep`'s `fresh-onboarding`/`negative-control` share a fixture.
- `AskUserQuestion`'s availability inside `claude plugin eval` sandboxes is itself environment-dependent (see `evals/go-deep/README.md`'s note); this skill's autopilot path never calls it on the happy path anyway, so it mainly affects how `close-the-gaps-negative-control` behaves once it reaches a question it can't resolve unattended.


## Optional Slack context research

See [the connected Slack context-search scenarios](slack-context-search-manual.md)
for consent, all-channel default scope, explicit channel limits, Autopilot,
read-only behavior, conflict handling, and export/resume checks. These require a
test Slack connection and are manual coverage; the existing offline/autopilot
fixtures do not simulate a connected search provider.
