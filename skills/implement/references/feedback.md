# Implement workflow feedback

Use this reference only when an `implement` run has already reached an eligible terminal state. The feedback artifact is a local, cumulative retrospective for improving the make-it-work workflow; it is not project documentation and is never submitted automatically.

## Eligibility and timing

Update `make-it-work/implement-feedback.md` only for:

- every run that has checkpointed `status: Complete`; and
- a run that has checkpointed `status: Stopped` because the fix, review, or replan limit was exhausted.

Do not write an entry for a pause, user-requested stop, branch/context/setup failure, missing tool, or other non-limit stop. Never backfill runs that reached a terminal state before this feedback behavior existed.

The terminal state-file write and dashboard regeneration happen first. Feedback failure or unanswered feedback questions never re-open, downgrade, or block the implementation run.

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

## Decide whether the path was minimal

Resolve `<base>` to this skill's directory. After the terminal checkpoint and dashboard regeneration, inspect the state with:

```sh
node "<base>/scripts/write-feedback.mjs" inspect --state "make-it-work/<TICKET>-state.md"
```

For an exhausted fix, review, or replan limit stop, also pass `--limit-stop`; never pass it for any other stop. The script rejects ineligible state. Its JSON summary supplies `minimal`, the counts, and the ordered `events` (`kind` and Audit-log `row`). It reads the Audit log chronologically; never substitute the live counters, which can reset after replanning.

The writer counts transitions into `fix-plan` (including zero-step rounds), explicit replans from execute/review/fix-plan back to plan, and review-cycle rows (falling back to transitions into review). A run with no fix or replan transitions is minimal, even if an approval was redone or execution retried internally.

For a minimal run, write the compact block immediately:

```sh
node "<base>/scripts/write-feedback.mjs" write --state "make-it-work/<TICKET>-state.md"
```

Do not dispatch retrospective analysis or ask feedback questions for a minimal run.

## Investigate a non-minimal run

Dispatch one fresh general-purpose subagent for the retrospective. Give it this reference and the minimum available evidence needed from:

- the state file and its complete Audit log;
- the refined spec;
- every version of the plan, including amended fix steps and `Design reset` notes;
- the saved execute report; and
- the review report.

Reports may have been overwritten by later cycles. Treat the Audit-log trigger summaries, fix-step root-cause text, and versioned plan design resets as the durable evidence for earlier rounds. Inspect the final diff or code only when those artifacts cannot establish whether execution departed from an adequate plan.

For each fix or replan event, determine:

1. The immediate trigger, paraphrased without project identifiers.
2. The underlying cause category: `refinement gap`, `planning gap`, `execution deviation`, `review gap`, `orchestration issue`, `project-context gap`, `unavoidable`, or `unclear`.
3. The earliest workflow stage where enough information existed to prevent it.
4. Preventability: `likely`, `partial`, `unavoidable`, or `unclear`.
5. The owning workflow skill, if any.
6. One specific, generalizable skill improvement and its confidence (`high`, `medium`, or `low`), or `No workflow change recommended` when the cause was project-specific or unavoidable.

Use these attribution rules:

| Evidence | Default owner |
| --- | --- |
| A requirement or edge case was never clarified, although the ambiguity was visible | `close-the-gaps` |
| The approved spec contained the requirement but the plan omitted or mis-modeled it | `plan-the-work` |
| The plan was adequate but the implementation departed from it | `execute` |
| Review missed an observable issue in an earlier cycle, produced an unsupported finding, or surfaced related defects one cycle at a time | `review-the-pr` |
| Routing, state, retry, fix, or replan behavior created the extra round | `implement` |
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

## Clarification questions

Write the provisional block with the script before asking anything. Ask one question at a time only when the answer could materially change the cause category, earliest preventable stage, owner, or recommendation. There is no numerical cap; stop when every remaining uncertainty is immaterial, the user says they do not know, or the user declines.

After every answer, update the analysis JSON and rerun the writer to replace the same marked block. Record the sanitized question and answer in `clarifications`; never copy sensitive wording verbatim when a share-safe paraphrase is sufficient. If the session ends first, leave the run terminal and keep the unresolved question in `openQuestions`. During an `implement --autopilot` run, never ask a clarification question: write the best evidence-backed provisional diagnosis and put every material unresolved question in `openQuestions`. Do not add a feedback-pending workflow state or resume path.

## Non-minimal analysis input

The retrospective subagent returns one share-safe JSON object. Create a uniquely named temporary JSON file under the gitignored `make-it-work/` directory, pass that file to the writer, and remove only that temporary file after a successful write. Never overwrite an existing file to stage this input. The model supplies only diagnosis and recommendations. The script derives counts, formats every heading and field, and preserves other runs:

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
  "recommendations": ["Deduplicated recommendation"],
  "clarifications": [],
  "openQuestions": []
}
```

`events` must correspond one-for-one, in order, to the inspection summary's `events`, including exact `kind` and `row`. Valid `rootCause` values are the categories in Investigate a non-minimal run; `preventability` is `likely`, `partial`, `unavoidable`, or `unclear`; `confidence` is `high`, `medium`, or `low`. Use `"No workflow change recommended"` when appropriate. Keep every text value one line and share-safe. The writer rejects paths, markup, contact details, and the ticket ID, but it cannot detect every sensitive identifier: perform the share-safe review above yourself before the write.

```sh
node "<base>/scripts/write-feedback.mjs" write --state "make-it-work/<TICKET>-state.md" --analysis "<temporary-analysis.json>"
```

Add `--limit-stop` for an eligible limit stop. The writer omits `### User clarifications` when none were asked and renders `None` under `### Open questions` when the list is empty. On any writer error, preserve the terminal workflow state and report the feedback failure.
