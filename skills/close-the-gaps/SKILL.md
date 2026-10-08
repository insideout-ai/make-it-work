---
name: close-the-gaps
description: "Refines a requirement into an AI-ready ticket: a Product Analyst session that fetches the ticket, loads project skills, explores affected code, asks gap-analysis questions in dependency-ordered batches, and outputs a Gherkin-format refined ticket. Supports an offline mode: export every question to a file to answer outside the session, then re-invoke with that file to inject the answers and resume. Use when refining a ticket before dev starts."
disable-model-invocation: true
---

# Ticket Refinement Session

**Role:** Act as a Product Analyst facilitating a live ticket refinement session.

**Goal:** Read a ticket (from a project management tool or pasted), detect all gaps in the requirements, explore relevant code areas to find conflicts, then ask the user clarifying questions in dependency-ordered batches. Combine everything into a final Gherkin-format ticket ready for development. When invoked with `--offline`, or when resuming from a previously exported questions file, follow Phase 5B or Phase 5C instead of asking questions live.

---

## Usage

```
/make-it-work:close-the-gaps [TICKET-ID] [--offline] [--autopilot]
/make-it-work:close-the-gaps path/to/<TICKET>-questions.md [--autopilot]
```

Or paste the ticket content directly into the chat after invoking.

Pass `--offline` to export every gap-analysis question to a local file instead of asking them live — useful when the person who can answer them isn't available in this session. Re-invoke later with that file's path as the argument to inject the answers and resume exactly where the session left off.

Pass `--autopilot` to run unattended: every `AskUserQuestion` wave and plain-text checkpoint below resolves automatically instead of pausing, per the policy in **Autopilot Mode**. Combine freely with `[TICKET-ID]`, pasted content, `--offline`, or the questions-file path form — `--offline --autopilot` still exports the file untouched (there's nothing to autopilot in an export-only run); autopilot's resolutions apply the next time that file comes back through the injection path. Without `--autopilot`, every interactive point pauses for a human exactly as documented below.

## Autopilot Mode

When invoked with `--autopilot`, still **construct** every question/options payload exactly as the interactive path below would — wave batching, the 2–4 option cap, `(Recommended)` placed first, `Skip — decide later (TBD)` placed last — just don't call `AskUserQuestion` or wait at a checkpoint. Auto-resolve per the table below instead.

**Hard-stop exceptions — never auto-resolved, even in autopilot mode:**

1. **Phase 1 ticket-fetch failure with nothing pasted.** If a tracker fetch fails and no ticket content was ever supplied, autopilot cannot fabricate a ticket. Stop and require a human to paste the content.
2. **Phase 1 pending offline export** (`make-it-work/<TICKET-or-slug>-questions.md` exists with `**Status:** Awaiting Answers`). None of its three choices — resume it, overwrite it and continue this fresh session, or abort — carries a designated default anywhere in this skill's text, and one of them is destructive: overwriting discards a file that may hold previously recorded answers. Autopilot does not guess among the three. It prints the file's path and the three choices, then stops and requires a human. "Overwrite it and continue this fresh session" is named here as never auto-selectable on its own, independent of which of the other two choices a human later makes.
3. **Phase 5C conflicting checkboxes** (more than one box checked for the same question, including a filled-in "Other:"). There is no safe way to infer which of two explicit, conflicting human selections was intended. Stop and show the user what was checked, exactly as the interactive path already does.

**Decision log:** write `make-it-work/close-the-gaps-autopilot-log.jsonl` at repo root, overwritten fresh at the start of each autopilot run (it describes that run only). Field shape follows the shared schema in `docs/autopilot-log-schema.md` — this skill uses all three `kind` values (`askUserQuestion`, `checkpoint`, `open_text`); `multiSelect` is present but always `false` (this skill never presents a `multiSelect` question; it batches independent single-choice questions into one call instead); `chosen` is therefore a string, the `open_text` free-text answer, or `null` — never an array. Every line also still includes `rationale` (one sentence), per the shared schema's core fields. `phase` examples: `"Phase 1"`, `"Phase 5A"`, `"Phase 5C"`. `site` examples: `"wave-1-q2"`, `"blank-q3"`, `"followup-1"`.

When Bash is permitted, use the shared writer in `docs/autopilot-log-schema.md` for this log, invoking each writer command in its own Bash tool call; preserve this skill's timing and never use it to bypass a denied log write.

This file is a run artifact: never treat it as a Phase 3 "code finding," never embed it in a `*-questions.md` export, and never reference it from Phase 6's own `## Decision Log` table — the two logs serve different audiences (this one is for auditing the autopilot run itself; Phase 6's is part of the deliverable ticket).

**Resolution table** (one row per interactive site, in the order they can appear):

| Phase | Site | `kind` | Autopilot resolution |
|---|---|---|---|
| Phase 1 | ticket-fetch failure, nothing pasted | `checkpoint` | Hard-stop exception above — stop and require a human. |
| Phase 1 | pending offline export (resume / overwrite / abort) | `checkpoint` | Hard-stop exception above — stop and require a human. Never auto-select "overwrite it and continue this fresh session." |
| Phase 5A | per-question wave batch | `askUserQuestion` | Choose the option labeled `(Recommended)`. |
| Phase 5A | genuinely open-ended question (no pre-enumerable answer) | `open_text` | Answer with your own best inference from Phase 2–3 findings, prefixed `[autopilot best-guess]`. |
| Phase 5C | more than one checkbox checked for the same question | `checkpoint` | Hard-stop exception above — stop and require a human. |
| Phase 5C | recorded answer's code finding changed in a way that contradicts it | `askUserQuestion` | Re-resolve using the same options the file recorded; choose `(Recommended)`. Log the rationale as the drift that triggered re-resolution, e.g. `"<path> no longer matches the recorded finding; re-resolved via Recommended."` |
| Phase 5C | blank checkbox-style question | `askUserQuestion` | Reuse the header, gap type, and options exactly as recorded in the file; choose `(Recommended)`. |
| Phase 5C | blank open-ended question | `open_text` | Answer with your own best inference, prefixed `[autopilot best-guess]`. |
| Phase 5C | `## Follow-up Needed After This Round` item | `open_text` | Answer with your own best inference from the embedded ticket/code findings, prefixed `[autopilot best-guess]`. |

Only the Phase 5A/5C `askUserQuestion` rows carry a `(Recommended)` label in this skill — do not invent one for the two Phase 1 checkpoints, which are hard-stops with nothing to auto-resolve, or for the Phase 5C conflicting-checkbox checkpoint.

**Marking autopilot answers in the deliverable itself:** apply the marker convention from `docs/autopilot-log-schema.md` to Phase 6's `## Decision Log` table — append `_(autopilot)_` after a `(Recommended)`-resolved answer, keep the `[autopilot best-guess]` prefix on an `open_text` answer — so a reviewer reading the refined ticket alone, without `make-it-work/close-the-gaps-autopilot-log.jsonl`, can see which decisions weren't confirmed by a person. A question that was already answered unambiguously in an offline file before this run needs no marker — a human already decided it.

At the end of an autopilot run, print a short human-readable summary of every auto-resolved decision (including any hard-stop that was hit) and the log file's path, so someone can audit the run afterward.

---

## Phase 1 — Ticket Ingestion

**0. Detect an injection run first.** If the argument is a path to an existing `*-questions.md` file, this is an **injection** run: read the file in full, skip the rest of Phase 1, restore the original ticket content, the loaded-skills list, and the code findings from its `## Session Context` section — then re-read each skill named in that list, so its content is available for Phase 6's re-check — and go directly to **Phase 5C — Offline Injection**.

Otherwise, ingest the ticket as usual:

- If a ticket ID is provided, fetch it via the available MCP integration (e.g., Atlassian, Linear, GitHub Issues). If the fetch fails (not found, no access, tool unavailable), say so plainly and ask the user to paste the ticket content directly instead of retrying silently or fabricating ticket content. (autopilot: see Autopilot Mode — this is a hard-stop, never auto-resolved.)
- If content is pasted, parse it as-is — work with whatever is there, even if vague or incomplete.
- Extract: ticket ID, summary, description, acceptance criteria, linked tickets, and any attachments or comments.
- Record the **source**: either "Fetched from `<tracker>` issue `<ID>`" or "Pasted directly, no tracker ticket" — Phase 5B will embed this so Phase 5C can later check for ticket drift.
- Derive `<TICKET-or-slug>`: the ticket ID if there is one; otherwise a kebab-case slug of the title; otherwise `spec-YYYY-MM-DD` — the same rule Phase 6 uses for its own output filename. Reuse this one value for the rest of this phase, for Phase 5B's export filename, and for Phase 6's final spec filename, so all three always agree.
- **Check for a pending offline export:** if `make-it-work/<TICKET-or-slug>-questions.md` exists with a `**Status:** Awaiting Answers` marker, warn the user: "A pending offline export exists at `<path>` with unanswered questions." and ask them to choose: **resume it** (re-invoke with that file's path instead — stop here), **overwrite it and continue this fresh session** (delete the stale file, then continue below), or **abort** (stop here, no changes). Do not continue past this check silently. (autopilot: see Autopilot Mode — this is a hard-stop, never auto-resolved.)
- Note whether `--offline` was passed in the arguments — carry this forward as a session flag for Phase 5 to check.
- Acknowledge to the user: "Loaded ticket [ID]: [summary]. Starting analysis..."

---

## Phase 2 — Skills Loading

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

If `--offline` was passed in Phase 1, follow **Phase 5B** below instead of asking anything live. Otherwise, follow **Phase 5A**.

### Phase 5A — Live Q&A

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
- Record each answer (or skip) before proceeding.

Rules:
- Batch every mutually-independent question of a wave into a single `AskUserQuestion` call (≤4 per call) — do not artificially split independent questions across separate calls one at a time; that throws away the navigation/revision UI for no reason.
- Frame questions as **closed (multiple choice)** whenever possible.
- When the answer cannot be pre-enumerated, ask in plain text instead of calling `AskUserQuestion` with fewer than two options.
- **Always recommend one option per question.** Place the recommended option first in the list and append `(Recommended)` to its label. Base the recommendation on product best practices, what the codebase already supports, and what is least likely to introduce scope creep. Exception: for a `Cross-cutting concern` question, "do nothing to the existing flow" is often the smallest-scope option but not the safest one — recommend whichever option keeps the system's existing compliance/lifecycle guarantee intact (e.g., new state actually gets cleared where an existing erasure/cleanup flow promises completeness), even if it takes slightly more scope than doing nothing.
- Never place the Skip option first — it should always be last.
- If a wave's answers create a new gap, unblock a dependent question, or surface a follow-up, fold it into the next wave rather than re-opening or re-batching a wave already asked.
- Never ask about implementation details, technical choices, or architecture.
- Skipped questions are recorded and included as TBD in the final output.
- After the last wave: "All questions answered. Generating refined ticket..."

### Phase 5B — Offline Export

Build the **complete** question list up front — every wave, not just Wave 1 — since there is no live back-and-forth to reveal later waves incrementally:

1. Compute Wave 1 exactly as in Phase 5A.
2. For each question, enumerate every later-wave question that depends on it, for each of its own options, **recursively** — a question two or three waves deep (e.g. a chain like Trigger → Detect → Reinvoke) is still written out, chained through its own immediate gating question rather than only checked against Wave 1. Write each dependent question directly after the question it depends on, so the file's order always presents a gating question before anything conditioned on it. Label each with the exact condition under which it applies (see template below). If a later question's wording or options cannot be enumerated without an answer that doesn't exist yet (e.g. it depends on free text with no fixed set of branches), do not force it into the file — record it instead under a `## Follow-up Needed After This Round` section at the end of the file, in plain language; Phase 5C resolves it live rather than exporting a second file.
3. Do not call `AskUserQuestion`. Do not ask anything in chat.

Write the file to `make-it-work/<TICKET-or-slug>-questions.md` (the same base name Phase 1 derived and Phase 6 will use), using this template:

```markdown
# Offline Questions — <TICKET-or-slug>

> **Status:** Awaiting Answers
> Fill in the checkboxes and notes below, save this file, then re-invoke:
> `/make-it-work:close-the-gaps <this file's path>`

## Session Context

### Source

<"Fetched from <tracker> issue <ID>" or "Pasted directly, no tracker ticket">, exported <YYYY-MM-DD>

### Original Ticket

<the full ticket content exactly as ingested in Phase 1>

### Skills Loaded

- <skill name> — <one-line reason it was loaded>

### Code Findings

- Q1 — `<path/to/file>`: <one-sentence summary of the Phase 3 finding this question is based on>

## Questions

### Q1 — [Gap type]

**Question:** <question text>
**Why it matters:** <one sentence>

- [ ] <Option 1 label> (Recommended)
- [ ] <Option 2 label>
- [ ] <Option 3 label>
- [ ] Other: ______________________
- [ ] Skip — decide later (TBD)

Notes (optional):

### Q2 — [Gap type] *(Answer only if Q1 = <option label>)*

**Question:** <question text>
**Why it matters:** <one sentence>

- [ ] <Option 1 label> (Recommended)
- [ ] <Option 2 label>
- [ ] Other: ______________________
- [ ] Skip — decide later (TBD)

Notes (optional):

### Q3 — [Gap type] *(open-ended — no fixed options)*

**Question:** <question text>
**Why it matters:** <one sentence>

**Your answer:**

## Follow-up Needed After This Round

<!-- Omit this section entirely if every question could be enumerated above. -->
- <plain-language description of the gap that could not be phrased as a conditional question, and why>
```

Tell the user: "Questions exported to `<path>`. Answer them there, then re-invoke `/make-it-work:close-the-gaps <path>` to continue." Stop here — do not proceed to Phase 6 in this session.

### Phase 5C — Offline Injection

**0. Check for ticket drift (tracker-sourced tickets only).** If `## Session Context → Source` names a tracker and issue ID, and that tracker's MCP integration is available in this session, fetch the current ticket read-only and compare it to the embedded `### Original Ticket` content.
- If they differ, tell the user the live ticket has changed since export, and add a one-line callout directly under the refined ticket's title in Phase 6's output: "> **Note:** the live ticket in `<tracker>` has changed since this refinement was exported on `<date>`; this spec reflects the snapshot taken at export time." The embedded snapshot stays authoritative — do not substitute the live version.
- If the tracker integration isn't available, or the ticket was pasted (no tracker source), say the comparison was skipped (or wasn't applicable) and proceed using the snapshot.

Resolve questions in two passes, since a conditional question can only be evaluated once its gating answer is known:

**Pass 1 — unconditional questions** (no "Answer only if…" label):

1. **Read its answer.** A checkbox-style question is answered if exactly one checkbox is checked (including "Other:", if it has text after the colon) or "Skip" is checked; if more than one box is checked, ask the user live to resolve the conflict, showing them what was checked. (autopilot: see Autopilot Mode — this is a hard-stop, never auto-resolved.) An open-ended question (no checkboxes, just a `**Your answer:**` line) is answered if that line has any text after it.
2. **Re-verify its code finding**, using the file path(s) noted under `## Session Context → Code Findings` for that question:
   - If the code still matches the recorded finding, keep the recorded finding and the file's answer as-is.
   - If it has changed in a way that contradicts the file's answer or the question's premise, flag this to the user now (e.g. "Q3 assumed X, but `path/to/file` now does Y — does your answer still hold?") and ask live using the same options the file recorded. (autopilot: see Autopilot Mode)
3. **Ask live anything left blank** — a checkbox-style question with no box checked and no notes, or an open-ended question with an empty `**Your answer:**` line — via `AskUserQuestion` if it has enumerable options (reuse the header, gap type, and options exactly as recorded in the file) or as plain text if it was recorded as open-ended. Batch up to 4 independent blank checkbox-style questions per `AskUserQuestion` call, per Phase 5A's batching rules, rather than asking them one at a time. (autopilot: see Autopilot Mode)

**Pass 2 — conditional questions** ("Answer only if Q_n = X" label): process them in the order they appear in the file — Phase 5B always places a gating question before anything conditioned on it, so by the time you reach a conditional question here, the question it names already has a final status from earlier in this pass or from Pass 1.

- If the question it names is itself `N/A — condition not met`, mark this question `N/A — condition not met` too, without evaluating its own condition — a question gated by a question that was never asked can't apply either. This propagates down a chain of any length.
- Otherwise, check the now-resolved answer to the question it names: if it does **not** match the stated condition, mark this question `N/A — condition not met`. Do not ask it, do not re-verify its code finding, and do not include it in Phase 6's Decision Log — it was never actually asked.
- If the gating answer **does** match, treat it exactly like an unconditional question: apply steps 1–3 above to it.

**Resolve any `## Follow-up Needed After This Round` items live**, the same way as step 3 above, now that every gating answer from both passes is known — do not export a second file for these. (autopilot: see Autopilot Mode — resolved as `open_text`.)

Once every applicable question has a final answer, proceed to **Phase 6** exactly as today, using the answers gathered here (whether from the file or live) as if Phase 5A had produced them. Only **after** Phase 6 has saved `make-it-work/<TICKET-or-slug>-spec.md`, update this file's status line to `**Status:** Answered — superseded by make-it-work/<TICKET-or-slug>-spec.md`. If the session ends before Phase 6 finishes, leave the status as `Awaiting Answers` — a later run must not mistake an incomplete session for a finished one.

---

## Phase 6 — Refined Ticket Output

Generate the final ticket and save it to `make-it-work/<TICKET-or-slug>-spec.md` (create the `make-it-work/` folder at the repo root if it doesn't exist) — the same value derived in Phase 1, so this filename always agrees with Phase 5B's export filename.

### Output structure

Start from the **original ticket's exact format and content** — preserve its sections, headings, and structure. Apply these targeted changes:

1. **Update the description / overview** — incorporate any clarifications from the Q&A session. Keep the original wording where it was already correct; edit only what changed.
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

4. **Append Decision Log** — always include this section when at least one question was asked in Phase 5, listing every question asked (in the order asked) and how it was resolved:

```
## Decision Log

| Question | Gap Type | Answer |
| --- | --- | --- |
| [full question text as asked] | [gap type] | [option the user picked, verbatim — or "Skipped — see TBD"] |
```

Include every question here, including skipped ones — the Decision Log is the complete record; TBD (below) is only the actionable follow-up list for skipped items. (autopilot: see Autopilot Mode — autopilot-resolved answers get an `_(autopilot)_` marker in the Answer column.)

5. **Append TBD section** — only if any questions were skipped:

```
## TBD — Unresolved Items

[These must be resolved before development begins.]

- [ ] [Skipped question 1 — original question text]
- [ ] [Skipped question 2 — original question text]
```

6. **Append Out of Scope section** — only if anything was explicitly clarified as out of scope during Q&A:

```
## Out of Scope

- [item clarified as out of scope]
```

### Output rules

- Preserve the original ticket's section names, order, and formatting wherever possible.
- Do not rewrite the whole ticket from scratch — make surgical edits and additions only.
- Use `Scenario Outline` with `Examples` tables for parameterized Gherkin cases.
- Wrap all Gherkin blocks in ` ```gherkin ` fenced code blocks — never write Gherkin as indented plain text.
- Each Gherkin keyword (Given, When, Then, And, But) must be followed by exactly one space — never pad with extra spaces for alignment.
- Keep Given/When/Then in plain business language — no code, no field names, no API details.
- If the original ticket already has Gherkin scenarios, add new ones in the same style.
- Before finalizing any new Gherkin scenario that asserts specific system behavior (not just user-visible intent), re-check that behavior against the exact code/logic found during Phase 3 exploration — don't rely on a general impression of how it "probably" works. A wrong assertion here becomes a wrong acceptance criterion.
- New sections (Acceptance Criteria — Added During Refinement, Decision Log, TBD, Out of Scope) always use `##` headers, even if the original ticket used no headers at all — this is expected, not a violation of "preserve the original format." Only the original ticket's own content should be left in its original style.
- Decision Log, TBD, and Out of Scope sections are omitted if empty (i.e., no questions were asked, none were skipped, or nothing was scoped out, respectively).
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

This section applies only when `/make-it-work:implement` runs this skill; a standalone run ignores it entirely.

**Inputs** — the ticket ID or pasted ticket content, the run's autonomy level (Guided, Autonomous, or Autopilot), and optional **redo notes** (when the user asked to redo refinement at the approval gate). With redo notes, read the existing spec first, treat the notes as clarifications already given, and ask only the questions they don't settle.

**No offline mode** — ignore `--offline` and always use Phase 5A. (`implement` stops before calling this skill when a pending questions file exists.)

**Questions** — Guided and Autonomous ask every question live exactly as in a standalone run. Autopilot invokes this skill with `--autopilot`, so use its Autopilot Mode resolution table and never ask live; return normally after a safe resolution or surface its documented hard-stop result to `implement`.

**Return report** — end the output with these lines, then stop without suggesting next steps:

```
Spec: <path written in Phase 6>
TBD items: <count>
Context updated: <list from Phase 7 | none>
```

**Version 1 handoff** — when the caller's workflow state contains `handoff_version: 1`, also read `../implement/references/handoffs.md` and write a new `gaps-<N>.json` in `make-it-work/<TICKET>-handoffs/` using its schema. Use `SPEC_SAVED`, the actual spec path, the counted TBD items, and the paths updated in Phase 7. Do not write this file for an older run. End the chat report with `Handoff: <path>` so `implement` can validate it before advancing.
