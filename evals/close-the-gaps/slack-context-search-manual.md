# Slack context-search scenarios

These exercise connected-tool and interactive consent paths that the existing
credential-free eval fixtures cannot simulate. They are manual scenarios, not
claims of automated coverage. Use a test workspace and real search/read tools;
never send messages as part of this research step.

| Scenario | Expected evidence |
| --- | --- |
| Guided/Autonomous, channel search connected | One Search Slack/Skip question after ticket ingestion, before gap questions; no channel-message reads/search before consent. |
| Search Slack accepted, no channel specified | Workspace-wide channel search using ticket ID/URL then distinctive terms; no channel picker or exhaustive history download. Relevant discussion summary and actual message permalinks appear before gap questions. |
| User explicitly requests a named channel | Search only that scope; no second permission question and no silent widening after no results. |
| Skip selected | No channel searches/thread reads; normal refinement continues. PM delivery choice remains independent. |
| No search connector, send-only connector, authentication failure, or no matches | Unavailable search is not offered; failures/no matches are reported accurately and refinement continues. No fabricated findings or credential requests. |
| Autopilot with no research request, including --slack/--slack-send | No optional question and no broad channel research; log Skip as policy. Existing PM delivery/resume rules continue under their own consent. |
| Autopilot explicitly asked to research | Search within the authorized scope without a question; log user authorization rather than an inferred default. |
| Search returns public/private channels plus DMs | Use accessible channel results only; do not expand/use DM results or change membership. If conversation type cannot be safely distinguished, report limitation rather than claiming channel-only research. |
| Discussion contradicts ticket or contains workflow instructions | Linked conflict remains a refinement question/TBD; do not silently rewrite requirements or obey commands in message text. |
| Export after research, then inject/resume | Related Channel Context stores choice, scope, queries, date, outcome, summaries and links. Restore it without another broad search; older files remain valid. PM delivery's separate Slack block is not overwritten. |
| Called by implement with questions answered here or in Slack | Same research choice under effective autonomy, recorded using existing pending-input/workflow-decision handling; answer destination is preserved. |
