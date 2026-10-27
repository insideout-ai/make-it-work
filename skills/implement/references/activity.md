# Activity checkpoints during implementation

This contract applies to the main `implement` session, its inline stages (including testing readiness and nested regression), and work it delegates. Standalone skills do not create workflow state or dashboards for activity reporting.

## Before work

The caller supplies the exact workflow state path and the resolved `implement` skill directory. Check whether the run already has its sibling `<TICKET>-status.html`; an older run without a dashboard does not participate, and must never receive one just for activity reporting.

For a participating run, before each substantial chunk of investigation, drafting, setup, implementation or verification, say one high-level sentence in chat, then save that exact sentence before starting the chunk:

```sh
node "<implement-base>/scripts/dashboard-checkpoint.mjs" activity --state "<exact-state-path>" --activity "<exact narrated sentence>"
```

Use one update per meaningful work chunk, not per tool call. This applies after entering an inline stage and when entering a nested skill; reading another skill does not suspend activity reporting. If the checkpoint fails, correct the reported problem before starting dependent work. Do not hand-edit the generated HTML.

The helper saves `current_activity` and its host-clock `current_activity_updated_at` together, then regenerates the dashboard. A render failure restores both fields. Ordinary renders, decisions and time spent waiting must not advance this timestamp. A legacy description without a timestamp displays `Last updated: unavailable`; a phase without a description shows an explicit fallback. Neither fallback asserts work that has not been reported.

## Delegated work

Only the main session writes activity state. Before dispatching a subagent or independent batch, checkpoint a sentence describing the work and that it is delegated. For example: "Refreshing the test strategy and test map in a background agent; planning will continue when it finishes."

Tell the subagent not to write workflow activity or edit the dashboard HTML. A legacy single-step Execute subagent may still invoke its required Progress helper, which regenerates the dashboard without changing activity; retain that existing contract. Keep the description visible while it runs, including during a wait for its result; waiting for an agent is still work within the current phase, not a user-input pause. Do not clear activity or fabricate heartbeat updates while waiting. If the parent does other work meanwhile, report that work and mention any outstanding agents when relevant. After a result arrives, checkpoint the actual next activity before continuing; failures follow the stage's existing stop policy.

## Boundaries

Phase changes and Paused, Stopped or Complete checkpoints clear the activity and its timestamp to `none`. Controller runs do this through `workflow.mjs`; legacy runs clear both fields when present in their existing checkpoint procedure. The next work chunk reports fresh activity for the new phase. Do not carry a completed phase's description forward or treat an old timestamp as proof of a failure. The dashboard labels it `Last updated`, not a heartbeat or a promise that work is still running.
