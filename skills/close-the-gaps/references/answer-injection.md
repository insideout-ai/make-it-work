<!-- Procedures relocated from the parent SKILL.md without policy changes. -->

Read this guide only at the loading point in [the skill entrypoint](../SKILL.md). `<base>` and bare relative paths in prose or code below refer to the parent skill directory; Markdown links resolve from this file. Phase and step names refer to the complete workflow in that entrypoint and its linked guides.

### Phase 5C — Offline Injection

First read [the question-helper contract](../../../docs/deterministic-artifacts.md#refinement-questions) and run its required parser. Its active/conflict/N/A results replace manual checkbox counting and conditional propagation below; preserve the documented Slack provenance and semantic code-drift checks.

**0. Check for ticket drift (tracker-sourced tickets only).** If `## Session Context → Source` names a tracker and issue ID, and that tracker's MCP integration is available in this session, fetch the current ticket read-only and compare it to the embedded `### Original Ticket` content.
- If they differ, tell the user the live ticket has changed since export, and add a one-line callout directly under the refined ticket's title in Phase 6's output: "> **Note:** the live ticket in `<tracker>` has changed since this refinement was exported on `<date>`; this spec reflects the snapshot taken at export time." The embedded snapshot stays authoritative — do not substitute the live version.
- If the tracker integration isn't available, or the ticket was pasted (no tracker source), say the comparison was skipped (or wasn't applicable) and proceed using the snapshot.

**0b. Read the Product Manager's Slack replies** (only when `## Session Context` has a `### Slack` block). This is read-only; resuming never sends or resends the questions. Read the recorded `Message timestamp`/ID directly when present. Otherwise find the sent message in the recorded DM whose first line matches the recorded first line, posted by the user at or after `Prepared at` (legacy files: `Draft created`). For a pending/unknown send, also compare the exact stored message body before adopting a match. A draft may have been edited by the user before sending, so keep first-line matching for draft mode. Record the discovered message ID and mark delivery `sent`, then read its thread replies from the recorded Product Manager. Older Slack blocks without delivery fields retain their original draft-only meaning.
- **Draft never sent** (draft-only metadata, no matching message), **delivery unconfirmed** (send metadata but no confirmed message), or **no reply yet** (message found, no thread replies from the PM): tell the user which it is, then ask whether to **stop and keep waiting** (stop here; the file stays `Awaiting Answers`) or **answer unresolved questions live now** (ask only unresolved questions below, preserving recorded decisions). Do not label an uncertain send as an unsent draft. (autopilot: see Autopilot Mode — answer live without sending.)
- **Slack unavailable now** (no integration, or the DM can't be read): say so and continue with whatever the file itself holds, so blanks are asked live below.
- Otherwise, map each reply to its question by its leading `Q<n>`. A reply that clearly selects exactly one recorded option (by letter or by unambiguous wording) or that answers an open-ended question becomes that question's answer — record it as if that box had been checked, or as its `**Your answer:**` text, citing `PM via Slack`. A reply that does not clearly match one option counts as blank: when step 3 below asks it live, show the PM's reply verbatim next to the recorded options. A later reply to the same question supersedes an earlier one. An answer recorded by hand in the file takes precedence over a Slack reply only when the two agree; when they disagree, treat it like conflicting checkboxes (step 1 below).

When questions directed to Product are instead resolved live or by Autopilot,
retain each answer's actual source alongside the saved answer. Preserve delivery
metadata separately from local resolution: marking the questions file Answered
does not mean the PM replied or the Slack thread was closed. Carry that
distinction into Phase 6's Product follow-up note. Resume is read-only with
respect to Slack; do not send a resolution FYI or close the thread automatically.

Resolve questions in two passes, since a conditional question can only be evaluated once its gating answer is known:

**Pass 1 — unconditional questions** (no "Answer only if…" label):

1. **Read its answer.** A checkbox-style question is answered if exactly one checkbox is checked (including "Other:", if it has text after the colon) or "Skip" is checked; if more than one box is checked, ask the user live to resolve the conflict, showing them what was checked. (autopilot: see Autopilot Mode — this is a hard-stop, never auto-resolved.) An open-ended question (no checkboxes, just a `**Your answer:**` line) is answered if that line has any text after it.
2. **Re-verify its code finding**, using the file path(s) noted under `## Session Context → Code Findings` for that question:
   - If the code still matches the recorded finding, keep the recorded finding and the file's answer as-is.
   - If it has changed in a way that contradicts the file's answer or the question's premise, flag this to the user now (e.g. "Q3 assumed X, but `path/to/file` now does Y — does your answer still hold?") and ask live using the same options the file recorded. (autopilot: see Autopilot Mode)
3. **Ask live anything left blank** — a checkbox-style question with no box checked and no notes, or an open-ended question with an empty `**Your answer:**` line — via `AskUserQuestion` if it has enumerable options (reuse the header, gap type, and options exactly as recorded in the file) or as plain text if it was recorded as open-ended. For a Slack export, show the Product Manager's unclear reply, if any, verbatim with the question. Batch up to 4 independent blank checkbox-style questions per `AskUserQuestion` call, per Phase 5A's batching rules, rather than asking them one at a time. (autopilot: see Autopilot Mode)

**Pass 2 — conditional questions** ("Answer only if Q_n = X" label): process them in the order they appear in the file — Phase 5B always places a gating question before anything conditioned on it, so by the time you reach a conditional question here, the question it names already has a final status from earlier in this pass or from Pass 1.

- If the question it names is itself `N/A — condition not met`, mark this question `N/A — condition not met` too, without evaluating its own condition — a question gated by a question that was never asked can't apply either. This propagates down a chain of any length. Exclude every such question from Phase 6's Decision Log as well.
- If its gating question was skipped or is itself blocked by a TBD, defer this question with its condition intact. It remains unresolved for Phase 5E; do not ask it prematurely or mark it N/A.
- Otherwise, check the now-resolved answer to the question it names: if it does **not** match the stated condition, mark this question `N/A — condition not met`. Do not ask it, do not re-verify its code finding, and do not include it in Phase 6's Decision Log — it was never actually asked.
- If the gating answer **does** match, treat it exactly like an unconditional question: apply steps 1–3 above to it.

**Resolve any `## Follow-up Needed After This Round` items live**, the same way as step 3 above, once their gating answers are known. Items blocked by skipped answers stay unresolved for Phase 5E. Do not automatically export a second file; only an explicit Phase 5E handoff authorizes another Product handoff. (autopilot: see Autopilot Mode — answerable follow-ups resolve as `open_text`.)

After the answerable questions are processed, follow **Phase 5E**, using the answers gathered here (whether from the file or live) as if Phase 5A had produced them. Only **after** Phase 6 has saved `make-it-work/<TICKET-or-slug>/<TICKET-or-slug>-spec.md`, update this file's status line to `**Status:** Answered — superseded by make-it-work/<TICKET-or-slug>/<TICKET-or-slug>-spec.md`. This marks the export superseded even when the user chose a spec with TBDs; the spec retains those unresolved items. If the session ends before Phase 6 finishes, leave the status as `Awaiting Answers` — a later run must not mistake an incomplete session for a finished one.

---

