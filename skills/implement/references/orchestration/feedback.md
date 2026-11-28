## Feedback retrospective

After the existing feedback finalization has settled (saved or verified unavailable),
run `node "<base>/scripts/implementation-cost.mjs" --state "<state-path>"` once,
before the terminal summary or delivery offer. Cost estimation is enabled by
default; `MIW_ESTIMATE_COST=0` in the host environment disables it. The helper reads
the existing transcript ZIP, never collects transcripts or rewrites the archive,
and shows calculation progress under Finalizing. A saved partial/unavailable
outcome is reused on resume. Allow up to ten seconds; failures, disabled status,
and missing telemetry never change completion or delivery eligibility. Do not
retry collection, reopen feedback, or seek approval because cost is unavailable.
For eligible retry-limit stops, run the same helper after feedback settles and
retain the stopped status. If feedback could not persist its finalization receipt,
skip cost accounting; do not add a new finalization gate to obtain it.

This is part of session finalization, after final approval and before the completion summary or optional delivery. The implementation checkpoint stays terminal for artifact integrity; the HTML shows **Finalizing session** until feedback settles. It does not reopen package approval or add a review cycle.

Run it only after either:

- Completion has checkpointed `status: Complete` and regenerated the dashboard; or
- Stop has checkpointed `status: Stopped` for an exhausted fix, review, or replan limit and regenerated the dashboard.

Read [../feedback-on-session/SKILL.md](../../../feedback-on-session/SKILL.md) and `<base>/references/feedback.md` in full and follow their automatic integration mode inline. This is the single feedback step: review the available conversation on every eligible run and combine it with the existing artifact retrospective. The deterministic feedback writer owns eligibility validation, captured plugin version, Audit-log counting, formatting, and idempotent updates of both feedback files; the model owns evidence-backed findings and share-safe paraphrasing.

Include the final run-local dashboard HTML alongside the state/Audit evidence for the skill's source-only inspection, reusing this same pass and any already-required retrospective delegate. Keep source findings and unrendered visual risks distinct. Missing HTML is a feedback evidence limitation, not a new workflow blocker.

The parent owns inspection, source retrieval and the combined save through direct writer calls. Delegate only the required artifact diagnosis to one fresh general-purpose agent; it returns analysis, not another feedback run or report write. Do not offload this step to a fork or permit self-analysis when independent dispatch is required. Settle and record feedback before `deliver.mjs offer` or its question. A delivery answer performs only the requested delivery action; it never starts another retrospective or report rewrite.

Follow the controller's terminal `next_action.type: feedback` before showing the summary or asking about delivery. Keep checkpoint output intact, including `next_action`, `fields.start_time` and `feedbackContext`; never truncate or reshape helper JSON. Use `write-feedback.mjs inspect --compact` for discovery. After saving and reading the complete report, if automatic finalization is still missing, use `write-feedback.mjs finalize --state <state-path> --transcript <current-session-jsonl>` (with `--limit-stop` for an eligible stop). Repair the specific missing proof or I/O error it returns, then resume the already-authorized delivery preparation without asking again. The scoped hooks require a current combined report and any required retrospective dispatch, or an unavailable outcome backed by an actual technical failure in this run. Saying the step was not performed or no friction occurred cannot finish it. Repair input/schema errors; use the reference's evidenced-failure procedure only for a technical blocker, and accurately distinguish its failure receipt from a saved feedback report. Each session finding includes a suggested next step, owner, verification and confidence; these are proposals only.

Follow that reference's **Explain the feedback to the user** guidance for progress messages and the terminal summary. Describe the purpose and findings in plain language; do not narrate internal writer classification or call the user's run "minimal" or "non-minimal" in chat.

Use the writer's `inspect` result to decide whether artifact root-cause analysis is needed. When `analysisRequired` is true (extra rounds, recorded in-workflow guardrails, hook interventions or repeated agent waits), the fresh retrospective Agent call is required before preparing or writing analysis, even if the cause seems clear from evidence already in this session. Work from that subagent's structured diagnosis and combine it with conversation findings in one report; do not run overlapping analyses. When false, review the conversation without a retrospective Agent call. Write the provisional combined report through the writer before the single session-feedback invitation. An unanswered invitation, an interrupted conversation, or a feedback-file write failure leaves the workflow terminal and does not delay its summary or delivery offer. Later input updates the same run's report.

The feedback file is local working data. Never upload, submit, email, or post it, and never edit the installed make-it-work skills in response to one run's recommendation. The user decides whether to review and share it later. Under `autopilot`, do not ask the retrospective's optional clarification questions: preserve material uncertainty in the writer input's `openQuestions` and finish the terminal report.

---

