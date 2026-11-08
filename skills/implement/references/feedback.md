# Implement workflow feedback

Use this reference only when an `implement` run has already reached an eligible terminal state. The feedback artifact is a local, cumulative retrospective for improving the make-it-work workflow; it is not project documentation and is never submitted automatically.

## Eligibility and timing

Update `make-it-work/implement-feedback.md` only for:

- every run that has checkpointed `status: Complete`; and
- a run that has checkpointed `status: Stopped` because the fix, review, or replan limit was exhausted (in execute, review, fix-plan, or lightweight).

Do not write an entry for a pause, user-requested stop, branch/context/setup failure, missing tool, or other non-limit stop. Never backfill runs that reached a terminal state before this feedback behavior existed.

The terminal state-file write and dashboard regeneration happen first. Feedback failure or unanswered feedback questions never re-open, downgrade, or block the implementation run.

## Explain the feedback to the user

Use plain language in chat; keep terms such as `minimal`, `inspect`, writer classification and dispatch gates in internal reasoning and artifacts. Before inspecting a completed run, say: "Implementation is complete. I’m recording workflow feedback and checking whether any extra rounds need analysis." For an eligible limit stop, say: "The run has stopped at its retry limit. I’m reviewing what led to the extra rounds and recording possible workflow improvements." If extra-round analysis is needed, explain: "I’m reviewing why extra rounds were needed and whether the workflow could prevent them next time." For a hook-only review, say: "Hook interruptions or repeated waits were recorded. I’m reviewing whether the workflow could handle them better." For a guardrail-only review, say: "A guardrail intervention was recorded. I’m reviewing its resolution and whether it suggests a workflow improvement."

Include the feedback result in the terminal chat summary for both completed runs and eligible limit stops, not just the file location:

- With no fix, replan, escalation, recorded guardrail or hook interventions, or repeated agent waits, say: "No fix rounds, replanning or switch from Lightweight to TDD were needed; a short workflow note was saved."
- For recorded hook interventions or repeated agent waits, summarize the observed counts and releases separately from implementation retries. A single normal agent wait is informational and does not trigger analysis. A release means the hook later permitted continuation, not that a user approved anything or the underlying cause was fixed.
- For recorded guardrail interventions, summarize the stop and resolution neutrally, even if no extra rounds occurred. A safeguard catching an ambiguity is not automatically a failure.
- After detailed analysis, give a brief account of why extra rounds were needed and the main suggested workflow improvement, if supported. Distinguish a suggestion from an applied change. If no workflow change is recommended, say so; preserve material uncertainty rather than presenting a tentative cause as fact.
- Link the writer's `sessionOutputPath` (`make-it-work/<TICKET>/workflow-feedback.md`) as **Save this session's feedback** for the full saved details. The cumulative `make-it-work/implement-feedback.md` remains available locally. If analysis or saving failed, state what could not be completed rather than claiming feedback was saved. Keep the implementation's completed or stopped status explicit.

Summarize only this run's feedback, following the share-safe rules below. Do not paste the full retrospective or imply its recommendations have been applied. Keep the existing terminal summary concise.

## Session export beside the final package

Every successful writer call also saves `make-it-work/<TICKET>/workflow-feedback.md` and returns `sessionOutputPath`. This standalone Markdown file contains the standard header and only the current run's sanitized feedback block, never previous runs or user-authored cumulative-file notes. Clarification updates replace the session export as well as updating the cumulative entry.

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

For `analysisRequired: false`, write the compact block immediately:

```sh
node "<base>/scripts/write-feedback.mjs" write --state "make-it-work/<TICKET>/<TICKET>-state.md"
```

Do not dispatch retrospective analysis or ask feedback questions when `analysisRequired` is false. `minimal` still measures the path through Fix/Replan/Escalation rounds; a guardrail does not change those counts or imply a failed run. A recorded guardrail, hook intervention or repeated wait sets `analysisRequired: true` even on a minimal path. One ordinary agent wait does not. Counts and resolution metadata are derived by the writer, not supplied by the model.

## Investigate extra rounds, guardrails or hook interventions

The `inspect` result's `analysisRequired: true` is a dispatch gate: call the Agent tool once to start a fresh general-purpose retrospective subagent **before** drafting analysis JSON or calling `write --analysis`. Evidence already read in this session, an apparently obvious cause, or a nearly finished terminal report does not waive this gate. The orchestrator may inspect and sanitize the returned JSON, but must not replace the subagent's diagnosis with its own. If dispatch is unavailable or fails, report that the feedback retrospective could not be completed; keep the workflow's terminal state and do not write an invented non-minimal diagnosis.

Give that subagent this reference and the minimum available evidence needed from:

- the state file and its complete Audit log;
- the refined spec;
- every version of the plan, including amended fix steps and `Design reset` notes;
- the saved execute report, execution journal/history and any Lightweight implementation report; and
- the review report; and
- the run-local hook journal and the writer’s episode summary when hook interruptions or repeated waits were recorded.

Reports may have been overwritten by later cycles. Treat the Audit-log trigger summaries, fix-step root-cause text, and versioned plan design resets as the durable evidence for earlier rounds. Inspect the final diff or code only when those artifacts cannot establish whether execution departed from an adequate plan.

For each fix, replan, or escalation event, determine:

1. The immediate trigger, paraphrased without project identifiers.
2. The underlying cause category: `refinement gap`, `planning gap`, `execution deviation`, `review gap`, `orchestration issue`, `project-context gap`, `unavoidable`, or `unclear`.
3. The earliest workflow stage where enough information existed to prevent it.
4. Preventability: `likely`, `partial`, `unavoidable`, or `unclear`.
5. The owning workflow skill, if any.
6. One specific, generalizable skill improvement and its confidence (`high`, `medium`, or `low`), or `No workflow change recommended` when the cause was project-specific or unavoidable.

For each recorded guardrail intervention, separately paraphrase the stop and
resolution, describe any evidence-supported lesson (or `No workflow change
recommended`), and give confidence. Do not invent a resolution where its row is
null or treat correct safeguard behavior as a workflow defect. Only structured
execution checkpoints recorded within the terminal workflow boundary count;
older unstructured history is not guessed from prose. Post-workflow findings
are outside this feedback feature.

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

Write the provisional block with the script before asking anything. Ask one question at a time only when the answer could materially change the cause category, earliest preventable stage, owner, or recommendation. There is no numerical cap; stop when every remaining uncertainty is immaterial, the user says they do not know, or the user declines.

After every answer, update the analysis JSON and rerun the writer to replace the same marked block. Record the sanitized question and answer in `clarifications`; never copy sensitive wording verbatim when a share-safe paraphrase is sufficient. If the session ends first, leave the run terminal and keep the unresolved question in `openQuestions`. During an `implement --autopilot` run, never ask a clarification question: write the best evidence-backed provisional diagnosis and put every material unresolved question in `openQuestions`. Do not add a feedback-pending workflow state or resume path.

## Non-minimal analysis input

The retrospective subagent returns one share-safe JSON object. Create a uniquely named temporary JSON file under the gitignored `make-it-work/` directory, pass that file to the writer, and remove only that temporary file after a successful write. Never overwrite an existing file to stage this input. The model supplies only diagnosis and recommendations, including `hooks` entries when `hookAnalysis` is nonempty. The script derives counts, formats every heading and field, and preserves other runs:

```json
{
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
    "confidence": "high"
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
node "<base>/scripts/write-feedback.mjs" write --state "make-it-work/<TICKET>/<TICKET>-state.md" --analysis "<temporary-analysis.json>"
```

Add `--limit-stop` for an eligible limit stop. The writer omits `### User clarifications` when none were asked and renders `None` under `### Open questions` when the list is empty. On any writer error, preserve the terminal workflow state and report the feedback failure.
