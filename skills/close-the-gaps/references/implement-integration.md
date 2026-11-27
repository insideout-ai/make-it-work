<!-- Procedures relocated from the parent SKILL.md without policy changes. -->

Read this guide only at the loading point in [the skill entrypoint](../SKILL.md). `<base>` and bare relative paths in prose or code below refer to the parent skill directory; Markdown links resolve from this file. Phase and step names refer to the complete workflow in that entrypoint and its linked guides.

## When run by implement

When explicitly dispatched as the opt-in local refinement worker, additionally follow [the worker ownership contract](../../implement/references/refinement-worker-task.md). It replaces inline activity/state ownership with parent requests; it does not change refinement reasoning or the terminal v1 handoff. Other callers retain this section unchanged.


**Workspace runs owned by implement:** when supplied `workspace_contract` (`workspace_version: 1`), read [the workspace contract](../../implement/references/workspace.md) before detection or artifact writes. Its artifact root and approved repository IDs/roots/branches/bases override standalone layout detection, any requirement for root `CLAUDE.md`, and repo-root artifact assumptions. Run source/Git/test operations in the explicit named repo; keep workflow artifacts under the supplied artifact root. Assess only approved scope, including selected test repos. Return newly affected repos or required branch changes before edits there so the parent obtains user confirmation. Forward the contract to nested skills and delegated agents. This override does not change standalone or legacy single-repo behavior.

**Activity checkpoints** — follow [implement's activity contract](../../implement/references/activity.md). In this inline session, save the exact narrated activity before each substantial investigation or spec-writing chunk. Before delegating work, save its description and retain it while waiting; only the main session writes activity or dashboards. Standalone runs and older runs without a dashboard do not create one.

**Workflow decisions** — follow [implement's workflow-decision audit contract](../../implement/references/workflow-decisions.md). Report explicit workflow choices to the main session as they resolve, before dependent work; keep product answers in their existing deliverables. Use the supplied state path, and preserve the distinction between user answers and automatic resolutions.

This section applies only when `/make-it-work:implement` runs this skill; a standalone run ignores it entirely.

**Ticket publication** — return the local spec and handoff; do not replace the tracker description, attach files or post comments here. `implement` owns publication under its saved ticket-write consent after the spec's acceptance checkpoint. Tracker read access and autonomy do not grant write permission.

**Inputs** — the ticket ID or pasted ticket content, the run's autonomy level (Guided, Autonomous, or Autopilot), and optional **redo notes** (when the user asked to redo refinement at the approval gate). With redo notes, read the existing spec first, treat the notes as clarifications already given, and ask only the questions they don't settle.

**Live autonomy** — the caller also supplies the workflow state path. Follow [implement's chat autonomy contract](../../implement/references/autonomy-changes.md) in this inline session. Before each question/default and return route, use its current saved mode, overriding the entry `--autopilot` flag after a chat change. Keep the current interview progress and answers; never restart refinement just to change mode.

**Slack context research** — Phase 1A is separate from the saved answer destination. Offer it in Guided/Autonomous when channel search is available, even when questions will be answered here or sent to the PM. Reuse explicit saved research consent/context, honor effective autonomy, and report the choice through implement's existing workflow-decision/pending-input contract. Autopilot skips unless the user explicitly requested research; `slack-draft`/`slack-send` alone do not grant this consent.

**Answer mode** — ignore `--offline`; use [implement's refinement-destination contract](../../implement/references/refinement-destination.md) before the first product-question wave. Verify the choice in the supplied workflow state, honoring a later explicit destination instruction. Do not show standalone Phase 5's export-mode choice when a destination is already resolved. If it is missing, recover an unambiguous Audit-log choice or ask the destination question now in Guided/Autonomous, including Slack capability discovery and an explanation when unavailable. Save the resolved destination and audit it before asking product questions; preserve answers already given. Autopilot defaults a missing choice to `here` as policy without asking. Use Phase 5D draft mode for `slack-draft` (`--slack`), send mode for `slack-send` (`--slack-send`), and Phase 5A for `here`. An absent Slack flag alone never proves that the user chose live questions. A saved explicit Slack choice remains effective under Autopilot; Autopilot itself never selects sending. When `implement` passes a pending questions file's path instead of the ticket, this is an injection run: follow Phase 5C without choosing a destination or making any send call. (`implement` stops before calling this skill when an offline questions file is pending that its own run did not create.)

**Questions** — in answer-here mode, Guided and Autonomous ask every question live exactly as in a standalone run. Autopilot invokes this skill with `--autopilot`, so use its Autopilot Mode resolution table and never ask live; return normally after a safe resolution or surface its documented hard-stop result to `implement`. Slack modes export the questions and pause instead of answering them.

**Partial-answer handoff** — Phase 5E applies here too. A user choosing to pause for Product after answering here is a later explicit destination change: persist/audit `slack-send` (or the actual `slack-draft` fallback) under the refinement-destination contract before delivery, preserve answers, and return `QUESTIONS_SENT` with the actual delivery status so implement pauses. If no Slack action is supported, retain the destination and audit the manual file handoff; report delivery as `offline`. Saving a draft returns `SPEC_SAVED` with the complete in-scope unresolved count, including blocked dependencies. Any nonzero count pauses Implement in `close-the-gaps` with the draft linked; it cannot advance through risk assessment, spec approval or either implementation route. There is no generic accept-TBDs override. Resume from that draft, preserve all answers, and ask only unresolved or newly applicable questions. A zero count requires actual answers, authorized recorded defaults, or accepted reduced scope that leaves a useful independently verifiable change.

**Return report** — end the output with these lines, then stop without suggesting next steps:

```
Spec: <path written in Phase 6>
TBD items: <count>
Context updated: <list from Phase 7 | none>
```

After a Phase 5D export (no spec yet), end instead with:

```
Questions sent: <path of the questions file>
Slack delivery: <draft | sent | unknown | offline>
```

`Questions sent:` is the existing compatibility label for the questions artifact, not proof of a send. Report the actual delivery result in `Slack delivery:` (`unknown` includes an interrupted pending send). If Phase 5D fell back to Phase 5B because Slack couldn't be used, use `offline` — the file is pending either way, and `implement` pauses on it.

**Version 1 handoff** — when the caller's workflow state contains `handoff_version: 1`, also read `../implement/references/handoffs.md` and write a new `gaps-<N>.json` in `make-it-work/<TICKET>/<TICKET>-handoffs/` using its schema. Use `SPEC_SAVED`, the actual spec path, the counted TBD items, and the paths updated in Phase 7 — or, after a Phase 5D export (including its Phase 5B fallback), `QUESTIONS_SENT` with the questions file's path. Do not write this file for an older run. End the chat report with `Handoff: <path>` so `implement` can validate it before advancing.

## Integrated quality review ownership

Follow [bounded artifact quality review](../../../docs/artifact-quality-review.md).
Apply only to TDD under Implement; standalone skills follow their entrypoint.
Retain existing workspace, edit and activity ownership. The parent alone handles
questions/stops and spec-conflict transitions. Record attempts outside workflow
counters; preserve unfinished/exhausted attempts on resume. A record is evidence
of the inspection, not a new controller gate or schema. Never emit a successful
handoff while quality blockers remain. For refinement the parent invokes review
after mode selection and before spec acceptance/publication.
