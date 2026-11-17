<!-- Procedures relocated from the parent SKILL.md without policy changes. -->

Read this guide only at the loading point in [the skill entrypoint](../SKILL.md). `<base>` and bare relative paths in prose or code below refer to the parent skill directory; Markdown links resolve from this file. Phase and step names refer to the complete workflow in that entrypoint and its linked guides.

## Phase 3 — Guardrail / retry-limit stop handling

Phase 2 hands control here the instant either of Phase 1's two stop conditions fires while working a step — the guardrail identifying a real product-behavior question (Phase 1, "Guardrail"), or that step's test(s) still failing after the 5th fix attempt (Phase 1, "Retry limit"). Per Phase 1's "Halt scope," reaching this phase means the entire remaining plan pauses in place: no later step is attempted, including one with no dependency on the flagged/stalled step, and this step itself is not retried any further once this phase is reached. This phase does exactly one thing — assemble and deliver whichever of the two fixed reports below applies — and the run ends there. Both stop conditions get the same halt scope and the same reporting treatment, per Phase 1's Halt scope: there is no third, lesser halt behavior for either condition, and nothing here resumes automatically. The only way the plan continues is a fresh invocation of `execute`, after the user has reviewed the report and supplied whatever guidance resolves it (e.g. an edited plan step, an updated spec, or an explicit call on which side — test or code — was actually wrong).

### Precedence when both conditions could apply to the same step

Phase 1's "Retry limit" section already states this, and it governs here too: if, at any point during a step's retry attempts — including as early as the very first attempt, well before a 5th attempt is ever reached — the guardrail's test-bug-vs-product-behavior check identifies a real product-behavior question, stop counting retries immediately and apply the guardrail instead. In that situation this phase always uses **Case 1 — Guardrail fired** below, never Case 2, even though fewer than 5 attempts occurred. The two conditions are never both charged against the same step for the same discrepancy, and a step is never reported under both formats.

### Which side detects the stop condition and originates the report

Phase 2's dispatch mechanics differ by mode, and so does which side of the run actually notices the stop condition first and is responsible for producing the report:

- **Subagent-Driven mode.** The dispatched subagent working the stalled/flagged step is the one applying Phase 1's policy internally (Phase 2, "Dispatch mechanics, by mode"), so it is the subagent — not the orchestrating session — that first detects the stop condition and is the only party that actually knows the discrepancy details, the attempts tried, and the last failure observed. Phase 2 already requires that subagent's dispatch prompt to include Phase 1's policy in full; in addition to that, the dispatch prompt must also include this section's two fixed report shapes (Case 1 and Case 2 below) verbatim, so the subagent knows exactly what shape to return the moment either stop condition fires inside it, rather than reporting back in free-form prose that the orchestrating session would then have to reconstruct into shape after the fact. The subagent's final report back to the orchestrating session must already be filled in to one of these two shapes, with every field populated from what it actually observed while working the step. On receiving that report, the orchestrating session's job is to re-read the plan file's own `## Execution Status → Progress` line directly (never trusting the subagent's prose for this one field — the same rule Phase 2 already applies when reviewing any subagent report) to fill in the `Progress` field, then relay the rest of the subagent's report into the fixed shape verbatim — never omitting, paraphrasing away, or re-deriving a field the subagent already determined — and deliver it to the user as this phase's report. **Exception for a real batch:** when the stopped step was dispatched as part of a real batch (Phase 2's batch-dispatch bullet), the stopped subagent ran concurrently with its siblings and has no visibility into their outcomes, so whatever it wrote in `Batch siblings` is not trustworthy and is never relayed verbatim for that one field. Instead, once every batched sibling has reported (per the batch-dispatch bullet's own wait-for-all-reports rule), the orchestrating session itself fills in `Batch siblings` from what those other reports actually showed — each other step's own number and title, plus its own outcome — overriding whatever the stopped subagent's report said there. When more than one sibling stopped, the precedence rule below also governs which stopped sibling's own report supplies this phase's other fields. Every field besides `Progress` and `Batch siblings` is still relayed from the originating (stopped) subagent's own report, verbatim, exactly as before.
- **Inline mode.** This session is executing the step directly (no subagent), so it is the one that detects the stop condition itself, mid-step, while applying Phase 1's policy. It assembles the same fixed report shape directly from what it just did and observed while working the step, reading `## Execution Status → Progress` from the plan file for that one field the same as above, and delivers it to the user itself.

In both modes, the report that ultimately reaches the user has the identical shape and carries the identical required information — only which side originates it, and how the `Progress` field (and, for a real batch in Subagent-Driven mode, `Batch siblings`) is filled in, differs.

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
Batch siblings: <none — this step was dispatched alone | for each other step dispatched in the same batch: its own number and title, plus its own outcome — "passed, <files touched>" if it passed, or its own short stop-condition summary if it also stopped>
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
Batch siblings: <none — this step was dispatched alone | for each other step dispatched in the same batch: its own number and title, plus its own outcome — "passed, <files touched>" if it passed, or its own short stop-condition summary if it also stopped>
Progress: <the plan file's ## Execution Status → Progress line, read fresh, exactly as it reads> — unchanged; step <N> is not recorded as done
Status: The rest of the plan is on hold pending your guidance. This run ends here — Phase 4 (the completion gate) is never reached, and no completion-gate report is printed for this run. Nothing resumes automatically: re-invoke /make-it-work:execute (with your guidance incorporated, e.g. an updated plan or spec resolving this failure) to continue.
```

**Precedence when more than one sibling in the same batch stops.** If every stopped sibling in the batch hit the *same* kind of stop condition, use that Case's own shape and describe every stopped sibling in `Batch siblings`. If siblings stopped on *different* conditions within the same batch (one guardrail, one retry-limit), use Case 1's shape — a product-behavior question takes precedence for the user to resolve first — and fold the retry-limit sibling's own outcome into `Batch siblings` instead of omitting it. Either way, the report's own `Step:`/`Test expectation:`/etc. fields describe exactly one sibling (the one chosen by this precedence rule); every other stopped or passed sibling's own detail lives in `Batch siblings`, never silently dropped.

### Progress is read here, essentially never written

Both cases above read `## Execution Status → Progress` to fill in one field — they do not write it, with one narrow exception. Per Phase 2 point 4, Progress is updated only when a step's own Verify passes; a step that hit either stop condition, by definition, never passed Verify, so in the ordinary case Phase 2 never wrote a Progress update for it, and this phase leaves it exactly as it already reads. The one exception mirrors Phase 2's own correction rule in the opposite direction: when this phase re-reads Progress fresh (per "Which side detects the stop condition" above) and finds the flagged/stalled step's own number already recorded as complete — e.g. a subagent mistakenly wrote it despite the stop condition firing — correct the file back to the prior value (the last step that actually passed Verify) before filling in the `Progress` field and delivering the report, rather than reporting a Progress value known to be wrong. Outside that narrow correction, nothing here ever advances Progress. Either way, the flagged/stalled step's own partial history — its fix attempts, its specific failure or discrepancy, and the files it touched — lives only in the chat report above, never folded into the Progress line itself, so the plan file never records a mid-attempt state. This is deliberate: a resumed run (the next `execute` invocation) must find an accurate resume point in the file, resuming at the same flagged step `N` on top of whatever files it already edited, not a half-finished step recorded as if it were further along than it is. A batch-dispatched step (see Phase 2's batching exception) is not corrected by this section at all — the orchestrating session, not any individual subagent, owns that batch's Progress write, and the analogous correction for a non-compliant batched subagent (one that wrote Progress despite being told not to) already happens earlier, inside Phase 2's own batch-dispatch bullet, before this phase is ever reached; by the time a batch's partial-failure stop reaches this phase, Progress has already been confirmed or corrected back to its pre-batch value there.

### This is a terminal outcome for this run

Once either report above has been delivered, this run of `execute` is finished — not paused mid-phase, finished. Phase 4 (the completion gate) is never reached following a Phase 3 report, no matter which step in the plan was flagged or stalled, and Phase 5's terminal success report is never printed in the same run as a Phase 3 report — the two are mutually exclusive, distinct terminal outcomes: a run either ends here, in Phase 3, or it ends later in Phase 5, never both.
