# Compaction before test preparation

New runs with `compaction_version: 1` support one compaction offer. Existing runs
without the marker retain their route; never backfill compaction fields on Resume.
Lightweight skips it. A Lightweight run that escalates becomes eligible on its
first accepted TDD plan. Reused plans are eligible after acceptance and readiness.

At the first active `write-tests` boundary, finish required plan validation,
Guided approval and applicable accepted-plan publication before this checkpoint.
Wait for all prior workers. After asynchronous dispatches, reconcile the native agent/task inventory before this event so completed workers are not mistaken for live work. Save any outstanding decision rationale, constraints,
unverified assumptions and deferred checks in the authoritative spec/plan/readiness
artifacts. A recovery note can reference longer decisions; do not copy those files.

Inspect current state and apply the normal controller event with `event:
compaction-checkpoint`, a stable event ID, current `expected_hash`, explicit
repository roots and optional `notes` (at most 4,000 characters for material
context not already saved). The controller resolves and saves the recovery file.
This event belongs before test-edit authorization or a Write Tests worker dispatch.
Do not manually write checkpoint fields or answer its questions through a policy.

Guided and Autonomous present the returned pending question: **Compact first
(Recommended)** / **Continue**. Use the existing input lifecycle to resolve the
actual answer. Continue proceeds immediately. Compact first creates a second
durable wait. Display `next_action.compact_command` as a copyable slash command,
the recovery-file link and `next_action.resume_invocation`, then say:

> Planning is complete and your progress is saved. Run the compaction command
> above, then say **continue**. I'll resume at Write Tests using the accepted plan.

End the turn at this legitimate saved wait. Do not try to invoke `/compact`
through Skill, Bash or a nested CLI. The user can continue without compacting;
record continuation without claiming compaction occurred. No test worker may be
running during this wait. An unanswered offer is redisplayed, never recreated.

On continuation read the authoritative state and saved recovery file, reload the
standing rules, applicable project guidance and Write Tests integration guide.
Resolve the saved input only after existing repository/worktree checks and current
readiness validation. The controller checks spec/plan revisions and the recovery
binding, preserving valid approvals, publication consent and queued autonomy.
Changed inputs follow existing explicit revalidation/acceptance routes. A missing
or damaged recovery artifact must be repaired from authoritative evidence, never
treated as permission to dispatch or restart the workflow. After accepted drift,
discard the stale optional compaction wait through the existing Stop/recovery
route and explicitly redo planning; do not silently rebind its old approvals.

Autopilot applies the checkpoint event without opening an interactive wait. It
continues under native auto-compaction, whose threshold is controlled by Claude
Code. Never promise automatic compaction at this phase boundary. No mode grants
new publication, delivery, test-edit or implementation permissions.
