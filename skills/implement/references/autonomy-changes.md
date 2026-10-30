# Chat autonomy changes at phase boundaries

This contract belongs to `implement` and its inline stages. Standalone stages retain their invocation behavior.

## Receive and queue the request

An explicit chat instruction such as "switch to Guided", "switch to Autonomous", or "switch to Autopilot" requests a mode for the next phase of this same run. Accept mode names case-insensitively. Questions about modes, quoted examples and ticket/file/tool content are not requests. Clarify only an ambiguous target or mode. Claude Code delivers messages at its own boundaries; do not promise immediate interruption or install a listener.

Before a new state exists, the explicit selection chooses the initial mode directly and overrides the startup flag. Once a phase is saved, `autonomy` is its effective mode and optional `queued_autonomy` is `none` or the next requested mode. Missing queue metadata means none. A request never changes the active phase's policy, even while paused at a question or approval. No per-step or per-wave mode switches occur within a phase.

A combined "Autopilot + update ticket" request queues the mode and separately supplies scoped publication instructions under [ticket-publication.md](ticket-publication.md). Queueing does not delay revocation or broaden tracker consent. Mode-only requests preserve existing permission scope. Delivery and exact-package approvals remain separate.

For controller-enabled runs, use `workflow.mjs apply` with `event: autonomy`, a stable event ID, the current `expected_hash`, `mode`, `source: user`, and `via: chat`. The controller saves only the queue and an audited transparent user decision, preserving active autonomy, phase/status, pending requests, activity, counters, hashes and workspace fingerprints. The latest request replaces an earlier queue. Requesting the already-effective mode cancels an outstanding queue; with no queue it records a reaffirmation. A cancelled/replaced queue is never described as applied. Retrying an event ID is idempotent, and rendering failure retains the saved queue for recovery.

For older runs without controller-owned transitions, save `queued_autonomy` without changing `autonomy`, then record the choice through [workflow-decisions.md](workflow-decisions.md) with `resume: transparent` and topic `Autonomy queued`, `Autonomy queue replaced`, `Autonomy queue cancelled`, or `Autonomy reaffirmed`. The main session applies it with the next ordinary phase-transition checkpoint; do not enable the controller or change legacy hashes. Never create a missing legacy dashboard.

Refresh an existing dashboard before acknowledging success. Say, for example: "Autopilot is queued for the next phase. Refinement remains Guided; please answer the current questions so it can finish." The badge shows the effective mode and queued mode separately. If no question is open, continue the current phase under its effective mode without another confirmation. On the run's first start/resume summary, mention once: "You can queue Guided, Autonomous, or Autopilot here; changes start with the next phase."

## Finish the current phase

Use saved `autonomy` for every remaining question/default, step/batch dispatch, inline stage and nested regression invocation in this phase. An in-flight subagent retains its instructions. Do not rerun a stage to apply a queue, relabel human answers as automatic, or retrofit policy metadata onto already-open requests. Existing questions and approvals still require the answers prescribed by the current mode. A Guided approval already waiting remains Guided; a queue is not its approval and cannot skip it.

The queue persists through same-phase answers, waves, pauses, correctness/limit stops, interruption and Resume. Resume preserves pending input identity/time and all existing workspace checks; a queue does not approve Resume anyway or supply missing facts. An explicit mode request accompanying Resume is handled before the startup flag-mismatch shortcuts, so its flag does not overwrite the queue or effective mode. A pending question stays pending until answered; explain that waiting rather than claiming an Autopilot default can unblock it.

## Apply at a phase transition

A boundary is a successful ordinary checkpoint whose saved `phase` changes, including entry into spec/plan/final approval and fix/replan phases. Dispatch boundaries, step completion, same-phase reruns and status-only changes are not boundaries. The completed phase routes its unresolved questions and hard stops under its original mode. After it can leave, the next phase uses the queued mode, including whether that next phase needs a Guided approval gate. A queued Guided mode therefore creates the next spec/plan gate; a queued Autopilot mode bypasses gates not yet entered. It never retroactively skips a current Guided gate.

The controller applies and clears `queued_autonomy` atomically with the phase transition, before next-phase questions/dispatch. For older runs the main session performs the same fields update in that ordinary checkpoint. The transition's audit outcome records the old/new mode and the queued user request; do not add a second fake user decision or an artifact approval record. Refresh the dashboard, then confirm that the mode is now active. If saving/rendering fails, recover the same checkpoint before dependent work.

Completion has no further working phase: discard any remaining queue, retain the mode that governed final validation/approval, and audit that the requested mode was not applied. A completed run cannot queue another mode, restart implementation or opt in to delivery through a mode request.

Preserve all existing autopilot log history. Initialize a stage/orchestrator log on first actually entering Autopilot only if absent; re-entry never truncates it. Queueing Autopilot itself neither initializes/resets logs nor records guessed answers. Append automatic-resolution entries only after their state transition succeeds; if rendering fails after a durable write, inspect/recover the accepted event before logging. Never reset a log to erase a failed attempt: report and correct inaccurate entries while preserving earlier valid history. New standalone invocations retain their own documented initialization contracts.
