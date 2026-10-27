# Workflow decision audit

Read this contract at Start and Resume and pass it to inline stages. The existing state-file Audit log and its dashboard must record every explicit user decision about how this run proceeds, regardless of whether it arrives through a question tool, ordinary chat, or an explicit invocation option. This includes permission grants, restrictions, refusals and revocations; here/offline/Slack selection and recipient confirmation; autonomy, branch, artifact reuse and resume/redo/stop choices; testing setup and automated/manual policy; implementation mode overrides and downgrades; execution and pause preferences; approvals/requested changes; fix/replan decisions; and delivery opt-in, refusal, exact-plan approval and retry requests. Product requirement answers stay in the refined spec unless they also change the workflow.

Record the actual selected choice, its source, how it arrived, and its scope (ticket/run, repo, recipient, or artifact). Include the user's reason only when supplied. Spec/plan/package/delivery approvals identify the exact version/hash shown; tracker permission identifies the resolved issue/site and allowed operations. References point to the authoritative consent journal/revision, delivery plan/hash, or local approval record when available. The audit is evidence, not another authorization store: publication, package and delivery helpers still enforce their own records. `Draft in Slack`, `--slack`, and a legacy generic Slack choice authorize drafts only. Sending requires an explicit `Send via Slack` choice or `--slack-send`, scoped to this ticket's refinement message and confirmed PM; a redo or retry is not authorized by restoring the original choice. Record recipient confirmation and any fallback or revocation separately from the selected mode; a selected send mode is not evidence that delivery succeeded.

Never describe an automatic default, skipped gate, absent connector, unanswered question, or restored saved choice as a user decision. Use `source: autopilot` for Autopilot resolutions and `source: policy` for other automatic resolutions, with `via: policy`. Keep the existing per-skill Autopilot logs. Silence stays pending. A changed choice gets a new event preserving its predecessor; re-reading an existing answer on Resume does not create another event. Do not copy credentials, raw conversations or unrelated personal data into the audit or dashboard; summarize the scoped instruction faithfully.

## Record before proceeding

For a decision that causes a phase transition, include `Decision: <topic> — <choice>; source: user; via: question|chat|flag; scope: <scope>; reference: <version/hash or journal revision when applicable>` in that transition's ordinary Outcome / reason, retaining its required causal evidence. Do not add a duplicate same-phase row. Before a state file exists, retain all startup choices (including branch, autonomy and refinement channel) and include them with their sources/scopes in its first row; never fabricate a pre-state timestamp.

For every other decision, save a local JSON input and run:

```sh
node "<implement-base>/scripts/dashboard-checkpoint.mjs" decision --state "<state-path>" --input "<decision-input.json>"
```

Example input (substitute the real target, consent scope and journal revision):

```json
{
  "id": "publication-consent-2",
  "topic": "Ticket publication",
  "source": "user",
  "via": "question",
  "choice": "Comments and attachments only",
  "scope": "PAY-123 at https://example.atlassian.net, current run; comment and attachment; description excluded",
  "reference": "publication journal, consent revision 2",
  "resume": "transparent"
}
```

Required fields are `id`, `topic`, `source`, `via`, `choice`, and `scope`. Optional fields are `reference`, `reason`, and `resume`. `source` is `user`, `autopilot`, or `policy`; a user decision uses `via: question`, `chat`, or `flag`, and an automatic resolution uses `via: policy`. The stable `id` identifies this occurrence, not the general question: include plan/fix round, artifact hash, consent revision or another occurrence identifier. Repeating the same input after interruption is idempotent; a changed answer needs a new ID. Related answers to a batched prompt remain individually identifiable. If a choice is superseded or cannot be applied (for example sending in Slack when no PM can be resolved), record the requested choice and why it was not applied; do not report it as the effective workflow. An explicit Slack draft/send choice remains effective alongside Autopilot, subject to its existing recipient and delivery rules.

The helper captures the host UTC clock, appends a same-phase row, and refreshes an existing dashboard. Do not capture or supply its timestamp yourself. It preserves fields, phase, counters, hashes and implementation completion time, and never creates a missing legacy dashboard. Its machine marker stays in the Markdown audit; the dashboard displays the readable decision, source, scope and reference.

Persist the choice in its existing authoritative state/journal, then record it before dependent work or another dispatch. A failed audit write/refresh must be reported and repaired before dependent work; do not retry a denied write through another tool or claim the checkpoint succeeded. Audit evidence remains saved if rendering fails, and repeating the same ID repairs the snapshot without another row. Permission revocation remains effective even if auditing or rendering fails; never restore an older grant. Independent local work may continue under existing failure rules.

## Implementation mode

In an adaptive run, record the risk assessment as a decision with `topic: Implementation mode`, `choice: <mode> (<risk> risk)`, `scope: <TICKET> run`, and the rationale as `reason`. An assessed mode uses `source: policy` (`autopilot` under Autopilot) with `via: policy`; a mode forced by `--mode` or chat uses `source: user` with `via: flag` or `chat`, and its `reason` notes any disagreement with the assessment. A Guided **Approve with <the other mode>** belongs in its `spec-approval` transition row. A user's explicit downgrade from TDD to Lightweight is its own decision. An escalation is a transition, not a separate decision: the row into `plan` whose reason starts with `Escalation:`. When the user requested it, that row continues with the ordinary `Decision:` text.

## Resume classification

`resume` defaults to `in-phase`: it preserves the evidence that a phase started and has not closed. Use `transparent` only for choices independent of phase execution, such as publication permission changes, chat autonomy changes, and post-completion delivery choices. Execution mode, pause mode, test strategy/setup, recipient selection and fix dispatch remain `in-phase`. Never mark a choice transparent merely to obtain a clean resume.

On Resume, after the existing legacy-field normalization and before last-row classification, run the read-only command:

```sh
node "<implement-base>/scripts/dashboard-checkpoint.mjs" resume --state "<state-path>"
```

Use its `last_work_row` for the existing last-row/phase-closure classification; retain all fingerprint, pause, context-check and interruption checks. It ignores explicitly marked transparent same-phase decisions and legacy autonomy/publication decision rows only. A transition still counts even when its outcome describes a decision. Other same-phase rows still cannot prove a phase closed. Do not ignore every row starting with `Decision:`.

## Stage and delivery ownership

The main `implement` session owns decision checkpoints. Inline stages report workflow choices to that session as they resolve, using this contract before dependent work; do not wait for the terminal handoff, reset stage progress, or add a new handoff schema. Nested testing/regression choices follow the same contract when a workflow state path is supplied. Subagents report requests for human input; they do not independently update the workflow audit. Existing phase-transition rows carry decisions resolved by `handoff.mjs next`.

After completion, `implement` records Prepare delivery/Not now and `deliver` records its explicit opt-in when invoked directly, Stop/exact-plan approval and authorized retry requests in the same audit with `resume: transparent`. Reference the delivery plan hash for exact-plan approval. Preserve `status: Complete`, phase, counters and implementation timing; record before `deliver.mjs run`. Keep the delivery journal as the authority for actual commits, pushes, PRs and approval. An approval event is not a claim that an external operation succeeded.
