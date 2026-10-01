# `slice-the-epic` autopilot smoke test

Three cases exercising `skills/slice-the-epic/SKILL.md`'s `--autopilot` flag:

- **`well-specified-epic-autopilot`** — a clear, single-outcome epic (CSV export of a customer's own order history) that should never trigger the skill's one interactive site. Confirms autopilot doesn't change behavior when nothing is ambiguous.
- **`ambiguous-epic-autopilot`** — an epic with no identifiable outcome ("Make the platform better for enterprise customers"), which should trigger the skill's clarifying-question condition. Confirms autopilot answers it with a flagged best guess and still produces a full backlog, instead of stalling.
- **`negative-control`** — the same ambiguous epic, without `--autopilot`. Confirms the interactive path still asks and stops rather than guessing.

`slice-the-epic` is simpler than `go-deep`'s pilot in one respect and the same in another:

- **Simpler**: it has exactly one interactive site (a conditional clarifying question in "Understand the request" — see SKILL.md's Autopilot Mode section), no destructive-action analog, and it persists **no output file of its own** — the backlog is chat-output only. This was confirmed by reading the live `SKILL.md` in full before writing any grader: nothing in "Write the backlog" or "Wrap up" instructs saving to disk.
- **Same**: the one thing it *does* write under autopilot — `.claude/slice-the-epic-autopilot-log.jsonl` — lands under `.claude/`, which `claude plugin eval`'s sandbox denies writing to regardless of tool grants (reconfirmed empirically for this exact binary version during this work — see "Re-confirming the `.claude/` write block" below). So the suite follows the same split `go-deep`'s README documents for `define-test-strategy`-shaped cases: run everything through plain `claude plugin eval`, and only reach for a manual, unsandboxed run to verify the log file's actual content.

## A note on case names

Each case's `case.yaml` `name:` is prefixed `slice-the-epic-` (e.g. `slice-the-epic-negative-control`, not `negative-control`). `claude plugin eval --case <glob>` matches by name across the **whole** eval dir, not scoped by subdirectory — and `go-deep` already has its own case named plainly `negative-control`. Running `--case negative-control` picked up both suites' cases in one run during this work. Every other skill's autopilot suite being added alongside this one is likely to want a `negative-control` too, so this convention (prefix every case name with the skill name) is worth adopting plugin-wide, not just here.

## Running the plain-eval cases

```
claude plugin eval . --case "slice-the-epic-*" --allow-tools Write --ablation none --runs 3 --trust-plugin --no-publish
```

All three cases run fully unattended this way. `--allow-tools Write` is granted because the two autopilot cases attempt to write the decision log (the attempt is expected to be denied inside the sandbox — see below); the negative-control case needs no tools at all. Each case's own `prompt.md` frontmatter also declares its `allowed_tools`.

None of the three cases assert `file_exists` against anything under `.claude/` — that check would be vacuous inside `claude plugin eval` (a denied write and a write that never happened both look like "file absent"). Instead, `log-write-attempted` in the two autopilot cases is a `regex` grader against the full `trace`, anchored on the literal tool-call shape (`"name":"Write"[^\n]*slice-the-epic-autopilot-log\.jsonl`) rather than just the filename in prose — proof the skill *attempted* the write via an actual `Write` call (refused or not), without depending on whether the sandbox let it through.

**Grading targets `trace`, not `last_message`, for the two autopilot cases' content checks.** The skill writes its decision log *after* producing the backlog (by design — a denied log write must never block or precede the deliverable), so the backlog itself usually lands in an earlier assistant turn, with the run's actual final message being a short one-line note about the log write's outcome. A `focus: last_message` / `target: last_message` grader against that short note alone would never see the backlog — this was caught empirically during this work (the first draft of `backlog-produced` scored 0/3 against `last_message` before being retargeted to `trace`, even though the skill's real output was correct every time).

**Observed judge variance:** with 3 runs each, `ambiguous-epic-autopilot` and `negative-control` scored 100% across the board; `well-specified-epic-autopilot` scored 2/3 full passes and one 0.83 (the `backlog-produced` LLM grader split 2-1 against a transcript that, read by hand, was fully correct — approach stated, three well-formed Gherkin slices, dependencies section, wrap-up, no clarifying question). This looks like default-judge-model (`haiku`) noise on a long structured document rather than a skill defect; `--judge-model` can be overridden to a stronger model for more reliable grading if this recurs.

## Verifying the decision log's actual content (manual, unsandboxed run)

Unlike `go-deep`, this did **not** require `--dangerously-skip-permissions` to verify. During this work, a direct probe showed that plain headless mode (`claude -p ... --allowedTools Write`, no `--dangerously-skip-permissions`) **can** write under `.claude/` in this environment — only `claude plugin eval`'s own sandbox blocks it. This is a discrepancy with `evals/go-deep/README.md`'s claim that "no permission grant or tool allowlist unblocks writing there, in `claude plugin eval` or in plain headless mode" — worth a look by whoever owns that doc, but out of scope to edit here since `go-deep`'s files aren't part of this task.

To verify the log for real, in a disposable directory:

```bash
RUN_DIR=$(mktemp -d)
cd "$RUN_DIR"
claude -p "/make-it-work:slice-the-epic --autopilot

Epic: Make the platform better for enterprise customers." \
  --plugin-dir /Users/ErezMo/make-it-work --allowedTools Write \
  --output-format stream-json --verbose > /tmp/slice-the-epic-ambiguous-transcript.jsonl

cat "$RUN_DIR/.claude/slice-the-epic-autopilot-log.jsonl"
```

Expect exactly one line: `phase: "Understand the request"`, `site: "missing-fact-clarification"`, `kind: "open_text"`, `chosen` starting with `[autopilot best-guess]`, and a one-sentence `rationale`.

This repo's own working tree is never touched by the above — it runs entirely inside `$RUN_DIR`. If plain `--allowedTools` stops working in some other environment, fall back to the `go-deep`-style manual path instead (same pattern as `evals/go-deep/run-all.sh`): seed a scratch dir, run with `--dangerously-skip-permissions`, diff `git status` on the real repo before/after.

## Re-confirming the `.claude/` write block (for whoever reads this next)

Before writing any case, two throwaway probes were run directly against this plugin (not kept in this suite):

1. A trivial case asking the model to `Write` a file to `.claude/probe-autopilot-log.jsonl`, run via `claude plugin eval ... --allow-tools Write` — **denied**. The trace shows `"type":"system","subtype":"permission_denied"` with `"message":"Permission to use Write has been denied because Claude Code is running in don't ask mode."`
2. The same case, same grant, writing to `probe-root.txt` at the working-directory root instead — **succeeded**.

This reconfirms `go-deep`'s finding holds for `claude plugin eval` specifically: no `--allow-tools` grant unblocks a `.claude/`-path write inside its sandbox. It does not hold for plain `claude -p` headless mode on this machine/version (see above) — that part of `go-deep`'s README may be stale or was specific to a different invocation shape.

## Known gaps in this suite (by design)

- Doesn't cover a scenario where the requirement "combines unrelated initiatives" (the *other* half of the clarifying-question condition) — the "no identifiable outcome" half was exercised instead, and is sufficient to prove the resolution policy end to end. A second ambiguous fixture for the other half would be a reasonable follow-up, not a gap in the autopilot logic itself (both halves hit the exact same single resolution rule).
- `slice-the-epic` has no `AskUserQuestion` call anywhere in its current text — its one interactive site is a plain-text question, not a structured tool call — so unlike `go-deep`, there's no multi-select/filler-option variant to exercise here. This matches the skill's actual shape rather than being an omission.
