# Bounded artifact quality review

Read this procedure when refinement, planning or test preparation calls it. This
is part of the producing skill, not a workflow phase or final code review.
Standalone calls review their output. Implement calls review TDD artifacts only;
Lightweight skips it. Follow the caller's explicit artifact root, approved source
roots, activity ownership, authorization and accepted decisions.

## Inputs and ownership

Supply the stage (`spec`, `plan`, or `tests`), exact current spec/plan/preparation
paths as applicable, relevant loaded project rules, coverage policy, prior review
record and any explicit retry direction. The accepted spec controls requirements;
the plan cannot amend it. Read actual assertions for test review. Pass retained
command facts and preparation evidence, including failures and unknown provenance.
A count, mapping or passing suite alone does not establish acceptance coverage.

Keep existing structural validators and preparation checks. Review semantic
adequacy rather than duplicating their checks. Do not run extra suites, install
tooling, broaden selectors or rerun commands just to populate a review record.

The producing skill owns corrections and the record. Under Implement, only the
coordinator owns state, pending inputs, activity and dashboard changes. A nested
worker returns review evidence to that coordinator; it never writes activity.
The coordinator narrates/checkpoints the review dispatch (or the containing test
worker's dispatch) and retains that description while waiting.

## Review and one correction round

1. Finish the candidate artifact and existing applicable validation, then reopen
   the saved artifact and compare it with authoritative inputs (including actual
   prepared assertions for tests). Do not review only your remembered draft. Read any
   prior record before starting: continuation/resume does not reset its allowance.
2. Reserve a unique record before dispatch with
   `node <plugin-root>/scripts/artifact-output.mjs allocate --root <artifact-root> --directory make-it-work/<TICKET> --name <TICKET>-<stage>-quality-review.md`.
   Use its returned path. The author writes the record, never the read-only reviewer.
   Record the attempt number, input paths and SHA-256 fingerprints, review method,
   completed pass count, findings, corrections and disposition. For a plan, use
   the existing plan hash convention excluding Execution Status; for tests include
   prepared files and relevant spec/plan/preparation inputs. Preserve prior records
   and reference them. No new state marker or controller receipt is required.
3. Dispatch a fresh reviewer without inherited author reasoning. Use the prompt
   below and matching checklist. If fresh-agent tooling is unavailable (including
   unavailable nested delegation), perform the same inspection yourself and
   disclose `author self-review` and the reason. Convenience/cost is not unavailability.
   The exposed tool inventory is valid availability evidence: if no agent tool or
   supported discovery path exists, disclose that fact; do not invent a probe or
   attempt a nonexistent tool. If discovery exists, check it before falling back.
4. If no blockers remain, record CLEAN (advisories may remain) and return to the
   skill's normal completion. Otherwise correct all local blockers in one round,
   within existing edit authorization, and rerun affected existing validators or
   preparation checks. Refresh changed test evidence; do not rewrite observations.
5. Obtain one confirmation review in fresh context, or the disclosed fallback.
   Inspect the current artifact and prior findings, including consequences of fixes.
   Record CLEAN only if no blockers remain. At most two completed reviews are
   allowed per attempt. An interrupted/invalid review is unfinished, not CLEAN;
   retain it and use existing operational recovery rather than automatic retries.

An input edit invalidates coverage of that input; reassess it within the remaining
allowance. Editing, redispatch, resume or autonomy changes never reset exhaustion.
Reuse a completed record only for unchanged relevant inputs. User edits at an
approval boundary must be checked before dependent work; do not silently overwrite
an accepted artifact or bypass existing reapproval/refinement requirements.

## Reviewer prompt

> Review the supplied current artifacts read-only using the matching checklist in
> docs/artifact-quality-review.md. Inspect source/assertions only as needed for
> concrete claims. Return all supported blockers and optional advisories together,
> with the criterion/rule, exact artifact/source location, evidence, consequence
> and responsible artifact. Distinguish verified observations from assumptions
> and unavailable checks. Review previous findings and corrected regions when
> supplied. Do not edit, run additional checks, ask the user, publish, write the
> record or modify workflow activity. Do not treat absent production implementation
> or expected progression failures as defects. Return CLEAN or BLOCKED and any
> inspection limitations. CLEAN concerns artifact quality, not implementation
> completion, passing execution or final-review approval.

## Stage checklists

### Spec

Check clarity and consistency of material acceptance clauses, boundaries,
inclusion/exclusion rules, related flows and observable outcomes. Identify actual
unresolved product decisions and contradictions with applicable project rules.
Do not reopen recorded decisions without changed evidence or invent requirements.
A draft with unresolved in-scope decisions retains the existing draft/wait route;
review cannot bless TBDs or supply unapproved product answers.

### Plan

Trace each material spec clause to implementation work and meaningful verification.
Check assumptions against the spec, interfaces against callers, architecture and
security constraints, and required verification prerequisites. Challenge whether
all cited tests could pass while the claimed behavior fails, including affected
sibling paths and ordering/failure behavior. For coverage-contract plans inspect
Progression/Regression purposes and Required/Excluded/Unresolved Regression Impact
reasoning. Domain membership discovers candidates; it does not itself require
coverage. Respect existing scope, configured layers and manual verification policy.

### Tests

Inspect actual assertions and fixture values, independent expected results and
mock boundaries against material spec clauses and planned scenarios. Verify that
tests reach the layer owning required behavior, and that a test claimed to protect
multiple scenarios actually asserts them. Distinguish progression expected-red,
already implemented passing coverage and regression baseline observations.
Check purpose against preparation kind without requiring duplicate command runs.
Manual preparation is exempt, not executed; review actions/expected observations
only. Unavailable checks remain unavailable. Missing production behavior is
expected here. Do not manufacture red, production edits or unsupported pass claims.

## Blockers and recovery

A blocker needs a concrete requirement/rule conflict, deficient assertion/design,
or unsupported material claim. Preferences and optional polish are advisories.
Missing observations retain existing verification policies; they do not create a
new blanket execution gate. Metadata-only repairs preserve completed steps and
valid evidence; substantive coverage changes use existing amendment/replan rules.

Surface required product decisions or upstream ownership conflicts immediately,
without spending the correction allowance on unauthorized edits. Test authors
cannot amend plans; planners cannot silently change accepted requirements. Use
existing refinement/planning/readiness routes. Under Implement, accepted-spec
conflicts use `spec-conflict` and mandatory revised-spec acceptance.

After the second completed review remains BLOCKED, save the draft and findings
and do not report success. Under Implement return the existing `needs_input`
questions or `blocked` reason with the review-record path (non-done handoffs must
not include artifacts/data/outcome). No new blocker code is introduced.
Guided/Autonomous use existing pending-input handling to offer Retry with corrective
direction or Stop; for spec conflicts use the existing refinement route instead.
Autopilot stops. Standalone reports the same options and awaits direction.
Only explicit user authorization of another attempt resets the local allowance;
a retry request must supply corrective direction or resolve the named blocker.
Retain previous findings and reuse valid work. No generic continue-anyway waiver
or automatic upstream retry loop is added.
