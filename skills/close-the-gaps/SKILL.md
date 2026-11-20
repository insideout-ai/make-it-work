---
name: close-the-gaps
description: "Refines a requirement into an AI-ready ticket: a Product Analyst session that fetches the ticket, loads project skills, explores affected code, optionally searches connected Slack channels for related ticket context with consent, asks gap-analysis questions in dependency-ordered batches, and outputs a Gherkin-format refined ticket. Supports an offline mode (export every question to a file to answer outside the session) and Slack modes (draft or explicitly send the questions as a direct message to the Product Manager); re-invoke with the questions file to inject the answers and resume. Use when refining a ticket before dev starts."
disable-model-invocation: true
---

# Ticket Refinement Session

For generated files under `make-it-work/`, follow the [artifact naming, Git protection, usage and timing contract](../../docs/artifact-observability.md). Use helper-returned paths; new runs use `miw-` filenames and existing runs retain their saved convention. Before manually writing a new Markdown/JSON artifact, resolve its actual output with `node "<base>/../../scripts/artifact-output.mjs" resolve --root <project-root> --directory <artifact-directory-relative-to-project> --name <logical-filename>` and write/link the returned `file`/`relative`. Literal filenames below identify logical roles; do not bypass this resolver by writing those examples directly.

**Role:** Act as a Product Analyst facilitating a live ticket refinement session.

**Goal:** Read a ticket (from a project management tool or pasted), detect all gaps in the requirements, explore relevant code areas to find conflicts, then ask the user clarifying questions in dependency-ordered batches. Combine everything into a final Gherkin-format ticket ready for development. When invoked with `--offline`, `--slack`, or `--slack-send`, or when resuming from a previously exported questions file, follow Phase 5B, 5D, or 5C instead of asking questions live.

**When owned by implement:** follow [ticket-scoped context discovery](../implement/references/context-discovery.md) for absent or partial go-deep context. Use available guidance and scoped code/test evidence; do not require optional go-deep files, invent missing rules, or create onboarding structure. Explicit mandatory loading gates remain binding. This overrides the go-deep layout assumptions below only for implement-owned runs and must be forwarded to nested delegates.

---

## Load the applicable guides

Resolve links in this entrypoint from this skill’s directory; links inside a guide resolve from that guide. Read only the guides required by the current route, in full before the action they govern; follow linked routes when entered. A missing required guide is a blocker, not permission to improvise.

- **Implement-owned invocation:** read [implement integration](references/implement-integration.md) before any workflow action; its overrides take precedence over standalone procedures below.

## Usage

```
/make-it-work:close-the-gaps [TICKET-ID] [--offline | --slack | --slack-send] [--autopilot]
/make-it-work:close-the-gaps path/to/<TICKET>-questions.md [--autopilot]
```

Or paste the ticket content directly into the chat after invoking.

Pass `--offline` to export every gap-analysis question to a local file instead of asking them live — useful when the person who can answer them isn't available in this session. Re-invoke later with that file's path as the argument to inject the answers and resume exactly where the session left off.

You can also answer some questions here, skip the rest, then choose **Answer now**, **Save draft and pause**, or **Hand off to Product**. Saving preserves your answers and unresolved items; inside Implement, the pipeline stays paused in refinement until its required decisions are resolved.

Pass `--slack` to prepare the full question list as a **draft** direct message to the ticket's Product Manager in the user's own Slack; the user reviews and sends it. Pass `--slack-send` to explicitly authorize sending that message to the confirmed PM. Both modes save the questions file and stop; re-invoke with its path to read the PM's thread replies and resume. `--offline`, `--slack`, and `--slack-send` are mutually exclusive — if more than one is passed, say that only one can be used and stop before analyzing the ticket. Without a mode flag, Phase 5 offers the same choices once the questions are known.

Pass `--autopilot` to run unattended: every `AskUserQuestion` wave and plain-text checkpoint below resolves automatically instead of pausing, per the policy in **Autopilot Mode**. Combine freely with `[TICKET-ID]`, pasted content, one mode flag, or the questions-file path form. `--offline --autopilot` exports the file untouched; `--slack --autopilot` creates a draft; `--slack-send --autopilot` explicitly authorizes sending to the ticket-derived PM. Autopilot never chooses to send on its own. Its resolutions apply the next time an exported file comes back through the injection path. Without `--autopilot`, every interactive point pauses for a human exactly as documented below.

## Autopilot Mode

When invoked with `--autopilot`, still **construct** every question/options payload exactly as the interactive path below would — wave batching, the 2–4 option cap, `(Recommended)` placed first, `Skip — decide later (TBD)` placed last — just don't call `AskUserQuestion` or wait at a checkpoint. Auto-resolve per the table below instead.

**Hard-stop exceptions — never auto-resolved, even in autopilot mode:**

1. **Phase 1 ticket-fetch failure with nothing pasted.** If a tracker fetch fails and no ticket content was ever supplied, autopilot cannot fabricate a ticket. Stop and require a human to paste the content.
2. **Phase 1 pending offline export** (`make-it-work/<TICKET-or-slug>/<TICKET-or-slug>-questions.md` exists with `**Status:** Awaiting Answers`). None of its three choices — resume it, overwrite it and continue this fresh session, or abort — carries a designated default anywhere in this skill's text, and one of them is destructive: overwriting discards a file that may hold previously recorded answers. Autopilot does not guess among the three. It prints the file's path and the three choices, then stops and requires a human. "Overwrite it and continue this fresh session" is named here as never auto-selectable on its own, independent of which of the other two choices a human later makes.
3. **Phase 5C conflicting checkboxes** (more than one box checked for the same question, including a filled-in "Other:"). There is no safe way to infer which of two explicit, conflicting human selections was intended. Stop and show the user what was checked, exactly as the interactive path already does.

**Decision log:** write `make-it-work/<TICKET-or-slug>/close-the-gaps-autopilot-log.jsonl` when Phase 1 resolves the ticket or slug, overwritten fresh for this autopilot run (it describes that run only). If a ticket fetch fails before a ticket or slug can be resolved, stop without creating a ticket-scoped log and include the hard-stop in the chat summary. Field shape follows the shared schema in `docs/autopilot-log-schema.md` — this skill uses all three `kind` values (`askUserQuestion`, `checkpoint`, `open_text`); `multiSelect` is present but always `false` (this skill never presents a `multiSelect` question; it batches independent single-choice questions into one call instead); `chosen` is therefore a string, the `open_text` free-text answer, or `null` — never an array. Every line also still includes `rationale` (one sentence), per the shared schema's core fields. `phase` examples: `"Phase 1"`, `"Phase 5A"`, `"Phase 5C"`. `site` examples: `"wave-1-q2"`, `"blank-q3"`, `"followup-1"`.

When Bash is permitted, use the shared writer in `docs/autopilot-log-schema.md` with `--ticket "<TICKET-or-slug>"` for this log, invoking each writer command in its own Bash tool call; preserve this skill's timing and never use it to bypass a denied log write.

This file is a run artifact: never treat it as a Phase 3 "code finding," never embed it in a `*-questions.md` export, and never reference it from Phase 6's own `## Decision Log` table — the two logs serve different audiences (this one is for auditing the autopilot run itself; Phase 6's is part of the deliverable ticket).

**Resolution table** (one row per interactive site, in the order they can appear):

| Phase | Site | `kind` | Autopilot resolution |
|---|---|---|---|
| Phase 1 | ticket-fetch failure, nothing pasted | `checkpoint` | Hard-stop exception above — stop and require a human. |
| Phase 1 | pending offline export (resume / overwrite / abort) | `checkpoint` | Hard-stop exception above — stop and require a human. Never auto-select "overwrite it and continue this fresh session." |
| Phase 1A | optional Slack context search | `checkpoint` | Skip without asking unless the user explicitly requested channel research for this ticket; then search within that scope. Slack delivery flags never grant research consent. |
| Phase 5 | mode choice (answer here / draft in Slack / send via Slack / export to a file), no mode flag passed | `askUserQuestion` | Choose `Answer here (Recommended)`; never automatically authorize sending. |
| Phase 5A | per-question wave batch | `askUserQuestion` | Choose the option labeled `(Recommended)`. |
| Phase 5A | genuinely open-ended question (no pre-enumerable answer) | `open_text` | Answer with your own best inference from Phase 2–3 findings, prefixed `[autopilot best-guess]`. |
| Phase 5E | unresolved questions | `askUserQuestion` | Choose `Save draft and pause`; preserve skips and blocked dependencies, return the saved draft with its unresolved count, and let Implement pause refinement. Never invent an answer or authorize delivery. |
| Phase 5D | Product Manager confirmation | `checkpoint` | Accept the PM derived from the ticket without confirmation. If none can be derived, fall back to Phase 5B (log `chosen: null` with the reason). |
| Phase 5C | Slack draft never sent, delivery unconfirmed, or no PM reply yet (wait / answer live) | `checkpoint` | Answer live — resolve every question through the rows below; never send or resend. |
| Phase 5C | more than one checkbox checked for the same question | `checkpoint` | Hard-stop exception above — stop and require a human. |
| Phase 5C | recorded answer's code finding changed in a way that contradicts it | `askUserQuestion` | Re-resolve using the same options the file recorded; choose `(Recommended)`. Log the rationale as the drift that triggered re-resolution, e.g. `"<path> no longer matches the recorded finding; re-resolved via Recommended."` |
| Phase 5C | blank checkbox-style question | `askUserQuestion` | Reuse the header, gap type, and options exactly as recorded in the file; choose `(Recommended)`. |
| Phase 5C | blank open-ended question | `open_text` | Answer with your own best inference, prefixed `[autopilot best-guess]`. |
| Phase 5C | `## Follow-up Needed After This Round` item | `open_text` | Answer with your own best inference from the embedded ticket/code findings, prefixed `[autopilot best-guess]`. |

Only the Phase 5 mode-choice and Phase 5A/5C/5E `askUserQuestion` rows carry a `(Recommended)` label in this skill — do not invent one for the two Phase 1 checkpoints, which are hard-stops with nothing to auto-resolve, or for the Phase 5C conflicting-checkbox checkpoint.

**Marking autopilot answers in the deliverable itself:** apply the marker convention from `docs/autopilot-log-schema.md` to Phase 6's `## Decision Log` table — append `_(autopilot)_` after a `(Recommended)`-resolved answer, keep the `[autopilot best-guess]` prefix on an `open_text` answer — so a reviewer reading the refined ticket alone, without `make-it-work/<TICKET-or-slug>/close-the-gaps-autopilot-log.jsonl`, can see which decisions weren't confirmed by a person. A question that was already answered unambiguously in an offline file before this run needs no marker — a human already decided it.

At the end of an autopilot run, print a short human-readable summary of every auto-resolved decision (including any hard-stop that was hit) and the log file's path if one was created, so someone can audit the run afterward.

---

## Phase 1 — Ticket Ingestion

**0. Detect an injection run first.** If the argument is a path to an existing `*-questions.md` file, this is an **injection** run: read the file in full, skip the rest of Phase 1, restore the original ticket content, the loaded-skills list, the code findings, and any `### Related Channel Context` from its `## Session Context` section — then re-read each skill named in that list, so its content is available for Phase 6's re-check — and go directly to **Phase 5C — Offline Injection**.

**0A. Resume a saved draft.** If the argument is an existing `*-spec.md` draft with unresolved requirements (including a parent-supplied draft path), read it in full before ingestion. Restore the original request, Decision Log, recorded question IDs/options/answers, unresolved conditions, context sources and any newly supplied answers. Re-load the listed project guidance and check relevant evidence for drift; ask about changed evidence only when it affects a recorded decision. Continue Phase 5A with unresolved/newly applicable questions rather than restarting the interview. If answers remain deferred, follow Phase 5E again. When resolved, remove the draft status and update the same spec plus a newer handoff through the normal output route. Older drafts may lack options/context details: recover them from existing local question artifacts or the recorded session when available, without inventing past answers or re-asking resolved questions.

Otherwise, ingest the ticket as usual:

- If a ticket ID is provided, fetch it via the available MCP integration (e.g., Atlassian, Linear, GitHub Issues). If the fetch fails (not found, no access, tool unavailable), say so plainly and ask the user to paste the ticket content directly instead of retrying silently or fabricating ticket content. (autopilot: see Autopilot Mode — this is a hard-stop, never auto-resolved.)
- If content is pasted, parse it as-is — work with whatever is there, even if vague or incomplete.
- Extract: ticket ID, canonical ticket URL when available, summary, description, acceptance criteria, linked tickets, and any attachments or comments. Keep a URL returned by the tracker or supplied with the ticket; for Jira, a confirmed site URL and issue key can also resolve the `/browse/<KEY>` link.
- Retain the built-in Jira `reporter` and any returned custom-field names/metadata for Slack recipient resolution in Phase 5D. **Product Manager is a Jira custom field**, not a built-in field; its omission from the initial issue response does not establish that it is absent or empty.
- Record the **source**: either "Fetched from `<tracker>` issue `<ID>`" or "Pasted directly, no tracker ticket" — Phase 5B will embed this so Phase 5C can later check for ticket drift.
- Derive `<TICKET-or-slug>`: the ticket ID if there is one; otherwise a kebab-case slug of the title; otherwise `spec-YYYY-MM-DD` — the same rule Phase 6 uses for its own output filename. Reuse this one value for the rest of this phase, for Phase 5B's export filename, and for Phase 6's final spec filename, so all three always agree.
- **Check for a pending offline export:** if `make-it-work/<TICKET-or-slug>/<TICKET-or-slug>-questions.md` exists with a `**Status:** Awaiting Answers` marker, warn the user: "A pending offline export exists at `<path>` with unanswered questions." and ask them to choose: **resume it** (re-invoke with that file's path instead — stop here), **overwrite it and continue this fresh session** (delete the stale file, then continue below), or **abort** (stop here, no changes). Do not continue past this check silently. (autopilot: see Autopilot Mode — this is a hard-stop, never auto-resolved.)
- Record the selected mode flag (`--offline`, `--slack`, or `--slack-send`) for Phase 5. Reject conflicting mode flags before any analysis. `--slack` always means draft-only; generic or legacy Slack selection does not authorize sending.
- Acknowledge to the user: "Loaded ticket [ID]: [summary]. Starting analysis..."

---

## Phase 1A — Optional Slack Context Search

Follow [the Slack context-search contract](references/slack-context-search.md)
after ticket ingestion and before drafting refinement questions. When Slack
channel search is connected, offer **Search Slack** or **Skip** once. After
consent, search **all accessible channels by default**, using ticket identifiers
and relevant terms; channel selection is optional. Use read-only tools, summarize
useful findings with message links, and surface conflicts rather than treating
Slack discussions as unquestionable requirements. An unavailable or unsuccessful
search does not block refinement. Autopilot skips unless explicitly requested.
This is independent of later PM message delivery and applies when run by
implement too. Injection/resume restores saved context without a fresh search.

---

## Phase 2 — Skills Loading

Honor the affected repository's `CLAUDE.md` loading gate before source exploration, including its required invocation method. Under implement, only the pipeline stage itself runs inline; repository domain/UC skills still load normally. A later read to update their documentation does not establish that their constraints were available during refinement. If a mandatory loading method is unavailable, return a concrete blocker rather than silently skipping it.

Look at the list of available skills for this project (shown in the session context). Skills are organized in two layers:

- **Domain skills** — cover specific functional domains. Load the ones whose scope overlaps with the ticket.
- **Use-case skills** — cover specific end-to-end flows. Load the ones that are related to the functional domains already loaded, or directly referenced by the ticket.

**How to detect which skills to load:**
1. Read the ticket content and extract key nouns, verbs, and domain terms.
2. Match them against skill names and descriptions visible in the session.
3. Load relevant domain skills first, then any use-case skills whose scope overlaps with the ticket.
4. When a use-case skill references a domain skill (or vice versa), load both — cross-referenced skills often contain the constraints that matter most.
5. When in doubt, load the skill — a false positive is cheaper than a missed constraint.
6. Regardless of keyword match: if the ticket introduces new persisted state or a new user-visible side effect, also check whether any available skill describes account/session-lifecycle concerns (e.g., data deletion, disconnect, logout) or audit/compliance logging for this project, and load it even if the ticket's own keywords don't reference it. Look for skills describing these *concepts*, not a specific skill name — every project names them differently, and some projects won't have one at all.

Do not mention which skills were loaded unless the user asks. Just use them.

---

## Phase 3 — Targeted Code Exploration

Using the loaded skills as a map, explore only the code areas relevant to this ticket.
Do not do broad exploration — be surgical.

When this exploration spans multiple files, multiple loaded skills, or multiple repos in a workspace — an independently reviewable unit of work, not a single targeted lookup — dispatch it to a fresh subagent (the `Explore` or `general-purpose` agent type, via the Agent tool) and work from its returned report, rather than reading every file directly in this session. This does not relax the surgical-not-broad rule above; it changes who does the surgical reading. A single, narrow confirmation (does this function exist, what are this enum's values) stays inline — forking has overhead that isn't worth it for a one-grep fact-check.

Look for:
- Enums, status definitions, and state machines that this ticket touches
- Existing logic that would be affected or extended
- Any current behavior that conflicts with what the ticket describes
- Edge cases already handled that the ticket does not mention

Do not summarize findings to the user yet. Use them internally to build the question list.

---

## Phase 4 — Gap Analysis (Internal Draft)

Focus strictly on the **"what"** — product behavior, user-facing outcomes, business rules.
Do NOT flag implementation choices, architecture patterns, or technical how-to gaps.

Scan for all of the following gap types:

1. **Unclear language** — phrasing that could mean two different things
2. **Missing definitions** — terms used without being explained (e.g., "the relevant record", "the user", "the system")
3. **Unstated assumptions** — behavior implied but never written down
4. **Conflicting requirements** — two statements in the ticket that contradict each other
5. **Skill conflicts** — requirements that contradict flows, status names, transitions, or rules documented in the loaded skills
6. **Code conflicts** — behavior described in the ticket that conflicts with what already exists in the codebase
7. **Missing edge cases** — scenarios not covered: what happens on error, empty state, concurrent actions, retry
8. **Missing acceptance criteria** — things that must be true for the feature to be "done" but are not stated
9. **Scope ambiguity** — unclear whether something is in or out of scope
10. **Missing actor or trigger** — who initiates this? What event triggers it? Under what conditions?
11. **Cross-surface consistency** — when a loaded domain/UC skill documents other components or flows related to this one, does the ticket's change need to extend to them, or should it explicitly exclude them? (e.g., a new control on one surface governed by a domain skill that also governs a sibling dialog/page/flow)
12. **Cross-cutting concern interaction** — does this feature introduce new persisted state, a new notification, or any other side effect that needs to be considered by concerns that apply system-wide, regardless of domain — e.g., account or data deletion, session/logout handling, audit or compliance logging, data export/portability? These often live in a different area of the codebase than the one the ticket's own keywords would naturally point to.

Before finalizing the question list, re-scan each loaded skill for other components or flows it documents besides the one the ticket directly targets — don't rely only on what surfaced during the first pass of Phase 3. Also re-scan for other documented business rules, named states/modes, or exclusions that apply to the same underlying data or calculation the ticket touches (e.g., an existing "outlier" or "recovery" classification, an exclusion list, a special-cased threshold) — a new feature that reacts to a calculated value often needs to say whether it respects an exception the loaded skill already documents for that same calculation. A structured process should catch these gaps more reliably than general thoroughness would; skipping this re-scan is the most common way it doesn't.

This draft is internal only. Do not output it. Use it to generate the question list for Phase 5.

---

## Phase 5 — Interactive Q&A

If `--offline` was passed in Phase 1, follow **Phase 5B** below instead of asking anything live. If `--slack` or `--slack-send` was passed, follow **Phase 5D** in draft or send mode respectively. Otherwise, ask the mode choice below, then follow the phase it selects.

**Mode choice (no mode flag passed).** Ask one `AskUserQuestion` (`multiSelect: false`) whose question states the actual question count: *"I've analyzed the ticket and found [N] questions to resolve. Where should they go?"*, with options `Answer here (Recommended)` → Phase 5A; `Draft in Slack` — prepare a DM to the ticket's PM for the user to review and send → Phase 5D draft mode; `Send via Slack` — send the questions directly to the confirmed PM → Phase 5D send mode; and `Export to a file` → Phase 5B. Offer each Slack option only if the integration supports that action. Selecting `Send via Slack` is explicit authorization for this ticket's refinement message; do not add a separate send-confirmation question later. Keep Phase 5D's recipient confirmation. (autopilot: see Autopilot Mode — always `Answer here` unless a mode was explicitly selected.) When run by implement, skip this choice — see **When run by implement**.

### Phase 5A — Live Q&A

Once semantic dependencies are identified, use `scripts/questions.mjs waves` under [the question-helper contract](../../docs/deterministic-artifacts.md#refinement-questions) to validate and schedule batches. Recompute after an answer materially changes the graph.

Tell the user:
> "I've analyzed the ticket and found [N] questions to resolve. I'll ask them in batches, grouped so you can navigate and revise answers within each batch before submitting."

Emit this announcement with the actual question count before the first live
question, even if the run must stop for answers and never writes a spec. Do
not replace it with an unnumbered paraphrase.

**Group the question list into waves before asking anything.** `AskUserQuestion` accepts up to 4 questions in a single call and renders them as navigable tabs the user can jump between and revise — but every question in that call is fixed and visible at once, so it only works for questions that don't depend on each other's answers.

1. For every question, check whether any *other* pending question's wording, options, or relevance could change depending on how it's answered. If so, that question **depends on** the other and must go in a **later** wave — never the same batch, since the user could revise the earlier answer after already seeing the dependent one.
2. **Wave 1** = every question with no unresolved dependency on another pending question. Most gap types (Unclear language, Missing definition, Missing edge case, Missing acceptance criteria, Scope ambiguity, Cross-surface consistency, Cross-cutting concern, etc.) are independent of each other by default and belong here unless one specifically hinges on another's answer (e.g., "which entity does this apply to" gates "which field on that entity").
3. Each subsequent wave = questions whose dependencies were fully resolved by the previous wave's answers, plus any new follow-up questions those answers surfaced.

**Ask each wave in one `AskUserQuestion` call:**
- If a wave has more than 4 questions, split it into consecutive batch calls of ≤4 — order between those calls doesn't matter, since everything in the wave is mutually independent.
- If a wave contains a genuinely open-ended question with no pre-enumerable answer, ask that one separately as plain text; do not force it into the `AskUserQuestion` array. (autopilot: see Autopilot Mode — resolved as `open_text`.)

For each multiple-choice question in a batch, include it in the `questions` array with:
  - `header`: a short label (≤12 characters) for this question — use the gap type abbreviated, or a one-word topic (e.g. "Duration", "Scope", "Conflict"). Never put the full question text here.
  - `question`: `"[Gap type]: [The question]\n\n[One sentence explaining why this matters.]"`
    - `[Gap type]` must be one of: `Unclear language`, `Missing definition`, `Unstated assumption`, `Conflicting requirements`, `Skill conflict`, `Code conflict`, `Missing edge case`, `Missing acceptance criteria`, `Scope ambiguity`, `Missing actor/trigger`, `Cross-surface consistency`, `Cross-cutting concern`
  - `options`: up to 3 substantive choices **plus always one final option**:
    `{ label: "Skip — decide later (TBD)", description: "Leave this open; it will be listed as an unresolved item in the refined ticket." }`
  - The `AskUserQuestion` tool caps options at 4 per question, so use at most 3 substantive choices + the Skip option. If a gap genuinely has more than 3 meaningful answers, either narrow to the 3 most likely/valuable and let Skip implicitly cover the rest, or split it into two sequential questions (e.g., resolve the category first, then the specific value) rather than forcing a cramped single question.
- Wait for the whole batch's answers before building the next wave. (autopilot: see Autopilot Mode)
- Record each answer (or skip) and its actual source before proceeding: user via chat/question, PM via Slack with the available reply reference, recorded file answer (author unknown unless identified), or Autopilot. Preserve this attribution when answers are resumed or carried into the spec; a user choosing "go with recommended" is a user decision, not an Autopilot answer or evidence of PM approval.

Rules:
- Batch every mutually-independent question of a wave into a single `AskUserQuestion` call (≤4 per call) — do not artificially split independent questions across separate calls one at a time; that throws away the navigation/revision UI for no reason.
- Frame questions as **closed (multiple choice)** whenever possible.
- When the answer cannot be pre-enumerated, ask in plain text instead of calling `AskUserQuestion` with fewer than two options.
- **Always recommend one option per question.** Place the recommended option first in the list and append `(Recommended)` to its label. Base the recommendation on product best practices, what the codebase already supports, and what is least likely to introduce scope creep. Exception: for a `Cross-cutting concern` question, "do nothing to the existing flow" is often the smallest-scope option but not the safest one — recommend whichever option keeps the system's existing compliance/lifecycle guarantee intact (e.g., new state actually gets cleared where an existing erasure/cleanup flow promises completeness), even if it takes slightly more scope than doing nothing.
- **Keep recommendations current.** Before applying a blanket answer such as "go with recommended," check it against the latest findings, including returned research. Apply it to the recommendations actually shown; do not extend it to unseen questions. If new evidence invalidates an option, changes its product outcome or materially changes its risk, show the affected recommendation and changed evidence/risk, then resolve only that affected question under the existing autonomy/conflict rules. Never treat the blanket answer as acceptance of a newly substituted option. Unchanged choices need no repeated confirmation or recap.
- Never place the Skip option first — it should always be last.
- If a wave's answers create a new gap, unblock a dependent question, or surface a follow-up, fold it into the next wave rather than re-opening or re-batching a wave already asked.
- Never ask about implementation details, technical choices, or architecture.
- Skipped questions are recorded and included as TBD in the final output.
- A skipped gating answer does not resolve its dependencies. Defer dependent questions whose wording or relevance cannot yet be determined; keep their conditions and any unformulatable follow-ups unresolved rather than guessing or treating them as out of scope. Continue with independent questions.
- After the last answerable wave, follow **Phase 5E**. Say "All questions answered. Generating refined ticket..." only when nothing remains unresolved.

### Phase 5E — Unresolved Questions

Apply after live Q&A or offline/Slack injection, before Phase 6. A skipped answer is a deferral, not acceptance of a recommendation. Continue independent questions and preserve blocked dependencies before this checkpoint.

**Readiness:** distinguish required decisions from future work. A missing decision that determines what to build or how to verify it is blocking. Use an established default only when existing policy or an explicit user decision authorizes it; record the actual default and its source in the spec and Decision Log. A recommendation alone is not authorization. If a useful, independently verifiable subset can ship, offer that reduced scope and obtain acceptance before moving deferred work to Out of Scope. Do not silently narrow scope, invent acceptance criteria, or move an unanswered in-scope requirement out of the TBD list. Record the deferred question, reason and accepted scope boundary so it is not lost. `TBD items` counts all unanswered requirements within the selected scope, including blocked dependencies; defaults and scope exclusions qualify only after the corresponding decision is actually settled.

If nothing remains unresolved in scope, proceed directly to Phase 6 without another question. Otherwise summarize the resolved and unresolved counts and explain which decisions prevent implementation. Offer these choices in one `AskUserQuestion`:

- **Answer now (Recommended)** — return to Phase 5A (or Phase 5C on injection), asking only unresolved questions and newly applicable dependencies. Preserve existing answers.
- **Save draft and pause** — go to Phase 6 and save the refined ticket with the existing answers and an explicit unresolved checklist. Standalone refinement finishes with a draft; inside Implement, return `SPEC_SAVED` with the unresolved count so the pipeline pauses in `close-the-gaps`, before risk assessment, spec approval, planning or implementation.
- **Hand off to Product** — preserve existing answers, hand off only unresolved questions, and pause without generating a spec. Explain whether delivery can send via Slack or requires a manual file handoff. This choice authorizes the displayed message to the confirmed PM; do not ask a second send-confirmation question. Offer this choice only when a supported Slack or manual file handoff is available.

For **Save draft and pause**, label the spec **Draft — awaiting requirements decisions** and retain each question's ID, options, recorded answer/skip, dependencies and the reason it blocks implementation in the draft. Also preserve the original request and context sources/loaded guidance needed for resume. This is the resume source; no second questions file or delivery is required. Keep unresolved conditional questions with their gating conditions; do not add Decision Log rows for questions never asked. Present: **Draft saved — implementation is waiting on [N] unresolved decisions. Your other answers are preserved.** Link the draft and identify the remaining questions. Do not suggest that accepting the draft permits development. The parent must not ask a second generic TBD-acceptance or spec-approval question.

For **Hand off to Product**, use Phase 5D send mode when supported, otherwise its documented draft/file fallback. Discover available delivery capabilities before describing the choice. Preserve the session snapshot, code findings, all recorded answers and notes, original question IDs, and dependency conditions in the questions file. Keep answered questions checked as read-only context for this handoff; turn only skipped questions back into unanswered fields, retaining a note that the user deferred them to Product. Include unresolved conditional branches per Phase 5B and preserve unformulatable follow-ups under `## Follow-up Needed After This Round`. Omit branches ruled out by resolved decisions from the message; never re-ask resolved questions. In the message, summarize answered decisions as context separately from the unresolved questions and retain the original Q-numbers. Leave the file `Awaiting Answers` and stop through the normal Phase 5D handoff.

On resume, preserve resolved answers and apply Phase 5C only to unresolved or newly applicable questions. An explicit human answer or recorded code drift can reopen a decision under the existing conflict/drift rules. Follow this choice again only if the resumed round leaves unresolved items; do not send another message without a new explicit handoff selection. Preserve any existing pending/unknown delivery metadata and reconcile it under Phase 5C before considering a new delivery.

### Phase 5B — Offline Export

When exporting offline, or when Slack delivery needs its question construction/template or offline fallback, read this guide before building or writing the export. Read and follow the complete [Offline Export guide](references/offline-export.md).

### Phase 5D — Slack Export

After an explicit draft/send selection (including a Phase 5E Product handoff), read this guide and the [offline export template](references/offline-export.md) before recipient resolution, saving, or delivery. Draft mode never authorizes sending. Read and follow the complete [Slack Export guide](references/slack-delivery.md).

### Phase 5C — Offline Injection

For a questions-file argument, read this guide before processing answers or accessing Slack/tracker sources; follow Phase 1’s snapshot restoration first. Resume is read-only toward Slack and never sends or resends. Read and follow the complete [Offline Injection guide](references/answer-injection.md).

## Phase 6 — Refined Ticket Output

Generate the final ticket and save it to `make-it-work/<TICKET-or-slug>/<TICKET-or-slug>-spec.md` (create the `make-it-work/<TICKET-or-slug>/` directory at the repo root if it doesn't exist) — the same value derived in Phase 1, so this filename always agrees with Phase 5B's export filename.

### Output structure

Start from the **original ticket's exact format and content** — preserve its sections, headings, and structure. Apply these targeted changes:

1. **Update the description / overview** — incorporate any clarifications from the Q&A session. Keep the original wording where it was already correct; edit only what changed.

   **Include a User Story in every final spec.** Preserve and refine an existing user story in place; otherwise add `## User Story` immediately after the description / overview (or after the title if neither exists):

   ```markdown
   ## User Story

   As a [actor], I want [capability], so that [benefit].
   ```

   Ground the actor, capability, and benefit in the original ticket and resolved refinement answers; do not invent a persona, business benefit, or extra scope to fill the format. Use `TBD` for any part that remains unresolved, and list it under `## TBD — Unresolved Items`. Autopilot inferences follow the existing decision-log marker policy.

2. **Update existing acceptance criteria** — fix any that were ambiguous or incorrect based on Q&A answers.
3. **Add missing acceptance criteria** — for any gaps identified during analysis that the original ticket did not cover, append new acceptance criteria in **Gherkin format** under a new section:

````markdown
## Acceptance Criteria — Added During Refinement

```gherkin
Scenario: [descriptive name]
  Given [initial state]
  When [action or event]
  Then [expected outcome]
  And [additional outcome if needed]

Scenario: [edge case or error case]
  Given ...
  When ...
  Then ...
```
````

4. **Append Decision Log** — always include this section when at least one question was asked in Phase 5, listing every applicable question actually asked (in the order asked) and how it was resolved. For an offline injection run, first filter the questions file against the final gating answers from Phase 5C: any question marked `N/A — condition not met` was never asked, even if it has a Q-number or an answer in the file, and must have no Decision Log row:

```
## Decision Log

| Question | Gap Type | Answer |
| --- | --- | --- |
| [full question text as asked] | [gap type] | [option the user picked, verbatim — or "Skipped — see TBD"] |
```

Include every applicable question actually asked here, including skipped ones — the Decision Log is the complete record of questions actually asked; TBD (below) is the actionable follow-up list for skipped items, blocked dependencies, and unresolved User Story parts. A condition-not-met question is neither asked nor skipped, so omit it from both sections. A question blocked by a TBD belongs only in the TBD section until actually asked. Before saving an offline-injection spec, check each Decision Log row against the final Phase 5C statuses and remove every `N/A — condition not met` or unasked `blocked-by-tbd` row. (autopilot: see Autopilot Mode — autopilot-resolved answers get an `_(autopilot)_` marker in the Answer column.)

5. **Append TBD section** — only if any questions were skipped, conditional questions/follow-ups remain blocked by those skips, or any User Story parts remain unresolved:

```
## TBD — Unresolved Items

[These must be resolved before development begins.]

- [ ] [Skipped question 1 — original question text]
- [ ] [Skipped question 2 — original question text]
- [ ] [Blocked conditional question or follow-up — include the unresolved dependency/condition]
- [ ] [Unresolved User Story part, if any — actor, capability, or benefit]
```

6. **Append Out of Scope section** — only if anything was explicitly clarified as out of scope during Q&A:

```
## Out of Scope

- [item clarified as out of scope]
```

### Output rules

- **Decision sources:** keep the existing three-column Decision Log. After the verbatim answer, add a short source annotation in its Answer cell, such as `_(user via chat)_`, `_(PM via Slack: <available reply reference>)_`, or `_(recorded file answer; author unknown)_`. Retain `_(autopilot)_` for automatic answers. Use only known identity/role evidence; never infer that the user is a developer, a PM or an authorized proxy from the input channel alone. If a prior artifact lacks attribution, label its source unknown rather than inventing one. This records provenance without adding a new approval gate.
- **Product follow-up visibility:** if questions were previously directed to Product and resolved elsewhere, add a concise note directly below the spec title and in the final response: identify which questions were resolved by the user/Autopilot, the last verified PM reply/delivery status (or say it could not be checked), and whether a follow-up was sent. Say `pending PM confirmation` only when a known project rule or explicit instruction actually requires it; otherwise report the outstanding communication without implying the user's decision is invalid. Do not label a local answer or artifact approval as PM approval. Preserve the existing acceptance/readiness rules and any expressly required unresolved approval; do not assume every product decision needs a separate PM gate. No FYI or other message is authorized by this note.

- When Slack research informed refinement, preserve its short `## Related Channel Context` evidence summary and source links per the context-search contract. It is reference evidence, not a substitute for the ticket's Decision Log or unresolved questions.

- Preserve the original ticket's section names, order, and formatting wherever possible.
- Do not rewrite the whole ticket from scratch — make surgical edits and additions only.
- Use `Scenario Outline` with `Examples` tables for parameterized Gherkin cases.
- Wrap all Gherkin blocks in ` ```gherkin ` fenced code blocks — never write Gherkin as indented plain text.
- Each Gherkin keyword (Given, When, Then, And, But) must be followed by exactly one space — never pad with extra spaces for alignment.
- Keep Given/When/Then in plain business language — no code, no field names, no API details.
- If the original ticket already has Gherkin scenarios, add new ones in the same style.
- Before finalizing any new Gherkin scenario that asserts specific system behavior (not just user-visible intent), re-check that behavior against the exact code/logic found during Phase 3 exploration — don't rely on a general impression of how it "probably" works. A wrong assertion here becomes a wrong acceptance criterion.
- New sections (User Story, Acceptance Criteria — Added During Refinement, Decision Log, TBD, Out of Scope) always use `##` headers, even if the original ticket used no headers at all — this is expected, not a violation of "preserve the original format." Only the original ticket's own content should be left in its original style.
- Decision Log, TBD, and Out of Scope sections are omitted if empty (i.e., no questions were asked, no skipped questions/blocked dependencies/unresolved User Story parts remain, or nothing was scoped out, respectively).
- Do not include implementation notes, technical choices, or a "how" section.

---

## Phase 7 — Context Update

Run this once Phase 6 has saved the spec, in every run that reaches Phase 6 — live or offline injection. Skip it silently when the project has no `go-deep` context to update (no `uc-*` / `domain-*` skills under `.claude/skills/` and no `.claude/rules/` files).

**Scope — current facts only.** Record facts about the *existing* system or product that this session surfaced: a business rule, term definition, or current behavior the user explained during Q&A, or a statement in a loaded skill that Phase 3 exploration showed to be wrong or missing. **Never** record the ticket's new or decided behavior — that enters the knowledge base only once it has actually been built.

- Record: "the user explained that refunds over 30 days need manager approval today."
- Do not record: "the ticket will add a 60-day refund limit."

**Where it goes** — follow `go-deep`'s layout and its UC-vs-domain separation and size targets:

- User-facing flow facts → the matching `uc-*` skill.
- Implementation facts (files, functions, data contracts) → the matching `domain-*` skill.
- Cross-cutting business rules or constraints → `.claude/rules/product.md` or `.claude/rules/architecture.md`.

Write the updates directly, without a confirmation step. Most runs will have nothing to record; that is expected, not a gap.

Finish by printing one line: `Context updated: <each file changed, with a one-line reason | none>`.

---

## When run by implement

When called by `implement`, read this guide before any intake, discovery, question, or artifact write. Standalone runs skip it. Its caller-owned overrides apply throughout the workflow. Read and follow the complete [Implement integration guide](references/implement-integration.md).
