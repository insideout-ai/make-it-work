# Implement workflow feedback

Use this reference with [../../feedback-on-session/SKILL.md](../../feedback-on-session/SKILL.md) only when an `implement` run has already reached an eligible terminal state. Together they produce one combined session review and artifact retrospective for improving make-it-work. The report is local, is not project documentation and is never submitted automatically.

## Eligibility and timing

Update `make-it-work/implement-feedback.md` only for:

- every run that has checkpointed `status: Complete`; and
- a run that has checkpointed `status: Stopped` because the fix, review, or replan limit was exhausted (in execute, review, fix-plan, or lightweight).

Do not write an entry for a pause, user-requested stop, branch/context/setup failure, missing tool, or other non-limit stop. Never backfill runs that reached a terminal state before this feedback behavior existed.

The terminal state-file write and dashboard regeneration happen first. Feedback failure or unanswered feedback questions never re-open, downgrade, or block the implementation run.

The controller returns `next_action.type: feedback` at eligible terminal checkpoints, including replay. Follow it before the terminal summary or delivery question. Run the checkpoint command on its own and keep its structured output intact; do not pipe it through a projection that prints only phase/status. The scoped Stop and PreToolUse hooks detect a missing combined report for the current run and hold the terminal summary or delivery question until feedback is saved or explicitly reported unavailable. They do not change implementation status or wait for feedback answers. A saved report is bound to the terminal workflow boundary so an older run or an earlier retry-limit report cannot satisfy a later terminal checkpoint. Subsequent delivery decisions and informational notes do not invalidate that binding or trigger another retrospective.

A runtime-verified retrospective delegate launched after the terminal checkpoint may be awaited normally. Its completion notification restores the requirement to save the report or disclose unavailability; an older implementation/review delegate does not satisfy that wait.

Unavailability requires an actual technical failure, not a decision to omit the retrospective. First inspect the run and perform the required work. Run writer commands directly in separate Bash calls using the resolved absolute writer path and `--state` path; do not hide exit status with pipelines or shell variables. A failed `inspect` or `write` emits a structured `feedbackFailure: technical` record only for concrete I/O or retained-evidence failures. Missing/invalid model-authored input and schema errors must be repaired; they do not qualify. A failed retrospective Agent tool call qualifies only after this run's successful `inspect` returned `analysisRequired: true`; include this reference's resolved absolute path in that Agent prompt so the runtime can identify the dispatch. Agent-authored failure prose is not a tool failure.

After a qualifying failure, use the failed tool call's actual ID and this session's JSONL transcript path (the terminal hook supplies it when holding completion):

```sh
node "<base>/scripts/write-feedback.mjs" unavailable --state "<absolute-state-path>" --transcript "<session-jsonl-path>" --failure-id "<failed-tool-call-id>" --reason "<specific share-safe technical limitation>"
```

Add `--limit-stop` only for an eligible limit stop. The helper and terminal hook verify runtime call/result evidence after the current terminal checkpoint; a reason alone, a replay, or an earlier run cannot release the gate. It saves only `feedback-unavailable.json` when possible and returns `reportSaved: false`, `receiptSaved` and `receiptPath`. Neither state nor approved package changes. If receipt saving also fails, the verified tool outcome still permits completion with an explicit disclosure. Do not retry indefinitely or seek permission for the required retrospective. Tell the user what failed and whether only a failure receipt was saved; never claim that receipt is the combined report or that feedback files were written. The implementation stays terminal.

## Explain the feedback to the user

Use plain language in chat; keep terms such as `minimal`, `inspect`, writer classification and dispatch gates in internal reasoning and artifacts. Before inspecting a completed run, say: "Implementation is complete. I’m recording workflow feedback and checking whether any extra rounds need analysis." For an eligible limit stop, say: "The run has stopped at its retry limit. I’m reviewing what led to the extra rounds and recording possible workflow improvements." If extra-round analysis is needed, explain: "I’m reviewing why extra rounds were needed and whether the workflow could prevent them next time." For a hook-only review, say: "Hook interruptions or repeated waits were recorded. I’m reviewing whether the workflow could handle them better." For a guardrail-only review, say: "A guardrail intervention was recorded. I’m reviewing its resolution and whether it suggests a workflow improvement."

Include the feedback result in the terminal chat summary for both completed runs and eligible limit stops, not just the file location:

- With no fix, replan, escalation, recorded guardrail or hook interventions, or repeated agent waits, say that no extra rounds were needed, then summarize any supported conversation findings or say none were found. A compact artifact note alone does not establish absence of session friction.
- For recorded hook interventions or repeated agent waits, summarize the observed counts and releases separately from implementation retries. A single normal agent wait is informational and does not trigger analysis. A release means the hook later permitted continuation, not that a user approved anything or the underlying cause was fixed.
- For recorded guardrail interventions, summarize the stop and resolution neutrally, even if no extra rounds occurred. A safeguard catching an ambiguity is not automatically a failure.
- After detailed analysis, give a brief account of why extra rounds were needed and the main suggested workflow improvement, if supported. Distinguish a suggestion from an applied change. If no workflow change is recommended, say so; preserve material uncertainty rather than presenting a tentative cause as fact.
- Link the writer's `sessionOutputPath` (`make-it-work/<TICKET>/workflow-feedback.md`) as **Save this session's feedback** for the full saved details. The cumulative `make-it-work/implement-feedback.md` remains available locally. If analysis or saving failed, state what could not be completed rather than claiming feedback was saved. Keep the implementation's completed or stopped status explicit.
- On unavailability, link only `receiptPath` when `receiptSaved` is true and label it **Feedback failure receipt**. Otherwise state that no durable receipt could be saved. Neither case is a saved retrospective; preserve any partial-write limitation from the failed operation.

Summarize only this run's feedback, following the share-safe rules below. Do not paste the full retrospective or imply its recommendations have been applied. Keep the existing terminal summary concise.

## Session export beside the final package

Every successful writer call also saves `make-it-work/<TICKET>/workflow-feedback.md` and returns `sessionOutputPath`. This standalone Markdown file contains the standard header and only the current run's sanitized feedback block, including the combined session review when supplied, never previous runs or user-authored cumulative-file notes. User-input updates replace the session export as well as updating the cumulative entry. Do not create an additional session-reviews report for the same automatic review.

The export lives beside the final approval package as a post-completion companion. Do not change the approved package, its manifest, hash or approval to add feedback: the retrospective occurs after Completion. Eligible limit stops also get an export even when no final package exists. The export is local and uncommitted; it is removed if the user later deletes the ticket artifact folder, while the cumulative file remains separate. Share the session export only, never the implementation package, transcript or cumulative feedback file.

Sharing uses a manual download-and-email flow. When detailed feedback has been saved, invite the user to review the linked session export, save/download it, and attach only that file to an email to InsideOut AI at [insideoutaitech@gmail.com](mailto:insideoutaitech@gmail.com). Use a generic suggested subject such as "make-it-work workflow feedback" without ticket or customer identifiers. For example: "To share this feedback with InsideOut AI, review and save the session report, then email it as an attachment to insideoutaitech@gmail.com. Sharing is optional." Do not launch an email application, attach files, send a message or claim submission. The user chooses whether to send; no additional sharing approval prompt or wait is needed. An email sent by the user can identify the sender even though the report itself is sanitized.

## Stable run identity and safe updates

The feedback writer uses the state file's real `start_time` verbatim as the run ID and renders the immutable `plugin_version` captured when the run began. A missing or `none` start time makes the run ineligible: report its error, but leave the terminal workflow state unchanged. A legacy state without `plugin_version` is labelled `not captured (legacy run)`; never backfill it from the currently installed plugin.

On first creation, begin the file exactly with:

```markdown
# Implement workflow feedback

Schema: 1
Reporter: Anonymous

> Review this file before sharing. It may contain AI-generated inferences, and it is never uploaded automatically.
```

Delimit each run with exact markers:

```markdown
<!-- run:<start_time> -->
...one run block...
<!-- /run:<start_time> -->
```

The writer creates the header, formats the run block, and updates it atomically. It replaces only a unique, well-formed matching marker pair; otherwise it appends without altering existing text. It reports malformed or duplicate matching markers as a warning for the terminal summary.

## Runtime hook evidence

The startup hook automatically records supported PreToolUse denials, Stop holds,
permitted background-agent waits and later releases in the run-local
`make-it-work/<TICKET>/hook-events.jsonl`. The journal contains only fixed event
kinds, phase, timestamps and opaque deduplication identifiers. It never records
chat, hook reasons, source snippets, paths or raw agent IDs. The ordinary
post-initialization dashboard reminder is expected startup behavior and is not
an intervention. No state/audit mutation or human approval is inferred.

Repeated invocations of the same hook event count once; distinct rejections in
one episode retain their occurrence count. A later allowed call of the same hook
or a change of phase/condition closes that episode. A successful tool call does
not resolve a Stop hold. One permitted wait for a delegated task is normal;
multiple observations of the same wait require analysis. Different delegated
tasks are separate waits. A recorded release is evidence only that enforcement
changed, not a diagnosis or proof that an underlying defect was fixed.

The writer reads this journal automatically, bounds observations by the run's
start and terminal checkpoint, and keeps hook interruptions and waits separate
from Fix/Replan/Escalation counts. A missing journal is compatible with older
runs; do not backfill it from remembered chat. A malformed or unreadable journal
makes feedback unavailable rather than silently producing a clean report.
Hook recording errors are reported to the session without changing enforcement
or implementation status. If recording failed, report the evidence limitation.

## Decide whether the path was minimal

Resolve `<base>` to this skill's directory. After the terminal checkpoint and dashboard regeneration, inspect the state with:

```sh
node "<base>/scripts/write-feedback.mjs" inspect --state "make-it-work/<TICKET>/<TICKET>-state.md"
```

For an exhausted fix, review, or replan limit stop, also pass `--limit-stop`; never pass it for any other stop. The script rejects ineligible state. Its JSON summary supplies `minimal`, `analysisRequired`, the counts, the ordered `events` (`kind` and Audit-log `row`), and separate `guardrails` (stop `row`, `resolutionRow` or null, known source/channel). It also supplies `hookInterventions`, `agentWaits` and `hookAnalysis` (intervention episodes plus repeated waits). Each episode includes its opaque `id`, phase, kind, occurrence count and `resolvedAt` or null. It reads the Audit log chronologically; never substitute the live counters, which can reset after replanning.

The writer counts transitions into `fix-plan` (including zero-step rounds) and, for Lightweight runs, `review`/`final-approval` → `lightweight` fix rounds as `Fix`; explicit replans from execute/review/fix-plan back to plan as `Replan`; any row whose outcome starts with `Escalation:` (Lightweight → TDD) as `Escalation`, never as a Replan; and review-cycle rows (falling back to transitions into review). A run with no fix, replan, or escalation event is minimal, even if an approval was redone or execution retried internally. Adaptive runs (`adaptive_version: 1`) also get `Mode: <mode> (<risk> risk, <assessed|user>)`, `Escalations: <n>`, `Stages skipped:` and `Elapsed:` lines (the risk rationale stays in the state file, since it may name project terms); older runs do not.

For `analysisRequired: false`, no artifact root-cause analysis is needed. Review the available conversation using feedback-on-session, pass the read-only input check below, then save its structured review alongside the compact artifact block:

```sh
node "<base>/scripts/write-feedback.mjs" write --state "make-it-work/<TICKET>/<TICKET>-state.md" --session-review "<temporary-session-review.json>"
```

Do not dispatch artifact retrospective analysis when `analysisRequired` is false; conversation review and its single invitation still apply. `minimal` measures only the path through Fix/Replan/Escalation rounds; it does not classify conversation quality. A guardrail does not change those counts or imply a failed run. A recorded guardrail, hook intervention or repeated wait sets `analysisRequired: true` even on a minimal path. One ordinary agent wait does not. Counts and resolution metadata are derived by the writer, not supplied by the model.

## Investigate extra rounds, guardrails or hook interventions

The `inspect` result's `analysisRequired: true` is a dispatch gate: call the Agent tool once to start a fresh general-purpose retrospective subagent **before** drafting analysis JSON or calling `write --analysis`. Evidence already read in this session, an apparently obvious cause, or a nearly finished terminal report does not waive this gate. The orchestrator may inspect and sanitize the returned JSON, but must not replace the subagent's diagnosis with its own. If dispatch is unavailable or fails, report that the feedback retrospective could not be completed; keep the workflow's terminal state and do not write an invented non-minimal diagnosis.

Give that subagent this reference and the minimum available evidence needed from:

- the state file and its complete Audit log;
- the refined spec;
- every version of the plan, including amended fix steps and `Design reset` notes;
- the saved execute report, execution journal/history and any Lightweight implementation report; and
- the review report; and
- versioned `review-<n>.md` and `review-<n>.evidence.json` archives beside the review handoffs, when present; and
- the run-local hook journal and the writer’s episode summary when hook interruptions or repeated waits were recorded.

Reports may have been overwritten by later cycles. Treat the Audit-log trigger summaries, fix-step root-cause text, and versioned plan design resets as the durable evidence for earlier rounds. Inspect the final diff or code only when those artifacts cannot establish whether execution departed from an adequate plan.

Prefer retained review archives to the current overwritten report for earlier cycles. If full transcript evidence is available, supply the retrospective agent the relevant runtime excerpts and actual locators, clearly separated from artifact evidence. Otherwise disclose the missing history. Reconcile diagnoses against the instructions actually loaded and passed to each delegate. Classify policy-driven scope refreshes separately from defect-fixing rounds, and check when final-sync gaps were first known. Do not attribute a missed sibling to a missing rule when that rule was already required, or claim that a fixed number of reviews establishes quality. Missing earlier evidence limits attribution; it does not license a confident cause.

For each fix, replan, or escalation event, determine:

1. The immediate trigger, paraphrased without project identifiers.
2. The underlying cause category: `refinement gap`, `planning gap`, `execution deviation`, `review gap`, `orchestration issue`, `project-context gap`, `unavoidable`, or `unclear`.
3. The earliest workflow stage where enough information existed to prevent it.
4. Preventability: `likely`, `partial`, `unavoidable`, or `unclear`.
5. The owning workflow skill, if any.
6. One specific, generalizable skill improvement and its confidence (`high`, `medium`, or `low`), or `No workflow change recommended` when the cause was project-specific or unavoidable.

For every event, return a `basis` with the requirement and locator, evidence known during implementation, observed action, and primary versus contributing causes. Explicit behavior plus a known unaddressed implementation mismatch normally attributes to execution (`implement` for Lightweight), even when refinement could have described the source better. A missing technical mechanism is not itself a missing requirement. Explain contrary evidence and preserve uncertainty rather than changing ownership because the spec could have contained more implementation detail.

Normal agent waits and harness status prompts alone do not justify communication findings. Compare actual progress messages and any unmet obligation or human request. Preserve review qualifications and mandatory maintenance gaps; neither CLEAN nor advisory severity upgrades them to completed work.

For each recorded guardrail intervention, separately paraphrase the stop and
resolution, describe any evidence-supported lesson (or `No workflow change
recommended`), and give confidence. Do not invent a resolution where its row is
null or treat correct safeguard behavior as a workflow defect. Only structured
execution checkpoints recorded within the terminal workflow boundary count;
older unstructured history is not guessed from prose. Conversation findings
are recorded separately in the session review and never invented as Audit-log events.

For every entry in `hookAnalysis`, paraphrase the interruption or repeated wait,
its observed release (or lack of one), an evidence-supported lesson and confidence.
Use `hooks: [{id, trigger, resolution, lesson, confidence}]` in the analysis JSON,
matching the exact inspection IDs and order. Do not infer a cause or successful
repair solely from a release; retain uncertainty when the journal alone cannot
explain why the hook fired. Omit `hooks` or use an empty array when the list is
empty. Ordinary single waits remain visible as counts without requiring diagnosis.

Use these attribution rules:

| Evidence | Default owner |
| --- | --- |
| A requirement or edge case was never clarified, although the ambiguity was visible | `close-the-gaps` |
| The approved spec contained the requirement but the plan omitted or mis-modeled it | `plan-the-work` |
| The plan was adequate but the implementation departed from it | `execute` |
| Review missed an observable issue in an earlier cycle, produced an unsupported finding, or surfaced related defects one cycle at a time | `review-the-code` |
| Routing, state, retry, fix, or replan behavior created the extra round | `implement` |
| A Lightweight implementation or Lightweight fix missed or broke behavior the spec stated | `implement` (Lightweight phase) |
| An escalation: the initial risk assessment underrated the change, or Lightweight was the wrong mode | `implement` (risk assessment) |
| Required system knowledge was missing or stale | project context / `go-deep`, not automatically a pipeline-skill defect |

Recommend a skill change only when the needed evidence was available before the failure and the change would generalize beyond this run. Do not convert hindsight or a one-off project preference into a universal workflow rule.

## Share-safe output

The cumulative feedback file must not contain:

- ticket IDs or titles;
- repository, organization, customer, or person names;
- source snippets or raw requirements/review text;
- secrets or credentials;
- absolute or relative paths;
- function, class, test, branch, or commit names.

It may name make-it-work phases and skills, counts, generic failure shapes, and paraphrased causal evidence. Re-read the finished block specifically for forbidden identifiers before writing it.

Before staging the analysis JSON, compare every text value with the source artifacts. Replace distinctive requirement labels and compound terms copied from those artifacts with a generic description of the behavior; for example, describe a missed rejection case without carrying over its named role or acceptance-path label. Keep the causal distinction, such as allowed versus rejected outcomes, while removing the source vocabulary. The writer also rejects compound terms copied from Audit-log prose, but the same review is still necessary for names appearing only in the spec, plan, or reports.

## Clarification questions

Use feedback-on-session's single invitation as chat text alongside the terminal summary after saving the provisional combined report. Do not use a blocking question tool for feedback or ask a separate artifact-retrospective questionnaire. Follow up only when a material ambiguity would change a finding. Continue the terminal summary and delivery offer without waiting for feedback; silence leaves user input pending, never declined. The separate delivery approval questions retain their existing behavior.

After a reply, update the same session review, explicitly correcting contradicted findings and attributing user-only experiences. Update the artifact analysis only when that reply changes its diagnosis; preserve the original validated event identities. Rerun the writer with both inputs to replace the same marked block and export. Record sanitized material clarifications in `clarifications` when analysis exists. If the session ends first, keep unresolved questions open and the report provisional. Under `implement --autopilot`, omit the invitation, keep status pending, record that input was not requested under Autopilot in limitations, and retain open questions. Do not add a feedback-pending workflow state or resume path.

## Combined session-review input

Review the conversation on every eligible run, including runs with zero retries. Follow feedback-on-session's evidence, attribution and standalone-readability requirements. When artifact diagnosis is required, reuse the required subagent's result rather than independently rediagnosing its events. A finding may cite both sources; do not count the same episode twice. Only the available pre-feedback conversation is in scope; disclose compaction or missing earlier context. User feedback replies may correct this report but are not new workflow incidents.

Stage a uniquely named JSON file under the gitignored `make-it-work/` directory and pass it as `--session-review` on every integrated write, including clarification updates. Preserve the input until feedback is resolved so updates can resend both it and any analysis; after an interruption, reconstruct from the saved report without discarding existing findings or input. Remove only the temporary files created for this review when no longer needed. The writer accepts:

```json
{
  "version": 2,
  "status": "pending",
  "context": [
    "Intended outcome and observed result, paraphrased",
    "Conversation turns 1 through 12 and saved workflow artifacts reviewed; earlier conversation unavailable",
    "Conversation locators use visible turn numbers; artifact locators use anonymous source labels and row numbers",
    "Client version unknown; workflow mode and autonomy only when evidenced"
  ],
  "findings": [{
    "id": "F1",
    "title": "A previously answered question was repeated",
    "expectedObserved": "The user supplied a preference but was asked for it again",
    "evidence": [
      "Conversation turn 2, user paraphrase: proceed with the supplied preference",
      "Conversation turn 4, assistant paraphrase: requested the same preference again"
    ],
    "impact": "An additional reply was needed; cause unknown",
    "investigation": "Proposed reproduction — not independently tested: supply the preference before starting and check whether it is requested again",
    "nextStep": "Investigate whether the recorded preference is reused when entering the next stage",
    "owner": "implement",
    "verification": "In a disposable run, confirm the recorded preference reaches the next stage without another question",
    "confidence": "medium"
  }],
  "userInput": [],
  "limitations": ["Cause could not be established from available evidence"]
}
```

All text values must be sanitized single lines following Share-safe output; use anonymous locators such as Conversation turn 4 or Review source, row 8 instead of paths. A finding must carry the instruction or expectation, action and relevant result or recovery, not merely a locator. Include enough evidence to investigate using only the report. Use `findings: []` when no problems are supported; missing evidence is a limitation, not a finding. The writer rejects obvious unsafe text but cannot establish evidence accuracy or catch every identifier; review all values before writing.

Every finding also requires `nextStep`, `owner`, `verification` and recommendation `confidence` (`high`, `medium`, `low`). Propose a concrete next action and how its benefit could be checked, preserving uncertainty about untested remedies. An adherence gap calls for investigating enforcement, not adding a duplicate instruction. A compliant review or validator is not itself a defect; label any optimization as optional and preserve required safeguards. Do not automatically implement, publish or file suggested changes. When no change is warranted, explain that in the next step.

The writer always derives the report's plugin version from the saved run state, never from model input or the installed manifest. The report's shared provenance applies to both artifact diagnosis and session review. A legacy missing version remains `not captured (legacy run)`.

`status` is `pending` until a reply is incorporated, `complete` after incorporating a reply (with attributed `userInput`), or `skipped` only after an explicit decline. Unanswered and Autopilot invitations remain pending. Preserve stable finding IDs on corrections. A reply is not endorsement of findings it did not address. Before presenting either provisional or completed output, read back the report and check standalone readability, provenance, bounded conclusions and sanitization.

## Check both inputs before saving

Run the read-only check with the same inputs intended for the write:

```sh
node "<base>/scripts/write-feedback.mjs" check --state "make-it-work/<TICKET>/<TICKET>-state.md" --analysis "<temporary-analysis.json>" --session-review "<temporary-session-review.json>"
```

Omit `--analysis` when inspection says it is unnecessary; add `--limit-stop` for an eligible stop. A valid check returns `valid: true`; otherwise it returns the independent structural errors together and exits nonzero. Repair the reported fields from actual evidence, not invented defaults, and recheck before writing. Missing earlier evidence belongs in limitations or open questions. The writer also runs these structural checks before changing either output. Schema validity cannot establish that a causal diagnosis or a reported human complaint is true: apply the evidence review above and the standalone-readability check too.

## Non-minimal analysis input

Ask the retrospective agent for the complete version-2 object below, including `events`, `recommendations`, `clarifications`, `openQuestions` and any required guardrails/hooks. Do not request only a diagnosis fragment and reconstruct omitted fields later. Both current analysis and session-review inputs declare `version: 2`; old saved inputs retain their existing write compatibility. Recommendations are evidence-backed suggestions, not automatically applied changes.

The retrospective subagent returns one share-safe JSON object. Create a uniquely named temporary JSON file under the gitignored `make-it-work/` directory and pass it to the writer along with the session-review input. Retain it for user-input updates as described above; never overwrite an existing unrelated file to stage this input. The model supplies only diagnosis and recommendations, including `hooks` entries when `hookAnalysis` is nonempty. The script derives counts, formats every heading and field, and preserves other runs:

```json
{
  "version": 2,
  "events": [{
    "kind": "Fix",
    "row": 6,
    "trigger": "Generic, share-safe trigger",
    "rootCause": "planning gap",
    "explanation": "Generic cause explanation",
    "earliestStage": "plan-the-work",
    "preventability": "likely",
    "owner": "plan-the-work",
    "improvement": "Specific generalizable improvement",
    "confidence": "high",
    "basis": {
      "requirement": "Spec source, row 2 states the expected behavior",
      "knownEvidence": "Plan source, row 4 shows the requirement was available",
      "observedAction": "Plan source, row 8 omitted the required behavior",
      "attribution": "Planning omission is primary; no earlier ambiguity was established"
    }
  }],
  "guardrails": [{
    "row": 8,
    "resolutionRow": 9,
    "trigger": "An expected outcome required clarification",
    "resolution": "The user clarified the intended outcome",
    "lesson": "No workflow change recommended",
    "confidence": "high"
  }],
  "recommendations": ["Deduplicated recommendation"],
  "clarifications": [],
  "openQuestions": []
}
```

`guardrails` must match the inspection list one-for-one using its exact `row` and `resolutionRow` (null when not recorded). Keep trigger/resolution/lesson share-safe and distinguish reported evidence from inference. Source/channel are derived from saved checkpoints, not invented by the subagent. Omit `guardrails` or use an empty array when none were recorded. A guardrail-only analysis uses `events: []`.

`events` must correspond one-for-one, in order, to the inspection summary's `events`, including exact `kind` (`Fix`, `Replan`, or `Escalation`) and `row`. Valid `rootCause` values are the categories in Investigate extra rounds or guardrail interventions; `preventability` is `likely`, `partial`, `unavoidable`, or `unclear`; `confidence` is `high`, `medium`, or `low`. Use `"No workflow change recommended"` when appropriate. Keep every text value one line and share-safe. The writer rejects paths, markup, contact details, the ticket ID, and compound terms copied from Audit-log prose, but it cannot detect every sensitive identifier: perform the share-safe review above yourself before the write. If it rejects a term, paraphrase that text value and retry rather than dropping the diagnosis.

```sh
node "<base>/scripts/write-feedback.mjs" write --state "make-it-work/<TICKET>/<TICKET>-state.md" --analysis "<temporary-analysis.json>" --session-review "<temporary-session-review.json>"
```

Add `--limit-stop` for an eligible limit stop. The writer omits `### User clarifications` when none were asked and renders `None` under `### Open questions` when the list is empty. On any writer error, preserve the terminal workflow state and report the feedback failure.
