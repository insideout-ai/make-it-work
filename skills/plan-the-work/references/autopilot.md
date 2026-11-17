<!-- Procedures relocated from the parent SKILL.md without policy changes. -->

Read this guide only at the loading point in [the skill entrypoint](../SKILL.md). `<base>` and bare relative paths in prose or code below refer to the parent skill directory; Markdown links resolve from this file. Phase and step names refer to the complete workflow in that entrypoint and its linked guides.

## Autopilot Mode

When invoked with `--autopilot`, still **construct** every question/options payload exactly as the interactive path below would — option count, ordering, and the `(Recommended)` label rules all still apply and get exercised on every run — just don't call `AskUserQuestion` or wait at a checkpoint. Auto-resolve per the table below instead.

**Hard-stop exception:** autopilot must never silently overwrite an existing plan file. If `make-it-work/<TICKET>/<TICKET>-plan.md` already exists from a previous run, autopilot writes to the next unused `-v2` (then `-v3`, `-v4`, …) suffix instead of overwriting it — "overwrite" and "abort" are never auto-selected, since a free suffix is always available as a non-destructive alternative. Step 6's final output, and the `/make-it-work:execute` hint it prints, both name the actual resolved path explicitly (e.g. `make-it-work/PROJ-123/PROJ-123-plan-v2.md`) — not the bare `<TICKET>`, since `execute <TICKET>` alone would resolve to the original file instead.

**Decision log:** write `make-it-work/<TICKET>/plan-the-work-autopilot-log.jsonl` at repo root, overwritten fresh at the start of each autopilot run (it describes that run only). Field shape follows the shared schema in `docs/autopilot-log-schema.md` — this skill uses all three `kind` values (`askUserQuestion`, `checkpoint`, `open_text`), `multiSelect` is a genuine boolean, so `chosen` can be a string, an array of strings, the `open_text` free-text answer, or `null`. No `repo` field — this skill has no per-repo-resolved site. Every line also still includes `rationale` (one sentence), per the shared schema's core fields. `phase` examples: `"Step 1"`, `"Step 4"`, `"Step 4.5"`. `site` examples: `"existing-plan-collision"`, `"approach-gap"`, `"scope-check"`.

When Bash is permitted, initialize this log in its own Bash tool call with `node "<base>/../../scripts/decision-log.mjs" init plan-the-work --root "<repo-root>" --ticket "<TICKET>"`, then use that writer's `append` command with the same root and ticket for each resolved site. Never combine a log call with investigation, testing, or another file write: a denied log write must not prevent substantive planning. If the log write is denied, do not retry it through another tool or path; continue planning. If Bash is unavailable, retain the existing Write/Edit behavior. Resolve `<base>` to this skill's directory; the shared writer contract is in `docs/autopilot-log-schema.md`.

This file is a run artifact: never reference it from the plan itself, and never list it as an Affected Code entry.

**Resolution table** (one row per interactive site, in the order they appear):

| Step | Site | `kind` | Autopilot resolution |
|---|---|---|---|
| 1a | ambiguous workspace — unrelated repos with no unifying doc | — | **Remains a hard stop.** No safe default exists for guessing which repo or workspace is in scope; stop and require a human, exactly as the interactive path already does. |
| 1a | project root not identified at all | — | **Remains a hard stop**, unchanged from the interactive path. |
| 1b | no ticket key derivable from the argument or the current branch | — | **Remains a hard stop.** Autopilot cannot invent a ticket key; this requires a human to supply one. |
| 1b | mid-refinement questions file (`<TICKET>-questions.md` still `Awaiting Answers`) | `checkpoint` | The skill's own designated default here is "stop here and finish `close-the-gaps` first (recommended)" — autopilot honors that default literally: halt the run, log the decision, print the summary. This is the recommended path auto-selected, not an error exit. |
| 1b | no local spec and the tracker fetch is unavailable, fails, or has no refinement | — | **Remains a hard stop**, unchanged from the interactive path — autopilot cannot fabricate a spec. |
| Step 1 | scope check — spec covers 2+ independent subsystems | `checkpoint` | Auto-confirm; proceed with the single plan as scoped rather than splitting it. Non-destructive — a human can always ask for a split on a later run. |
| 2 | "critical blocker" that makes planning impossible | `checkpoint` / `open_text` | A requirements conflict always remains a hard stop and returns to refinement. Otherwise, if a reasonable inference consistent with the spec resolves it, do so, record it as an Assumption prefixed `[autopilot best-guess]` (`open_text`), and continue. If it genuinely cannot be inferred — e.g. the spec is self-contradictory or unreadable — **remains a hard stop**. |
| 4 | existing `<TICKET>-plan.md` collision | `checkpoint` | See the Hard-stop exception above: write to the next free `-v2`/`-v3`/… suffix. Never overwrite, never abort. |
| 4.5 | per-gap `AskUserQuestion` (Approach, Change surface, Data/migration, Contract compatibility, Placement/pattern, Missing prerequisite, Sequencing/rollout) | `askUserQuestion` | Choose the option labeled `(Recommended)`. Never choose the filler `"Proceed with the recommended assumption"` — a substantive recommended option is always present per this skill's own question-construction rule, so autopilot always has a concrete one to pick. For an `Approach` gap specifically, still print the full tradeoff block, then pick the option named in its `Recommendation:` line. |
| 4.5 | material spec gap (`Spec gap` question) | `askUserQuestion` | Choose the option labeled `(Recommended)`; never choose `"Needs PM — route to close-the-gaps"`. Mark the plan's Decision Log answer `_(autopilot spec-gap)_`, and list it separately in the end-of-run summary. |
| 4.5 | genuinely open-ended gap (no fixed option set) | `open_text` | Answer with your own best inference from Step 4's investigation, prefixed `[autopilot best-guess]`. |
| 5 | a step's regression baseline already failing before this step's changes | `checkpoint` | Do not attempt to fix an unrelated pre-existing failure. Record it in that step's Codebase Gaps/Risks and in the decision log, then continue with the progression test only. A suite that is not runnable locally (Step 5 point 6) is not a failure: record `regression not runnable locally — <reason>` and continue, with no checkpoint. |
| 6 | "Optional — independent review" offer | `checkpoint` | Decline. There is no human to ask; the run completes without the extra review pass, and the final summary notes that it was skipped. |

Only the Step 4.5 entries carry a `(Recommended)` label in this skill; the three rows marked "Remains a hard stop" are unaffected by `--autopilot` — they require information no autopilot heuristic can safely invent, exactly as in the interactive path.

At the end of an autopilot run, print a short human-readable summary of every auto-resolved decision — including which hard stop halted it, if any — and the log file's path, so someone can audit the run afterward.

---

