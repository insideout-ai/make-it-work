# Refinement destination

Apply this at startup and before `close-the-gaps` asks its first product question. The destination is a separate decision from autonomy and tracker-write consent.

## Resolve the choice

Use the latest explicit destination instruction for this ticket; otherwise retain `refinement_destination` from the workflow state:

| Value | Meaning |
| --- | --- |
| `none` or missing | No destination has been resolved. |
| `here` | Answer product questions in this session. |
| `slack-draft` | Prepare a Slack DM for the user to review and send. |
| `slack-send` | Send this ticket's refinement message to its confirmed PM. |

For an older run with no resolved field, recover the most recent unambiguous destination choice from its Audit log: `Refinement questions: here`, `Refinement questions: Slack draft`, or `Refinement questions: Slack send`. Legacy `Refinement questions: Slack` means draft-only. Preserve the original evidence when saving the recovered field. Missing flags, an omitted startup question, previously displayed product questions, autonomy, and tracker consent are not evidence that the user chose `here` or authorized Slack sending.

A pending questions file is an injection run: retain its delivery metadata and follow Phase 5C without choosing a new destination or sending again. An accepted/reused spec that skips refinement needs no destination; do not retrofit one in later phases or completed runs.

If the destination remains unresolved:

- **Guided or Autonomous:** perform capability discovery below, then ask the destination question and wait for an answer before any product questions. An explicit autonomy selection in chat does not waive this separate choice.
- **Autopilot:** save `here` as a policy default and record it as automatic, without asking. Retain any explicit Slack choice instead; Autopilot never selects sending itself.

## Discover capabilities and ask

Check the tools available in this session. If integrations or their tools are deferred, use the available tool-discovery mechanism (for example `ToolSearch`) to search for Slack capabilities before deciding Slack is unavailable. Inspect whether lookup/DM addressing and the requested draft or send action are supported; do not send a probe message or create a draft to test access. Availability in another app/session, a Slack plugin name, or the presence of Jira tools does not establish Slack access here. If discovery fails or cannot verify support, explain that limitation and omit the unverified action.

Only when Guided/Autonomous still needs a destination, ask a separate startup question after autonomy is resolved: **Where should refinement questions go?** Never include this question in the same `AskUserQuestion` call as the autonomy question: its presence depends on that answer. Either interactive Autopilot choice follows the no-prompt policy default above, just like `--autopilot` or an explicit chat selection. The default `here` does not enable live product questions in Autopilot; missing required answers still trigger the stage's documented hard stop. For Guided/Autonomous, do not make the question conditional on Slack being available. Offer:

- **Answer here (Recommended)** — answer product questions in this session.
- **Draft in Slack** — only when supported; prepare a DM for review and manual sending.
- **Send via Slack** — only when supported; send to the confirmed ticket PM.

If no Slack action is supported, state the concrete discovery result before the question and offer **Answer here (Recommended)** and **Stop for Slack setup**. If only one Slack action is supported, explain the unavailable action and offer the supported choices. Do not silently select `here` or claim that an unverified integration is disconnected.

**Stop for Slack setup:** before a new state exists, stop before branch creation. For an existing run, retain an unresolved destination, checkpoint `status: Paused`, `pause_reason: refinement destination pending`, and `current_activity: none`, refresh an existing dashboard, and stop. Resume at the missing-destination check after normal workspace checks.

An explicit destination instruction already supplied in chat or invocation options satisfies the question; do not ask it again. Check capabilities before using a requested Slack action, and follow Phase 5D's documented fallback if that action cannot be used. A choice supplied alongside an interactive Autopilot selection also remains effective.

## Persist and dispatch

Hold a startup answer until Start creates the state, then write `refinement_destination` and record the choice and source in the first Audit-log row. Use the existing compatibility labels `Refinement questions: here`, `Refinement questions: Slack draft`, or `Refinement questions: Slack send` in that row. On recovery or a later change, save the field and the workflow-decision audit entry before dependent work, then refresh an existing dashboard. Record user selections as user decisions and Autopilot's default as policy; never manufacture user consent.

Before dispatching refinement, verify that the destination is resolved and pass `--slack` for `slack-draft`, `--slack-send` for `slack-send`, and no Slack flag for `here`. The inline stage independently checks the saved choice before its first product-question wave; if the caller omitted it, the stage uses this same resolution procedure rather than silently assuming `here`. Preserve any product answers already given when repairing an interrupted session.

Selecting `slack-send` authorizes only this ticket's refinement message. Keep Phase 5D's recipient confirmation and message preview; do not introduce another send-confirmation question. Draft mode never authorizes sending. A redo or retry requires its existing explicit authorization. Both Slack destinations export the questions and pause for replies; delivery status remains separate from the selected destination.
