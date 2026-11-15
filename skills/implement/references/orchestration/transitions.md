## Transition table

Every transition is listed here. `—` means the outcome cannot occur at that level. In Lightweight mode, the `review (Lightweight)` rows replace the `FIX_REQUIRED`, `REPLAN_REQUIRED`, and `HUMAN_DECISION` review rows; the review limit and `CLEAN` rows apply to both modes. Escalation is never asked, at any level.

For `autopilot`, use the Autonomous column only where it requires no human decision. The Autopilot mode policy overrides all rows that say to ask, pause, accept a manual walkthrough, or record a `Route: human` decision: checkpoint a `Stopped` state instead. Clear outcomes that already route automatically in Autonomous (execution pass, related/unrelated gate classification, fix/replan loops, and clean review) continue unattended.

| Phase | Outcome | Guided | Autonomous |
| --- | --- | --- | --- |
| context-check | complete | resolve existing spec/plan artifacts, then start the selected phase | resolve existing spec/plan artifacts, then start the selected phase |
| context-check | absent or partial go-deep context | ticket-scoped discovery, then continue | ticket-scoped discovery, then continue |
| context-check | mandatory context unavailable or essential fact unresolved | stop with concrete blocker | stop with concrete blocker |
| close-the-gaps | spec saved | spec-approval (adaptive runs: after Risk assessment) | plan, or lightweight when `mode: lightweight` |
| close-the-gaps | questions prepared for the PM (draft, sent, unconfirmed, or offline fallback) | pause (Slack refinement pending) | pause (Slack refinement pending) |
| spec-approval / plan-approval | approve | next phase (from spec-approval: lightweight or plan by `mode`) | — |
| spec-approval | approve with the other mode (adaptive runs) | lightweight or plan by the switched `mode` | — |
| spec-approval / plan-approval | redo | re-run the phase with the notes | — |
| spec-approval / plan-approval | stop | stop | — |
| plan | plan saved | plan-approval | execute |
| lightweight | `IMPLEMENTED` | review, unless reassessment escalates | same as Guided |
| lightweight | blocked | escalate when reassessment finds risk above Low; else stop with the reason | same as Guided |
| plan / fix-plan | `Blocked:` pre-existing failing regression | ask: call it out and proceed / stop | ask: call it out and proceed / stop |
| execute | `PASSED` | review | review |
| execute | `VERIFIED_MANUALLY` (explicit all-manual policy and complete evidence) | review, `execution: verified-manually`, `gate: none` | same as Guided, including Autopilot when the manual policy was explicitly authorized |
| execute | `GUARDRAIL` or `RETRY_LIMIT` | pause with the stop report; ask: replan (offered only while `replans_used < 2`) / edit the plan or spec by hand, then resume execute / stop | replan if `replans_used < 2`, else stop |
| execute | `GATE_FAILED`, any related failure, `fix_cycle < 3` | confirm the split, then fix-plan (gate) | fix-plan (gate) |
| execute | `GATE_FAILED`, any related failure, `fix_cycle = 3` | stop (limit reached) | stop (limit reached) |
| execute | `GATE_FAILED`, no related failure | review | review |
| execute | `GATE_NO_RESULT` | ask: continue to review with the plan's manual `## Test Plan` walkthrough as the regression check (`gate: none`) / stop | same as Guided |
| execute | `EXECUTE_STOPPED` | pause, showing execute's message | pause, showing execute's message |
| review | `review_cycle = 4` and not `CLEAN` | stop (review limit reached) | stop (review limit reached) |
| review | `CLEAN` | final-sync | final-sync |
| review | `FIX_REQUIRED` with an early-replan trigger (see Early replan), `replans_used < 2` — checked before the two plain `FIX_REQUIRED` rows below, at any `fix_cycle` | ask: replan (recommended) / continue patching (fix-plan (review)) / stop | replan, reason logged in the audit row |
| review | `FIX_REQUIRED` with an early-replan trigger, `replans_used = 2` | the plain `FIX_REQUIRED` rows below, with the audit row noting the replan limit was reached | same as Guided |
| review | `FIX_REQUIRED`, `fix_cycle < 3` | fix-plan (review) | fix-plan (review) |
| review | `FIX_REQUIRED`, `fix_cycle = 3` | stop (limit reached) | stop (limit reached) |
| review | `REPLAN_REQUIRED` | first ask about any `Route: human` findings (record under Decided findings); then replan if `replans_used < 2`, else stop | same as Guided |
| review | `HUMAN_DECISION` | ask about each `Route: human` finding and record each decision under Decided findings; then fix-plan (review) with the answers — `fix_cycle` limit applies | same as Guided |
| review (Lightweight) | `FIX_REQUIRED` without an early-replan trigger, `fix_cycle < 3` | lightweight (fix), unless reassessment escalates | same as Guided |
| review (Lightweight) | `FIX_REQUIRED` without an early-replan trigger, `fix_cycle = 3` | stop (limit reached) | stop (limit reached) |
| review (Lightweight) | `FIX_REQUIRED` with an early-replan trigger, or `REPLAN_REQUIRED` | first ask about any `Route: human` findings (record under Decided findings); then escalate | same as Guided |
| review (Lightweight) | `HUMAN_DECISION` | ask about each `Route: human` finding and record each decision under Decided findings; then escalate | same as Guided |
| fix-plan | amend-mode return carries `Recommend replan:`, `replans_used < 2` — checked before the two rows below | ask: replan (recommended) / continue patching (execute the new steps, or review if none) / stop | replan, reason logged in the audit row |
| fix-plan | amend-mode return carries `Recommend replan:`, `replans_used = 2` | the two rows below, with the audit row noting the replan limit was reached | same as Guided |
| fix-plan | steps added | execute | execute |
| fix-plan | no steps added (every finding accepted as-is) | review | review |
| final-sync | done | final-approval for new runs; otherwise complete | final-approval for new runs; otherwise complete |
| final-approval | package current and approved (Guided), or current (Autonomous/Autopilot) | complete | complete |

**Early replan** — a fix-plan round is the wrong tool when a fix keeps breaking its own code path, so do not wait for `fix_cycle` to run out. The trigger is any of: a `FIX_REQUIRED` review where any finding is a repeat offender (its `Introduced by fix of:` names an earlier finding or fix step, i.e. is not `none`); a `FIX_REQUIRED` review whose findings land in the same function or file region as the immediately preceding review's (compare against the region list in the previous `→ fix-plan` entry row, see Fix); or a `Recommend replan:` line in `plan-the-work`'s amend-mode return report. The first two are checked when the review outcome is read; the third immediately after fix-plan returns, before its steps are sized, counted, or dispatched (see Fix). Guided asks with `AskUserQuestion` — **Replan (Recommended)** / **Continue patching** / **Stop** — showing the evidence; Autonomous replans without asking. In both, the Audit-log row for the transition states the trigger (the finding and its `Introduced by fix of:` value, the repeated region, or the `Recommend replan:` text). Pass that same evidence to the replan by appending it under a `## Repeat-offender evidence` heading to its feedback file (the review report, or `execute_report` when the fix source was a gate failure). Only while `replans_used < 2`; at the limit, fall back to the plain fix-plan rows and write "replan limit reached" in the row that enters fix-plan (or, after a `Recommend replan:`, in the row that proceeds with its steps).

**Replan** — `replans_used += 1`; `plan_version += 1`; `review_cycle = 0`; `fix_cycle = 0`; `fix_plan_dispatch` back to `none`; `execution` and `review` back to `not-started`; then Plan in replan mode, passing the previous plan path, one feedback path — `execute_report` after an execute stop, or the review report after `REPLAN_REQUIRED` or an early replan (whose `Route: fix` findings are constraints for the new plan too) — and the Decided findings list, every entry of which is also a constraint. The transition row back to `plan` carries a concise summary of the failed assumption or design reason, preserving enough causal evidence for the terminal feedback retrospective even if a later report is overwritten. In Guided the new plan goes through plan approval again, and `execute` will ask for the execution mode again, since each new plan version starts with it unchosen.

**Stop** — set `status: Stopped` when a limit or cap was reached or the user chose to stop, or `status: Paused` when the run is waiting on the user. Set `pause_reason` and complete the checkpoint and dashboard regeneration first. When the stop was specifically caused by exhausting the fix, review, or replan limit, run Feedback retrospective below before showing the terminal stop summary; other stops and every pause are ineligible. Then tell the user where the run stopped, why, and what to do before running `implement` again. A resumed Paused run continues at its saved `phase`.

---

