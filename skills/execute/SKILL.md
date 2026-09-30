---
description: "Implements a plan `plan-the-work` produced, step by step: writes each step's code, re-runs that step's named test(s) to green with a 5-attempt retry limit before escalating, and applies the test-vs-product-behavior guardrail — halting the entire plan on a real product-behavior question rather than guessing. Once every step is green, runs `run-regression` as a completion gate. This is the execute step of the spec → plan-the-work → execute → review-the-pr pipeline. Use when implementing a plan that plan-the-work already wrote."
disable-model-invocation: true
---

# Execute

## Usage

```
/make-it-work:execute [TICKET-ID | path/to/plan.md]
```

- Pass a ticket key (e.g. `PROJ-123`), an explicit path to a plan file, or nothing (the skill derives the key from the current branch).

## Phase 0 — Locate the plan and resolve execution context

1. **Repo/workspace detection** — reuse `plan-the-work`'s Step 1a logic verbatim to decide whether this is a **single repo** or a **coordinated multi-repo workspace**, since it determines which repo's `Affected Code` table (and, later, which repo's regression command) this run applies to. The distinction is not "does the parent hold other repos" — a bare folder of unrelated clones is not a workspace. It is "are these repos documented as one system": a **workspace-root orientation file** (a top-level `CLAUDE.md` / service map describing the sibling repos and how they call each other) is the signal that turns a folder of repos into a workspace.
   - **`.git` exists here.** This repo is a project root. Then:
     - If the **parent** holds a workspace-root orientation file that describes this repo as one service among siblings → you are inside one service of a multi-repo workspace; the **workspace root** is the parent (`..`).
     - Otherwise → **single-repo project**, root is here — even if the parent happens to contain other, unrelated repos.
   - **No `.git` here, but subdirectories have their own `.git`.** If a workspace-root orientation file ties them together → multi-repo workspace, root is here. If they are just unrelated clones with no unifying doc → ask the user which repo (or workspace) to execute against, rather than guessing.
   - **None of these resolve** → tell the user: "Could not identify the project root. Please launch from the repo root, a service subdirectory, or the workspace root." and stop.

   All paths below are relative to the root identified here. In a single-repo project, "each affected repo" simply means the one repo. When unsure between single and multi, prefer single-repo.

2. **Locate the plan** — resolve the plan file from the invocation argument, adapting `plan-the-work`'s Step 1b spec-resolution logic to `-plan.md` files instead of `-spec.md` files:
   - **If the argument is an explicit path to a file**, use it directly and skip the rest of this resolution.
   - **Otherwise, determine the `<TICKET>` key:**
     - If the argument looks like a ticket key, use it.
     - If the argument is empty, derive the key from `git branch --show-current` in the current (or most recently modified) repo, e.g. `feature/PROJ-123-add-x` → `PROJ-123`.
     - If no argument was given and no key can be derived from the branch (e.g. on `main` or a branch that doesn't encode a key), do not proceed with an undefined `<TICKET>`: ask the user for the ticket key or an explicit plan path, and stop until they answer.
   - Once a `<TICKET>` is known, resolve `make-it-work/<TICKET>-plan.md`. If it does not exist, tell the user: "No plan found at `make-it-work/<TICKET>-plan.md`. Run `/make-it-work:plan-the-work` first." and stop.
   - Read the resolved plan file in full before proceeding.

3. **Resolve Execution Status → Mode** — read the plan file's `## Execution Status → Mode` line.
   - **If it reads "Not yet chosen"**, ask the user to choose, before doing anything else — even if you were only handed this file with no memory of it being created — using the same two options `plan-the-work`'s own Step 6 offers:

     **Two execution options:**

     **1. Subagent-Driven (recommended)** — dispatch a fresh subagent per step (via the Agent tool), review between steps. Best for complex multi-repo plans; keeps each step's context clean.

     **2. Inline Execution** — execute steps in this session with a checkpoint after each step's Verify.

     **Which approach? (or: review the plan first, then decide)**

     - If the user picks **Subagent-Driven**, replace the "Not yet chosen" line and its two bullet options with `**Mode:** Subagent-Driven — dispatch a fresh subagent per step (via the Agent tool), reviewed between steps.` in the plan file, then proceed to point 4.
     - If the user picks **Inline**, replace that same block with `**Mode:** Inline — execute steps in this session, checkpointed after each step's Verify.` in the plan file, then proceed to point 4.
     - If the user asks to review the plan first, stop here and wait — write nothing back until they come back with one of the two choices above.
   - **If a mode is already recorded** (the line already reads `Subagent-Driven` or `Inline` rather than "Not yet chosen" — set by a prior `plan-the-work` or `execute` run), proceed under that mode without asking again.

4. **Resolve Progress / resume point** — parse the plan file's `## Execution Status → Progress` line ("Step N of M complete").
   - If `N` equals `M`, every implementation/test step is already done — skip directly to Phase 4 (the completion gate); only the gate remains, or needs re-running.
   - Otherwise, resume from step `N+1` once Phase 2 begins working through the plan's steps.

5. **Re-derive the recommended executor tier** — `plan-the-work`'s own Step 6 computes a "Recommended executor tier" (low/standard/high) but only prints it in chat; it is not persisted as a field in the plan file. Re-derive it yourself, directly against the plan file Phase 0 point 2 resolved, using the exact same criteria `plan-the-work`'s Step 6 documents:
   - **low** — mechanical, few files, additive, no data-migration / state-transition / security risk, steps fully specified.
   - **standard** — moderate: a few domains or repos, some risk, mostly-specified steps.
   - **high** — multiple repos with logic changes, security / state transitions / data migrations / cross-service flows, or steps that still need judgment during execution.

   Read this off the plan file's own sections only — no new investigation of the target codebase: the **Affected Code** table (repo/file count), the **Risks** table (severity surface — the Overall risk values), and the **Steps** (count, and whether they read as additive or invasive). Under **Subagent-Driven** mode, pass a model matching this tier as the `model` argument on every subsequent `Agent` dispatch in Phase 2 (Work through the plan's steps), so every step runs at the recommended level. Under **Inline** mode, the current session's model can't be changed programmatically — note the tier for the user, but take no further action here.

## Phase 1 — Guardrail and retry-limit policy

Every step in Phase 2 applies the two stop conditions defined here, plus the one standing rule at the end of this section. Do not proceed past either stop condition on your own judgment — both hand control to Phase 3, which owns how the halt is reported.

### Retry limit

A step's own named test(s) — the `**Tests:**` field's scoped command, or (when that repo has no configured test framework) the corresponding row(s) in the plan's shared `## Test Plan` table — are that step's sole success criterion. When a fix attempt is made and the test(s) are re-run:

- Count every attempt to change the code in pursuit of making that step's failing test(s) pass as one "attempt," starting from 1.
- If the test(s) still fail after **5** such attempts, stop working on that step immediately. Do not make a 6th attempt, and do not fall back to a "best effort, moving on anyway" outcome — a step whose test still fails is not done, regardless of how close the 5th attempt looked.
- Reaching the retry limit is a distinct stop condition from the guardrail below: it fires when the code itself simply isn't passing the test after genuine fix attempts, with no indication the test or the plan's intent is in question. If, during those attempts, it becomes clear the disagreement is actually about what the test (or the code) *should* be doing rather than a plain bug, stop counting retries and apply the guardrail below instead — the two conditions are not both charged against the same step for the same discrepancy.

### Guardrail (test bug vs. product-behavior question)

This check applies specifically when fixing a step's failing test appears to require changing the test itself (its assertions, fixtures, or setup) rather than only the implementation code. Work through it in this order, every time:

1. **First, check for a genuine test bug — but never on pattern-matching alone.** A test assertion that merely *looks* mechanically wrong (an apparently off-by-one or inverted value, a suspicious-looking fixture) is not yet confirmed as a genuine test bug — it only becomes one once it's actually checked against what the plan's own `## Goal`/`## Requirement Summary` document as the intended behavior for this case (the same source point 2 below consults). Before concluding "this is just a mechanical bug in the test" and fixing it, briefly confirm the plan's documented intent doesn't actually match what the test currently asserts — if it does match (the test was "wrong-looking" but is in fact what's documented), this is not a mechanical bug at all; skip straight to point 2's classification instead of fixing it here. Only once that check comes back clean — the documented intent doesn't call for what the test currently asserts, and the test's flaw is narrow and mechanical (a bad assertion, e.g. it asserts the wrong value, checks the wrong field, or has an off-by-one/inverted condition; or a wrong fixture, e.g. stale test data, a setup step that doesn't match what the step under test actually needs) — fix the test, and never in a way that weakens or deletes what the test was actually trying to verify (e.g. do not loosen an assertion, delete a check, or broaden a match just to make it pass). Then continue implementing the step normally: re-run the corrected test and proceed as usual (including still being subject to the retry limit above if further fix attempts are needed).
2. **If it is not a mechanical test bug**, apply this operationalized check to classify the discrepancy — do not skip straight to a guess:
   - Locate what the plan's own `## Goal` and `## Requirement Summary` sections say about the behavior in question. If those sections are silent or ambiguous about this specific behavior, also read the spec's Acceptance Criteria they trace to (the spec file's path is given in the plan's own header, e.g. `> **Spec:** ...`) before drawing any conclusion — do not stop at "the plan doesn't say" without checking the spec it was built from.
   - Compare three things: (i) what the failing test expects, (ii) what the code currently does, and (iii) what the Goal/Requirement Summary (and, where consulted, the spec's Acceptance Criteria) documents as the intended behavior.
   - **If the code's behavior contradicts that documented intent, while the test's expectation matches it** — this is an ordinary bug, not a product-behavior question: the code is the side that's wrong. Fix the code; leave the test's expectation as it is. Then continue implementing the step as normal.
   - **If the test's own expectation contradicts that documented intent** — e.g. the test asserts something the Goal/Requirement Summary (or the spec's AC) explicitly says should not happen, or asserts the opposite of what an AC scenario describes — this is a real product-behavior question, not a test bug. Do not silently rewrite the test to match the code, and do not silently change the code to match the test's expectation either. Stop and hand off to Phase 3.
   - **If neither the test nor the code looks wrong relative to what's documented (having checked both the plan and, where the plan was silent, the spec's AC), yet the two still disagree with each other** — this, too, is a real product-behavior question. Stop and hand off to Phase 3.
   - **Whenever this comparison is genuinely uncertain** — the documented intent (plan and, where consulted, spec) is ambiguous, silent on the specific case, or could reasonably be read either way — resolve the uncertainty toward treating it as a real product-behavior question, never toward picking a side and continuing. It is always acceptable to hand off to Phase 3 when unsure; it is never acceptable to guess and keep going.

In short: the classification hinges entirely on matching each side (test, code) against the plan's (and, when needed, the spec's) own documented intent, not on which side is more convenient to change, which side was written first, or which side is easier to fix.

### Halt scope

Both stop conditions above — the retry limit and the guardrail — halt the **entire remaining plan**, not only the current step or that step's dependents. Once either condition fires:

- Do not attempt any later step in the plan, including one that has no dependency at all on the flagged/stalled step and could technically run on its own.
- Do not continue working step-by-step on the theory that the flagged step can be revisited later — the whole plan pauses in place, and only resumes via the handling Phase 3 defines (a fresh decision from the user).
- This applies identically under both execution modes: under Subagent-Driven mode, do not dispatch the next step's subagent once a stop condition has fired inside the current step's subagent; under Inline mode, do not proceed to the next step's implementation in this same session.

### Never git-commit

`execute` never runs `git commit` on the user's behalf, at any point in this process:

- Not after any individual step's tests turn green.
- Not after the guardrail or retry-limit stop conditions fire.
- Not at the end of the plan, and not even after the completion gate (Phase 4) passes.

All implemented code, fixed tests, and any other changes made while working through the plan are left uncommitted in the working tree throughout — for the user to review and commit themselves, on their own schedule and in whatever grouping they choose. This rule governs every step in Phase 2 and every phase of this skill; nothing later in this skill overrides it.

## Phase 2 — Work through the plan's steps

This phase does the actual implementation work. It drives the plan forward from the resume point Phase 0 point 4 established, through the plan's own **last** step, **inclusive**.

### Scope: resume point through the last step, inclusive — no exceptions

The plan's `## Steps` section numbers its steps 1 through `M`, where `M` is the same `M` that appears in `## Execution Status → Progress` ("Step N of M complete"). This phase's job is not finished, and control does not pass to **Phase 4**, until step `M` itself — the highest-numbered step in the plan, whatever its own heading calls it — has been implemented, had its tests confirmed passing, and had Progress updated to read "Step M of M complete." The only way to leave this phase before that point is the early exit described in the per-step procedure below: a Phase 1 stop condition (guardrail or retry limit) firing on some step, which hands control to Phase 3 instead — never a routine step completion, and never simply reaching a step that looks like a wrap-up.

This holds regardless of what kind of step `M` is. A plan `plan-the-work` writes for a repo with no configured test framework ends with a trailing step titled something like "Write tests," whose own body says it is "always the last step before Definition of Done" and whose "tests" are the manual scenario walkthroughs in the plan's shared `## Test Plan` table rather than an automated command. That trailing step is not a wrap-up, a formality, or a separate phase outside this loop — it is step `M`, and this loop executes it exactly the way it executes every other step: implement what its **What to do** describes (here, working through the Test Plan's rows), run its Verify check, and update Progress once it passes. Do not treat reaching a step titled "Write tests" as a signal that the loop is effectively done and can be skipped, summarized, or waved through without actually performing its Verify — `Progress` cannot reach "Step M of M complete" by any other means, and skipping it would leave Progress permanently short of "M of M" even though every ordinary implementation step is green.

Concretely: if Phase 0 point 4 determined the resume point is step `N+1`, this phase's loop begins at step `N+1` and continues, step by step, up to and including step `M`. If `N+1` already equals `M` (only the last step remains), this phase still runs — it performs step `M` itself, the same as any other step; it is never skipped just because it is also the final step. The loop only ends, successfully, once step `M`'s own Progress update ("Step M of M complete") has been written to the plan file. Ending the loop earlier — for any reason other than a Phase 1 stop condition firing — is not a valid outcome of this phase. Once Progress reads "Step M of M complete," this phase's work is done — proceed to Phase 4 (the completion gate).

### Working order: respecting each step's own dependency markers

Work through the steps in the numeric order the plan lists them. Progress is a single linear counter ("Step N of M complete"), so this loop never actually reorders steps at runtime — reordering would let a resumed run silently skip whatever was jumped ahead of. Each step's own `**Depends on:**` and `**Can run in parallel with:**` markers are honored as follows:

- Before starting any step, confirm every step named in its `**Depends on:**` line has a number less than or equal to `N` (i.e. it is already recorded as complete in Progress, either from an earlier step in this same run or from an earlier resumed run). In a well-formed plan this is always true by the time numeric order reaches that step, because a step cannot depend on a later-numbered step. If a step's `**Depends on:**` line ever names a step whose number is greater than the current step's own number, the plan itself is malformed — do not attempt to reorder execution to satisfy it; stop and tell the user the plan's dependency ordering is inconsistent (naming the two step numbers involved) rather than guessing at a fix.
- A step's `**Can run in parallel with:**` line names another step that has no ordering constraint against it: neither depends on the other, so either could validly come first. Since this phase processes one step at a time in both execution modes (Subagent-Driven dispatches and reviews one subagent before the next; Inline implements one step before starting the next), "parallel" here means the two steps' relative order is unconstrained, not that they are executed concurrently in the same turn — simply take them in the plan's listed numeric order, like any other adjacent pair, since nothing requires reordering them.

### Per-step procedure

For every step from the resume point through step `M`, inclusive, perform these four actions in order:

1. **Implement.** Make the code change(s) the step's own **What to do** field describes. Touch only the files listed on that step's own **Files:** line — do not edit a file that isn't listed there, even if it seems related, and do not fold in work that belongs to a different, later step.
2. **Verify.** Run the step's **Verify** check.
   - If the step has its own `**Tests:**` field (meaning the target repo has a configured test framework and `plan-the-work`'s per-step test-writing sub-phase recorded a scoped command for this step), run the exact scoped test command that field records, and confirm the specific named test(s) it identifies now pass — not merely that some tests somewhere pass.
   - If the step has no `**Tests:**` field (meaning that repo has no configured test framework), it has no scoped command to run. In addition to running the step's own **Verify** line as written, locate the row(s) in the plan's shared `## Test Plan` table that correspond to this step (by scenario description or by the file/command column referencing this step's own changes) and manually confirm each identified scenario behaves as that row describes. A step with no `**Tests:**` field is not exempt from verification — its corresponding Test Plan row(s) are its test, and they must be walked through and confirmed exactly as the row describes before the step counts as passing.
3. **On failure, apply Phase 1's policy before re-attempting.** If the Verify check (the scoped test command, or the manual Test Plan walkthrough) fails, apply the retry-limit and guardrail policy defined in Phase 1 — do not simply try again ad hoc. Specifically: check whether fixing the failure requires changing the test/scenario itself (triggering the guardrail's test-bug-vs-product-behavior check) or only the implementation code (counting as one retry-limit attempt); keep re-attempting only within whichever of those two policies applies, exactly as Phase 1 defines. The instant either policy's stop condition fires — the guardrail identifies a real product-behavior question, or the 5th attempt still fails — stop working on this step immediately and proceed to Phase 3. Do not attempt any later step (including one satisfying "Can run in parallel with" this one) once a stop condition has fired; Phase 1's "halt scope" rule governs here without exception.
4. **Update Progress immediately once the step passes.** As soon as this step's Verify check is confirmed passing (per point 2), update `## Execution Status → Progress` in the plan file to read "Step N of M complete" (substituting this step's own number for `N`) before doing anything else — in particular, before starting the next step's implementation. Do not batch Progress updates, and do not defer this update until later steps also finish; each step's own completion is written to the plan file the moment that step is done, so a resumed run always has an accurate resume point even if the session ends unexpectedly right after this step.

### Dispatch mechanics, by mode

How points 1–4 above are actually carried out differs by the `Mode` Phase 0 point 3 resolved:

**Subagent-Driven mode.** For each step, dispatch a single fresh subagent via the Agent tool to perform that one step:
- Pass the executor tier Phase 0 point 5 computed for this plan as the subagent dispatch's `model` argument, so every step's subagent runs at the plan's recommended tier.
- Give the subagent, as its prompt, everything it needs to complete points 1–4 above without needing to ask this session anything mid-step:
  - this step's own fields verbatim — **What to do**, **Files:**, **Verify**, and, when present, the step's own **Tests:** field (the exact scoped test command); when the step has no **Tests:** field, the relevant row(s) of the plan's shared `## Test Plan` table instead;
  - Phase 1's policy **in full**, including the retry limit, the guardrail's operationalized check, the halt-scope rule, and the never-git-commit rule — not a paraphrase or a subset of it, since a subagent working alone is exactly where a stray `git commit` or an uncounted retry would otherwise happen;
  - Phase 3's two fixed report shapes (Case 1 — Guardrail fired; Case 2 — Retry limit reached), verbatim, so the subagent already knows exactly what shape to return, with every field filled in from what it actually observed, the instant either of Phase 1's stop conditions fires inside it — rather than reporting back in free-form prose the orchestrating session would then have to reconstruct into shape after the fact;
  - the plan file's own path, this step's number `N`, and the total step count `M`, together with an explicit instruction that the subagent itself is responsible for updating `## Execution Status → Progress` in that plan file to "Step N of M complete" the moment its Verify (and, where applicable, Test Plan row(s)) pass — per point 4 above — before it returns its report.
- The dispatched subagent is responsible for performing points 1–4 above on its own: implementing the change, running Verify, retrying internally (up to Phase 1's 5-attempt limit) on an ordinary failure, applying the guardrail check itself if a fix looks like it needs to change the test, writing the Progress update itself once it passes, and reporting back once the step either passes or hits a Phase 1 stop condition. Do not re-dispatch a new subagent mid-step for a retry — the same subagent iterates internally.
- Once the subagent returns its report, review it before doing anything else: read what it implemented, then re-read the plan file's own `## Execution Status → Progress` line directly (not merely the subagent's prose claim) to confirm it now reads "Step N of M complete" for this step, or that a Phase 1 stop condition fired per the report. The subagent is the one that writes Progress; only if the file's Progress line was not actually updated despite the subagent reporting success does this session write it directly, as a correction, before proceeding. Once Progress is confirmed, either continue to the next step (if this step passed) or proceed to Phase 3 (if a stop condition fired). This review is this mode's own "reviewed between steps" pause point, required by the plan's chosen Mode line and by `plan-the-work`'s own definition of Subagent-Driven. Do not dispatch the subagent for the next step until the current step's subagent's report has been reviewed and relayed to the user in chat — never dispatch two steps' subagents back to back without an intervening report to the user, even if the current step's report looked unambiguous.

**Inline mode.** Perform points 1–4 above directly in this session, for each step in turn:
- Implement the step's change, run its Verify check, and apply Phase 1's policy on failure, all within this same session — no subagent dispatch.
- Phase 0 point 3 records Inline mode's Mode line as "checkpointed after each step's Verify" — that phrase refers only to point 4's Progress write (the plan file gets an accurate, durable checkpoint after every step), not to a pause for user review. Once Progress is updated for a step (point 4), proceed immediately and directly to the next step's implementation. Do not pause here to report progress and wait for the user's go-ahead between steps — Inline mode's defining property is that it "runs straight through all steps... without pausing between them for review," so a routine step completion is never itself a stopping point.
- The only conditions that stop this session mid-plan under Inline mode are Phase 3's two stop conditions (the guardrail firing, or the retry limit being reached) — never a successful, routine step completion. If every step's Verify passes on its own attempts with no stop condition firing, this session moves through the resume point all the way to step `M` in one continuous pass, updating Progress after each step along the way, with no intermediate pause for user review.

## Phase 3 — Guardrail / retry-limit stop handling

Phase 2 hands control here the instant either of Phase 1's two stop conditions fires while working a step — the guardrail identifying a real product-behavior question (Phase 1, "Guardrail"), or that step's test(s) still failing after the 5th fix attempt (Phase 1, "Retry limit"). Per Phase 1's "Halt scope," reaching this phase means the entire remaining plan pauses in place: no later step is attempted, including one with no dependency on the flagged/stalled step, and this step itself is not retried any further once this phase is reached. This phase does exactly one thing — assemble and deliver whichever of the two fixed reports below applies — and the run ends there. Both stop conditions get the same halt scope and the same reporting treatment, per Phase 1's Halt scope: there is no third, lesser halt behavior for either condition, and nothing here resumes automatically. The only way the plan continues is a fresh invocation of `execute`, after the user has reviewed the report and supplied whatever guidance resolves it (e.g. an edited plan step, an updated spec, or an explicit call on which side — test or code — was actually wrong).

### Precedence when both conditions could apply to the same step

Phase 1's "Retry limit" section already states this, and it governs here too: if, at any point during a step's retry attempts — including as early as the very first attempt, well before a 5th attempt is ever reached — the guardrail's test-bug-vs-product-behavior check identifies a real product-behavior question, stop counting retries immediately and apply the guardrail instead. In that situation this phase always uses **Case 1 — Guardrail fired** below, never Case 2, even though fewer than 5 attempts occurred. The two conditions are never both charged against the same step for the same discrepancy, and a step is never reported under both formats.

### Which side detects the stop condition and originates the report

Phase 2's dispatch mechanics differ by mode, and so does which side of the run actually notices the stop condition first and is responsible for producing the report:

- **Subagent-Driven mode.** The dispatched subagent working the stalled/flagged step is the one applying Phase 1's policy internally (Phase 2, "Dispatch mechanics, by mode"), so it is the subagent — not the orchestrating session — that first detects the stop condition and is the only party that actually knows the discrepancy details, the attempts tried, and the last failure observed. Phase 2 already requires that subagent's dispatch prompt to include Phase 1's policy in full; in addition to that, the dispatch prompt must also include this section's two fixed report shapes (Case 1 and Case 2 below) verbatim, so the subagent knows exactly what shape to return the moment either stop condition fires inside it, rather than reporting back in free-form prose that the orchestrating session would then have to reconstruct into shape after the fact. The subagent's final report back to the orchestrating session must already be filled in to one of these two shapes, with every field populated from what it actually observed while working the step. On receiving that report, the orchestrating session's job is to re-read the plan file's own `## Execution Status → Progress` line directly (never trusting the subagent's prose for this one field — the same rule Phase 2 already applies when reviewing any subagent report) to fill in the `Progress` field, then relay the rest of the subagent's report into the fixed shape verbatim — never omitting, paraphrasing away, or re-deriving a field the subagent already determined — and deliver it to the user as this phase's report.
- **Inline mode.** This session is executing the step directly (no subagent), so it is the one that detects the stop condition itself, mid-step, while applying Phase 1's policy. It assembles the same fixed report shape directly from what it just did and observed while working the step, reading `## Execution Status → Progress` from the plan file for that one field the same as above, and delivers it to the user itself.

In both modes, the report that ultimately reaches the user has the identical shape and carries the identical required information — only which side originates it, and how the `Progress` field is confirmed, differs.

### Case 1 — Guardrail fired

Print, verbatim in shape, filling in every bracketed field:

```
Stop condition: Guardrail — test vs. product-behavior discrepancy
Plan: <resolved plan path>
Step: <N> — <step title, exactly as it appears in the plan's ## Steps section>
Test expectation: <exactly what the failing test asserts, or — for a step with no Tests: field — what the corresponding ## Test Plan row describes as the expected/scenario outcome>
Code behavior: <exactly what the code currently does for the same case>
Documented intent: <what the plan's ## Goal / ## Requirement Summary say about this specific behavior; when those sections were silent or ambiguous and the spec's Acceptance Criteria were consulted per Phase 1, what those AC say instead — name the spec file (from the plan's own header) in that case>
Discrepancy: <name exactly which one of Phase 1's guardrail-triggering outcomes applied — "the test's own expectation contradicts the documented intent"; "neither the test nor the code contradicts the documented intent, yet they still disagree with each other"; or "the documented intent is ambiguous/silent on this specific case, so the disagreement is being treated as a product-behavior question per Phase 1's uncertainty rule">
Attempts tried before the guardrail fired: <a short line per fix attempt tried before the discrepancy was recognized, naming what changed each time, or "None — the discrepancy was apparent without any code fix attempt" when the guardrail fired on inspection alone>
Files touched by this step so far: <the file(s) actually edited while working this step, from its own Files: line> — left exactly as they are, uncommitted, in the working tree
Progress: <the plan file's ## Execution Status → Progress line, read fresh, exactly as it reads> — unchanged; step <N> is not recorded as done
Status: The rest of the plan is on hold pending your decision. This run ends here — Phase 4 (the completion gate) is never reached, and no completion-gate report is printed for this run. Nothing resumes automatically: re-invoke /make-it-work:execute (with your guidance incorporated, e.g. an updated plan or spec resolving this discrepancy) to continue.
```

Phase 1's outcome where "the code's behavior contradicts documented intent while the test's expectation matches it" is, by Phase 1's own definition, an ordinary bug — Phase 1 has the step fix the code and continue normally rather than handing off here, so that outcome never produces a Case 1 report; it never reaches this phase at all.

### Case 2 — Retry limit reached

Print, verbatim in shape, filling in every bracketed field:

```
Stop condition: Retry limit reached
Plan: <resolved plan path>
Step: <N> — <step title, exactly as it appears in the plan's ## Steps section>
Attempts made: 5
Attempts tried: <a short line per attempt (1 through 5) naming what changed and what the resulting failure was, so the user can see the fix history, not just the final one>
Last failure observed: <the exact failure from the 5th attempt — the failing test's output/assertion, or the manual Test Plan scenario's observed mismatch, whichever applied to this step>
Files touched by this step so far: <the file(s) actually edited while working this step, from its own Files: line> — left exactly as they are, uncommitted, in the working tree
Progress: <the plan file's ## Execution Status → Progress line, read fresh, exactly as it reads> — unchanged; step <N> is not recorded as done
Status: The rest of the plan is on hold pending your guidance. This run ends here — Phase 4 (the completion gate) is never reached, and no completion-gate report is printed for this run. Nothing resumes automatically: re-invoke /make-it-work:execute (with your guidance incorporated, e.g. an updated plan or spec resolving this failure) to continue.
```

### Progress is read here, essentially never written

Both cases above read `## Execution Status → Progress` to fill in one field — they do not write it, with one narrow exception. Per Phase 2 point 4, Progress is updated only when a step's own Verify passes; a step that hit either stop condition, by definition, never passed Verify, so in the ordinary case Phase 2 never wrote a Progress update for it, and this phase leaves it exactly as it already reads. The one exception mirrors Phase 2's own correction rule in the opposite direction: when this phase re-reads Progress fresh (per "Which side detects the stop condition" above) and finds the flagged/stalled step's own number already recorded as complete — e.g. a subagent mistakenly wrote it despite the stop condition firing — correct the file back to the prior value (the last step that actually passed Verify) before filling in the `Progress` field and delivering the report, rather than reporting a Progress value known to be wrong. Outside that narrow correction, nothing here ever advances Progress. Either way, the flagged/stalled step's own partial history — its fix attempts, its specific failure or discrepancy, and the files it touched — lives only in the chat report above, never folded into the Progress line itself, so the plan file never records a mid-attempt state. This is deliberate: a resumed run (the next `execute` invocation) must find an accurate resume point in the file, resuming at the same flagged step `N` on top of whatever files it already edited, not a half-finished step recorded as if it were further along than it is.

### This is a terminal outcome for this run

Once either report above has been delivered, this run of `execute` is finished — not paused mid-phase, finished. Phase 4 (the completion gate) is never reached following a Phase 3 report, no matter which step in the plan was flagged or stalled, and Phase 5's terminal success report is never printed in the same run as a Phase 3 report — the two are mutually exclusive, distinct terminal outcomes: a run either ends here, in Phase 3, or it ends later in Phase 5, never both.

## Phase 4 — Completion gate

Phase 4 is reached in exactly two ways: normally, once Phase 2's loop finishes step `M` and writes "Step M of M complete" to `## Execution Status → Progress`; or directly, on a fresh invocation of `execute`, when Phase 0 point 4 finds Progress already reading "Step M of M complete" — every implementation/test step was already done by an earlier run — and routes straight here without re-running Phase 2 at all. Either way, this phase runs exactly once per invocation of `execute` that reaches it: it is a single, whole-plan-level check, not a per-step action, and it is never reached following a Phase 3 report (per Phase 3's own "terminal outcome" rule).

### Where this runs: never dispatched, mode-independent

Unlike Phase 2's per-step work, Phase 4 always runs in whichever session is currently executing `execute` — it is never dispatched to a fresh subagent via the Agent tool, regardless of which `Mode` the plan recorded in `## Execution Status → Mode` for Phase 2's own per-step dispatch. Subagent-Driven mode dispatches a fresh subagent per *step*; the completion gate is not a step, has no entry in the plan's `## Steps` section, and is never counted in "Step N of M." It is a single check performed once, after every step is done, so it stays in this session even when every individual step above it ran inside a dispatched subagent. Do not dispatch a subagent for this phase under Subagent-Driven mode — a reader should not assume that mode's per-step dispatch pattern extends here.

### Resolving scope: scoped vs. full-suite

Attempt scoped mode only when **all three** of the following hold — check them in this order, and fall back to full-suite mode the moment any one of them fails, without checking the rest:

(a) The plan's `## Affected Code` table lists exactly one repo.
(b) That one repo's `.claude/rules/testing-strategy.md` file exists.
(c) The plan file itself has a non-empty "Domains/UCs Touched" field recorded for that repo.

**This branch is currently unreachable in practice.** No plan produced by the `plan-the-work` skill as it exists today writes a "Domains/UCs Touched" field anywhere in the plan file. Condition (c) can therefore never be satisfied by any plan file `execute` will actually encounter today, so — regardless of how (a) and (b) resolve — scope resolution always falls through to full-suite mode as things stand. This is the intended, safe default, not a bug: it mirrors `run-regression`'s own resolved behavior of falling back automatically to full-suite mode when there is no mapping to compute a scope from. If a future `plan-the-work` change starts persisting a "Domains/UCs Touched" field, this same check starts succeeding for qualifying plans, with no further change needed here.

### Invoking `run-regression`

However scope resolved, invoke `run-regression` via the `Skill` tool — the same mechanism used anywhere else in this plugin that one skill's own instructions call another:

- **Scoped mode** (conditions (a)–(c) all hold): `Skill({skill: "make-it-work:run-regression", args: "<space-separated domain-*/UC-* tokens from the plan's Domains/UCs Touched field>"})` — e.g. `Skill({skill: "make-it-work:run-regression", args: "domain-velocity UC-08"})`.
- **Full-suite mode** (any condition fails — which is every run today, per the previous section): `Skill({skill: "make-it-work:run-regression", args: "full"})`.

This call requires `skills/run-regression/SKILL.md` to not carry a `disable-model-invocation: true` frontmatter line — it does not, as shipped. Without that, the `Skill` tool refuses the call outright with "Unknown skill" — it does not run `run-regression` in some degraded form or fall back to anything else; the call simply fails to resolve.

`run-regression`'s own frontmatter carries no subagent-dispatch directive, so invoking it via the `Skill` tool loads its instructions into this same session's current turn rather than handing the work to a separate subagent: this session itself then works through `run-regression`'s own Phase 0 through Phase 5 exactly as that skill's `SKILL.md` describes, using the argument just passed (the scope tokens, or `full`), and it is this session that ends up printing `run-regression`'s fixed Phase 5 report block(s) directly in the chat. Once that report has been printed, control returns here, to `execute`'s own Phase 4, to read it — `run-regression`'s own Phase 5 is not itself the end of this run; `execute` still has to act on what it produced.

### Reading the result

`run-regression`'s Phase 5 report takes one of two shapes, and which one applies is a property of the report itself — not of how many repos this plan's own `## Affected Code` table lists (a single-repo plan can still resolve, inside `run-regression`, to a detected multi-repo workspace, since `run-regression` does its own independent repo/workspace detection whenever it's given `full`):

- **No leading `Workspace:` line** — a single-repo run. Read that one block's own `Gate result:` field.
- **A leading `Workspace: <n> repos` line, followed by one block per repo** — a multi-repo workspace run (exactly what `run-regression full` produces on its own whenever it detects a workspace, with no extra per-repo orchestration needed from `execute`). Read the closing `Overall gate result:` line, never any individual repo's own `Gate result:` line — a workspace run can have some repos PASS and others FAIL, and `Overall gate result` is the single line that already folds that all together correctly.

**If the result reads `PASS`** (`Gate result: PASS` for a single-repo run, or `Overall gate result: PASS` for a workspace run): proceed to Phase 5.

**If the result reads `FAIL`** (`Gate result: FAIL` for a single-repo run, or `Overall gate result: FAIL` for a workspace run — regardless of which specific repo(s) inside a workspace run actually failed): stop. Print `run-regression`'s full report verbatim to the user — every block, in full, exactly as `run-regression` produced it, including any `Reason:` string, its `Unmapped scope (not run)` line, and (for a workspace run) every repo's own block plus the `Workspace:`/`Overall gate result:` lines — and state plainly that `execute` does not attempt to fix a completion-gate failure automatically. This is a deliberate difference from a step-level test failure in Phase 2: there is no retry here (Phase 1's 5-attempt retry limit governs step-level test failures only), no guardrail check (Phase 1's guardrail is about a step's own failing test conflicting with the plan's documented intent — it has no bearing on a regression-suite result), and no dispatch to Phase 3 (Phase 3 exists specifically to report the two step-level stop conditions Phase 1 defines — the guardrail and the retry limit — and neither of those fired here; a completion-gate FAIL is a third, distinct kind of stop that this phase reports on its own, in its own way, never by routing through Phase 3's machinery). Leave `## Execution Status → Progress` exactly as it already reads ("Step M of M complete") — this phase never rewrites Progress, since every step did in fact pass; only the plan-level regression gate failed on top of that. Do not print Phase 5's terminal success report in this same run. The only way to continue is a fresh invocation of `execute` after the user has triaged the regression failure (fixed the underlying break, or otherwise addressed it) — that fresh invocation's own Phase 0 point 4 will find Progress already reading "Step M of M complete" and route straight back to this same Phase 4 to re-run the gate.

**If `run-regression` never produces a `Gate result` / `Overall gate result` line at all** — this happens when one of `run-regression`'s own stop-and-ask conditions fires instead of a normal report, e.g. its Phase 0's "Could not identify the project root," or (for a single-repo full-suite run — the outcome this very plugin repo would hit today, having no configured test framework of its own) its Phase 1's "Could not find a full-suite test command for `<repo>`... Specify one directly, or run `/make-it-work:define-test-strategy` first." — treat this the same as a FAIL, never as a PASS, and never as something to silently skip past into Phase 5: relay `run-regression`'s own stop message to the user verbatim and stop here, in Phase 4, exactly as the FAIL case above does (Progress left unchanged, no Phase 5 report this run, only a fresh `execute` invocation resumes it). The one exception is Phase 1's stop-and-ask itself asking the user for a command: if the user supplies one and `run-regression` goes on, in that same turn, to actually run it and print a real Phase 5 block with a `Gate result`/`Overall gate result` line, read that line per the rules above instead — the stop-and-ask is a pause within `run-regression`'s own run, not automatically a hard stop of this phase, provided it resolves into an actual block. A `Gate result` line must never be assumed or defaulted to `PASS`: the absence of one is itself treated as not-a-pass.

## Phase 5 — Final report

Phase 5 is reached only when Phase 4's completion gate reads `PASS` (`Gate result: PASS` for a single-repo run, or `Overall gate result: PASS` for a workspace run) — never any other way. It performs exactly one action: print the fixed report block below, filling in every bracketed field, and the run ends there.

Print, verbatim in shape, filling in every bracketed field:

```
Plan: <resolved plan path>
Mode: <Subagent-Driven | Inline>
Steps completed: <M> of <M>
Completion gate: <Scoped | Full suite> — <PASS>
Changes are uncommitted in the working tree — review and commit when ready.
```

- **`Plan:`** — the plan file path Phase 0 point 2 resolved (`make-it-work/<TICKET>-plan.md`, or the explicit path argument), exactly as it was used throughout this run.
- **`Mode:`** — the `Mode` Phase 0 point 3 resolved for this run, printed exactly as one of the two literal values `Subagent-Driven` or `Inline` (not the longer descriptive sentence recorded in the plan file's `## Execution Status → Mode` line — just the mode name).
- **`Steps completed:`** — `<M> of <M>`, where `M` is the plan's own total step count, the same `M` that appears throughout `## Execution Status → Progress` ("Step N of M complete"). By the time this phase runs, Progress reads "Step M of M complete," so both numbers here are that same `M` — every step, not merely the ones this particular invocation itself executed (a resumed run that only executed the tail of the plan still reports the plan's true total here).
- **`Completion gate:`** — first the word `Scoped` or `Full suite`, matching whichever branch Phase 4's "Resolving scope" section actually took for this run (conditions (a)–(c) all holding → `Scoped`; any one failing → `Full suite` — which, per that section, is every run today), then ` — PASS` (this line is only ever printed once the gate has already been confirmed to read PASS, so the result half of it is always `PASS`, never `FAIL`).
- **`Changes are uncommitted in the working tree — review and commit when ready.`** — printed verbatim, unchanged, every time: this skill never runs `git commit` on the user's behalf, per Phase 1's "Never git-commit" rule, so this line is a constant, not a field to fill in.

### This is the terminal, successful-completion message

This report is one of exactly three distinct, mutually exclusive ways a run of `execute` can end — never more than one of them in the same run:

1. **A Phase 3 report** (Case 1 — Guardrail fired, or Case 2 — Retry limit reached) — printed when a stop condition fires mid-plan, in Phase 2. Per Phase 3's own "terminal outcome" rule, a run that ends this way never reaches Phase 4, and never reaches this Phase 5 report either.
2. **Phase 4's completion-gate FAIL report** — printed when every step passed but `run-regression`'s gate itself comes back FAIL (or never produces a result line at all). Per Phase 4's own instructions, a run that ends this way prints `run-regression`'s full report verbatim and stops there; it never falls through to this Phase 5 report in the same run.
3. **This Phase 5 report** — printed only when every step passed *and* the completion gate came back PASS. This is the sole successful, fully-terminal outcome of a run of `execute`.

Every run of `execute` ends in exactly one of these three ways. Do not print this Phase 5 report alongside either of the other two, and do not print it as a partial or interim status — once printed, the run is finished.
