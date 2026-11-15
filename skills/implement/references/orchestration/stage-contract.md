## Stage skills

The stage skills are siblings of this skill in the plugin. Take the `Base directory for this skill:` path printed when this skill loaded, and resolve:

- `<base>/../close-the-gaps/SKILL.md`
- `<base>/../plan-the-work/SKILL.md`
- `<base>/../execute/SKILL.md`
- `<base>/../review-the-code/SKILL.md`
- `<base>/../define-test-strategy/SKILL.md` — only for testing readiness, including refresh after setup

For the explicitly enabled initial local Autopilot refinement route only, follow [refinement-worker.md](../refinement-worker.md): the worker reads the full close-the-gaps skill; the parent does not. Otherwise, read each one with the Read tool when its phase starts — **never** start them through the Skill tool; they are deliberately user-invoked only outside this orchestrator. Follow each skill's instructions including its `## When run by implement` section, passing the inputs that section names.

That inline-stage rule applies only to the pipeline skills listed above. It does not waive any repository's `CLAUDE.md` skill-loading gate: load matching domain/UC skills by the method that repository requires before source exploration, edits or review. Pass that distinction explicitly to implementation, fix and review delegates. If required loading is unavailable, checkpoint the stage's blocker instead of silently substituting a later documentation read.

- Pass the exact **workflow state path**, even for an older run without a dashboard, the current autonomy, and the workflow-decision audit contract to each stage (including readiness and nested regression). The workflow state path does not authorize dashboard backfill. Inline stages share this session's autonomy-change handling; dispatched subagents do not own it.
- Pass the resolved `implement` directory and [activity checkpoint contract](../activity.md) into inline stages and nested skills. The main session owns activity writes, including the description saved before dispatching a subagent and retained while waiting for its result; delegated agents must not write workflow activity or edit HTML. Preserve the contract's legacy single-step Progress-helper exception.
- Read [references/context-discovery.md](../context-discovery.md) and pass its absolute path to every stage and implementation, fix, review or nested delegate. Apply it per repository for absent or partial go-deep context; it overrides only implement-owned assumptions that go-deep files must exist. Preserve mandatory repository loading gates.
- Pass this scope constraint to every stage and delegated agent, including nested skills: never invoke or follow `go-deep` inline during `implement`, in any autonomy mode. Defer full onboarding, repair and broad documentation audits; report the affected repo and concrete gap to the parent for Context discoveries and the completion recommendation. Ticket-scoped documentation maintenance still applies.
- Refinement, planning, and execution run inline in this session; while the current mode is `autopilot`, pass `--autopilot` so their own decision policies replace questions while `execute` dispatches its own per-step subagents. Recompute this from the saved mode for each dispatch, including nested regression; do not reuse the invocation's original flag after a change.
- On workspace runs, pass the saved `workspace_contract` and artifact root through every stage and delegated agent under [the workspace contract](../workspace.md). It overrides standalone root detection and repo-relative artifact assumptions. Newly discovered repos require explicit scope/branch approval before edits.
- Review runs in a fresh subagent, for an independent read of the change (see Review dispatch).
- Lightweight implementation and its fixes run in a fresh subagent with no stage skill (see Lightweight implementation).

If a required stage file is missing, stop and tell the user the exact path that could not be found. Do not improvise the stage.

The feedback retrospective's detailed contract is in `<base>/references/feedback.md`. Read it only after an eligible run has already reached its terminal state; ordinary in-progress phases do not need it.

For runs with `handoff_version: 1`, also read `<base>/references/handoffs.md` before the first stage. Each stage produces the versioned JSON result described there. Validate it and run the read-only `handoff.mjs next` helper after the stage; use its action to select the next phase or question. The Transition table below still specifies the side effects of each route and remains the compatibility path for older runs.

---

