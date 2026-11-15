# Opt-in local Autopilot refinement worker

Read this only for `--refinement-worker` on a new run or saved
`refinement_worker_version: 1`. This first slice supports initial refinement in
one approved repository, Autopilot, destination `here`, with no accepted spec.
It does not delegate risk assessment, planning, approvals, publication or feedback.
Never add its marker to an existing run. Default and standalone behavior is unchanged.

For this eligible route the parent does **not** read `close-the-gaps/SKILL.md` or
the worker's detailed investigation. The worker reads it. Parent contracts and
repository startup/context gates still apply. Explicit Slack/research requests,
workspace scope, redo/requirements-conflict refinement, and a change away from
Autopilot are outside this first slice: reconcile/cancel the actual worker, keep
its artifacts and follow the existing inline route without losing decisions.
Do not turn unsupported delivery into local delivery or waive a required question.

Resolve `<worker>` to `<implement-base>/scripts/refinement-worker.mjs`.
All input files and worker artifacts are local run data. Request/handoff paths
passed to this helper are absolute or relative to the ticket directory.

1. Record the existing parent-owned activity: refinement is delegated. Save JSON
   `{"task":"<original ticket/pasted requirements and already-resolved inputs>"}`
   and call `prepare --root ROOT --state STATE --input JSON`. Keep the original
   requirements complete, including explicit restrictions and required skills;
   do not substitute an invented spec. If an assignment exists, `inspect` and
   reconcile actual runtime history before doing anything. A journal is not
   proof of a live/completed/cancelled agent.
2. Dispatch a **general-purpose Agent**, with fresh stage context, to read only
   [the worker contract](refinement-worker-task.md) and the returned assignment
   path first. Include the resolved plugin/Implement paths and explicitly instruct the worker to read the complete `close-the-gaps/SKILL.md` before ticket investigation or constructing any handoff, including an immediately blocked result. Do not fork/copy the
   parent's whole transcript, load the full stage into the parent, or inline
   research/logs in its prompt. Once startup/context prechecks are complete, do not open the delegated task’s source or authoritative inputs in the parent before dispatch or while the worker investigates; the parent reads the returned spec and compact evidence for its existing assessment. Attach the *actual* returned runtime ID using
   `attach` with `{"agent_id":"..."}`. Use normal runtime waiting/result tools;
   #101's verified wait rules apply, not metadata claims or parent polling.
3. A worker may return `Parent request: <path>` before dependent work. Read that
   small envelope, verify its scope, then call `service` with
   `{"request":"<path>"}`. It supports only activity and automatic local context
   update audit notes via existing parent checkpoint APIs. It never grants
   consent, performs external actions or advances a phase. Feed the returned
   reply path to the **same** worker using the host's supported resume/message
   API (`SendMessage` to the actual agent ID on the tested 2.1.311 host). After a successful resume, yield for its native completion notification. Do not poll ListAgents, repeatedly list files, block on TaskOutput or use sleeps to keep the parent turn open. Do not reconstruct from raw logs. If runtime resumption is unavailable,
   first prove the prior agent is finished/unavailable, record cancellation and
   continue inline from the saved assignment, requests/replies and artifacts.
   This first slice does not replace a runtime ID or start a second writer.

4. On `Handoff: <path>`, call `accept` with `{"handoff":"<path>"}`. This checks
   assignment/run/phase/autonomy/scope, application preservation and newest v1
   handoff. It does **not** advance state or complete refinement. The opt-in controller also requires that accepted receipt before routing a gaps handoff. Read the spec
   and a compact handback (at most roughly 1,500 characters: result, paths,
   unresolved facts and risk factors). Assess risk and route the unchanged gaps
   handoff through the existing controller/approval logic. If the parent finds a material spec error before routing, call `revise` with a precise `reason`, then resume the same worker and require a newer gaps handoff. Earlier result hashes remain in history. A changed/consumed phase cannot be reopened by this helper. Hard stops and
   `needs_input` follow that same existing logic; never answer for the user.
5. On interruption, inspect both assignment and actual runtime evidence. Resume
   the known agent when possible. On a changed choice or unavailable worker,
   record `cancel` with a reason after runtime reconciliation, then continue
   inline from saved artifacts. Cancellation retains any returned receipt and artifact hashes, including when a changed choice makes revision stale. Cancellation metadata does not stop an agent.
   Do not invent a successful result or silently launch another worker.

`prepare` is idempotent for the same task; changed task/agent IDs, stale results
and changed artifacts require reconciliation. `service` is idempotent by request
ID and content hash. Replaying an accepted result never increments workflow
counters. After controller acceptance, normal controller idempotence owns retries;
do not re-accept a completed earlier phase as if it were current.

Keep detailed investigation/test output in the worker and local files. The parent
receives only requests, required artifacts and the compact handback. It still
owns user interaction, decisions, all state/dashboard writes, publication and
independent-review dispatch. An agent's prose never supplies permission or proof
that a runtime task is live.
