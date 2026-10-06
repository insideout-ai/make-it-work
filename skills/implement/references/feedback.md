# Implement workflow feedback

Use this reference only when an `implement` run has already reached an eligible terminal state. The feedback artifact is a local, cumulative retrospective for improving the make-it-work workflow; it is not project documentation and is never submitted automatically.

## Eligibility and timing

Update `make-it-work/implement-feedback.md` only for:

- every run that has checkpointed `status: Complete`; and
- a run that has checkpointed `status: Stopped` because the fix, review, or replan limit was exhausted.

Do not write an entry for a pause, user-requested stop, branch/context/setup failure, missing tool, or other non-limit stop. Never backfill runs that reached a terminal state before this feedback behavior existed.

The terminal state-file write and dashboard regeneration happen first. Feedback failure or unanswered feedback questions never re-open, downgrade, or block the implementation run.

## Stable run identity and safe updates

Use the state file's real `start_time` verbatim as the run ID. A missing or `none` start time makes the run ineligible: report that feedback could not be recorded without a stable run ID, but leave the terminal workflow state unchanged.

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

- If that run's complete marker pair already exists, replace only the content from its opening marker through its closing marker.
- Otherwise append the new block after the existing content.
- Preserve the header, every other run block, and any user-authored text outside the matching markers.
- If only one of the matching markers exists or their order is malformed, do not risk overwriting user content: append a fresh complete block and mention the malformed earlier marker in chat.

## Decide whether the path was minimal

Read the state file's Audit log chronologically. Do not infer history from the live `fix_cycle`, `review_cycle`, or `plan_version` fields, because replanning resets some of them.

- A run is **non-minimal** when the log contains at least one transition whose `To` is `fix-plan`, or an explicit replan transition from `execute`, `review`, or `fix-plan` back to `plan`.
- Count fix rounds from transitions into `fix-plan`, including a round that ultimately added no steps.
- Count replans from those explicit replan transitions to `plan`.
- Count review cycles from explicit `Review cycle <N>` Audit-log rows when they exist. Otherwise count transitions that enter `review` from another phase (`To: review`, `From` not `review`). Never use the current `review_cycle` field, which resets after a replan.
- A run with none of those fix/replan transitions is **minimal**, even if an approval phase was redone or execution retried internally. Those behaviors are outside this feedback feature's first version.

Minimal runs get only the compact run block below. Do not dispatch retrospective analysis or ask feedback questions for them.

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

Write the provisional block before asking anything. Ask one question at a time only when the answer could materially change the cause category, earliest preventable stage, owner, or recommendation. There is no numerical cap; stop when every remaining uncertainty is immaterial, the user says they do not know, or the user declines.

After every answer, update the same marked block. Record the sanitized question and answer under `### User clarifications`; never copy sensitive wording verbatim when a share-safe paraphrase is sufficient. If the session ends first, leave the run terminal and keep the unresolved question under `### Open questions`. Do not add a feedback-pending workflow state or resume path.

## Run-block templates

Minimal run:

```markdown
<!-- run:<start_time> -->
## Run started <start_time>

- Outcome: Complete | Stopped — loop limit
- Minimal path: Yes
- Fix rounds: 0
- Replans: 0
- Review cycles: <count>
- Workflow feedback: No fix or replan round was needed.
<!-- /run:<start_time> -->
```

Non-minimal run:

```markdown
<!-- run:<start_time> -->
## Run started <start_time>

- Outcome: Complete | Stopped — loop limit
- Minimal path: No
- Fix rounds: <count>
- Replans: <count>
- Review cycles: <count>

### Extra-round analysis

#### Event <n> — Fix | Replan

- Trigger: <share-safe paraphrase>
- Root cause: <category and explanation>
- Earliest preventable stage: <phase or Not preventable>
- Preventability: <likely | partial | unavoidable | unclear>
- Workflow owner: <skill | project context | none | unclear>
- Suggested improvement: <specific change | No workflow change recommended>
- Confidence: <high | medium | low>

### Consolidated recommendations

- <deduplicated recommendation, or No workflow change recommended>

### User clarifications

- Question: <sanitized question>
  Answer: <sanitized answer>

### Open questions

- <material unresolved question, or None>
<!-- /run:<start_time> -->
```

Omit `### User clarifications` when none were asked. Keep `### Open questions` for non-minimal runs and write `None` when the analysis is settled.
