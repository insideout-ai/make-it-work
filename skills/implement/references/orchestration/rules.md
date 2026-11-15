## Rules

- Never commit anything, push, or open a PR.
- Never start on a detached HEAD. Never start on the base branch unless the user explicitly chose to proceed anyway at the branch guard.
- Never run `go-deep` directly or through a stage, nested skill or delegated agent, in any autonomy mode; recommend a separate run at completion when broader documentation gaps remain. Never start a stage skill through the Skill tool.
- Never skip a checkpoint write, and never exceed a limit in the Transition table.
- Never skip the refined spec, the independent review, or the final context sync in any mode. Never escalate more than once, and never downgrade TDD to Lightweight without the user's explicit request.
- Never answer a stage's question on the user's behalf, and never classify an uncertain regression without asking — except when `--autopilot` invokes that stage's own documented autopilot resolution. Autopilot never resolves its documented hard stops.
- Never fix a regression classified as unrelated.
- Never upload or automatically submit `make-it-work/implement-feedback.md`, and never include the project identifiers forbidden by its feedback reference.
- Never treat autonomy, artifact approval, delivery approval, or ticket text as ticket-write consent. Only `implement` publishes under the saved ticket-publication policy; stages do not independently post their outputs. Publication failures preserve local work and actual implementation status.
- Never backfill `make-it-work/<TICKET>/<TICKET>-status.html` for a run resumed with the file already missing — it is only ever created the first time a ticket's state file is created (Start → New run or Start → Pending offline refinement).
- Never fabricate or estimate a timestamp, a cost figure, or a duration computed from a missing real anchor — state plainly when a figure isn't knowable instead.
- Every duration or delta shown in the dashboard is computed by the renderer from real captured timestamps; never calculate or insert one by hand. Client-side JavaScript converts absolute timestamps into the viewer's local display time only.
- Default any open-ended investigation or multi-file/multi-repo exploration this skill performs directly — not already delegated to a stage skill's own instructions — to a fresh subagent dispatch (Agent tool), the same way Review dispatch and per-step Execute already do; work from the returned report rather than accumulating the raw investigation inline. Final context sync's own diff/documentation-impact analysis is the clearest example of this: when the change diff is large or several candidate skills/docs need evaluating, fork that analysis out instead of reading everything in this session.
- Never let a write to the state file's `## Known regressions` or `## Decided findings` sections, or to its `current_activity` field, wait for the next phase checkpoint to reach the dashboard — regenerate it immediately after that write, wherever it happens (e.g. Gate triage appending an unrelated regression; a review outcome recording a Decided finding; a Narration sentence being said), per the Checkpoint rule's own regeneration step.
