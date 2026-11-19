### Final context sync

For `repo_impact_version: 1`, apply [repository impact](../repository-impact.md): check the current assessment; reuse justified no-maintenance records for unchanged repos, and skip context-only documentation/map work. Keep those repos visible in packaging and report tests as not required, not passed.


See Final context sync below.

#For `review_scope_version: 1`, `sync-complete` checks the final tree against the
reviewed delivery target. If documentation, test-map files or other delivery
content changed, it saves the context paths and returns to Review with an
explicit `next_action`; follow that action rather than building a package. This
uses the existing review-cycle cap and does not consume a fix/replan round. Once
the current full diff has been independently reviewed, run final sync again
without rewriting unchanged context. Packaging requires covered scope for every
delivered file and binds the target and its diff artifacts into its evidence.

If later edits during final approval invalidate coverage, apply the controller's
`refresh-review` event, then prepare and dispatch the new target. It verifies
actual scope drift before returning to Review; an already-reviewed tree does not
consume another review cycle. Completed runs retain their existing terminal and
new-run rules. Saved runs without `review_scope_version` keep legacy disclosure
behavior; do not retrofit the marker to a historical run.

## Final context sync

The Final Sync phase runs after review comes back `CLEAN`; the same bounded maintenance procedure is also used during Review preparation. In Review preparation, record `review-context` and continue to target preparation; do not emit `sync-complete` or advance the phase. After CLEAN, address only newly discovered gaps and confirm existing context is current. On a repeated final-sync pass, retain
already-correct context and test-map artifacts; do not rewrite or regenerate them
without a real content change. Its job is to make the project's knowledge base describe the system as it now is — reusable knowledge for future work, not a record of this ticket.

When delegating documentation/test-map maintenance, assign separate evidence
files before dispatch, following [Stage skills](stage-contract.md). For example,
two workers in a new marked run might receive
`make-it-work/DEMO/miw-DEMO-api-docs-w1.md` and
`make-it-work/DEMO/miw-DEMO-web-test-map-w2.md`; honor the saved run's naming
convention. Workers in the same repo also get distinct filenames. Use a fresh
name for another worker/attempt or an occupied path, without a user question.
Collect each exact returned path into the appropriate repo's maintenance
`evidence` list. Each actual documentation/map file has one assigned writer;
other workers return contributions separately. The parent owns any consolidated
report and the existing `review-context`/`sync-complete` checkpoint. Parallel
workers do not append to or replace one shared evidence file.

**Inputs:**

- The full change: `git diff $(git merge-base <base> HEAD)` plus untracked files, excluding `make-it-work/`.
- Context discoveries collected during the run (from `execute` or the Lightweight report, and from review's context gaps).
- The spec and the current plan, or the Lightweight report when the run has no plan.
- The documentation items of the project's `CLAUDE.md` "After Any Feature Change" checklist and its quick-lookup table — not its commit-time items.

Apply [context discovery's documentation maintenance rules](../context-discovery.md) first. The go-deep destinations below apply where that knowledge base already exists; they do not require creating missing onboarding structure. For other repositories, maintain existing relevant docs or record a reasoned no-change outcome and deferred discoveries in run artifacts. Final sync itself remains mandatory.

**Reconcile discoveries before reuse.** Compare implementation discoveries with the review findings and final code/contracts. Correct or explicitly mark disproven claims as superseded in the state's Context discoveries and any affected current documentation. Cite the correcting evidence; preserve historical reports and audit rows, linking the correction to the original claim where needed. Retain unresolved contradictions as limitations, using the existing stop/question route for essential unknowns. Do not present an assumption or a refuted discovery as an established fact in reusable knowledge or the final package.

**For each piece of changed or newly learned behavior, choose one:**

- Update the existing `domain-*` or `uc-*` skill that covers it.
- Create a new skill when no existing one fits, and register it everywhere `CLAUDE.md`'s checklist says (Skills Reference, the Functional Domains table in `architecture.md`, the UC table in `product.md` for a new flow, the quick-lookup table).
- Update `.claude/rules/architecture.md` or `.claude/rules/product.md` when the change alters system-level understanding.
- Change nothing, when nothing reusable was learned.

Follow `go-deep`'s rules: UC skills describe what the user does and sees, domain skills describe how it is built and where the code lives; keep to the size targets; keep only what someone could not learn by reading the code. Never mention the ticket, its ID, or "this change added…".

Keep this sync scoped to the implemented behavior and discoveries needed to document it. Do not run or follow `go-deep`, rebuild the repository's knowledge base, or repair unrelated pre-existing documentation. Record broader gaps in Context discoveries with the repo, evidence and deferred work; include material limitations in the final package. A deferred gap does not waive a required implementation, validation or review stop.

Write the updates directly, without a confirmation step, at both autonomy levels. Add the files changed to `context_updated`.
For controller runs, include those paths in the `sync-complete` event's `context_updated` array (or `[]` for none); prose in `reason` does not update the field.

**Reconcile test maps after documentation edits.** For each affected product repo with a current test-strategy, follow [references/final-sync-mapping.md](../final-sync-mapping.md) and `<base>/../../docs/test-map-contract.md` against the finished documentation tree. Inspect baseline readiness first, then reassess the affected behavior and documentation with bounded inputs. Pre-existing incomplete onboarding is not an implicit full-rebuild task. Persist meaningful map updates and regenerate `.claude/testing/TEST-MAP.md`; include changed paths in `context_updated` and disclose remaining uncertainty in the final package. Do not modify source/tests for mapping or migrate old metadata.

Resolve review-identified affected-test relationships when the available assertions and domain/UC guidance establish them. A clean verdict does not clear the review's context gaps. Retain unresolved relationships only for actual missing/ambiguous evidence or an access blocker, with that reason recorded. Avoiding another review cycle is not a reason to leave a supported correction undone; make the update and follow the existing scope/review routing below.

**Reuse completed validation.** Do not run tests again merely as a Final Sync safety check. Documentation/map/report updates that preserve tested behavior, test selection and verification assumptions reuse the completed gate and review. If reconciliation changes those selections or assumptions, or source/test behavior changes, checkpoint `Stopped` at final-sync, naming the affected Execute validation and Review work required before completion. The previous result does not validate that new scope; do not invent an unlisted phase transition.

For a run with `final_package_version: 1`, checkpoint `final-sync → final-approval` after these updates and regenerate the dashboard. The package captures the finished tree, including these documentation changes. An older run follows its existing `final-sync → complete` transition.

---


**Testing summary:** New runs carry script-owned `testing_summary` metadata. The controller inventories missing strategies at `context-ready` and refreshes actual methods from verification evidence (or Lightweight independent review) at `sync-complete`. Do not hand-edit this field or create onboarding artifacts to remove a note. Final packaging independently checks and includes it; if it changed, repeat final sync and rebuild the package. Older runs without the field remain unchanged.
