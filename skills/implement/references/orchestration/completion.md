## Completion

For a run with `final_package_version: 1`, reach this section only after the Final approval package check succeeded. Set `status: Complete` and `phase: complete`, log the transition, and regenerate the dashboard. Then run Feedback retrospective, including automatic `feedback-on-session`. Save and invite input without waiting for a reply, then print a concise summary:

Begin the summary with **Workflow: Complete** and
**Assurance: <assurance_summary.text>** from the successful package check. Keep
its pending/unknown review coverage, pending browser checks, missing acceptance
evidence, unavailable gates, open nits and known regressions near the top.
`Recorded checks complete` covers recorded checks only; it is not a release,
merge, deployment or delivery-approval claim. For an older checker without this
summary, explicitly retain its recorded scope/verification limits instead of
inventing a global assurance label.

When the package check returns `verification_summary`, show
**Acceptance verification: <verification_summary.text>** separately. List
each pending criterion and its scenarios' recorded reason/verification needed.
Use `Partially verified` when some criteria have passing evidence and others
remain pending; use `Pending verification` when none are verified. A criterion
counts as verified only when all its mapped scenarios have passing automated or
manual evidence. Do not count traceability rows as separate criteria, infer AC
coverage from the suite result, or invent a successful check to clear a pending
item. This is presentation, not a new workflow state, approval or release gate;
existing manual-policy completion requirements still apply. A missing summary
(legacy/Lightweight/no AC ledger) cannot establish full AC verification.

- **Mode** — for an adaptive run: the mode, assessed risk and its source, rationale, and each escalation with its reason. Omit for older runs.
- **Implemented** — the plan's `## What This Changes`, in a sentence or two; with no plan, the Lightweight report's `## Summary`.
- **Validation** — in Lightweight mode, "Lightweight — no regression gate; verified by independent review", plus the checks the report lists. Otherwise, from `execute`'s final report: steps completed, automated suites actually run, and manual evidence where selected. For `VERIFIED_MANUALLY`, state "Manual verification completed; automated regression unavailable" with `gate: none`, never an automated PASS. Include readiness/setup changes and retained coverage limitations.
  Preserve the package's `validation_notes`, including unresolved introduced diagnostics and the evidence for any accepted limitation. Existing repo-wide failures must not obscure a new error in changed files.
  Retain inherited branch build failures even when outside ticket fix scope, unknown destination provenance, actual compiler exits/raw-output locators and unperformed startup failures. Report passing emitted-JavaScript tests separately from compilation, following [the compilation evidence contract](../compilation-evidence.md).
- **Testing** — when `testing_summary` has missing-strategy repos, use the checked package's same summary: "Strategy missing for `<repo>`; used manual verification. Run `/make-it-work:define-test-strategy` separately." Substitute the actual recorded method (existing automated tests, automated tests and manual verification, or independent review). Group repos by method and recommend the command once. This informational note is also in the green dashboard completion panel before its delivery disclaimer; no prompt, extra card or onboarding invocation. Omit for no missing strategies.
- **Known regressions** — each one, marked unrelated, stating plainly that they were documented, not fixed. Omit when there are none.
- **Review** — the verdict, how many review and fix cycles it took, and any Minor findings left unfixed.
- **Review scope and browser verification** — report the package check's `review_scope` and `ui_verification`. Name delivered paths with unknown or partial review coverage and pending browser checks. A clean review applies only to its recorded scope; approval to deliver additional work does not establish review coverage. Final packaging compares exact per-path diffs, including earlier changes in the same file. Scope gaps remain visible in the delivery preview and generated PR description; they do not create a new approval gate.
- **Review qualifications and maintenance** — preserve every `review_scope[].limitations` entry (skimmed, partially reviewed, or not reviewed), including earlier branch work. Matching diff hashes establish snapshot coverage, not review depth or requirements verification. Retain blocked test-map assessments and their reasons in assurance/completion text. Neither an advisory verdict nor successful tests waive required context maintenance.
- **Final package** — for a new run, its path and whether Guided approval was recorded; omit for older runs.
- **Context updated** — every file changed by `close-the-gaps`, `plan-the-work`, and the final sync, or "none".
- **Recommended follow-up** — only when Context discoveries or stage reports identify broader documentation gaps left outside this ticket's sync: recommend running `/make-it-work:go-deep` separately in each affected repo, naming the concrete reason and suggesting "Repair existing docs" for an existing knowledge base. This is an informational recommendation; do not launch it, ask to launch it, or delay Completion. Omit when no such gaps remain.
- **Ticket updates** — when a tracker destination was supplied/configured, report confirmed publications and any local-only, skipped, deferred, unsupported, failed or uncertain operations from the publication journal.
- **Replans used** — the count.
- **Workflow feedback** — a brief result and a **Save this session's feedback** link to the writer's `sessionOutputPath` (`make-it-work/<TICKET>/workflow-feedback.md`), following the feedback reference's **Explain the feedback to the user** guidance: say whether extra rounds were needed and, when analyzed, summarize the main cause and suggested improvement or the conclusion that no workflow change is recommended. Preserve material uncertainty and do not imply suggestions were applied. The export is a post-completion companion beside the approved package, not a change to its approval. If analysis or saving failed, state that limitation instead of claiming success.
- **Elapsed time (includes waits and pauses)** — if `start_time` is a real captured timestamp (not `none`), the plain delta between it and this transition's own just-logged timestamp, as a human-readable duration (e.g. "2h 14m") — convert both ISO timestamps to epoch seconds via the host's `date` utility and subtract; this is a duration, not a display timestamp, so no timezone conversion is needed. If `start_time` is `none` (this run began before real start-timestamp capture existed), state "Elapsed: unknown — no real start timestamp was captured for this run" instead of estimating or backfilling one. State that active processing time is not measured. Do not subtract guessed idle time or present checkpoint intervals as active work.
- **Cost** — not shown; no tool surfaces token-usage or billing data to this session. Check your own client's `/usage` command instead.

After the summary, state: "Implementation is complete; code changes remain local and uncommitted. Ticket artifacts are in `make-it-work/<TICKET>/`; delete that directory yourself when you no longer need them." On a separate line, state: "Workflow feedback is kept separately in `make-it-work/implement-feedback.md`. It is cumulative across runs; keep it if you plan to review or share it." If this run's feedback write failed, say so in the summary and phrase this note as the usual location rather than claiming the run was recorded. These notes are not questions; never delete anything.

Before the terminal summary and optional delivery offer, attach the completed HTML dashboard to Jira once if authorized and supported, following the publication reference's final-dashboard procedure. Publish the completion comment with review and verification summaries if authorized, after Complete has been checkpointed. Missing upload support uses the publication reference's authorized comment fallback for accepted artifacts; it does not suppress these summaries. At significant workflow stops, publish only the concise actionable blocker if authorized. Follow the publication reference for partial failures; its outcome never changes implementation status or authorizes delivery.

Finally, for every completed run with `final_package_version: 1`, run `node "<base>/scripts/deliver.mjs" offer --root <artifact-root> --state <state-path>`, then call `AskUserQuestion` (`multiSelect: false`): “Prepare delivery for this completed run?” with **Prepare delivery** / **Not now**. Ask even in Autopilot. Record each explicit answer through the workflow-decision checkpoint with `resume: transparent` before acting on it. This is an offer after Completion: `status: Complete` and `phase: complete` stay unchanged. **Not now** records `decline` with the same helper/root/state and refreshes only the delivery display; an unanswered question remains pending, never auto-declined. Do not select an answer on the user's behalf or ask again for this completed invocation. Older runs without a final package cannot use `deliver`, so omit this question for them.

**Continue after Prepare delivery:** this selection explicitly opts in to delivery preparation. Read [../deliver/SKILL.md](../../../deliver/SKILL.md) and follow it inline in this same session: run its `deliver.mjs prepare` step, show the entire delivery preview and plan hash, then wait for **Deliver this exact plan** / **Stop**. Do not ask for preparation permission again or end by telling the user to invoke `/make-it-work:deliver` manually. The skill's `disable-model-invocation: true` setting does not prevent reading and following its instructions inline; do not rely on the Skill tool to invoke it. If preparation fails, report the actual command error and blocker without rebuilding the package or starting delivery execution. Opt-in never approves the exact delivery plan: no commit, push, or PR action may occur until that separate approval. The shared dashboard observes delivery through its journal and keeps refreshing while the choice, approval or delivery is pending.

---


For `change_assessment_version: 1`, include both change ratings, completeness, deciding rationale, exact snapshot and Markdown/JSON report links from the package. If unavailable, disclose the failure reason and label any previous report stale history; never repeat old ratings as current.

Preserve each returned `validation_notes` qualification in the final approval prompt and completion summary, including suspected baseline attribution, unrun checks and unobserved acceptance behavior. Reuse the package checker’s assurance text without strengthening it. “CLEAN” is a routing outcome, not proof that every criterion passed; retain “Approve with nits” and open advisories. If risk was reassessed during Lightweight implementation, state the recorded rationale and remaining limits rather than reverting to the initial small-change description.
