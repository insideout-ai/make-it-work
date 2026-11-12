# Optional Jira publication

Read only after the interactive run has a complete saved local epic and slice set. Autopilot never enters this phase.

Make one concrete offer using the available Jira connector's actual capabilities. Name the target project, whether an existing ticket is updated or a new Epic is created, every proposed slice Story/Task and its parent, and any native hard-dependency links or source overview comment. Clarify missing mandatory destinations/values only where required. The source ticket need not be the destination or a valid parent; never convert or overwrite it merely because it was supplied as input.

Reuse explicit scoped authorization already given; otherwise wait for permission on the concrete offer. A general request to run the skill or read Jira is not publication authorization. Declining publication or missing Jira access leaves local preparation complete. Do not ask for unavailable capabilities or promise them.

For an epic description update, follow `shape-the-epic`'s full saved description and read-back rules, including its decision log. For slice creation, follow `slice-the-epic/references/jira-creation.md`, including Story/Task choice, parenting constraints, required values, hard-dependency links, and any separately scoped complete-overview source comment. Suppress the stages' duplicate offers. Stage logs and local workflow state are not ticket attachments unless specifically authorized.

Before the first external operation, save a `publication` event recording the user's scoped consent and concrete operation list. Save each operation's target and outcome afterward. Record returned keys/URLs before the next operation. Report created, reused, failed, pending, and uncertain results separately. On interruption, reconcile the saved journal with Jira before retrying; do not create duplicate tickets, links, or comments. Retry uncertain/failed writes only under the user's request or authorization that explicitly covers those retries. Include local deliverable links regardless of Jira results.
