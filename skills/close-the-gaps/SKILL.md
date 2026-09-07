---
description: "Product Analyst session: fetches a ticket, loads project skills, explores affected code, asks gap-analysis questions one at a time, outputs Gherkin-format refined ticket. Use when refining a ticket before dev starts."
---

# Ticket Refinement Session

**Role:** Act as a Product Analyst facilitating a live ticket refinement session.

**Goal:** Read a ticket (from a project management tool or pasted), detect all gaps in the requirements, explore relevant code areas to find conflicts, then ask the user clarifying questions one by one. Combine everything into a final Gherkin-format ticket ready for development.

---

## Usage

```
/make-it-work:close-the-gaps [TICKET-ID]
```

Or paste the ticket content directly into the chat after invoking.

---

## Phase 1 — Ticket Ingestion

- If a ticket ID is provided, fetch it via the available MCP integration (e.g., Atlassian, Linear, GitHub Issues). If the fetch fails (not found, no access, tool unavailable), say so plainly and ask the user to paste the ticket content directly instead of retrying silently or fabricating ticket content.
- If content is pasted, parse it as-is — work with whatever is there, even if vague or incomplete.
- Extract: ticket ID, summary, description, acceptance criteria, linked tickets, and any attachments or comments.
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

Tell the user:
> "I've analyzed the ticket and found [N] questions to resolve. I'll ask them one at a time."

Then ask each question using the **`AskUserQuestion` tool** — one tool call per question. Do not output the question as text; call the tool directly.

For each question:
- Call `AskUserQuestion` with:
  - `header`: a short label (≤12 characters) for this question — use the gap type abbreviated, or a one-word topic (e.g. "Duration", "Scope", "Conflict"). Never put the full question text here.
  - `question`: `"Question [X] of [N] · [Gap type]: [The question]\n\n[One sentence explaining why this matters.]"`
    - `[Gap type]` must be one of: `Unclear language`, `Missing definition`, `Unstated assumption`, `Conflicting requirements`, `Skill conflict`, `Code conflict`, `Missing edge case`, `Missing acceptance criteria`, `Scope ambiguity`, `Missing actor/trigger`, `Cross-surface consistency`, `Cross-cutting concern`
  - `options`: up to 3 substantive choices **plus always one final option**:
    `{ label: "Skip — decide later (TBD)", description: "Leave this open; it will be listed as an unresolved item in the refined ticket." }`
  - The `AskUserQuestion` tool caps options at 4, so use at most 3 substantive choices + the Skip option. If a gap genuinely has more than 3 meaningful answers, either narrow to the 3 most likely/valuable and let Skip implicitly cover the rest, or split it into two sequential questions (e.g., resolve the category first, then the specific value) rather than forcing a cramped single question.
- Wait for the user's response before calling `AskUserQuestion` again for the next question.
- Record each answer (or skip) before proceeding.

Rules:
- One `AskUserQuestion` call per turn. Never ask two questions at once.
- Frame questions as **closed (multiple choice)** whenever possible.
- Use open-ended format only when the answer cannot be pre-enumerated.
- **Always recommend one option per question.** Place the recommended option first in the list and append `(Recommended)` to its label. Base the recommendation on product best practices, what the codebase already supports, and what is least likely to introduce scope creep. Exception: for a `Cross-cutting concern` question, "do nothing to the existing flow" is often the smallest-scope option but not the safest one — recommend whichever option keeps the system's existing compliance/lifecycle guarantee intact (e.g., new state actually gets cleared where an existing erasure/cleanup flow promises completeness), even if it takes slightly more scope than doing nothing.
- Never place the Skip option first — it should always be last.
- If an answer creates a new gap or follow-up, insert it as the next question before continuing, and update [N] in subsequent question counts to reflect the new total — don't leave a stale total that under-counts what's actually being asked.
- Never ask about implementation details, technical choices, or architecture.
- Skipped questions are recorded and included as TBD in the final output.
- After the last question: "All questions answered. Generating refined ticket..."

---

## Phase 6 — Refined Ticket Output

Generate the final ticket and save it as a new file named `[TICKET-ID]-refined.md`. If the ticket has no ID (pasted content with no ticket key), derive the filename from a kebab-case slug of the title instead, e.g. `add-dark-mode-toggle-refined.md`. If there's no clear title either, fall back to `refined-ticket-YYYY-MM-DD.md`.

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

4. **Append TBD section** — only if any questions were skipped:

```
## TBD — Unresolved Items

[These must be resolved before development begins.]

- [ ] [Skipped question 1 — original question text]
- [ ] [Skipped question 2 — original question text]
```

5. **Append Out of Scope section** — only if anything was explicitly clarified as out of scope during Q&A:

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
- New sections (Acceptance Criteria — Added During Refinement, TBD, Out of Scope) always use `##` headers, even if the original ticket used no headers at all — this is expected, not a violation of "preserve the original format." Only the original ticket's own content should be left in its original style.
- TBD and Out of Scope sections are omitted if empty.
- Do not include implementation notes, technical choices, or a "how" section.
