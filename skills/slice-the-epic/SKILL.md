---
name: slice-the-epic
description: Slice a requirement, epic, ticket, or user story into small, independently deliverable increments, and write each slice as a proper Gherkin (Given/When/Then) user story. Use this whenever the user pastes or references a requirement, epic, PRD, or ticket that feels too big and wants it broken into smaller stories or sprint-sized tasks — including requests like "this ticket is too large," "break this into smaller pieces," "help me write user stories for this epic," "slice this feature," or "what would the acceptance criteria look like for this." Also use it when a technical task or research spike needs to be right-sized for a sprint, or when a requirement resists slicing and the user is stuck. Trigger even if the user never says the word "slice."
---

# Slice the Epic

Slicing is the practice of breaking a large requirement into smaller pieces ("slices") that each deliver a usable, demonstrable increment on their own. Thinner slices mean shorter cycle time, faster feedback, easier estimation, and lower risk — because uncertainty gets resolved a little at a time instead of all at once at the end. This skill turns a big, vague requirement into a set of small, well-formed user stories.

## The process

Work through these steps in order. Don't treat them as a rigid checklist to recite back to the user — think of them as the reasoning a good product-minded engineer or PO would apply.

### 1. Understand the requirement

Get the actual requirement text. If the user gives a Jira/Confluence link or ticket ID and a connector is available, fetch it. If they paste a requirement or epic description, work from that directly.

If the requirement is reasonably concrete, proceed straight to slicing — don't interrogate the user with a round of questions just for the sake of it. Only pause to ask (one focused question at a time, not a list) when something is genuinely blocking, e.g.: the requirement has no identifiable user or workflow at all, or it mixes several unrelated features together and it's unclear which one to slice.

Also check whether the requirement is already written as a user story with its own Given/When/Then acceptance criteria (rather than a loose paragraph). If so, look at whether each existing AC could stand on its own as a slice — this is frequently the fastest and most natural path to slicing, since the seams are already drawn by whoever wrote the ACs, and it can save you from forcing one of the techniques in step 2 onto a shape that doesn't need it.

### 2. Pick slicing technique(s)

If step 1 turned up existing acceptance criteria that already slice cleanly on their own, you can use that directly — it doesn't need to compete with the techniques below. Otherwise, here are the techniques, **listed in priority order** — when more than one would work, prefer the one higher in this list:

1. **Functional slicing**: ship the simplest version of the functionality first, then layer on more capability. E.g., for "search for products," slice 1 is a basic search box, slice 2 adds searching by name, slice 3 adds filters.
2. **Workflow slicing**: break a multi-step flow into one slice per step. E.g., checkout → add to cart, then shipping info, then payment.
3. **Data slicing**: start with the simplest data shape and add complexity later. E.g., a reporting feature starts by showing basic fields before adding detailed breakdowns.
4. **User role slicing**: if multiple roles are involved, deliver one role's functionality at a time.
5. **Complexity slicing (defaults/mocks/stubs)**: where a technical uncertainty is blocking the whole story, carve it out — implement the rest against a mock, stub, or default value, and resolve the hard part as its own slice.

**If the epic could reasonably be sliced more than one way**, don't just silently pick one — surface the viable options to the user and ask which to use before producing the stories. Use the priority order above to decide what to recommend/default to, and mention that as your suggestion, but let the user confirm or override. It's fine to combine two techniques (e.g., workflow slicing for the overall flow, with complexity slicing carved out for one uncertain step) — offer that as an option too when it fits. Only skip this check when one technique is clearly the obvious fit (e.g., a simple sequential workflow with no real ambiguity about how to break it up) — don't ask just for the sake of asking.

Most people asking for help slicing an epic don't know what "functional slicing" vs "workflow slicing" means, and a bare list of technique names won't let them make a real choice. So for each option you present, don't just name it — attach 2-4 example slice *titles* as they'd actually come out for this specific epic under that technique (not the generic textbook example from the list above). A short label plus a couple of concrete titles is enough; you don't need full Gherkin stories at this stage.

**Do this in two parts: the detail as a chat message, then the actual pick as a clickable question.** A structured multiple-choice question tool is great for letting the user answer with one click instead of typing, but its option labels are short and don't reliably display extra detail (examples attached to an option can end up invisible depending on how the tool renders) — so don't rely on the tool to carry the examples. Instead:

1. First, write out the options as an ordinary chat message. Start with a sentence or two on why this particular epic has more than one reasonable shape (e.g., what makes it look like a pipeline, or where the role/data/complexity split comes from) — this is what lets the user trust the recommendation instead of just taking your word for it. Then, for each technique: a bolded name, a short phrase on how that technique would approach this specific epic, and its 2-4 example slice titles as their own bullet sub-list underneath (not crammed onto one line) so each example is easy to scan on its own. For instance:

> This epic bundles a fairly linear pipeline (upload → validate → map → expose → notify), but there's a real choice in how to break it up. A few ways this could go:
>
> 1. **Workflow slicing** (recommended) — one slice per stage in the pipeline:
>    - "Add items to cart"
>    - "Enter shipping info"
>    - "Process payment"
> 2. **Functional slicing** — simplest version of the whole feature first, then layer on capability:
>    - "Basic checkout with one hardcoded payment method"
>    - "Add support for saved payment methods"
>    - "Add support for multiple currencies"

Keep the intro sentence(s) and each technique's description tight — the goal is a quick scan, not an essay. The bullets are where the concrete detail lives.

2. Immediately after, if a structured multiple-choice question tool is available, use it to let the user actually make the pick — with short labels only (just the technique names, e.g. "Workflow slicing (recommended)", "Functional slicing", plus an option along the lines of "Combine two" and the tool's own free-text/"something else" option). The user has already seen the examples in the text above, so the labels alone are enough to click through. If no such tool is available, just let the user reply in plain text (a number, a technique name, "combine 1 and 2," or something else entirely) instead.

Once a technique (or combination) is chosen, state it once up front, before the list of slices (see the output format section) — no need to repeat it on every individual slice.

After slicing, think about ordering by risk — the riskiest/most uncertain slices are where tackling them early pays off the most (early, controlled failure beats late, expensive failure). This isn't always the same as build order: a low-risk, foundational slice that everything else depends on may still need to go first, with the riskiest slices prioritized right after it. When you recap the order for the user, separate "what has to go first for dependency reasons" from "what's riskiest and should happen soon after."

### 3. Size each slice: half a sprint or less

The target granularity is a story that a team could realistically complete within half a sprint. If a slice is still too big:

- Don't accept "this can't be sliced further" at face value — it's rarely true. Look at the technical implementation: find where the heavy lifting actually happens, and slice around that boundary.
- This applies to technical tasks and research spikes too, not just user-facing stories. Technical tasks are usually easier to slice since each slice doesn't need to represent a full use case. Research spikes should be scoped tightly and time-boxed — a spike that drags across multiple sprints has failed at its job.

### 4. Watch for the "infrastructure-only slice" trap

Sometimes slicing produces a leading story that's pure plumbing (e.g., "stand up the microservice") with no real use-case value of its own. Don't leave it that way — bind the smallest possible real use case to it, even a trivial one (e.g., "display an almost-empty page backed by the new service"). This gives the team something concrete to demo, instead of an invisible technical checkbox.

### 5. Sanity-check value

A slice doesn't need to be release-worthy to be valuable. The bar is: can this be demoed to a product manager or stakeholder and produce real feedback that shapes the next slice? If yes, it's a legitimate slice, even if it never ships to customers on its own.

### 6. Write each slice as a Gherkin user story

Present all the slices together as a single Markdown table with exactly two columns: **User Story** and **Acceptance Criteria**. No title column, and no separate title line per slice — the user story sentence itself is enough to identify the slice. One row per slice, in the order you want them tackled.

```
| User Story | Acceptance Criteria |
|---|---|
| **As a** <real, human user role>,<br>**I want** <goal>,<br>**so that** <reason>. | - **Given** <context><br>**When** <action><br>**Then** <outcome><br><br>- **Given** <context 2><br>**When** <action 2><br>**Then** <outcome 2> |
```

Standard Markdown table cells can't contain real line breaks, so `<br>` is what forces each part onto its own line instead of running together. Apply it in both columns:

- **User Story cell:** put "As a ...", "I want ...", and "so that ..." on three separate lines (join them with `<br>`), not one flowing sentence.
- **Acceptance Criteria cell:** for each Given/When/Then scenario, put "Given", "When", and "Then" on three separate lines (joined with `<br>`). Lead each scenario with a bullet (`- `), and put a blank `<br><br>` between one scenario's bullet and the next so multiple ACs don't visually run together.

Bold exactly the words "As a", "I want", "so that", "Given", "When", and "Then" — nothing else in the sentence. This makes the story's structure scannable at a glance.

The "**As a** / **I want** / **so that**" sentence and the Given/When/Then scenarios are the backbone of every slice — nothing else needs to go in the table.

**Common mistakes to avoid when writing the Given/When/Then:**

1. **Non-human users.** Never phrase a scenario around "the system," "the network," or "module X" as the actor. Rewrite it around the real human who experiences it. If there's genuinely no human affected, that's a sign the item may not belong in a user story at all (it might be a technical task).
2. **Isolating edge cases.** Don't dump edge cases into a separate "Edge Cases" section — that's where they get forgotten during implementation. Turn each edge case into its own Given/When/Then scenario within the story, or, if it's substantial enough, spin it out into its own separate sliced story.
3. **Isolating notes.** Same problem with a "Notes" section — fold important notes into a Given/When/Then scenario, or split them into their own story. Nothing important should live outside the scenarios.

### 7. Recap for the user

When presenting the output, briefly summarize: how many slices you produced, which technique(s) you used and why, and which slice you'd recommend tackling first (usually the riskiest one, per step 2).

If it's a genuinely useful distinction for this epic, also note which slices look like the minimal set needed for a first release (the MVP) versus which are later-phase or nice-to-have enhancements — slicing is a natural opportunity to surface that line, since it's much easier to see once the epic is broken into individually shippable pieces. Don't force this if the epic doesn't really have a "core vs. later" split (e.g., a short, already-minimal epic) — only call it out when it adds real information.

### 8. Check whether another round of slicing is needed

Slicing thin enough is a judgment call, and the right granularity depends on context you don't have (team velocity, how confident the team is in this domain, how much risk is acceptable). So after presenting the table, don't just assume you're done — ask the user whether these slices are thin enough to stop, or whether you should slice them further. Keep this quick: a short question, with a clickable pick if a structured multiple-choice tool is available (e.g., "These look thin enough" / "Slice further"), same as in step 2.

**Only ask this once.** The full flow is at most two rounds of slicing: the initial pass, then — if the user asks for it — one further pass to thin things out. If the user wants another round:

- Go slice by slice (row by row) rather than re-slicing the whole epic from scratch — the point of another round is to break down the existing slices further, not to redo the earlier work.
- For each row, apply the same reasoning as steps 2-5: pick a fitting technique (asking the user if there's a genuine choice to make, exactly as in step 2), and split it into smaller slices if it's still bigger than half a sprint or if a real seam exists. Not every slice needs to be split further — some may already be as thin as they should get, and that's fine; leave those rows as-is.
- Replace each row you do split with its resulting finer-grained rows, written in the exact same table format as step 6 (two columns, `<br>`-separated lines within each cell). The end result should read as one continuous table, not a table-of-tables — the user shouldn't be able to tell which rows came from round 1 versus round 2 just by looking at the format.

After presenting this second-round table, stop there — don't ask again whether to slice further. If the user explicitly asks for yet another pass afterward, that's fine to do, but don't prompt for it unprompted a second time.

## Output format

Present the sliced requirement as the two-column table described in step 6. If the original requirement had a clear title, keep it as a heading above the table. Keep the epic-level description available/visible above the table — slicing changes the size of the work, not the fact that the stories still ladder up to the same overall goal.

Right below the epic description and before the first slice, add a single line stating which technique(s) were used across the whole set (e.g., "Slicing technique(s) used: workflow slicing, with complexity slicing carved out for the payment integration step."). This is stated once at the top only — individual slices should not repeat which technique produced them.

## Handling pushback

If the user reacts with a common objection, here's the reasoning to draw on:

- **"Won't we lose the bigger picture?"** The bigger picture lives at the epic level, not inside each story. It doesn't matter whether an epic becomes 5 stories or 40 — the epic description is the map. Recommend revisiting it regularly during refinement.
- **"Isn't this more upfront work?"** Yes, slicing takes more time upfront — but it pays for itself by cutting down on confusion, rework, and estimation arguments later. It's meal-prep, not a shortcut.
- **"This can't be sliced."** Almost everything can be. Point back at step 3 — dig into the technical implementation to find the seam.
