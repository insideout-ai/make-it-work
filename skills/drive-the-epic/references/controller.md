# Saved workflow controller

Use Node's existing installation; no packages or services are required. All paths below are absolute or relative to the explicit project root. Commands take JSON from files to preserve literal user content. Use one reusable controller scratch file, `<run-directory>/.event.json`, for every event, including semantic epic/slice input. The event command removes this file only after its state and dashboard checkpoint succeeds; it retains it after validation or checkpoint failure for an exact retry. Resolve that failure before overwriting the scratch file. If a response is lost and the scratch file is already gone, inspect the saved event ID and progress rather than starting another operation. Do not create `ev-*.json`, `epic-input-*.json`, separate stage input snapshots, or saved command-output JSON files. Never interpolate source prose into shell commands. Initialization can use an agent-created OS temporary file; remove it after successful initialization. Supplied source documents and arbitrary legacy/custom input paths are never automatically deleted.

```text
node <plugin-root>/scripts/epic-workflow.mjs init --root <project> --input <init.json>
node <plugin-root>/scripts/epic-workflow.mjs show --root <project> --run <run-name>
node <plugin-root>/scripts/epic-workflow.mjs event --root <project> --run <run-name> --input <run-directory>/.event.json
node <plugin-root>/scripts/epic-workflow.mjs refresh --root <project> --run <run-name>
```

`init` returns the run name, directory and state. Keep these exact values through every stage. `state.json` is authoritative and retains source evidence, stage inputs, questions, answers, all decisions, history, and pending progress. `dashboard.html` is derived. New runs do not generate a duplicate `decisions.jsonl`; an export already present in an older run is maintained for compatibility. `refresh` repairs these views after an interrupted checkpoint without changing progress. A controller lock prevents concurrent checkpoint writers; inspect the run and confirm no writer is active before removing an abandoned `.lock`. Artifact creation interrupted before checkpointing may leave unreferenced files; preserve them and retry the same event. Collision-safe writers keep earlier output intact.

## Initialization

```json
{
  "title": "Order exports",
  "goal": "Let customers reconcile their purchases",
  "autonomy": "interactive",
  "sources": [{"id": "brief", "reference": "User-provided brief", "available": true, "content": "Customers need their own orders as CSV."}]
}
```

Use `autopilot` for an unattended run. Each source needs a unique ID, reference, availability, and content; inaccessible sources have empty content. A Jira source reference should retain its browsable URL when known and its key in the retained evidence. A source content hash is saved. On resume, compare accessible evidence with the saved snapshot; assess meaningful changes rather than restarting because of a timestamp.

## Events

Every event requires a unique `id` and a `type`. Retry the **identical** event after interruption; replay is idempotent. A changed payload needs a new ID. Controller-generated history timestamps describe checkpoints, not human actions.

| Type | Payload and effect |
|---|---|
| `intake` | Advance to shaping if any usable source exists; otherwise pause interactive or stop autopilot. |
| `question` | `question`: exact blocking stage question, optional `options` (label strings or label/description objects) and `multi_select` boolean. Save before asking; returns `pending.id`. Interactive only. |
| `answer` | `pending_id`, `answer`, `reference`: record the actual answer, clear the pending question and resume its stage. It cannot bypass epic review. |
| `decision` | `text`, `source` (`user`, `automatic`, `policy`), optional `scope`, and `reference` for a user answer. A stage auto-resolution also supplies `stage` and `auto_resolution` in the existing shared log schema; these are retained in state. Record decisions/assumptions/progress without another approval. |
| `epic` | `input`: the existing epic writer's version-1 semantic input (see below). Saves a fresh epic with source references; pauses interactive at full review or records automatic continuation to slicing. |
| `accept` | `pending_id`, `reference`: explicit acceptance of the current complete epic. Only resolves the matching review wait. |
| `slices` | `input`: the existing slice writer's version-1 input plus parallel and open-item information. Validates first, then saves all files and the prepared handoff. Returns `chat_summary`; display it. |
| `revise` | `scope`: `epic`, `slices`, or an array of known slice IDs; `reason`, `reference` for user feedback (or `source: policy` for detected source changes), optional full replacement `sources` array. Reopen only affected work; keep unaffected decisions. If no source is usable, return to intake. |
| `retire` | `slice_id`, `reason`, `reference`: explicitly retire an existing ID during a revision; never reuse it. Reconcile its dependency edges in the next set. |
| `stop` | `reason`: actionable failure. Clears the pending wait and preserves progress. |
| `resume` | Continue a stopped run after addressing its cause. A paused run instead needs `answer`, `accept`, or `revise`. |
| `publication` | `text`, `reference`: record specific authorized operation and its outcome, including destination and any failures or uncertain results. Only after local completion, interactive only. |

A user-sourced event must cite the actual chat answer or scoped instruction; a recommendation or silence is not a reference to user approval.

## Stage artifact input

Use [the shared deterministic contracts](../../../docs/deterministic-artifacts.md) for `epic.mjs` and `slices.mjs`. The controller invokes those writers on the stages' semantic inputs and returns actual paths; stage skills do not write a second set in their standalone directories. Place semantic inputs directly in the scratch event’s `input` object. The controller retains them as `epic_input` and `slices_input` in state; do not save additional input files.

An epic input has `version: 1`, `title`, `mode: product|technical-debt`, `categories`, and optional `decisions`, `open_items`, `out_of_scope`. Each selected category has `id`, `assessed: true`, `content`, `ready`, and optional `open_items`, `unconfirmed`, `exclusions`, `applicable`. Respect the stage's actual readiness/provenance rules. Do not turn automatic assumptions into confirmed user decisions.

A slice input has `version: 1`, `title`, `goal`, `approach`, `rationale`, `slices`, optional `stages`, `mvp`, `assumptions`, `open_items`, and `parallel_groups`. Each slice has `id`, `title`, `summary`, complete Markdown `content`, `hard`, `recommended`, dependency `reasons`, optional `external`, `open_items`, and required:

```json
{"parallel": {"suitability": "candidate", "reason": "Independent outcomes; separate code areas expected, to reassess before execution."}}
```

Use `unassessed` when evidence is insufficient; do not automatically classify a dependency wave as a safe parallel group. `parallel_groups` is an array of ID arrays such as `[["S-2", "S-3"]]`. All members must be candidates without a transitive hard dependency on one another. Reasons are grounded proposals, not claims that future worker/worktree isolation already exists.

The controller checks graph consistency and protects unaffected slice content during scoped revisions. Keep IDs stable through title refinements. Retire removed slices explicitly before saving a replacement set. Local `Complete` means preparation ended; epic/slice open items and external prerequisites keep affected slice preparation at `Needs refinement`. Every implementation status remains `Not started` in this version.

## Stage logs and dashboard

Dashboard presentation is shared with `implement` through `scripts/lib/workflow-dashboard.mjs` (base styles, branded header, and local timestamp formatting). Keep phase routing and artifact state in their own controllers. The only primary dashboard artifacts are Requirement and Slicing summary. The audit immediately follows them and combines decisions with transitions by saved event ID; legacy event order and independent decision timestamps remain supported. Preserve questions and actual answers in history. Full slicing detail is saved in the overview Markdown, with complete slice files linked from it; internal state and logs are supporting files. Show audit entries newest first with descending row numbers. Keep all sections visible without collapse/expand controls so refreshes do not reset disclosure state. Use compact inline status banners for completion, waits, and current activity. The header shows only the title and autonomy badge; omit the goal subtitle, revision/status badges, and Source material section. Keep source evidence in state and the requirement. Audit From/To phase labels never wrap. The saved epic view refreshes every 15 seconds while active or paused and stops refreshing when stopped or complete.

Nested stages do not create their standalone JSONL logs in an orchestrated run. For every auto-resolved stage site, submit an automatic `decision` event with `stage: shape-the-epic|slice-the-epic`, human-readable `text`, and `auto_resolution` containing the existing shared decision-log entry (exact question/options/chosen/rationale). The controller validates and preserves it within `state.decisions`, while the dashboard shows the substantive choice. Reuse this journal on resume; do not replay earlier choices. Existing stage logs from older runs remain untouched. Standalone stage invocations retain their original logging behavior.

A normal fresh completed run retains only the dashboard, state, requirement Markdown, slicing-summary Markdown, and one complete Markdown file per slice (**4 + number of slices**). Artifact revisions still preserve earlier Markdown versions. Files do not grow with every interview turn or decision. Helpers such as approach preview may reuse `.event.json` temporarily, then checkpoint their question/choice through the controller; do not retain their intermediate inputs or command results.
At every blocking stage question: save `question`, present the actual question through the available tool/text, wait, then save `answer` with the matching ID before dependent work. Category-selection batches retain their stage's batching rule; save their complete exact question text together and record each returned selection. Full-epic review already has a persisted pending question: do not create a second `question` event for it.

Compact artifact names: `requirement.md`, `slicing-summary.md`, and `S-1-short-description.md`. Supply an optional 2–5 word `short_title` per slice when its full title is verbose; the writer bounds filename length and keeps the full title in the document. Preserved revisions use `-v2`, `-v3`, etc. Always use returned artifact paths rather than reconstructing names. Standalone stage commands retain their original naming.
