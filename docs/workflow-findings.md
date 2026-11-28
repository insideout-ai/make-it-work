# Workflow findings

Maintainer review ledger. Recommendations are proposals; they do not authorize changes. Preserve successful behavior and record minor friction so recurrence can inform later decisions. Fix risk describes a proposed remedy, independently of issue impact. R001 records the initial undecided review; D001/D002 below record the subsequently authorized decisions, implementation and validation status.

## Current overview

**Status reconciliation: 2026-11-27, inspected `main` at `5c0fd6b` (5.17.5).** This overview is a navigation aid, not a new finding, fix selection or recurrence. Read the linked finding and decision record before acting. Historical statements below describe their original checkpoint; later dated delivery updates supersede only that delivery status. Uncommitted work is not merged work.

Maintainer **decision**, **implementation/delivery**, and **verification** are separate. Merging a fix does not establish installation in a reporting user's account, universal model adherence, or live verification of every affected route. Severity and fix risk retain their separate meanings in the detailed decision summary.

### Work needing attention

| Work | Maintainer decision | Implementation / delivery | Verification / next step |
| --- | --- | --- | --- |
| WF-059 CLI / default cost estimation — D047 | Fix selected, 2026-11-28 | Implemented and verified locally; uncommitted | 107 focused, 918 workflow and 116 harness/package checks passed; live model/session adherence unverified. |
| WF-015 recovery wording / WF-042 review-path examples — D046 | Fix selected, 2026-11-28 | Implemented and verified locally; uncommitted | 88/88 focused, 909/909 workflow and 116/116 harness/package checks passed; live model adherence unverified. |
| [WF-047](#wf-047--activity-argument-retries-were-misdiagnosed-as-a-path-problem), [WF-051](#wf-051--missing-delivery-cli-was-discovered-after-exact-plan-approval), [WF-052](#wf-052--developer-reported-an-hour-in-the-wrong-repository) — D045 | Fix selected | Implemented locally; not recorded as delivered | D045 records 869/869 workflow and 116/116 harness/package checks passing; live-provider and paid-smoke verification remain unperformed. |
| [WF-053](#wf-053--developer-reported-earlier-artifact-folder-deletion) | Undecided; investigation recommended | No remedy selected | Earlier deletion is user-reported and uncorroborated. Establish recovery/ownership before selecting a change. |
| [WF-007](#wf-007--sanitization-rejected-generic-workflow-vocabulary) | Earlier fix retained; renewed investigation completed in D038; vocabulary extension unselected | Earlier implementation remains; proposed extension is not implementation | Decide separately on the bounded sanitizer proposal. WF-015 wording is selected separately in D046; runtime/timing-policy changes remain unselected. |
| [WF-008](#wf-008--approval-narration-paraphrased-the-proposed-pr-body), [WF-039](#wf-039--localized-discoveries-triggered-costly-replanning-and-broad-revalidation) | Renewed adherence investigation / reuse-policy remedy remains undecided | Earlier behavior and bounded investigation results retained | No broader gate/evidence-reuse remedy selected. |
| [WF-022](#wf-022--branch-helper-created-the-ticket-branch-at-current-head-not-the-previewed-base), [WF-025](#wf-025--context-grew-to-about-854k-tokens-user-reported-85-of-the-window) | Existing partial selections retained | Bounded branch/feedback improvements implemented | Broader investigation/context-attribution questions remain open; do not call the entire issue closed. |
| [WF-004](#wf-004--question-options-mixed-scope-decisions-and-the-custom-answer-was-rejected), [WF-012](#wf-012--a-one-line-final-sync-documentation-edit-consumed-the-last-allowed-review-cycle) | Deferred | Existing behavior retained | No automatic reopening or safeguard removal. |
| Startup / refinement: [WF-024](#wf-024--branch-pause-message-gave-no-path-to-restore-the-branch), [WF-035](#wf-035--readiness-dependency-link-was-classified-as-premature-implementation), [WF-046](#wf-046--refinement-question-preceded-reading-the-comments-that-addressed-it) | Undecided | No new implementation selected by these review entries | Consult impact, recommendation and fix risk in the decision summary before selecting work. |
| Testing / execution: [WF-031](#wf-031--planned-api-and-integration-tests-were-ineligible-for-preparation), [WF-032](#wf-032--prepared-virtual-mocks-became-order-dependent-after-implementation), [WF-033](#wf-033--prepared-tests-for-later-steps-prevented-real-tree-verification), [WF-037](#wf-037--later-execute-phases-ran-inline-without-a-new-mode-decision), [WF-038](#wf-038--later-execution-timing-was-almost-entirely-unclassified), [WF-045](#wf-045--developer-reported-excessive-tests-for-a-small-lightweight-change), [WF-050](#wf-050--fixed-migration-version-collided-with-a-second-source-location) | Undecided | No new implementation selected by these review entries | Consult impact, recommendation and fix risk in the decision summary before selecting work. |
| Review / finalization: [WF-027](#wf-027--delivery-preparation-edited-gitignore-after-package-validation), [WF-029](#wf-029--assessment-and-package-used-different-repository-names-for-identical-snapshots), [WF-034](#wf-034--final-approval-excluded-live-assessment-delegates-from-permitted-waits), [WF-041](#wf-041--gate-cancellation-recovery-promised-an-unverified-route-and-overstated-the-restriction), [WF-048](#wf-048--final-sync-maintenance-refresh-hit-a-workspace-snapshot-guard), [WF-049](#wf-049--known-documentation-discoveries-were-applied-after-the-first-review) | Undecided | No new implementation selected by these review entries | Consult impact, recommendation and fix risk in the decision summary before selecting work. |

The rows group remaining work, not mutually exclusive issue categories or severity ranks. Completed investigations and earlier implemented fixes stay in the full decision summary; their evidence remains below.

### Confirmed delivery updates

| Work | Maintainer decision | Implementation / delivery evidence | Verification limits |
| --- | --- | --- | --- |
| [WF-028](#wf-028--planned-documentation-edits-could-not-refresh-impact-evidence-in-execute), [WF-030](#wf-030--semantic-plan-gaps-survived-existing-self-review-and-fix-planning), [WF-040](#wf-040--adding-paths-inside-existing-change-repos-reset-the-completed-plan) — D036/D037 | Existing bounded Fix selections retained | 5.17.2 merged through PR #118, merge `1ebfaf9` | D036 retains its deterministic results; R010 does not exercise both impact-update routes. No new live result established here. |
| [WF-018](#wf-018--parallel-delegates-wrote-the-same-evidence-filename), [WF-036](#wf-036--approved-commit-prose-failed-the-repositorys-line-length-rule), [WF-042](#wf-042--private-artifact-and-source-roots-caused-helper-path-retries), [WF-043](#wf-043--draft-markdown-backticks-executed-inside-an-unquoted-shell-heredoc) — D039/D040 | Existing bounded Fix selections retained | 5.17.3 merged through PR #119, merge `a8edd0c` | D039 retains local validation evidence and model-adherence limitations. Merge evidence alone does not fill those gaps. |
| [WF-044](#wf-044--reported-typecheck-failure-lost-its-status-and-baseline-uncertainty-before-approval) — D042–D044 | Existing capture/propagation selections retained | 5.17.4 merged through PR #120, merge `24543f1` | Capture-enabled scope and legacy/uncaptured limitations remain; do not claim all free-text qualifications are automatically protected. |

**Related 5.17.5 context:** PR #121 merged at `5c0fd6b`, including progression/regression purpose, impact and baseline visibility. This preserves existing test-selection/execution rules. It therefore does **not** resolve WF-045's Lightweight test-proportionality concern, nor select WF-039's evidence-reuse remedy. This is repository-history context, not another reviewed user session.

### Navigation and maintenance

- [Decision summary](#decision-summary): all 59 finding entries, recommendations, fix risks and maintainer decisions.
- [Major findings](#major-findings), [Minor findings](#minor-findings), and [Uncertainties / no-change observations](#uncertainties-and-no-change-observations): evidence and qualifications.
- [Maintainer decisions](#maintainer-decisions): chronological authorization history; later explicit decisions may supersede earlier holds.
- [Review/source history](#reviewsource-history): source identity, captured versions, reviewed ranges and limits.
- [Selected fix plans](#selected-fix-plans): D001 onward, preserving original selections, validation and rollback details.

For later maintenance, update the overview and relevant summary disposition together. Append dated implementation/delivery/verification evidence to the corresponding decision record; preserve historical statements and stable WF/R/D IDs. Do not infer a new Fix decision or a passing check from a recommendation, a merge, or silence. This ledger remains one Markdown file with no runtime parser/schema.

**Latest supplemental review — R015, 2026-11-28:** a later reported attempt for session M could not calculate cost after delivery was declined; the enabled cost CLI failure is independently reproduced in the maintainer checkout (WF-059). Direct archive-only calculation succeeds with a partial estimate. This adds no distinct live session or fix selection.

**Latest review — R014, 2026-11-28:** session M completed locally on captured 5.19.0, with exact package approval and disclosed verification limits. Three new Minor findings (WF-056–WF-058), related recurrences WF-006/WF-007/WF-042, no new Major defect. Feedback finalization is cut off. New remedies remain Undecided; unrelated delivery history above is not reconciled by this review.

**Latest review — R013, 2026-11-27:** session L completed successfully on captured 5.18.0, with disclosed verification limits and delivery declined. No new Major issue; new Minor WF-054/WF-055 and recurrences WF-007/WF-015/WF-042. These review additions select no remedy and do not reconcile unrelated historical delivery status above.

## Decision summary

| ID | Issue impact | Distinct sessions | Proposed action | Fix risk | Recommendation | Maintainer decision |
| --- | --- | --- | --- | --- | --- | --- |
| [WF-001](#wf-001--repository-access-failed-after-commit-and-push) | Major: delivery | 2 (A, B) | Repository-specific read-only preflight | Low, bounded prerequisite check; later writes can still fail | Fix | Fix — implemented; checks below |
| [WF-002](#wf-002--delegate-test-attribution-was-omitted-from-proposed-publication-text) | Major: evidence trust | 1; repeated presentations | Inspect existing qualification-to-summary path | Unknown until enforcement approach is chosen | Investigate | Investigated — qualifications preserved; see R002 |
| [WF-003](#wf-003--frontend-cause-was-stated-more-definitively-than-the-investigation-supported) | Minor: diagnostic wording | 1 | Preserve hypothesis wording in handoffs | Low for a narrow guidance correction | Investigate | Investigated — hypothesis preserved; see R002 |
| [WF-004](#wf-004--question-options-mixed-scope-decisions-and-the-custom-answer-was-rejected) | Minor: refinement friction | 1 | Improve option/dependency guidance before considering schema changes | Medium: agent questioning behavior | Investigate | Defer |
| [WF-005](#wf-005--delegate-report-path-base-was-unclear-at-the-call-site) | Minor: helper retry | 4 (A, B, J, K), captured without clarified call guidance | Document absolute helper-returned paths | Low: documentation; keep resolver semantics | Fix | Fix — implemented; checks below |
| [WF-006](#wf-006--saved-feedback-narrative-conflicted-with-its-collection-notes) | Minor: report accuracy | 2 (A, M) | Apply existing bounded closing check to visible failures | Low for narrow guidance; enforcement design unassessed | Investigate | Investigated — consistency case passed; see R002 |
| [WF-007](#wf-007--sanitization-rejected-generic-workflow-vocabulary) | Minor: validator retry | 9 (A, B, D, E, G, I, K, L, M) — captured versions differ | Assess narrow public-vocabulary exception | Medium: privacy protection must remain effective | Investigate | Fix — D004 implemented; renewed investigation complete in D038; eight-literal extension proposed, unselected |
| [WF-008](#wf-008--approval-narration-paraphrased-the-proposed-pr-body) | Minor: approval reviewability | 2 live (J, K) + 1 synthetic | Retain complete-text guidance; investigate adherence if selected | Low guidance; enforcement unassessed | Investigate historical adherence | Implemented — D002; renewed investigation Undecided |
| [WF-009](#wf-009--publication-helper-rejected-the-miw--journal-filename-after-consent) | Major: consented ticket updates unavailable for the whole run | 2 (B, C) | Make the journal-name check accept the saved `miw-` form while keeping run binding | Medium: external-write path and legacy-name compatibility | Fix | Fix — implemented; deterministic regression checks passed, see D003 |
| [WF-010](#wf-010--run-began-on-another-tickets-feature-branch-without-a-question-and-was-restarted) | Minor: startup friction (user-reported expectation) | 1 (session B) | Detect a branch naming a different ticket; alert and ask continue vs new branch | Medium: startup/branch gating | Investigate (user's expectation raises confidence) | Fix — implemented; startup probe passed, see D003 |
| [WF-011](#wf-011--delegate-flagged-test-compromise-on-a-spec-clause-was-accepted-and-two-fix-rounds-followed) | Minor: avoidable fix rounds (safeguard worked) | 1 (session B) | Investigate reconciling delegate-flagged modelling compromises before execution | Medium: planning/test-prep behavior | Investigate | Investigated — focused hand-back probe passed; see D003 |
| [WF-012](#wf-012--a-one-line-final-sync-documentation-edit-consumed-the-last-allowed-review-cycle) | Minor: review budget | 1 (session B) | Observe only; no change proposed yet | High if the cycle cap or reopen rule changed | Defer | Defer — retain current review safeguards; see D003 |
| [WF-013](#wf-013--handoff-directory-was-resolved-with-the-miw--prefix-the-helper-requires-none) | Minor: helper retry | 1 (session B) | Clarify directory vs file prefix at the handoff call site | Low: documentation | Investigate | Fix — path guidance clarified; naming checks passed, see D003 |
| [WF-014](#wf-014--plan-approval-did-not-call-out-risks-left-above-low-after-mitigation-user-suggested) | Minor: user-suggested approval warning | 1 (session B) | Warn on unmitigated risks above Low at plan approval; default accept, offer discussion | Medium: approval-prompt content | Investigate | Fix — implemented; risk-presentation probes passed, see D003 |
| [WF-015](#wf-015--planning-activity-hook-denied-same-turn-narration-and-forced-repeated-narration-and-stop-hook-rounds) | Minor: repeated hook denials and duplicate narration in planning | 5 (C, D, E, I, L) | Clarify already-sent versus missing narration recovery | Low for wording; runtime changes Medium and unselected | Fix recovery wording only | Fix — D008 retained; D046 wording patch implemented and verified locally; timing/matcher unchanged |
| [WF-016](#wf-016--plan-file-lists-missed-files-the-tests-and-steps-needed-requiring-repeated-amendments) | Minor: repeated scope/preparation corrections and user decisions | 2 (C, F) | Reconcile known contract callers, per-step edit lists and test-support destinations during existing self-review | Low for selected guidance; broader authorization changes unassessed | Fix (guidance) | Guidance clarification implemented; authorization unchanged and live adherence unverified, see D019/D020 |
| [WF-017](#wf-017--regression-and-verification-helper-input-shapes-were-learned-by-reading-helper-source) | Minor: helper retry, first gate ran no tests | 1 (session C) | Add exact input examples at the call sites | Low: documentation | Fix | Fix — examples implemented; validation below, see D005 |
| [WF-018](#wf-018--parallel-delegates-wrote-the-same-evidence-filename) | Minor: evidence overwritten, recovered | 1 (session C) | Investigate dispatch wording for parallel delegates | Low–Medium | Investigate | Fix — D012 guidance retained; D039 script allocation merged via PR #119 (5.17.3); recorded validation/limits retained |
| [WF-019](#wf-019--unrelated-pre-existing-local-files-entered-the-review-target-final-package-and-delivery-plan) | Major: review/delivery scope | 1 (session D) | Find why the helper listed 3 of 18+ files; flag out-of-plan paths once at `prepare` | Medium: review/package/delivery path sets | Investigate | Fix — advisory scope handling for new runs; D010 supersedes the D009 gates |
| [WF-020](#wf-020--delivery-plan-offered-no-path-subset-so-a-subset-was-delivered-with-raw-git-and-gh) | Minor: delivery outside helper (user-directed) | 1 (session D) | Optional selected-file delivery with exact candidate-tree and branch-scope preview | Medium–High: approval/hash binding and candidate assurance | Investigate | Fix — implemented and validated locally; see D015/D016 for evidence and limits |
| [WF-021](#wf-021--silent-completion-gate-stall-and-mis-estimated-gate-cost-drew-three-user-complaints) | Major: about 110 min gate time, user complaints | 1 (session D) | Idle detection in the runner or call-site guidance on timeouts/estimates | Low (wording) to Medium (runner) | Investigate | Fix — progress retained; reporting failures are advisory, see D007/D010 |
| [WF-022](#wf-022--branch-helper-created-the-ticket-branch-at-current-head-not-the-previewed-base) | Major: startup/delivery integrity (agent recovered) | 1 (session D) | (a) Truthful preview of the start point; (b) consider `origin/<base>` start | (a) Low–Medium; (b) Medium–High | Fix (a), Investigate (b) | Fix (a) — implemented; tracking-only drift is advisory, see D005/D010; (b) remains investigation |
| [WF-023](#wf-023--verificationmjs-check---state-exited-13-with-an-unsettled-top-level-await) | Minor: verification CLI result lost | 1 (session D) | Investigate the unsettled await | Low–Medium | Investigate | Fix — reproduced and implemented; 762 workflow tests passed, see D011 |
| [WF-024](#wf-024--branch-pause-message-gave-no-path-to-restore-the-branch) | Minor: wording | 1 (session D) | None until recurrence | Low | Defer | Undecided |
| [WF-025](#wf-025--context-grew-to-about-854k-tokens-user-reported-85-of-the-window) | Major (user-reported, observed growth): context pressure | 1 (session D) | Identify the largest context contributors | Unknown until cause is established | Investigate | Partial — compact feedback-save receipt implemented; broader context attribution remains open, see D005/D013 |
| [WF-026](#wf-026--default-full-delivery-can-omit-a-local-reversal-and-publish-a-different-tree) | Major: delivered content can differ from the source package | 0 historical; disposable helper reproduction | Derive the full-delivery tree from the reviewed result and preview the required commit changes | Medium for the selected narrow scope: newly prepared full plans only | Fix | Narrow fix implemented and validated locally; saved older plans retain their contract, see D018 |
| [WF-027](#wf-027--delivery-preparation-edited-gitignore-after-package-validation) | Major: approved delivery blocked by helper-created drift | 1 (E) | Remove unrelated artifact protection from private-session delivery preparation | Medium: artifact privacy, exact trees, legacy layouts | Fix | Undecided |
| [WF-028](#wf-028--planned-documentation-edits-could-not-refresh-impact-evidence-in-execute) | Major: completion/replan blocked by stale evidence | 2 (E, H) | Bounded refresh and correctness-stop recovery | Medium–High: phase/evidence and gate binding | Fix bounded remedy | Fix — D036 bounded remedy merged via PR #118 (5.17.2); deterministic checks recorded; R010 does not exercise this route |
| [WF-029](#wf-029--assessment-and-package-used-different-repository-names-for-identical-snapshots) | Minor: completed assessment unusable in package | 1 (E) | Align new assessment snapshots with saved repository IDs | Medium: snapshot identity and historical reports | Fix | Undecided |
| [WF-030](#wf-030--semantic-plan-gaps-survived-existing-self-review-and-fix-planning) | Major: consequential defects deferred to independent review | 4 (E, F, H, I) | Investigate adherence to existing reachability/assumption/sibling checks | Low–Medium for selected guidance; broader remedies unassessed | Fix selected guidance | Fix — D036 guidance merged via PR #118 (5.17.2); R010 provides partial live evidence, not universal adherence |
| [WF-031](#wf-031--planned-api-and-integration-tests-were-ineligible-for-preparation) | Minor: 12 initial scenarios deferred to execution | 1 (E) | Investigate supported test-location recognition without broader write access | Medium: pre-edit permission boundaries | Investigate | Undecided |
| [WF-032](#wf-032--prepared-virtual-mocks-became-order-dependent-after-implementation) | Minor: suite flakiness and corrective attempt | 1 (E) | Investigate mocks for planned modules across preparation/execution | Medium: test isolation and evidence validity | Investigate | Undecided |
| [WF-033](#wf-033--prepared-tests-for-later-steps-prevented-real-tree-verification) | Minor: early checks required altered scratch copies | 1 (E) | Investigate compile-safe sequencing within existing authorization | Unknown: step order, stub permissions and evidence | Investigate | Undecided |
| [WF-034](#wf-034--final-approval-excluded-live-assessment-delegates-from-permitted-waits) | Minor: three holds and parent polling | 1 (E) | Extend existing verified-wait handling narrowly | Medium: Stop/phase enforcement | Fix | Undecided |
| [WF-035](#wf-035--readiness-dependency-link-was-classified-as-premature-implementation) | Minor: baseline interruption and setup workaround | 1 (E) | Investigate supported isolated-readiness setup | Medium: setup vs application-edit protection | Investigate | Undecided |
| [WF-036](#wf-036--approved-commit-prose-failed-the-repositorys-line-length-rule) | Minor: delivery retry and manual recovery | 1 (E) | Format drafts to observed repository conventions before approval | Low: draft guidance; exact approval retained | Fix | Fix — D039 script-owned draft preparation merged via PR #119 (5.17.3); recorded validation/limits retained |
| [WF-037](#wf-037--later-execute-phases-ran-inline-without-a-new-mode-decision) | Minor: execution-choice adherence | 3 (F, G, I) | Investigate saved-mode adherence, including parent-side corrections | Medium: dispatch and resume behavior | Investigate | Undecided |
| [WF-038](#wf-038--later-execution-timing-was-almost-entirely-unclassified) | Minor: diagnostic usefulness | 1 (F) | Apply existing category checkpoints at meaningful boundaries | Low–Medium: reporting only if kept advisory | Investigate | Undecided |
| [WF-039](#wf-039--localized-discoveries-triggered-costly-replanning-and-broad-revalidation) | Major: reported/observed repeated downstream work | 2 (F, H) | Investigate invalidation scope and evidence reuse for localized revisions | Medium–High: approvals, evidence freshness, legacy resumes | Investigate | Bounded transcript investigation complete; reuse-policy remedy undecided, see D033 |
| [WF-040](#wf-040--adding-paths-inside-existing-change-repos-reset-the-completed-plan) | Major: completed steps re-verified after a local correction | 1 (H) | Preserve amendment progress for narrowly scoped path additions; refresh affected bindings | Medium–High: impact hashes, approvals and phase/resume binding | Fix bounded remedy | Fix — D036 bounded remedy merged via PR #118 (5.17.2); deterministic checks recorded; R010 does not exercise this route |
| [WF-041](#wf-041--gate-cancellation-recovery-promised-an-unverified-route-and-overstated-the-restriction) | Minor: misleading recovery explanation and extra triage | 1 (H) | Investigate compatible cancellation evidence and truthful route guidance | Medium: failed/no-result semantics; wording-only subset Low | Investigate | Undecided |
| [WF-042](#wf-042--private-artifact-and-source-roots-caused-helper-path-retries) | Minor: recovered path-base retries | 3 (I, L, M) | Retain review examples; investigate broader handoff CLI examples separately | Low for examples; resolver changes Medium and unselected | Fix review examples only | Fix — D039 retained; D046 review examples implemented and verified locally; broader path changes unselected |
| [WF-043](#wf-043--draft-markdown-backticks-executed-inside-an-unquoted-shell-heredoc) | Minor: accidental commands, redundant suite run and draft rebuild | 1 (I) | Use literal-safe draft writing at the existing final-package step | Low for bounded authoring guidance; package hashes retained | Fix bounded guidance | Fix — D039 literal-data draft preparation merged via PR #119 (5.17.3); recorded validation/limits retained |
| [WF-044](#wf-044--reported-typecheck-failure-lost-its-status-and-baseline-uncertainty-before-approval) | Major: final approval omits a material validation qualification | 1 (I) | Propagate captured-command facts through existing review/package qualifications | Medium: evidence interpretation and exact approval content | Fix bounded capture-enabled propagation | Fix — D043 capture-enabled propagation merged via PR #120 (5.17.4); recorded validation retained; legacy/uncaptured limitations remain |
| [WF-045](#wf-045--developer-reported-excessive-tests-for-a-small-lightweight-change) | Minor: reported review burden | 1 (J) | Investigate proportional test selection in Lightweight dispatch | Medium: coverage could be weakened | Investigate | Undecided |
| [WF-046](#wf-046--refinement-question-preceded-reading-the-comments-that-addressed-it) | Minor: question lacked existing context | 1 (J) | Investigate adherence to comment ingestion before questions | Medium: questioning and conflict handling | Investigate | Undecided |
| [WF-047](#wf-047--activity-argument-retries-were-misdiagnosed-as-a-path-problem) | Minor: helper retries and lost category | 1 (J), repeated manifestations | Improve argument diagnostics without changing accepted calls | Low: parser errors only | Fix bounded diagnostics | Fix — implemented locally; deterministic validation passed, see D045 |
| [WF-048](#wf-048--final-sync-maintenance-refresh-hit-a-workspace-snapshot-guard) | Minor: recovered completion-event failure | 1 (J) | Characterize maintenance refresh versus snapshot binding | High: phase/freshness checks | Investigate | Undecided |
| [WF-049](#wf-049--known-documentation-discoveries-were-applied-after-the-first-review) | Minor: extra full-scope review | 1 (J) | Investigate adherence to existing review preparation | Medium: maintenance timing | Investigate | Undecided |
| [WF-050](#wf-050--fixed-migration-version-collided-with-a-second-source-location) | Minor: one correction and repeat review; caught before delivery | 1 (K) | Investigate identifier selection and whole-namespace validation | Medium: dispatch responsibility and check breadth | Investigate | Undecided |
| [WF-051](#wf-051--missing-delivery-cli-was-discovered-after-exact-plan-approval) | Minor: approved delivery could not start | 1 (K) | Earlier read-only prerequisite disclosure, retaining run-time checks | Low–Medium: preparation/network error ordering | Fix bounded prerequisite disclosure | Fix — implemented locally; deterministic validation passed, see D045 |
| [WF-052](#wf-052--developer-reported-an-hour-in-the-wrong-repository) | Minor: reported lost time before this captured run | 1 reported episode; earlier identity unknown | Clarify existing repository-routing entry point | Low guidance; automatic startup redesign unassessed | Investigate | Fix — implemented locally; deterministic validation passed, see D045 |
| [WF-053](#wf-053--developer-reported-earlier-artifact-folder-deletion) | Major potential history loss; underlying event uncorroborated | 1 reported earlier episode; linkage unknown | Establish recovery/ownership before selecting preservation remedy | Unknown overall; bounded guidance Low–Medium | Investigate | Undecided |
| [WF-054](#wf-054--preparation-only-coverage-status-confused-the-user-after-tests-passed) | Minor: approval evidence clarity | 1 (L) | Investigate purpose assignment and phase-specific result presentation | Medium if execution-to-scenario binding changes; Low for wording only | Investigate | Undecided |
| [WF-055](#wf-055--shell-portability-errors-caused-recovered-worker-retries) | Minor: worker retries | 1 (L), multiple workers | Prefer available structured editing and quote search patterns | Low for bounded guidance; no runner/state change | Defer | Undecided |

| [WF-056](#wf-056--dashboard-remained-paused-while-post-answer-spec-review-ran) | Minor: progress clarity | 1 (M) | Investigate post-answer review visibility within the existing status section | Low for presentation; lifecycle changes Medium and unselected | Investigate | Undecided |
| [WF-057](#wf-057--repository-skill-loading-selected-the-source-checkout-during-worktree-review) | Minor: guidance provenance; recovered | 1 (M), multiple workers | Investigate binding loaded guidance to approved checkout | Medium: mandatory loading gates and host resolution | Investigate | Undecided |
| [WF-058](#wf-058--pending-output-key-confusion-produced-a-failed-approval-and-false-empty-state-claim) | Minor: recovered approval retry and misleading narration | 1 (M) | Show exact inspect request lookup and stop on parse failure | Low for examples; output/schema changes unselected | Fix bounded guidance | Undecided |

| [WF-059](#wf-059--enabled-cost-cli-exited-13-with-an-unsettled-module-import) | Minor: optional cost estimate unavailable | 1 reported live (M), plus local CLI reproduction | Separate CLI/library; enable default estimation with explicit opt-out | Low–Medium: module initialization and default behavior | Fix bounded CLI dependency | Fix — implemented and verified locally, uncommitted; default-on scope selected separately in D047 |

R014 adds three Minor findings. WF-006 now has **2 distinct sessions (A, M)**, WF-007 **9 (A, B, D, E, G, I, K, L, M)** and WF-042 **3 (I, L, M)**. Renew consideration for cumulative Minor friction without upgrading severity or selecting remedies. Preserve D046's review-field examples and D038's already-completed investigation; the new occurrences do not prove those specific fixes regressed.

R013 adds two Minor findings; WF-007 now has **8 sessions**, WF-015 **5**, and WF-042 **2**. Recurrence warrants renewed consideration for cumulative repair cost, not severity upgrades or new authorization. Earlier decisions and selected plans remain intact.

R012 adds three Minor findings and one separate reported-loss investigation item. Recurrence counts above refer to live episodes, not duplicate reports; no earlier maintainer decision is changed.

R011: session J adds five Minor findings and pre-fix historical WF-005/WF-008 occurrences (WF-005: **3 live sessions, A/B/J**; WF-008: **1 live session plus 1 synthetic case**). No new Major finding, selected remedy, or post-fix recurrence is established. WF-012 remains deferred under D003: another review after documentation edits supports observing its broader friction but does not reproduce exhaustion of the review budget. New WF-049 addresses late maintenance rather than relaxing review coverage or its cap.

R010 update: WF-030 has **4 sessions (E, F, H, I)** including a contained residual plan miss; WF-007 has **6 (A, B, D, E, G, I)** and WF-015 **4 (C, D, E, I)**. WF-028/WF-040 were not enabled or exercised in I. The run completed without fix/replan rounds, while new WF-044 concerns approval evidence. Prior review counts/holds below are historical. No new remedies are selected.

R009 recurrence: WF-030 has **3 sessions (E, F, H)**, WF-039 **2 (F, H)** and WF-028 **2 (E, H)**. WF-040 is a concrete reset mechanism within WF-039's broader cost episode, not additional independent saved-time evidence. WF-030's selected guidance remains on hold; the other remedies are unselected.

R007 update: WF-030 is now evidenced in **2 distinct sessions (E, F)**. Its recommendation remains Investigate, decision Undecided. WF-039 is the primary new user-reported concern; it is separate from the earlier semantic omissions that trigger some corrective work. No new action is inferred from the complaint.

R006 renewal: WF-007 now has **4 distinct sessions (A, B, D, E)** and WF-015 **3 (C, D, E)**. Session E used 5.17.0 after D004/D008; retain their implemented decisions and reopen remedy assessment separately. Renewed decisions remain Undecided. This is not authorization to expand privacy exceptions or weaken hooks.

Cross-session updates in R003: WF-001, WF-005 and WF-007 are now each evidenced in **two distinct sessions** (A and B). See their R003 bullets; WF-007 is flagged for renewed fix consideration under the minor-recurrence rule.

Cross-session update in R004: WF-009 is now evidenced in **two distinct sessions** (B and C), both on plugin 5.14.0, which predates its fix. No post-fix observation exists.

Cross-session updates in R005 (session D, plugin 5.14.0, predating all D001–D004 changes): WF-015 is now evidenced in **two distinct sessions** (C, D) and WF-007 in **three** (A, B, D); both are flagged for renewed fix consideration under the minor-recurrence rule. The summary counts reflect the current evidence; earlier decisions and source observations remain historical.

## Major findings

### WF-009 — Publication helper rejected the `miw-` journal filename after consent

- Category/status: defect; historical and, by static inspection, current. First/last R003; one session (B), affecting the whole run. Observation confidence High; cause confidence High for the mismatch seen in source (not executed); recommendation confidence High.
- Expected vs observed: after the user chose "allow updates", saving that consent should record it and enable the scoped ticket writes. Instead `ticket-publication.mjs consent` failed with "Invalid publication journal filename" (267), and a status call failed identically (281). The state file held a `miw-`-prefixed journal name created by the run's own `init` (281). The agent located the check (298), disclosed it and left ticket writes off for the run (459, 630, 919, 3783).
- Impact: a consented capability (spec/plan comments, description refinement, completion comments) was unavailable for the entire run; the agent fell back to local-only artifacts. No unauthorized write occurred.
- R003 inspection: `skills/implement/scripts/ticket-publication.mjs:311` requires the name to start with `<ticket>-ticket-publication-`, while the expected-name comparison near line 319 is built with `artifactJoin` and so follows the saved naming convention. Existing publication tests inspected (`render-status.test.mjs:642,667`) use unprefixed fixture names; whether any test exercises a `miw-` journal through `init` then `consent` was not established.
- Smallest remedy/owner: implement/ticket-publication helper; accept the saved prefixed form at the filename check while keeping the run-identity binding at line 319 and the containment checks. Do not loosen binding.
- Fix risk **Medium**: guards an external-write path; legacy unprefixed runs must still resume; enabling it makes Jira writes reachable for `miw-` runs that were previously blocked.
- User-reported, unverified: the user also reported Jira access issues, with terminal warnings about the Jira CLI connection. The transcript shows the read-only ticket lookup succeeding (146) and no Jira CLI warnings in the records reviewed, so this may be a separate connectivity problem or the same failure seen differently. It is **not** merged into WF-009 and no cause is assumed; the user could supply the warning text or a screenshot if it matters.
- Proposed verification — untested: in a disposable run created by `init` with `miw-` naming, run consent then a prepare step and assert success; repeat for a legacy-named fixture; assert a journal from another run is still rejected. Rollback: revert the check and its tests. Recommendation **Fix**; decision **Undecided**.
- R004 recurrence (session C, plugin 5.14.0): same failure. `init` produced a `miw-` journal (308); after the user chose "Allow these updates" (328), consent failed with "Invalid publication journal filename" (336). The agent found the same prefix check (347, 355), queued a product-bug draft (360), told the user (845: the helper "rejects the journal file it created itself … I'm posting to Jira through the connector directly and reporting every write") and continued. **Distinct sessions: 2 (B, C).** The checkout already contains the D003 fix; no post-fix observation. Journal-less connector writes followed, each after user consent and disclosed: backup comment (735), description replace (746), plan-summary comment (1484), two sub-tasks (1506–1507), one issue link (1535). Whether the loaded instructions permit direct writes when the journal is unavailable was not established; the journal's duplicate suppression and scope checks did not apply. No duplicate or unapproved write was observed (see Uncertainties).

### WF-001 — Repository access failed after commit and push

- Category/status: observed delivery friction with a preflight gap at R001; addressed locally by D001. First/last seen R001; one failure in session A. Observation confidence High; cause confidence High for the reported SSO rejection; recommendation confidence High.
- Evidence (paraphrased): the user approved the displayed plan (1086). The delivery command returned an organization SAML/SSO authorization error from its PR operation (1106). The journal and Git inspection recorded a completed commit and push, with delivery `partial` and no PR (1115). The agent explained the recovery and retained the approved plan (1124). No rollback or duplicate delivery was observed.
- R001 inspection: `skills/implement/scripts/deliver.mjs` checks CLI availability and general authentication before mutations; its repository PR query is later, after push. General authentication did not establish repository-specific access in this session. The external SSO restriction itself is not a plugin defect.
- Smallest remedy/owner: delivery helper; perform the existing read-only repository PR-access query during prerequisites for every target GitHub repo before staging/committing/pushing any repo. Preserve approvals, hashes, journals, Bitbucket behavior, and late-failure recovery. This does not guarantee write permissions or eliminate races.
- Fix risk **Low**: bounded earlier read, no schema or approval changes; mocks/query counts and error ordering need updates. An unavailable API may now block before mutation, which is intended for an all-steps delivery request.
- Proposed verification — untested: mock general auth success with SSO failure on the repository query; assert unchanged index, local HEAD and remote refs. Include later-repo failure before any mutations, successful delivery, and post-push PR failure/resume without duplicates using existing delivery fixtures.
- Rollback: revert only the added preflight and its tests; existing journal/recovery remains. Recommendation **Fix**; decision **Fix; implemented locally, see D001**.
- R003 recurrence (session B, plugin 5.14.0): partial delivery repeated: approval of the exact plan (3755), SAML/SSO error from the PR step after commit and push succeeded (3770), no retry, partial delivery explained with both recovery options (3783). **Distinct sessions: 2.** The inspected checkout already contains the preflight (commit "Check repository access before delivery"); session B predates it, so there is no post-fix observation. Not a new defect; keep the fix and watch for recurrence on 5.15.0+.

### WF-002 — Delegate-test attribution was omitted from proposed publication text

- Category/status: adherence gap, current instruction already covers it. First/last seen R001; one affected session with repeated presentations at 842 and 1082. Observation confidence High; cause confidence Unknown; recommendation confidence Medium.
- Evidence (paraphrased): implementation/review hand-backs report eight unit-test passes, explicitly not rerun by the reviewer (565, 579, 694). The final approval presentation states the tests ran and passed without that attribution (842). The saved feedback identifies this omission (1015, embedded F3). The delivery preview repeats the bare passing result in the PR body while separately acknowledging the missing attribution and asking whether the user wants it changed (1082). The user approved afterward (1086); the PR was not created, so publication of this text was not observed.
- Impact/recovery: approval and proposed publication text were less precise than the supporting report. This does not establish fabricated test execution or require the parent to rerun passing tests. Other parts of the presentation preserved the qualifications.
- R001 inspection: `skills/implement/references/orchestration/final-package.md` and `skills/deliver/SKILL.md` already require qualification preservation; `deliver.test.mjs` covers qualification propagation in artifacts. That coverage does not prove a model's approval narration or contradictory draft prose is correct.
- Smallest action/owner: investigate the final-package/delivery summary path and an existing-behavior evaluation using delegate-only test evidence. Determine whether a narrow draft/presentation correction suffices. Do not duplicate the existing requirement or introduce a new evidence schema by default.
- Fix risk **Unknown** until a remedy is chosen: targeted guidance could be Low/Medium; broad summary generation or schema changes affect package approvals and compatibility. Recommendation **Investigate**, not automatic architectural enforcement.
- Proposed verification — untested: an evaluation should preserve attribution in the approval narrative, draft PR body, and delivery summary, while retaining existing approval bindings and test-reuse policy. Rollback a later isolated guidance/evaluation patch; no runtime change selected. Decision **Investigated; tested qualifications preserved, see R002**.

### WF-019 — Unrelated pre-existing local files entered the review target, final package and delivery plan

- Category/status: observed friction with a scoping gap; historical, and current by static inspection. First/last R005; one session (D). Observation confidence High; cause confidence Low; recommendation confidence Medium.
- Expected vs observed: the controller's "Pre-existing untracked files" step (`controller.md` ~194–208, `orchestration/review.md` 17–22) is meant to keep unrelated local files out of review, package and delivery. The helper listed only 3 untracked files and the user chose "Keep them out" (2109–2116); the question itself said other loose notes and untracked skill files were "outside what this helper can list". The frozen review target still held 32 backend-repo paths (2213, 2233). Final approval disclosed 33 delivery paths of which only 18 were the ticket's work, the rest pre-existing local files (2453); the delivery plan repeated that and the agent's own question recommended Stop (2752). The completion summary says some of those files were not reviewed and others only skimmed (2712).
- Impact: no unrelated file was committed. The disclosure came at final approval, after review and before delivery, so review ran on an inflated target. The agent had said it would flag such files "if they show up in the review target" and did so only at final approval (2233 does not).
- Inspection (static): `skills/implement/scripts/review-scope.mjs` `preexistingUntracked` (lines 85–109) lists only untracked files whose saved-baseline image still matches; modified tracked files and any untracked file whose bytes changed are never listed. Why 15+ files were not listed is **cause unknown**; whether their bytes changed during the run, or they fall outside the baseline's entries, was not determined.
- Smallest action/owner: implement review-scope. First reproduce the omission in a disposable repo (modified tracked file plus untracked skill directories); then consider reporting any review-target path outside the plan's Affected Code once at `prepare`, with the existing one-time ask.
- Fix risk **Medium**: review scope, package and delivery path sets, and legacy resumes. Proposed verification — untested: disposable repo as above; unrelated paths are excluded or flagged once; ordinary runs are unchanged. Rollback: revert the helper/guidance edit. Recommendation **Investigate**; decision **Undecided**.

### WF-021 — Silent completion-gate stall and mis-estimated gate cost drew three user complaints

- Category/status: observed friction, partly environmental; historical. First/last R005; one session (D). Observation confidence High; cause confidence Low–Medium (split between environment and missing progress visibility is unknown); recommendation confidence Medium.
- Evidence (paraphrased unless quoted): the full-suite gate was started in the background with an agent-chosen 50-minute timeout and its output going to a file (1625–1636). At the user's second nudge the output files were empty and the process had idled about 35 minutes (1655–1669); the agent killed it, reported 86 failures in unrelated specs, and asked how to proceed (1705–1714). A single-process rerun after a dependency sync failed the same way (1747–1754). A batched rerun hung on one batch, which the agent killed after the third user message (1793–1821). The next batched run was estimated at "roughly 20 minutes" (1853); its completion notice arrived exactly 55:00 after launch (1858), equal to the 3,300,000 ms timeout set at 1848 (whether the timeout ended it is not shown), with a FAIL and an acknowledged partial failure list (1863, 1879). Environment limits surfaced at the gate: no Java runtime for the support repo's suite (first check at 1608), 69 compiler errors fixed by a dependency sync (1728–1743), and no GNU parallel for the repo's own batch script (1765–1767). Whether plan-time readiness could have surfaced these is unknown.
- Impact: about 110 minutes of agent-side gate time ending in a failed, partial gate and Limited assurance, which was disclosed rather than misrepresented. User complaints: "any progress?" (1641), "and now? look like it was stuck long time" (1655), "why did you stuck? this task is so simple why its taking more then hour?" (1793). Progress messages were present (1636, 1645, 1788), so the friction is the invisible stall, not missing narration.
- Basis: `skills/run-regression/SKILL.md:148` recommends running long suites in the background and waiting; the harness advises not polling; `docs/regression-runner.md` says the helper writes no result files and shows no idle detection.
- Smallest action/owner: run-regression/regression helper. Investigate a bounded idle (no-output) failure, or call-site guidance tying timeouts and estimates to evidence, without contradicting the no-polling rule. Fix risk **Low** for guidance wording, **Medium** for helper idle-timeout (manifest and result semantics). Proposed verification — untested: a disposable suite that hangs silently ends as a labelled stall without user prompting; a healthy long suite is unaffected. Rollback: revert the edit. Recommendation **Investigate**; decision **Undecided**.

### WF-022 — Branch helper created the ticket branch at current HEAD, not the previewed base

- Category/status: defect (static inspection supports); historical and current. First/last R005; one session (D). Observation confidence High; cause confidence High for lines cited (not executed); recommendation confidence Medium.
- Evidence (paraphrased): the approval question said the helper would create and switch to the ticket branch "from local main" (189). After it ran, the agent checked and found each new branch carried another ticket's commits: two in the product repo and a merged feature branch in the support repo (205–210). The user chose "Rebase onto origin/main"; the agent recreated both branches (221–242) and approval had to be repeated because it was bound to the old heads (246–268): about 8 minutes and two extra approvals. Later the review/delivery diff measured against the stale local base listed 81 product-repo and 14 support-repo files for a 14-file change (2185–2194); the user approved fast-forwarding the local `main` ref in both repos (2200).
- Inspection (static): `skills/implement/scripts/workspace-scope.mjs:137` runs `git switch -c <branch>` with no start point; base defaults to `origin/HEAD` reduced to a local branch name (lines 76–80) and `base_sha` is that local ref's SHA. D003 (WF-010) clarified wording about new-branch creation versus restarting from base but did not change this behavior.
- Impact: observed — about 8 minutes, two approvals, a local ref move. Potential — another ticket's commits shipping in a PR; the agent's own verification, not a helper guard, prevented it.
- Smallest action/owner: implement workspace-scope. (a) Make the preview truthful: show "create at current HEAD, N commits ahead of base" and require explicit approval when HEAD differs from base. (b) Separately consider starting from `origin/<base>` when present and warning when the local base lags the remote.
- Fix risk: (a) **Low–Medium** (preview content, approval hashes); (b) **Medium–High** (start-point semantics interact with dirty trees — the agent hit a "commit or stash" refusal at 223 — saved bases, review scope and legacy resumes). Proposed verification — untested: disposable repo on another feature branch shows the true start point; matching/base-branch paths unchanged. Rollback: revert the preview change. Recommendation **Fix (a), Investigate (b)**; decision **Undecided**.

### WF-025 — Context grew to about 854k tokens (user-reported 85% of the window)

- Category/status: user-reported issue with observed growth; historical. First/last R005; one session (D). Observation confidence High for the token growth, Medium for the 85% figure (the window size is not in the transcript; 854k is 85% of a 1M window); cause confidence **Unknown**; recommendation confidence Low–Medium.
- Evidence (per-request input plus cache tokens from usage records of the main session): about 76k at the first request (32); 152k before the spec was approved (259); 364k at 09:11 after startup, refinement survey hand-back and domain-skill loads (528); 517k by the time plan and test preparation finished (1216); 593k at 10:01 (1509); 662k at 13:30 (1933); 719k at final package (2362); 851k at the last request (2823). No compaction record appears in the export. The session reached its end without a context failure.
- Impact: observed — steady growth across every stage, with about 18% of the final size already present before the spec was approved. No degraded answer or context-related error is evidenced. Risk — a longer or retried run could exhaust the window.
- Not established: which reads dominate (the large plugin references, repeated skill and map reads, delegate hand-backs, command output). The 14 delegate files and the 4 tool-result files were not inspected, and delegate usage is separate from the parent's.
- Smallest action/owner: investigation by implement and the maintainer. Rank context contributors by size from a similar run (references read, hand-back lengths, tool output) before proposing any change. Fix risk **Unknown** until cause is established. Proposed verification — untested: compare peak parent context for a comparable run after a targeted trim. Recommendation **Investigate**; decision **Undecided**.

### WF-026 — Default full delivery can omit a local reversal and publish a different tree

- Category/status: current helper defect, reproduced in a disposable repository
  under D017. No occurrence in a supplied historical/customer session has been
  established; repeated synthetic runs do not increase the distinct-session
  count. Observation/cause confidence High for the reproduced mechanism;
  real-world frequency and customer harm remain unknown.
- Expected vs observed: an inherited commit changes `setting.txt` from `false`
  to `true`; local work restores `false`. The full working-tree diff against the
  base omits that now-identical file. The enforced review target and current
  final package list only `src/code.js`, while the working setting is `false`.
  Default delivery preparation starts from HEAD and stages only those package
  paths, so its target tree still contains `true`. The real helper then commits,
  pushes to the fixture's local bare remote, records a stub PR result and reports
  `delivered: true`; the remote has `true` and the local reversal remains dirty.
- Existing checks exercised: controller and `review_scope_version: 1` binding,
  clean structured review handoff, final context sync, full-package build/check,
  completion, default delivery preparation, exact plan-hash execution and normal
  per-repo receipts. Source-package freshness is true and its review-scope status
  is covered. Review/PR evidence is synthetic; no live semantic review, hosting
  API or customer checkout was used. See D017 for exact artifacts and limits.
- Cause: `snapshotDeliveryRepo` in `scripts/lib/delivery-scope.mjs` derives
  `paths` from the net base-to-working-tree diff. `targetTree` in
  `skills/implement/scripts/deliver.mjs` initializes its temporary index at HEAD
  and stages that same list. A HEAD-to-working-tree reversal can be absent from
  the net list. Existing tree/hook checks bind this derived candidate, so they
  do not establish equivalence to the full reviewed working result.
- Impact: potential publication of behavior absent from the source package's
  final result despite successful helper checks. No customer harm is evidenced.
  Private worktrees starting from the intended base reduce exposure but do not
  establish that inherited changes and later local reversals are impossible.
- Proposed remedy/owner: full-delivery planning. Derive the intended tree from
  the pinned reviewed result, calculate the actual HEAD-to-intended-tree commit
  changes separately, and show required reversals in the existing delivery
  preview/approval. Preserve explicit exclusions, selected-file semantics and
  existing access/hook/retry checks. Do not blindly stage all local files or add
  a routine question, mandatory test rerun or history rewrite.
- Fix risk **Medium–High**: actual staging, package/approval compatibility and
  partial recovery change. Proposed verification: a default full delivery with a
  canceled inherited edit publishes the intended tree; normal full delivery,
  explicit selected omissions, excluded local work, stale approval, hooks and
  interrupted/multi-repo recovery retain their contracts. Recommendation **Fix**;
  maintainer decision **Fix — narrow implementation selected; see D018**.

### WF-027 — Delivery preparation edited .gitignore after package validation

- Category/status: defect; historical and current by static inspection. First/last R006, one session E. Expected preparation to preserve the reviewed tree and allow the exact approved plan to execute. Instead preparation added an artifact-ignore rule to product worktrees whose actual workflow artifacts lived elsewhere.
- Evidence: M4101 rejects execution as not fully reviewed; M4210/M4217 show an uncovered `.gitignore` and the added `/make-it-work/` line. After restoring only those helper edits, M4231 successfully regenerates the **identical plan hash** and immediately shows `.gitignore` modified again. M4235 restores it again before execution, which then reaches the commit hook (M4238). Thus preparation is the evidenced mutation point; the earlier narration blaming the run itself is imprecise. No external writer is needed to explain this sequence.
- Current mechanism: `skills/implement/scripts/deliver.mjs` `prepareLocked` checks the package before calling `ensureArtifactIgnored(<repo>/make-it-work)` for each changed repo. `scripts/lib/artifact-git.mjs` may append a tracked `.gitignore` rule for that path; its private-artifact exception does not apply to this synthesized product-root path. Existing delivery fixtures commonly pre-seed the ignore rule, which does not cover this layout.
- Impact/recovery: normal delivery blocked after exact approval; local ignore edits survived the failed attempt. No commit/push occurred on that failure. The agent restored the additions; later manual delivery was explicitly authorized. The review-scope check correctly rejected changed bytes and must remain.
- Confidence: observation High; cause High for the inspected sequence/mechanism, not a new execution; recommendation High. Smallest action/owner: `deliver` artifact-protection call site should follow the saved artifact root and avoid mutating unrelated product-root ignore files. Do not disable outgoing-artifact checks or patch a user's ignore file automatically during recovery.
- Fix risk **Medium**: artifact confidentiality, private versus legacy roots, target trees and partial-delivery retry. Preserve old saved approvals/journals and real artifact exclusion; investigate any compatibility ambiguity before changing execution.
- Proposed verification — **untested**: disposable private-artifact two-worktree fixture with no root ignore rule; preparation preserves all product bytes, package remains current and approved delivery can proceed. Retain legacy artifact protection, tracked-artifact rejection, hooks and partial retry checks. Rollback the bounded call-site/helper patch without rewriting existing packages or receipts. Recommendation **Fix**; maintainer decision **Undecided**.

### WF-028 — Planned documentation edits could not refresh impact evidence in Execute

- Category/status: defect in lifecycle integration, plus an observed workaround; historical and current by static inspection. First/last R006, one session E. A plan-authorized documentation step changed files also pinned as dependency evidence. Fresh evidence was required but the phase prohibited obtaining it.
- Evidence: X25 describes temporarily restoring two docs for the gate. M2161 reports dependency evidence changed after Step 11; M2186 rejects the attempted impact refresh outside planning/reconciliation. M2204–2221 reconstruct the earlier doc bytes, check their hashes and swap them in; M2287 announces a passing gate and restoration of the final docs. M2354 blocks the execute handoff again; M2360–2377 repeat the swap, enter Review, restore final docs and refresh there.
- Current basis: `repo-impact.mjs` checks every recorded evidence file hash, including changed-repo docs. `workflow.mjs:146` permits impact assessment in selected planning/reconciliation phases, excluding Execute. Planned docs maintenance and evidence freshness therefore conflict. This differs from WF-016's missing plan-file declarations.
- Impact/recovery: blocked gate/handoff and manual toggling of evidence-bearing files. The first gate described a temporary documentation tree; later fix-round gates ran after refresh. No final product-test failure or lost file is established. Restoring historical evidence to pass a check is not a supported general recovery; retain this adherence concern alongside the lifecycle defect.
- Confidence: observation High; cause High for the phase/hash conflict; recommendation Medium. Smallest action/owner: investigate `implement` impact refresh at an existing execution boundary for plan-declared evidence-file changes, with unchanged repo classifications, scope and required checks. Blanket exclusion of docs from freshness is not justified.
- Fix risk **Medium–High**: phase authorization, stale readiness/gate receipts, manifests and legacy resumes. No new routine approval, automatic acceptance of scope changes or bypass of true drift is proposed.
- Proposed verification — **untested**: disposable planned-doc-change run reaches gate and handoff with the final bytes in place; actual classification/check/scope drift retains reconciliation. Verify refreshed hashes bind the tree actually tested. Rollback the isolated refresh route while retaining saved evidence and a disclosed recovery path. Recommendation **Investigate**; decision **Undecided**.

- R009 recurrence (session H; **2 distinct sessions E, H**, first R006, last R009): after the Step 7 architecture stop, the Execute handoff returns **Repository impact dependency evidence changed; reassess it** (M1950). Reassessment is rejected outside active planning/reconciliation (M1956); the run is stopped at Execute (M1962). After an explicit package-location decision (M1967–1974), the parent obtains approval for a refinement round despite requirements being unchanged (M2020–2058), refreshes impact and writes plan v3. Six completed steps then become verify-only and are executed again (M2089/M2254–2459). The stale-evidence/phase dead end is corroborated; the exact evidence-bearing files and the necessity/exclusivity of the chosen workaround were not independently audited. Unlike E, no temporary restoration of earlier evidence bytes is evidenced. Existing code was kept, and the user approved the workaround. Observation High; cause High for the freshness/phase restriction, Medium for all routing contributors; recommendation High for bounded investigation. Current mechanism remains by static inspection; risk **Medium–High**, verification untested, decision **Undecided**. Do not solve it by dropping freshness checks or treating unchanged requirements as a new product decision by default.

- D035 investigation: the current helper freshness failure and Execute same-definition refresh rejection were reproduced in a disposable two-repository fixture using real scope approval, initialization, impact assessment and controller calls; the rejected operation preserved state and edited evidence. Static inspection also identifies `applyWorkflow`'s pre-transition check for every non-refinement `done` handoff, including Execute correctness-stop outcomes. In S009 M1950/M1956, a valid GUARDRAIL handoff is therefore blocked before it can route to recovery. This is a second contributor, not proof that every stale-evidence case needs a spec revision. Source-only proposed remedy: distinguish recording a correctness stop from authorizing dependent work, and support a bounded same-definition evidence refresh for planned evidence-bearing edits. Preserve freshness enforcement before successful dependent work. No such fix is implemented; see D035 for verified controls, limits and history.

- D036 implementation: bounded same-definition evidence refresh and correctness-stop recovery are implemented in the local 5.17.2 candidate. Deterministic positive and negative controller checks passed; successful handoffs and direct edit/resume still require freshness. Historical observations above describe the pre-fix behavior. No reporting-user outcome or published release is established.

### WF-030 — Semantic plan gaps survived existing self-review and fix planning

- Category/status: adherence gap; historical, current instructions already cover core checks. First/last R006, one session E. Expected design-critical assumptions, real UI entry paths, preserved behavior and legacy-data handling to be reconciled before accepting the plan.
- Evidence: P219/P347 assume existing ignored-record closures will run later; P481/P485 hide the only dialog-opening control while separately testing the dialog through mocked/captured handlers. RV1:8/13/18/22/27/32 reports unreachable recovery UI, incomplete later closure, an unrelated removed side effect, missed transition logging, stale UI state and legacy-data blocking. RV1 routes four Major and two Minor findings; legacy handling goes to the user (M2504–2506). P547 attributes the unreachable dialog to the plan; P549 preserves another button branch that RV2 later finds incompatible with the backend guard. P715 maps a two-part requirement to only one half; a second fix round adds the missing test (X73–74).
- Captured/current basis: loaded planning instructions at M798 include owning-layer reachability, design-critical assumption evidence, data/migration checks and caller consistency; current `plan-the-work/SKILL.md` retains them. Current `review-the-code/SKILL.md` also requires sibling sweeps and measured coverage claims. The earlier WF-016 guidance did not prevent this related semantic problem, but missing edit declarations are not the behavior counted here.
- Impact/recovery: two fix rounds grew the plan from 11 to 18 steps. Independent review provided useful protection; these are saved reviewer conclusions corroborated by plan diagnoses and accepted fixes, not this maintainer's independent adjudication of all customer code. No defective deployment is established, and not all review cost is preventable overhead.
- Confidence: observation High; cause Medium (plan defects are visible, reasons checks failed are unknown); recommendation Medium. Smallest action/owner: investigate adherence with the retained plan and one focused planner/test-worker case. Trace one real entry-to-action path and the flagged closure assumption under existing checks. A general evidence-table schema, mandatory reviewer or new validation gate is not selected or justified yet.
- Fix risk **Unknown** until a remedy is chosen: a narrow behavioral probe is bounded, but enforced semantic receipts could affect plan acceptance, autonomy, test authoring and review coverage. Proposed verification — **untested**: a plan with the same unreachable opener and unproved closure is corrected or returned before execution, while supported designs remain accepted. Rollback a future isolated guidance/eval patch; do not weaken independent review or expand cycle limits. Recommendation **Investigate**; decision **Undecided**.

- R007 extension (session F; **distinct sessions 2: E, F**, first R006, last R007): the first reviewer reports an accepted-spec/plan refusal-boundary mismatch and a copy-path documentation assumption contradicted by existing implementation (M2836). The user chose to clarify the boundary and audit copies (M2855–2862, M2926–2928); that is a real requirements decision, not proof that refinement should have guessed their preference. Despite the earlier report already saying copies emitted an upload event, the parent later told the user the copy path needed a production fix (M3164). The planning worker corrected that premise from a reported real-path probe and limited v3 to four test/docs/verification steps (M3175). After those steps, another reviewer reported a validation-rejection hole and premature success recording; the parent accepted the findings and added six fix steps (M4243–4359). These are delegate conclusions and parent-accepted corrections, not an independent customer-code audit. Current planning already requires traced assumptions and owning-layer coverage; investigate adherence instead of duplicating the rule. Observation High, cause Medium, recommendation Medium; remedy risk remains **Unknown**. Proposed focused verification and rollback remain untested. Added planning/review cost overlaps WF-039's episode and must not be counted twice as saved time.

- R009 extension (session H; **3 distinct sessions E, F, H**, first R006, last R009): Step 7's worker reports a concrete mismatch between planned package paths/selectors and the architecture test's fixed module set (M1924); plan prose points inside an existing module while its literal paths introduce a new one. This is a missed known architectural constraint/cross-field consistency check, not a user-requested new feature. Later the sibling import-read flow lacks the project-in-organization guard although the accepted criterion applies to import reads. The worker handback describes a constructor without the project facade (M2508), and the parent explicitly notes the missing sibling check before the full gate (M2547). The first independent review later reports that exact gap as Major and says the acceptance row proves only the other flow (M3439; embedded reviewer handback immediately preceding it). The user starts the fix (M3444), and an amend-mode handback scopes the two affected entry points and adds the missing test (M3470). Thus late discovery includes both missing sibling coverage and an already-visible correctness concern deferred until review. Reviewer/worker diagnoses are attributed; no application correctness or claimed parity was reproduced here. Observation High, cause Medium for why existing checks did not prevent acceptance, recommendation High for including these patterns in evaluation. The selected handoff/coverage change can help, but a misleading handoff alone does not explain H. Proposed additional scenarios: architecture-path consistency and a common requirement covered in one sibling only; handling a known gap before expensive broad verification needs existing-route investigation, not automatic in-place scope expansion. No such additional source change is authorized by this review; selected WF-030 guidance is on hold, see D034.

- D036 implementation: coordinator/planner guidance and two isolated semantic evaluation cases are prepared in the local 5.17.2 candidate. Deterministic checks establish fixture defects and assertion sensitivity; model adherence and reduced live fix rounds remain unmeasured. Existing coverage review, authoring rules and corrective routes remain in force. Historical hold/Undecided statements above retain their original review context.

- R010 post-fix live evidence (session I, plugin 5.17.2): captured new planner coverage guidance at M606 and coordinator guidance at M836. The plan specifies real helper/component tests without mocking (M651), and parent-read test source/preparation agrees (M980/M990). Nevertheless it prescribes a table span one below the actual header count. The worker reports that discrepancy (M1307); the parent counts/fixes it before gate/review (M1317–1337), keeps the accepted plan as history and discloses the deviation. No fix round/replan follows; reviewer approves after its own reported count (M1672). **4 sessions E/F/H/I**, first R006, last R010; I is a residual planning miss with successful containment, not another major outcome or costly reset. A helper-only assertion mapped to an input-to-display clause remains weaker coverage, expressly qualified rather than treated as browser proof (M1672/M1842/M1880). Observation High for captured flow, cause Medium for why self-review missed the count, recommendation Medium. D036 guidance remains implemented with partial live evidence; a further remedy is **Undecided**. Investigate only the residual owning-layer/constraint checks if selected; risk **Low–Medium** for bounded guidance, broader enforcement unassessed. No new schema, review stage or blanket rerun is justified. Full WF-030 semantic reliability remains unverified.

### WF-039 — Localized discoveries triggered costly replanning and broad revalidation

- Category/status: **user-reported issue with corroborating workflow friction**; historical session F, current broad invalidation mechanism statically inspected. First/last R007; one distinct session. Expected outcome, per the complaint: keep a small post-plan correction bounded so new understanding does not repeatedly reopen the whole process. Observed: a requirements clarification and copy-path correction returned the run through refinement, new plan, test preparation, Execute, a full gate and review; two later localized defects added another planning/preparation/Execute/gate/re-review cycle.
- Evidence: M2836 identifies the boundary conflict and copy-doc mismatch; M2855–2928 records the user's decisions and spec approval; H91–114 records the return through refinement, plan v3, tests and Execute. M3175 reports **four v3 steps with no production hook needed**. M4243–4359 records two actionable findings and a six-step amendment to that same plan, rather than a complete new plan. Three full-suite attempts each reached the **one-hour cap** (M2613, M4138, M4702; H82/112/135). M3160 asks to finish within 15 minutes; M3164 declines that estimate and says the full gate may take an hour. The maintainer-supplied complaint above is evidence of perceived repeated restart cost, not proof of every internal cause.
- Important bounds: the first rerun and removal of denial logging were explicitly requested/approved (M148, M916, M1196–1304), so do not count them as avoidable discovery loops. Readiness v3 reused setup/baseline (M2942, H95–96), and the last correction appended steps to v3; neither proves literally everything was redone. H's long review/test-preparation durations include overnight inactivity, user waits, compaction and an explicit computer-sleep error (M3490). They are not measured active work. The user subsequently reported that the unfinished session spans several days while they do other tasks (R007). Total calendar duration must not be attributed to the workflow or used to quantify the replanning complaint. The three gate hours are observed test waits; whether they overlap the user’s other work and the incremental avoidable fraction are unknown.
- Current basis/owner: `skills/implement/scripts/workflow.mjs` `spec-conflict` clears the active plan/hash, readiness, execution/report/gate and mode and resets review/fix counters while retaining a previous-plan reference. `references/orchestration/planning.md` requires explicit revised-spec approval, risk/readiness reassessment and regeneration of affected evidence. The ordinary fix route already permits amendments. Execute requires a new full completion gate after changed steps. This explains broad downstream work without proving that this particular genuine spec conflict should have skipped it. Current local planning/controller edits were present during inspection; no installed-version equivalence is claimed.
- Impact/recovery: user-reported delay from replanning, with repeated completion/status requests in the capture; the amount of avoidable delay is unmeasured. The unfinished, intermittent session does not establish missed delivery or an unsuccessful final outcome. Useful defect detection and honest failed-gate disclosure continued. There is no evidence of an infinite loop, unauthorized delivery, or permission to waive correctness/approval requirements.
- Confidence: observation **High** for transitions, gate timeouts and the complaint; cause **Medium** for broad invalidation/repeated gates contributing, **Low** for how much could safely be reused; recommendation **High** for a bounded investigation, not a redesign.
- Smallest proposed action: investigate one localized post-review clarification end to end. Separate changed requirements, implementation defects and documentation-only corrections; enumerate exactly which saved decisions, completed steps, baseline/setup, test assertions and review evidence remain valid and which dependencies changed. Compare existing amendment and spec-conflict routes before proposing a narrow compatible reuse rule. Include the repeated timing-out gate's incremental evidence value; do not automatically rerun unchanged failed evidence or relabel it current/pass. No implementation, new category schema, universal lighter gate or new user question is selected.
- Fix risk **Medium–High**: reducing invalidation can reuse stale approvals, tests or review; changing version/counter resets affects saved hashes, phase transitions, preparation authorization, old resumes and potentially publication snapshots. Preserve revised-requirement consent, truthful evidence qualification, independent review and exact delivery approval. No direct external side effect is required for investigation.
- Proposed verification — **untested**: trace a docs-only correction, a localized implementation fix, a true contract change and an interrupted legacy run in disposable fixtures. Demonstrate retained evidence is bound to unchanged inputs and impacted evidence is refreshed; full changed scope still receives required checks. Measure repeated work without counting user waits as processing. Rollback a future isolated reuse/routing change while retaining all saved versions and historical receipts; never silently upgrade a partially resumed run. Recommendation **Investigate**; maintainer decision **Undecided**.

- R009 extension (session H; **2 distinct sessions F, H**, first R007, last R009): one technical placement correction returned through unchanged-requirement refinement because impact evidence was stale in Execute (WF-028); six completed steps became re-verification steps in v3 (M2020–2459). Later a reviewer-requested tenant guard plus documentation was initially a normal **two-step amendment**, retaining Step 10 of 12 progress and unchanged completion checks (M3470). Adding the amendment's three newly declared file paths to the impact definition reset the controller to plan v4, cleared execution/review/readiness state and consumed a replan (M3480–3528; WF-040). The final report confirms Steps 1–10 were re-verified without code edits and Steps 11–12 implemented the actual fix/docs (M3737). These are concrete repeated-work mechanisms, with user-approved continuation, not an inferred infinite loop. Some reuse remained: prior work stayed on disk and preparation reused earlier evidence (M3652). Avoidable time is unmeasured, and no conclusion about eventual completion is possible. Recommendation remains **Investigate**; broader remedy unselected, risk **Medium–High**. The WF-030 guidance fix alone will not alter these controller resets.

### WF-040 — Adding paths inside existing change repos reset the completed plan

- Category/status: observed workflow friction from coarse impact invalidation; historical session H and current mechanism by static inspection. First/last R009; one session. Expected a bounded fix to proceed through the existing amendment route when repository membership/classifications and required checks are unchanged, with affected permissions/evidence refreshed accurately. Observed a two-step fix amendment becoming a full replan and re-verification of ten completed steps.
- Evidence: M3470 reports 10 existing steps unchanged, 2 appended, Progress 10 of 12 and no recommended replan. It adds three missing paths to the plan's impact block and explicitly reports checks, reasons and evidence otherwise unchanged. M3480 rejects plan/saved impact mismatch. M3507 submits the revised definition; M3509/M3521 show phase plan, version 4, plan none, execution/review not-started, readiness none and replans-used 1. M3526–3528 discloses the reset and obtains continuation approval. M3619–3621 approves v4; M3737 reports all ten older steps re-verified without code edits. The added path list/change classification facts are a delegate report plus visible retained assessment summaries; the full saved artifact pair was not supplied for independent byte comparison.
- Current basis/owner: `skills/implement/scripts/repo-impact.mjs` includes the full repo rows, including `planned_paths`, in `impactDefinition`; `workflow.mjs` compares the whole definition digest and handles every changed definition with an existing plan by returning to Plan, incrementing version/replans and clearing downstream fields. That matches the captured source excerpt and observed transition. Legitimate role/check changes also use this route; they must not be accidentally treated as harmless.
- Impact/recovery: extra readiness/preparation/approval/execution sequence and actual scoped reruns; no loss of implementation is evidenced. The reset is contract behavior, not an agent inventing a need to rebuild code. A normal amendment was attempted first. No evidence supports bypassing declared-path checks or silently carrying old approval to changed scope.
- Confidence: observation **High**, cause **High** for definition-level reset, recommendation **High** for a bounded design investigation. Smallest proposed action: investigate distinguishing an amendment's path additions inside existing change repos from changed repo roles, dependency meaning or required checks. Establish the minimum inputs that must be re-bound before defining a compatible same-plan refresh route; do not implement a general ignore-paths exception.
- Fix risk **Medium–High**: definition/plan hashes, readiness/preparation authorization, current progress, review/fix counters, old saved runs and partial resumes. No external write is needed for the investigation. Proposed verification — **untested**: a completed marked plan with a two-step amendment adding paths in existing change repos retains valid prior progress while refreshing affected evidence; a changed required check, promoted repo, true dependency change, stale approval and legacy resume retain appropriate reconciliation. Rollback any future isolated routing change while preserving saved definitions, receipts and old plan semantics. Recommendation **Investigate**; decision **Undecided**. This is a specific cause under WF-039, not a duplicate independent delay claim.

- D035 investigation: path-only reset reproduced through the **real current controller** in a disposable approved two-repository fixture. Adding one path retained all check definitions and classifications, yet moved fix-plan/version 3 to Plan/version 4, cleared the active plan and execution state and incremented replans to 1; prior completed-plan and edited-file bytes remained intact. Pure transition probes additionally show that changing only rationale wording or an evidence locator receives the same reset as changing a required command. A same-definition refresh succeeds in fix-plan without that reset. The initial custom fixture reached the WF-028 result but then failed rendering because its synthetic plan omitted Execution Status; that setup failure is not a product defect. The corrected fixture uses the normal renderer and confirms both mechanisms. No candidate remedy was implemented or tested; compatibility analysis in D035 rules out simply dropping definition hashes.

- D036 implementation: opt-in path-only amendment support is implemented in the local 5.17.2 candidate and tested with a saved version-1 run carrying historical plugin metadata, completed step hashes and retained readiness evidence. It preserves progress/mode/counters while requiring current downstream bindings; changed checks and rewritten completed steps retain rejection/replan behavior. The combined planned-evidence edit plus path amendment also passed. Historical pre-fix observations above remain evidence, not current candidate status.

### WF-044 — Reported typecheck failure lost its status and baseline uncertainty before approval

- Category/status: **Major adherence/assurance gap**, observed in session I under 5.17.2; first/last R010, one session. Existing instructions already require truthful compiler status and qualification preservation. This is separate from whether the ticket introduced a compilation defect or the unit-test gate passed.
- Expected/observed: Step 3's worker reports `npm run typecheck` producing **1,408 TypeScript diagnostic lines**, including 168 in the edited page, and explicitly says it did not run the starting revision's check and cannot confirm the total is unchanged (M1307). The same handback's closing description calls them existing; this internal inconsistency does not erase the explicit limitation. Parent completion checks omit typecheck (M1343), and the Execute report upgrades it to many pre-existing errors (M1462). Review/package `validation_notes` and final approval say only that the reviewer did not rerun lint/typecheck and that the unit suite passed (M1672/M1842/M1880); completion repeats that formulation (M2121). The reported compiler failure and unproved baseline attribution are absent from the actual approval text.
- Impact/recovery: the user approves a Limited-assurance package without the material reported compiler outcome/uncertainty. Browser and manual-check limits were retained, which is useful but does not substitute for compiler disclosure. No build success was explicitly claimed, no newly introduced compiler defect is proven, and delivery was declined. Raw child compiler output, exact exit status and baseline comparison are unavailable here; preserve those limits rather than presenting the diagnostic count as independent execution evidence. No correction to this qualification is observed before the close.
- Current basis/owner: Implement Execute report reconciliation, review handoff and final-package presentation. `skills/implement/references/compilation-evidence.md` already forbids upgrading suspected baseline errors to established inheritance and requires command/status/raw-output locators and unknown provenance to survive into review/approval/completion/delivery. Final-package guidance already uses `validation_notes` and preserves those facts. This is an adherence/propagation problem, not evidence that another generic instruction, mandatory build or schema is missing.
- Confidence: observation **High** for the handback-to-approval information loss; cause **Medium** for where inconsistent child conclusions became accepted provenance; recommendation **High** for bounded investigation. Smallest action: trace that existing reconciliation path using a synthetic reported compiler failure with baseline unknown and a passing runtime suite. Keep failure, attribution and test result separate using existing fields; select a source correction only after locating the gap.
- Fix risk **Medium**: reviewer evidence interpretation, final approval content and exact package bindings; broad automatic baseline execution or schema enforcement is unassessed. Preserve reuse, ordinary fix scope, accepted manual limitations, old saved packages and exact reapproval semantics. Do not require fixing unrelated errors or rerunning compilation on another branch merely to proceed.
- Proposed verification — **untested**: both compared and unproved-baseline compiler cases retain the real reported status/unknowns in Execute, review notes, approved draft and completion, while passing unit evidence remains passing. Test the narrow interpretation/propagation boundary before any broad workflow rehearsal. Rollback only a future selected guidance/helper/eval change, retaining historical approved artifacts and receipts. Recommendation **Investigate**; maintainer decision **Undecided**.

- D043 update: the maintainer selected local propagation for explicitly captured commands after the D042 foundation. New review targets/writers/packages retain generated process facts and known missing-record limitations; deterministic end-to-end and recovery checks passed. This is a bounded implementation for capture-enabled new artifacts, not a reconstruction of S010 or proof of universal model adherence. Legacy/uncaptured results retain their manual qualification contract. See D043 for compatibility, risk and verification; distinct-session count stays **1 (I)**.

## Minor findings

### WF-003 — Frontend cause was stated more definitively than the investigation supported

- Category/status: diagnostic wording gap; source-specific adherence, no reproduced runtime defect. First/last R001; one session, representative claims at 417 and 1082. Observation confidence High; cause confidence Unknown; recommendation confidence Medium.
- Evidence (paraphrased): the survey described missing frontend error handling as an inference from backend validation/error paths (373). A later question called the spinner a frontend display problem (417), and the PR draft stated that explanation definitively (1082). Customer network evidence and real browser behavior remained unavailable. The backend-only scope was explicitly chosen and remains valid (419, 439, 504, 512).
- Impact: stronger causal wording than observed evidence; no proof that the approved ZIP change was wrong. Proposed action/owner: refinement/final-sync guidance should carry forward hypothesis status. Existing final-sync reconciliation instructions already prohibit treating assumptions as established facts; investigate the adherence path rather than adding a new gate.
- Fix risk **Low** for a narrow evidence-wording correction; no phase/routing/state changes. Proposed verification — untested: a synthetic backend-only investigation retains uncertainty about the browser symptom through the final PR draft without blocking the accepted scope. Rollback the isolated wording change. Recommendation **Investigate**; decision **Investigated; tested hypothesis preserved, see R002**.

### WF-004 — Question options mixed scope decisions and the custom answer was rejected

- Category/status: observed refinement friction; question design and choice-only controller contract both visible. First/last R001; one rejected answer and one clarification round. Observation confidence High; cause confidence Medium for their combined contribution; recommendation confidence Medium.
- Evidence (paraphrased): one choice set mixed accepted file types with affected upload areas and did not offer the eventual ZIP-only scope; another question simultaneously asked about certificate extension fallback (417). The user answered ZIP variants in free text while accepting an extension option (419). The controller rejected that string as not an offered ID (424–426). Clarification resolved the real scope conflict and selected ZIP-only behavior (437–439); no state corruption was observed.
- R001 inspection: `pending-input.mjs` intentionally validates offered IDs for choice questions and supports text only for empty-choice prompts. Rejecting an invalid choice is not by itself a validator bug. The question tool/controller mismatch warrants assessment, not bypassing validation or assuming every free-text approval is safe.
- Smallest action/owner: `close-the-gaps` questioning/integration guidance; order dependent questions and separate type scope from affected surfaces. Consider free-text controller design only if repeated evidence shows that guidance cannot address the problem.
- Fix risk **Medium** for behavior-guiding instructions, because question selection and scope decisions change; a general free-text schema extension is a separate, higher-risk proposal. Proposed verification — untested: typed narrow scope is preserved or clarified once, dependent certificate questions are not asked prematurely, and explicit offered-ID approval checks still reject invented choices. Rollback only the scoped guidance. Recommendation **Investigate**; decision **Defer, see D001**.

### WF-005 — Delegate-report path base was unclear at the call site

- Category/status: helper/caller contract ambiguity present at R001; clarified locally by D001. First/last R001; one failed call, then recovery. Observation confidence High; cause confidence High for path-base mismatch, not for which side should change; recommendation confidence High.
- Evidence (paraphrased): accepting a report with a repository-relative path produced ENOENT with the run directory duplicated (572). The subsequent absolute-path call succeeded; the saved feedback recounts the same event (1015, embedded F2). The latter is not another occurrence.
- R001 inspection: `delegate-report.mjs` resolves relative report arguments against the state directory and checks containment. `references/orchestration/stage-contract.md` shows `--report <report-path>` without naming that relative base.
- Smallest remedy/owner: stage-contract documentation; specify absolute helper-returned report paths and retain current resolver/containment behavior. Do not add guessed path-base fallbacks.
- Fix risk **Low**: documentation only, though callers need accurate examples. Proposed verification — untested: a disposable run with nested state accepts an absolute in-run report, records duplicates idempotently, and continues to reject outside/symlink escapes. Rollback the instruction edit. Recommendation **Fix**; decision **Fix; implemented locally, see D001**.
- R003 recurrence (session B, plugin 5.14.0): accepting a delegate report with a repository-relative path failed with ENOENT showing the run directory duplicated (1414, 1417); retry with a run-relative path succeeded (1425, 1432). **Distinct sessions: 2.** The checkout's `stage-contract.md:38` now specifies absolute helper-returned paths; session B predates it. No post-fix observation.

- R011 historical recurrence (session J, captured plugin 5.14.0): the parent supplied a repository-relative report path to the run-directory resolver; M721 returned ENOENT with the run directory doubled; an absolute-path retry succeeded before handoff validation (M779). Observation/cause confidence High. **Three distinct sessions (A, B, J)**, all predating the documented fix. Cumulative retries support retaining the absolute helper-returned path guidance; no new fix is selected and no post-fix failure is established. Current `skills/implement/scripts/delegate-report.mjs` still intentionally resolves relative inputs from the run directory; changing that meaning would risk existing callers. Existing Low-risk guidance remedy and D001 decision remain intact.

- R012 historical recurrence (K): M550/M552 supplies a repository-relative report to the state-directory resolver and fails with a doubled run path; M558/M560 succeeds with the absolute path. **Four live sessions (A, B, J, K)**; observation/cause High. F's description places this at a fix handback, whereas the paired calls show initial implementation handback. M46's captured contract lacks the later absolute-path clarification, so this does not establish failure of current clarified guidance. Current resolver and absolute-path instructions inspected; preserve D001, containment and legacy semantics. Repeated historical retries favor retaining the existing Low-risk remedy, not another resolver change.

### WF-006 — Saved feedback narrative conflicted with its collection notes

- Category/status: report consistency/adherence gap. First/last R001; one saved inconsistency. Observation confidence High; cause confidence Unknown; recommendation confidence Medium.
- Evidence (paraphrased): a feedback input check failed (985), was repaired, and succeeded (1001). The saved report said no helper failure was visible before saving, but its generated collection notes recorded the failed check and later success (1015, embedded lines 99 and 107). The final response explicitly acknowledged this inconsistency and left the saved report unchanged (1038).
- Impact: a maintainer reading only the saved report must reconcile contradictory claims. Existing bounded closing-check guidance now explicitly reconciles visible failures; the inspected current instruction may already address the historical omission. Current persistence is unverified.
- Smallest action/owner: feedback collection guidance/evaluation; test and apply the existing pre-save check, rather than reopening successful saves to describe every later save. Avoid a save-review-save loop.
- Fix risk **Low** for a focused evaluation/guidance clarification; a new writer or lifecycle redesign is unassessed and not recommended here. Proposed verification — untested: a failed check followed by recovery yields consistent narrative/collection notes using one necessary repair/save, without delaying delivery. Rollback the scoped change. Recommendation **Investigate**; decision **Investigated; consistency case passed, see R002**.

- R014 related recurrence (M): supplied report F, Context and evidence coverage, says there were no recorded hook interventions, but M246 explicitly contains a startup Stop-hook continuation intervention. The run recovered normally; the issue is overbroad retrospective wording, not the safeguard. Collection notes correctly report three failed input checks, so this occurrence does not reproduce the earlier collection-notes contradiction exactly. Two distinct sessions A/M, first R001, last R014; observation confidence High, cause Unknown, recommendation Medium. Renew consideration for cumulative report accuracy; preserve R002's passed synthetic case rather than treating it as universal live assurance. Owner remains feedback collection guidance/evaluation; narrow existing pre-save reconciliation is Low risk, with no runtime/schema or lifecycle change. Proposed verification/rollback remain untested for this new case: reconcile a normal hook intervention and failed checks in the first saved narrative; preserve real metrics and avoid a save-review-save loop; revert only any selected wording/example. Earlier Investigated decision retained; renewed remedy Undecided.

### WF-007 — Sanitization rejected generic workflow vocabulary

- Category/status: validator friction; current heuristic inspected, privacy-safe remedy not reproduced. First/last R001; one failed check and successful paraphrase. Observation confidence High; cause confidence High for the diagnostic/heuristic, recommendation confidence Medium.
- Evidence (paraphrased): the share-safe checker rejected the public workflow term `pending-input` as copied project terminology (985). Paraphrasing it allowed validation to pass (990–1001). This is the same check failure discussed in WF-006, counted once as a runtime event with two distinct concerns, not two failed attempts.
- R001 inspection: `write-feedback.mjs` derives distinctive hyphenated terms from audit prose and excludes an existing workflow-vocabulary set. The feedback skill explicitly permits useful public controller vocabulary. Do not weaken customer-identifier protections based only on this one event.
- Smallest action/owner: investigate a narrow known-public-vocabulary exception in the feedback sanitizer, using its existing mechanism rather than removing the heuristic.
- Fix risk **Medium**: privacy enforcement is affected even by a small allowlist change. Proposed verification — untested: public workflow vocabulary passes while project names, private paths/URLs, credentials and representative proprietary terms remain rejected. Rollback the narrow exception. Recommendation **Investigate**; decision **Defer, see D001**.
- R003 recurrence (session B): the share-safe check rejected generic hyphenated workflow phrases ("approval-time", "cycle-3", "future-dated", "full-suite", "fix-round", "workflow-event") as copied project terminology; three failed checks (3559, 3591, 3644) and paraphrasing preceded the successful write (3672). Related validator messages: an owner field rejected as not a share-safe line, and a dashboard observation lacking an inspected source line. **Distinct sessions: 2 — flagged for renewed fix consideration** (cumulative cost: repeated pre-save repair loops; no data loss or privacy failure). Severity stays Minor; the Medium privacy risk of any exception is unchanged. Decision remains **Defer** until the maintainer revisits.
- R005 recurrence (session D, plugin 5.14.0, predating D004): the writer rejected the generic hyphenated terms "not-run", "self-review" and "per-step" as copied project terminology, plus locator and line-shape errors, in two failed checks before success (2627, 2663). None of the three terms is in the exact public-vocabulary set at `skills/implement/scripts/write-feedback.mjs:43`. **Distinct sessions: 3 (A, B, D)** — flagged again. This indicates an exact-term list keeps missing new generic words; it does not weaken the privacy rationale, and the D004 decision is unchanged. Not reproduced against the current checkout.

- R006 recurrence (session E, plugin 5.17.0 after D004): M3812 rejects the public plugin term and M3872 rejects `read-only`; locator-shape errors also appeared and were legitimate separate corrections. Paraphrasing allowed the final save. **Distinct sessions: 4 (A, B, D, E)**; renewed fix consideration for cumulative repair cost, severity still Minor. Current exact vocabulary set excludes both terms. Observation confidence High; cause High for the heuristic, remedy confidence Medium. Existing D004 implementation remains recorded; any additional exception is **Undecided**. Recommendation **Investigate** a bounded public-literal remedy; fix risk **Medium** for privacy protection. Proposed verification — untested: accepted exact public literals while customer compounds, identifiers and private paths remain rejected; rollback only any newly selected literals/tests. No broad hyphenated-word bypass is proposed.

- R008 recurrence (session G, plugin 5.17.1): the share-safe check rejected generic phrases `pre-existing` and `display-only` as copied project terminology (M1950); the unchanged terms failed again after a platform-specific edit error (M1965). Paraphrasing produced a valid check (M1973), then the report was saved/read back (M1978–1994). **Distinct sessions: 5 (A, B, D, E, G)**; last seen R008, renewed consideration for cumulative repair cost. Missing execution assessment and numbered locators were independently valid diagnostics. Impact remains Minor; observation High, heuristic cause High, remedy confidence Medium. Existing D004 implementation is preserved; further remedy **Undecided**, recommendation **Investigate**, fix risk **Medium** for privacy protection. Proposed verification remains untested: characterize these exact public terms while retaining rejection of private identifiers and compounds; rollback only any later selected narrow remedy. No broad sanitizer bypass is proposed.

- R010 recurrence (session I, plugin 5.17.2): the feedback precheck rejects generic `display-only` and public `test-map` at M2073; it separately and legitimately requires numbered evidence locators. The writer inputs are paraphrased/repaired, then check/save/readback/finalize succeeds (M2076–2109). **6 distinct sessions A/B/D/E/G/I**, last R010; flag renewed consideration for cumulative repair cost, not a privacy bypass. Observation High, heuristic cause High, remedy confidence Medium. Preserve D004's completed exact exception; further remedy remains **Undecided**, recommendation **Investigate**, fix risk **Medium** because private identifiers must still be rejected. Untested proposed verification: exact public terms pass while customer compounds/paths/credentials remain blocked; rollback only any future selected literal change. This was a local repair, not a fix-plan loop.


- D038 renewed investigation (2026-11-25): current source and D004 tests confirm eight observed literals are still absent: `not-run`, `self-review`, `per-step`, `make-it-work`, `read-only`, `pre-existing`, `display-only`, `test-map`. Rechecked S006 M3812/M3872 directly; later source observations remain attributed to R008/R010. Recommend only those eight exact exceptions, retaining ticket-ID and other share-safe checks plus full private-compound matching. No dynamic vocabulary extraction, prefix allowance or general hyphen exception. Investigation selected/completed; further implementation unselected. Privacy-related fix risk remains **Medium**, despite the small patch. Counts remain **6 sessions**; see D038 for scope and unrun verification.

- R012 historical recurrence (K): M1134 rejects generic terms including `re-review`, `reference-data` and `migration-version` as copied project terminology. These are actual validator results, not just retrospective claims. Other errors in the same result concern dashboard safety/locators and are not automatically false positives. Wording repair succeeds at M1204; an intervening shell quoting error (M1145) and locator rejection (M1178) are separate. **Seven live sessions (A, B, D, E, G, I, K)**. Observation High; cause Medium for vocabulary classification; remedy confidence Medium. Current sanitizer policy and D038's pending narrow exceptions need comparison before extending vocabulary; preserve privacy checks, existing D004/D038 decisions and Medium risk. Recurrence strengthens renewed fix consideration but selects no remedy and does not prove a new post-extension regression.

- R013 recurrence (L, captured 5.18.0): M1704 rejects generic `display-only` as copied Audit terminology, alongside legitimate missing-locator diagnostics. Paraphrase/locator repair passes at M1708; save/readback/finalize succeeds (M1727/M1732/M1744). **8 distinct sessions A/B/D/E/G/I/K/L**, first R001, last R013. Observation/cause confidence High for this literal and exact vocabulary mechanism; recommendation confidence Medium. Current 5.19.0 source still lacks this literal. D004 and D038 remain unchanged; D038 already proposes this exact exception, so do not create another plan or broaden it. Further implementation remains unselected; risk Medium for privacy protection; retain D038's unrun verification/rollback and negative privacy cases.

- R014 recurrence (M, captured 5.19.0): M1980 rejects the generic workflow literal `test-writing` as copied Audit terminology, alongside valid missing-numbered-locator errors. M2006/M2025 retain locator errors only; M2045 reports valid input after repair. This is one sanitizer rejection, not three; supplied report collection notes count all three failed checks for their separate diagnostics. Nine distinct sessions A/B/D/E/G/I/K/L/M; first R001, last R014. Observation/cause confidence High for the literal collision, remedy Medium. Current source still uses the vocabulary heuristic; `test-writing` is outside D038's previously proposed eight literals, so extending that proposal needs an explicit bounded choice and negative privacy cases. Owner: feedback evidence sanitizer. Risk Medium for privacy; no blanket bypass. Proposed verification — untested: public workflow term accepted while private terms still rejected and locator checks unchanged; revert any selected literal exception. Earlier decisions remain; renewed implementation Undecided. Successful feedback finalization is not established by M2045.

### WF-010 — Run began on another ticket's feature branch without a question and was restarted

- Category/status: user-reported issue with observed startup friction; the observed behavior is contract-compliant. First/last R003; one session (B). Observation confidence High; cause confidence **Medium** (the user later reported the expectation below; the transcript itself never states why they restarted); recommendation confidence **Medium** (raised from Low by the user's input).
- User-reported expectation (not in the transcript): `implement` should detect that the current branch names a different ticket than the one being implemented, alert the user, and ask whether to continue on that branch or move to a new one. This matches the observed restart and the missing prompt.
- Evidence (paraphrased): the user was on a feature branch for a different ticket with uncommitted edits. The initial branch-guard outcome recorded "proceeding on existing feature branch (not base)" with those edits as baseline (204). No branch question was asked; a code survey ran (459). The user interrupted the first question set (512) and asked to start over on the main branch (514). The agent stopped the run, archived it, switched to the base branch and created a new run (532–598); the user then typed "continue" because the restarted run ended its turn after the dashboard link (598; Stop hooks present at 595–596).
- Expected vs basis: `startup.md:137-150` continues without a prompt for any non-base branch, so the observed behavior matches the contract. The friction is the contract's silence about a branch evidently tied to a different ticket.
- Impact: about 14 minutes of discarded refinement work and one extra user turn. Recovery was clean; the user's own edits were not lost (they had been committed during the session).
- Smallest action/owner: investigate whether a branch name or uncommitted baseline unrelated to the ticket should produce a one-line confirmation. Fix risk **Medium**: startup/branch gating and baseline accounting; not a documentation-only change. Proposed verification — untested: a disposable repo on an unrelated feature branch with local edits; expect one confirmation, no extra prompt on matching branches or the base branch. Recommendation **Investigate**; decision **Undecided**.

### WF-011 — Delegate-flagged test compromise on a spec clause was accepted and two fix rounds followed

- Category/status: observed friction; independent review worked as designed. First/last R003; one session (B). Observation confidence High; cause confidence Medium; recommendation confidence Medium.
- Evidence (paraphrased): the test-writing worker's hand-back said it modelled "beyond the last configured period" as an empty period list because the lookup only had a lower bound, and that the re-send test tolerated a repeated close because the plan left that open (1402–1404). The orchestrator verified file scope and evidence and accepted it (1413–1447). Review cycle 1 returned two Major findings including that clause (2301); the agent later said it had accepted the flag without checking the code (2449). Fix round 1 introduced a regression in the same function, found in cycle 2 (2839) and traced to loose test wording in the plan itself. Cycles 3–4 were clean.
- Impact: two fix rounds and four review cycles for a medium-risk change; no defect reached the approved package. Delegate disclosure was present; the gap was in acting on it before execution. An existing instruction to verify delegate claims was followed for scope and evidence but not for this modelling compromise.
- Smallest action/owner: investigate whether test preparation or execute should treat a delegate-stated compromise on a spec clause as a gap to resolve before execute. Fix risk **Medium**: planning/test-prep behavior and gates. No new gate or schema recommended without more sessions. Proposed verification — untested: a synthetic case where a worker discloses an untestable clause; expect it to be raised or planned before execution. Recommendation **Investigate**; decision **Undecided**.

### WF-012 — A one-line final-sync documentation edit consumed the last allowed review cycle

- Category/status: observed design friction; compliant with the controller. First/last R003; one session (B). Observation confidence High; cause confidence High (controller reopens review when a frozen-target file changes); recommendation confidence Low.
- Evidence (paraphrased): after a clean review cycle 3, a documentation edit during final sync was rejected with "Workspace changed since checkpoint" (3139) and sent the run back to Review for cycle 4, described as the last cycle the cap allows (3165, 3203). The delta was one bullet in a documentation file; cycle 4 was clean (3218). `workflow.mjs:66` caps review cycles at 4.
- Impact: one extra review (about 2–3 minutes). Risk: had that review found a defect, no cycle would remain. Not observed.
- Action: observe; cycle cap and reopen semantics are structural. Fix risk **High** for changing them (phase transitions, saved state, legacy resumes). Recommendation **Defer**; decision **Undecided**.

### WF-013 — Handoff directory was resolved with the `miw-` prefix the helper requires none

- Category/status: helper/caller friction; one retry. First/last R003; one session (B). Observation confidence High; cause confidence Unknown; recommendation confidence Medium.
- Evidence (paraphrased): the agent resolved the output directory as a `miw-`-prefixed handoffs directory (772–774); validation failed with "Handoff path must be …/<ticket>-handoffs/<stage>-<N>.json" (794). It re-resolved with the unprefixed directory, removed the misplaced file and succeeded (807–827). The helper accepts a `miw-` prefix on the file name only (`handoff.mjs:408-410`); the integration doc names the unprefixed directory.
- Impact: one failed call and a cleanup. Smallest action: clarify directory vs filename prefix at the call site. Fix risk **Low** (documentation). Proposed verification — untested: a fresh run writes and validates a gaps handoff first try. Recommendation **Investigate**; decision **Undecided**.

### WF-014 — Plan approval did not call out risks left above Low after mitigation (user-suggested)

- Category/status: user-reported improvement suggestion with partial transcript support; not a confirmed defect. First/last R003; one session (B). Observation confidence Medium; cause confidence Unknown; recommendation confidence Low–Medium.
- Evidence: the plan's risk table kept a Medium residual for approval-time date recalculation, so the overall plan risk was Medium (1134, plan text at 1235). The approval question stated "medium risk" in its title (1181) but did not single out the unmitigated item. The user then asked the agent to investigate and lower the risk (1188), questioned how Low was reached (1277), and the agent re-presented the evidence limits and offered keep-Low-with-stop-rule, keep-Low, or back-to-Medium (1289–1290). The plan template already records a residual column, a phased-delivery alternative (`plan-template.md:99`) and escalates three or more Medium residuals (`plan-template.md:91`); a grep-level check found no explicit prompt for a single unmitigated risk above Low.
- User-reported suggestion (not independently corroborated): when a mitigation does not reduce a risk, warn that risks above Low remain and ask whether that is acceptable (default, recommended) or whether to discuss alternatives.
- Impact: observed — one extra user round-trip and a downgrade on code-reading evidence that the agent later qualified. Not shown — that the user would have approved sooner or that risk handling was wrong.
- Smallest action/owner: `plan-the-work` approval wording; surface unmitigated residual risks above Low in the plan-approval question with an accept-as-is default and a discuss option. Do not change risk computation or the approval schema. Fix risk **Medium**: it changes approval-prompt content and could add a question in many Guided runs; Autonomous/Autopilot behavior would need to stay unchanged. Proposed verification — untested: a synthetic plan with one Medium residual shows the warning and default once; a plan with all-Low residuals shows none; approval hashing and routing are unchanged. Rollback: revert the wording. Recommendation **Investigate**; decision **Undecided**.

### WF-015 — Planning-activity hook denied same-turn narration and forced repeated narration and Stop-hook rounds

- Category/status: observed friction; current by static inspection (`skills/implement/scripts/planning-activity.mjs:40` retains the message). First/last R004; one session (C); other sessions unknown. Observation confidence High; cause confidence Unknown; recommendation confidence Medium.
- Expected vs observed: the hook requires the `--activity` sentence to appear in assistant chat before the helper call. Ten PreToolUse denials occurred in the plan/fix-plan stages: eight "Planning activity must match actual assistant chat" (795, 998, 1298, 1349, 1368, 1419, 3139, 3179), one pipeline/redirect denial (822) and one Write denial (1338). In the clearest sequences the agent sent the sentence, the call was denied, the agent re-sent the identical sentence with no tools, a Stop-hook "Continue" followed, and the retry succeeded (1346–1356, 1365–1379, 1416–1425).
- Impact: one duplicate user-visible narration and one extra turn per cycle, in a compliant path. No failure or data loss. Whether the sentence was actually in chat before the first call (flush timing) versus a true mismatch is unknown.
- Smallest action/owner: implement planning hook. Investigate flush timing and whether the repair path can avoid a Stop-hook round. Fix risk **Medium**: hook gating over planning behavior. Proposed verification — untested: a disposable plan stage with narration immediately before the helper call; expect a single denial at most and no duplicated sentence. Rollback: revert the hook change. Recommendation **Investigate**; decision **Undecided**.
- R005 recurrence (session D, plugin 5.14.0): ten PreToolUse denials (649, 663, 677, 688, 693, 780, 880, 934, 965, 995) and seven Stop-hook holds (658, 697, 784, 884, 938, 976, 1004) fell within about five minutes in the plan stage (09:21–09:26); the session's own journal counted 16 interventions in 10 episodes. No data loss. **Distinct sessions: 2 (C, D)** — flagged for renewed fix consideration; severity stays Minor. The checkout still retains the message at `planning-activity.mjs:40`.

- R006 recurrence (session E, plugin 5.17.0 after D008): literal chat at M811/M1038/M2553 and denials/results at M814/M1041/M2550 show renewed activity-flush/repair friction; M2550 follows a related but not identical longer sentence, so not every denial proves the same cause. Subsequent turn-end holds include M826/M1046. **Distinct sessions: 3 (C, D, E)**; renewed consideration, still Minor. D008 explicitly retained response-end/late-flush limitations; this does not prove its one-second reread implementation is broken. Observation confidence High; cause Medium for visibility versus exact matching; recommendation Medium. Existing fix remains implemented; renewed decision **Undecided**. Recommendation **Investigate** captured flush/phase timestamps before another timing change; risk **Medium** for hook behavior. Proposed verification — untested: distinguish delayed chat, true mismatch and invalid combined calls, preserving literal evidence and prerequisites. Rollback a future bounded timing/repair patch; no unconditional yield or longer timeout selected.

- R010 recurrence (session I, plugin 5.17.2): M507 correctly rejects a combined activity/helper call; its activity also differs from the preceding narration. That denial is an adherence safeguard. Exact narration at M510/M677 is followed by visibility/match denials M512/M679; response-end retry succeeds at M527/M686. Response-end planning holds include M516/M628/M682. This corroborates residual flush/repair friction, **4 distinct sessions C/D/E/I**, without establishing that D008's one-second reread is defective. The retrospective's diagnosis is a child report, not independently measured transcript-flush timing. Observation High, cause Medium, recommendation Medium. Preserve the completed D008 fix and literal/phase checks; renewed remedy **Undecided**, recommendation **Investigate** captured timing/repair behavior before selecting another change, risk **Medium** for hook/continuation compatibility. Verification/rollback of any new remedy remain untested. No unconditional yield, extra confirmation or wider gate redesign follows from this review.


- D038 renewed investigation (2026-11-25): direct S006 comparison confirms exact chat/call equality at M811/M812 and M1038/M1039, with main-session text flags. Journal lines 8–10 and 14–16 corroborate PreToolUse denial, Stop hold and subsequent release. Final exported message timestamps do not reveal transcript append/visibility times, so neither a broken one-second wait nor a sufficient longer wait is established. The current denial first tells the agent to send the sentence, then offers a response-end fallback; duplicated narration follows in S006 M823/M1043. Recommend a wording-only distinction: if exact current-cycle chat was already sent, do not repeat it; finish the response without tools and retry the unchanged activity checkpoint on automatic continuation before dependent work. Missing or genuinely different narration still needs the correct sentence. Keep all runtime waits/matching/prerequisites and Stop behavior unchanged. This may reduce duplicate narration, not remove response-end holds. **Low** risk for this bounded message/contract clarification; runtime remedy remains unselected, **Medium** risk and unsupported by measured flush evidence. Counts remain **4 sessions**; see D038. No new fix was implemented or tested.

- R013 recurrence (L, captured 5.18.0): M428/M429 correctly reject a bundled activity call; M437/M438 reject a discovery checkpoint whose sentence is only visibly sent at M440, so this is not proof of ignored prior narration. Exact drafting narration at M565 matches M566, yet M567 denies it; duplicate narration follows at M570 and response-end continuation recovers. M603 proactively ends for validation before the next checkpoint. The embedded retrospective (M1641) and saved report (M1732) count three Stop holds and three PreToolUse denials in three episodes; their roughly eight-second estimate is attributed, not independently measured active time. **5 sessions C/D/E/I/L**, first R004, last R013. Observation confidence High for duplicate/denial/recovery; cause Medium for visibility and Unknown for hook-time file contents; recommendation Medium. Current denial wording still matches D038's inspected surface. Retain D008/D038; do not recast automatic continuation as a failed safeguard or a reason to waive Stop. Renewed wording implementation remains unselected, Low risk; runtime matcher/timing changes remain Medium risk and unsupported. D038's proposed verification and rollback remain unrun.

- D046 update, 2026-11-28: the maintainer explicitly requested implementation of the bounded recovery wording plan. Local wording and focused regression changes are implemented and deterministically verified; see D046. Existing runtime policy is retained; no live reduction in duplicate narration is claimed.

### WF-016 — Plan file lists missed files the tests and steps needed, requiring repeated amendments

- Category/status: observed friction; the controller and stop-and-ask safeguards worked. First/last R004; one session (C). Observation confidence High; cause confidence Unknown; recommendation confidence Low–Medium.
- Evidence (paraphrased): test authorization failed for a helper class absent from a step's Tests field (1581); a field addition was needed in a context class (1711, plan amendment and re-approval 1746–1867); an integration test needed an out-of-plan edit (2200, approved 2240); Step 12 stopped for three files outside its list and was amended and re-checked (2550–2746); the gate failed on two repository methods no test covered, leading to Step 13 (3071–3331). Review later found two Major defects (3561).
- Impact: several user decisions and re-validation rounds; no unauthorized edit observed. Some items may be genuine discovery rather than a planning gap; two repositories and a 57KB plan add context.
- Smallest action/owner: plan-the-work; investigate whether a test-referenced-symbol versus Files comparison would have caught items earlier. Fix risk **Unknown** until cause is established. Proposed verification — untested: a synthetic plan whose tests call an unlisted symbol. Recommendation **Investigate**; decision **Undecided**.

D019 follow-up: retained source/plan inspection distinguishes a declared helper
missing from test authorization, incomplete result propagation, an omitted
integration caller, known UI callers omitted from one step, and missing real
repository coverage. The helper episode was resolved inside the existing test
file without a plan amendment, so the incidents are not five equivalent approval
loops. Existing caller-discovery and owner-layer reachability rules already
cover much of the missing work. D020 implements the selected self-review
clarification; no new runtime gate or authorization broadening is introduced.

- R007 additional inspection: M3318 reports six reused regression files missing from their owning revised-plan Tests declaration, blocking the full preparation report; M3349/M3381/M3392/M3426 show declaration repair and evidence remapping. **Distinct affected sessions 2 (C, F)**, first R004, last R007: renewed fix consideration for cumulative preparation/amendment friction. The D020 guidance fix remains implemented; its live adherence was never guaranteed. Observation High for the reported block and visible recovery, cause High for the declared-path mismatch, remedy confidence Medium. Recommendation **Investigate** a bounded pre-preparation consistency check within existing validation; additional fix risk **Low–Medium** if declaration-only, higher if it changes permission eligibility. Proposed verification and rollback remain untested as described in R007's investigation. New remedy **Undecided**; no broader authorization is inferred.

### WF-017 — Regression and verification helper input shapes were learned by reading helper source

- Category/status: helper/caller friction; first/last R004; one session (C). Observation confidence High; cause confidence Medium (call-site documentation unverified); recommendation confidence Medium.
- Evidence (paraphrased): the gate manifest gave a prerequisite service check as a shell string and the runner rejected it with "Command must be structured argv"; the first gate ran no tests (2913–2915, 2962). Later a verification check failed with "Gate evidence must name every automated product repo full suite" (3028). The agent read helper source to learn the shapes (2916–2939, 3030–3045) and the retry validated (3053). The failure was disclosed honestly.
- Smallest action/owner: add exact manifest and gate-evidence examples at the run-regression/implement call sites. Fix risk **Low**: documentation only. Proposed verification — untested: a fresh gate with the documented shapes passes first attempt. Rollback: revert the examples. Recommendation **Fix**; decision **Undecided**.

### WF-018 — Parallel delegates wrote the same evidence filename

- Category/status: observed friction; first/last R004; one session (C). Observation confidence High; cause confidence Unknown (delegate prompts not inspected); recommendation confidence Low–Medium.
- Evidence (paraphrased): two parallel docs/test-map delegates used one shared evidence file; the second overwrote the first (3441–3446, 3454). The parent renamed the governor file and recreated the UI evidence from the delegate's report (3455–3458); validation then passed.
- Smallest action/owner: implement dispatch guidance; require per-repo evidence names for parallel delegates. Fix risk **Low–Medium**. Proposed verification — untested: two parallel delegates produce distinct files. Recommendation **Investigate**; decision **Undecided**.

### WF-020 — Delivery plan offered no path subset, so a subset was delivered with raw git and gh

- Category/status: observed friction; user-directed and disclosed. First/last R005; one session (D). Observation confidence High; cause confidence Medium (no subset option is offered in the question); recommendation confidence Low–Medium.
- Evidence (paraphrased): the delivery question offered only "Deliver this exact plan" or "Stop", with 18 of 33 paths unrelated (2752). The user instead typed "commit only the related files" (2758). The agent staged 14 explicit paths and committed (2768–2785), recorded the delivery plan as declined (2785–2788), then on "push it and open the PR" (2802) pushed and ran `gh pr create` directly (2817–2826), editing one sentence of the approved PR body by script and disclosing it (2823, 2870). The audit log recorded the push and PR (2864).
- Impact: authorization was explicit and the commit hook ran inside `git commit`. What was bypassed was the delivery helper's plan-hash binding, journal receipts, tree and hook checks and repository-access preflight (WF-001). No harm observed. The workflow's maintained test-map files stayed uncommitted because they depend on an untracked skill (2797); disclosed.
- Smallest action/owner: deliver. Investigate whether `deliver prepare` should accept a path subset, or whether guidance should describe how to proceed when the user rejects part of a plan. Fix risk **Medium–High** (approval and hash binding, journals). Proposed verification — untested: a plan with unrelated paths can be narrowed and delivered with journal and hash intact. Recommendation **Investigate**; decision **Undecided**.

### WF-023 — `verification.mjs check --state` exited 13 with an unsettled top-level await

- Category/status: helper failure, cause unknown. First/last R005; one session (D). Observation confidence High; cause confidence **Unknown**; recommendation confidence Low.
- Evidence (paraphrased): two identical calls with `--state` ended with a warning "Detected unsettled top-level await" at the audit write (`verification.mjs:212`), exit 13, and no result (1911–1919). The same ledger check without `--state` returned `{"valid":true}` (1922–1929). A later call with `--state` returned in 0.077 s with an unclear outcome (1942–1944). The agent suspected a leftover lock from a process it had killed earlier and found none (1935–1937).
- Impact: two failed calls and a workaround; unclear whether the audit row was recorded. Smallest action/owner: implement helpers; investigate whether `checkpointResult` can leave a promise unsettled and surface an error instead. Fix risk **Low–Medium**. Proposed verification — untested: reproduce with a state file whose audit write cannot settle. Recommendation **Investigate**; decision **Undecided**.

- D011 follow-up: a disposable current-checkout CLI reproduction matched exit 13 and the same unsettled await location. The dashboard re-imports the CLI module while its top-level audit await is still pending. The implementation and validation below supersede the initial cause-unknown assessment for that reproduced mechanism; no original customer checkout was executed.

### WF-024 — Branch-pause message gave no path to restore the branch

- Category/status: observed friction; one occurrence. First/last R005; one session (D). Observation confidence High; recommendation confidence Low.
- Evidence (paraphrased): after the controller blocked on a branch moved by another of the user's sessions, the pause message asked the user to move the support repo back to the approved branch without giving the path (2034). The user asked "can you tell me the path?" (2039) and got the exact command (2043). The controller check and the agent's leaving that checkout alone were correct and are preserved.
- Smallest action: none until recurrence. Fix risk **Low** (wording). Recommendation **Defer**; decision **Undecided**.

### WF-008 — Approval narration paraphrased the proposed PR body

- First seen R002/S002, one synthetic approval case. Observation confidence High:
  `implement-final-approval-evidence/transcript.jsonl` record 33 displayed the
  commit message and PR title, then paraphrased the body as “it says administrators
  are allowed” instead of presenting the full saved text. The package built and
  approval remained pending; no approval bypass or publication occurred.
- The saved draft and narration retained delegate test attribution, skipped
  integration tests and the unverified browser hypothesis. This is distinct from
  WF-002/003. The retained initial case remains **failed**, as both grader votes
  and direct trace inspection establish the omitted full-text requirement.
- Existing final-package step 4 already requires full proposed text. D002 clarifies
  the presentation method: copy the complete built-package commit message, PR title
  and PR description verbatim into separate text blocks in the approval message.
  Risk Low: guidance only; no schema, helper, gate or approval-binding change.
- Initial synthetic fixture also retained an outdated members-only spec although
  the approved change allows administrators. D002 aligns this fixture's spec and
  saved spec hash with its declared accepted scope. This is fixture repair, not a
  product change. Because guidance and fixture changed together, a successful
  retry cannot isolate which change caused improved compliance.
- Verification: rerun only this failed case with unchanged grading; require exact
  complete text, retained qualifications and pending approval. Rollback: revert the
  guidance sentence and the fixture spec alignment independently. Decision **Fix**;
  local patch and retry are recorded under D002.

- R011 historical live occurrence (J, plugin 5.14.0, predating D002): **Minor adherence gap**; observation confidence High for canonical assistant text, cause Unknown, recommendation Medium. First R002; last R011. **One live session plus one synthetic case**, not two customer sessions. No post-fix recurrence established.
- Expected/observed: the agent says it will present the exact package in full (M1345/M1358). M1348 reads the 95-line package as tool output, but M1358 only announces it; the next approval prompt M1367 gives hash and short limitations, not the body. No intervening canonical assistant message reproduces the package. The user selects Stop, later explicitly requests resume/approval, and the unchanged package is checked and approved (M1445–1479). No unauthorized approval, changed package or publication is established; user visibility of expanded tool output is unknown. This matches WF-008's existing missing-full-text behavior and is merged by behavior rather than counted as a separate finding.
- R011 proposed follow-up/owner: investigate final-package presentation adherence against the captured contract and UI evidence before prescribing enforcement. Tool readback and hash binding verify content identity; they do not establish full assistant presentation. Preserve exact-package checks and explicit resume consent. No extra approval question is recommended.
- Fix risk **Low** for eventual scoped presentation guidance, **Unknown** for runtime enforcement: chat rendering, approval binding and legacy behavior need characterization; no saved schema change selected. Proposed verification **untested**: a host trace verifies the complete returned approval text appears before the existing decision prompt, with unchanged stop/resume semantics. Rollback only eventual guidance; do not weaken hashes or rewrite prior approvals. Recommendation **Investigate**; renewed investigation decision **Undecided**; D002's implemented guidance decision remains unchanged.

- R012 historical live recurrence (K): **two live sessions (J, K), plus one synthetic case**. M854's captured final-package contract requires full proposed commit/PR text before Guided approval. M964/M966 reads only a bounded package summary; the next canonical assistant action is the short approval prompt M986, approved at M988. No intervening canonical assistant text presents the full drafts. Observation High; cause Unknown; remedy confidence Medium. Later delivery does show full preview (M1324), which does not retroactively satisfy final-package presentation. No unauthorized approval or changed package is established. Captured wording lacks D002's explicit verbatim-text-block clarification; no failure of that clarification is demonstrated. Retain D002 and the Undecided renewed adherence investigation; Low guidance risk, enforcement Unknown. Cumulative live recurrence supports renewed consideration without a new gate or approval question.

### WF-029 — Assessment and package used different repository names for identical snapshots

- Category/status: defect; historical and current by static inspection. First/last R006, one session E. Assessment should bind to the same saved repository identities as packaging.
- Evidence: M3573/M3594 mark the freshly saved assessment unavailable because its delivery snapshot changed. Offline comparison of bundled assessment `scope.repos` with package `repos` (excluding package-only `diff_file`) finds **only `name` differs for each repo**; paths, heads, bases, path sets and diff hashes match. Assessment uses the shared worktree-folder basename; package uses saved repo IDs. `change-assessment.mjs` `captureScope` omits the snapshot name override; `readAssessment` hashes names, while `review-scope.mjs` `deliverySnapshots` supplies IDs for marked contracts.
- Impact/recovery: completed informational work could not be used as current package evidence; the package accurately disclosed unavailable/stale and completion continued. F261–274 additionally reports a stale dashboard-header defect, but the final supplied D123 explicitly says **Assessment: Stale**. D293 is the earlier timestamped rating result. That final source does not corroborate the header claim; an earlier dashboard snapshot was not supplied. No dashboard change is recommended from that report alone.
- Confidence: observation High; cause High for saved identity mismatch; recommendation High. Owner/action: `assess-change`/snapshot integration should use saved repo IDs for new marked scopes consistently across capture and freshness checks.
- Fix risk **Medium**: snapshot IDs, standalone scope naming, historical reports and package compatibility. Do not rename existing reports in place or make mismatching historical evidence current silently. Proposed verification — **untested**: two worktrees sharing a basename bind one assessment into the package; real diff drift remains stale; standalone and legacy names retain their contract. Rollback the new-scope identity propagation, preserving history. Recommendation **Fix**; decision **Undecided**.

### WF-031 — Planned API and integration tests were ineligible for preparation

- Category/status: observed friction with a supported-location gap; historical/current. First/last R006, one session E. Planned automated coverage should have a permitted preparation destination; declaring it in the plan did not establish eligibility.
- Evidence: M1265/M1318/M1321 reject whole-file authorization as non-dedicated tests. First preparation report lines 95/215–279 records deferred API/integration scenarios; its JSON has **59 entries: 40 expected-red, 7 pass, 12 not-run**. The third report line 437 repeats one deferred API scenario. X24 says integration/API classes and support files were instead authored during Execute. This overlaps D019's earlier characterization of unconventional test paths, without proving identical omitted files or a second WF-016 planning-amendment occurrence.
- Current basis: `planning-tests.mjs` accepts filename/directory heuristics or an exact separate-test identity in a valid map. Dashed test-layer directories and API/IT suffixes need not match those heuristics; the captured repositories had no test map. Existing planning self-review requires checking eligibility, and the authorizer correctly maintained its documented boundary. No evidence supports bypassing it or creating a fictitious map.
- Impact/recovery: loss of pre-execution preparation for 12 initially planned scenarios, recovered during execution. A claim that authorization alone caused later application defects is unproven.
- Confidence: observation High; cause High for heuristic/map mismatch, Medium for planning contribution; recommendation Medium. Action/owner: investigate narrow recognition of evidenced test locations in `implement`, including how test-support files are distinguished from product code.
- Fix risk **Medium**: whole-file edit permissions and negative production-path protections. Proposed verification — **untested**: known dedicated API/IT destinations are eligible only with trustworthy scoped evidence; mixed/product files and unregistered arbitrary paths remain protected; no-map and legacy runs remain supported. Rollback a future bounded eligibility change and associated guidance together. Recommendation **Investigate**; decision **Undecided**.

### WF-032 — Prepared virtual mocks became order-dependent after implementation

- Category/status: observed test-preparation friction; historical, general remedy unestablished. First/last R006, one session E. Tests prepared for new modules should remain valid when those modules exist.
- Evidence: M2031 identifies worker-order failures in prepared frontend mocks; X23/X26 attributes the earlier flake and corrective attempt to virtual mocks. The mock-repair child's handback (child dispatched in the M2031–2051 sequence, physical child record 109) reports removing duplicate/virtual mock declarations without assertion changes, followed by four full-suite passes. This is delegate-reported execution, not an independent rerun here; the saved X report summarizes it. The report's exact affected-file count differs from the bounded handback list, so no independent count is asserted.
- Impact/recovery: flaky whole-suite verification and one diagnosed corrective attempt, then passing gates. The precise Jest cache mechanism is reported, not independently reproduced. A blanket ban on virtual mocks would break some legitimate preparation for missing modules.
- Confidence: observation High; cause Medium; recommendation Medium. Action/owner: `write-the-tests`/Execute investigation of mocks for plan-created modules and the transition from missing to real modules; retain existing owning-layer coverage rules.
- Fix risk **Medium**: test isolation, whether progression failures are meaningful and module availability before implementation. Proposed verification — **untested**: minimal absent-then-present module fixture, both test orders, preserved assertions and genuine missing-behavior failures. Rollback a future narrow authoring/transition change; do not mandate repeated full-suite runs for every ordinary step. Recommendation **Investigate**; decision **Undecided**.

### WF-033 — Prepared tests for later steps prevented real-tree verification

- Category/status: adherence gap with sequencing friction; historical. First/last R006, one session E. Existing authoring rules require meaningful behavior failures rather than compile/import errors; planning calls each step independently verifiable.
- Evidence: X20 says Steps 1–5 used scratch copies with not-ready tests removed/excluded; X55 repeats this for Step 12. Initial preparation report line 149 explicitly discloses that the real tree did not compile until a planned class existed. Later whole-suite runs used the real tree (X20/X51/X78). The initial worker's `ready` handback did not itself establish that all original-tree selectors reached assertions.
- Current basis: `write-the-tests/references/authoring.md` already rejects compile/type/import failures as progression proof and disallows new production stubs for implement workers absent accepted setup authorization. `preparation.mjs` validates declared statuses/evidence shapes, not semantic meaning of every log. No new rule repeating that prohibition is needed.
- Impact/recovery: weaker and more complicated early-step provenance; final real-tree gates reduce, but do not retroactively erase, the limitation. Scratch copies were disclosed; no fabricated passing final gate is established.
- Confidence: observation High; cause Medium; recommendation Medium. Action/owner: investigate planner/test-worker sequencing and supported compiler selection, including how blockers should return before execution. Do not authorize arbitrary stubs or broaden worker permissions as an assumed remedy.
- Fix risk **Unknown** until an approach is chosen: compilation strategy, step dependencies, pre-edit guard and accepted evidence may change. Proposed verification — **untested**: small compiled multi-step plan reaches intended assertions in the recorded checkout, or returns the precise blocker; final gate and explicit stub restrictions remain. Rollback a future isolated sequencing/guidance change. Recommendation **Investigate**; decision **Undecided**.

### WF-034 — Final approval excluded live assessment delegates from permitted waits

- Category/status: defect in wait integration; historical/current by static inspection. First/last R006, one session E. A genuinely running assessment delegate should permit yielding without falsely completing the workflow.
- Evidence: M3433/M3435 launch the assessment asynchronously; M3441/M3470/M3528 hold the parent at final approval despite the active wait. M3531 uses a timed shell loop waiting for the report. `startup-presentation.mjs` `continuationHold` permits verified current-phase live agents in several phases, but its allowlist omits `final-approval`. The informational assessment is dispatched in that phase. A missing journal release is secondary evidence, not proof of a hung child.
- Impact/recovery: three holds and unnecessary parent polling; assessment completed and packaging continued. Confidence: observation High; cause High for the phase omission, other runtime contributors untested; recommendation High. Owner/action: narrowly support verified current-phase assessment waits using the existing runtime dispatch/completion evidence.
- Fix risk **Medium**: Stop enforcement and phase lifetimes. Preserve missing-link, premature-edit, stale-child and completion-notification checks; narration or a report filename alone must not release a hold. Proposed verification — **untested**: real-hook fixture permits an active final-approval child, closes it on actual completion and still blocks fabricated/earlier-phase waits. Rollback the bounded allowlist/integration change without changing state or approvals. Recommendation **Fix**; decision **Undecided**.

### WF-035 — Readiness dependency link was classified as premature implementation

- Category/status: observed friction; historical/current mechanism inspected, supported remedy uncertain. First/last R006, one session E. Readiness is authorized to establish test tooling, while product edits remain protected.
- Evidence: M673 creates a dependency symlink in the isolated frontend worktree to reuse source-checkout packages. M695 flags that exact path as a premature application edit and says to preserve local edits. M699/M700 remove the newly created link and stop/restart the test process; M741 records a passing baseline using the source-installed executable. No unrelated deletion is evidenced. Broad process-name stopping in the recovery is not recommended as a reusable recipe.
- Current basis: `implementation-guard.mjs` inventories Git-visible symlinks and has no general readiness setup exception; its receipt exception is scoped to test writing. `testing-readiness.md` permits bounded runner setup, but this evidence does not establish arbitrary links as permitted baseline changes or guarantee parent dependency resolution for other runners.
- Impact/recovery: one setup interruption and improvised dependency reuse, without a product change or observed data loss. Confidence: observation High; cause Medium–High for link classification; recommendation Medium. Owner/action: investigate a documented supported isolated-readiness approach before adding any guard exception.
- Fix risk **Medium**: setup authorization, symlink containment and shared dependencies. Proposed verification — **untested**: intended worktree receives actual passing baseline evidence with unchanged source files; arbitrary product links and unauthorized edits remain detected. Rollback only a future bounded setup integration; never silently accept all dependency-looking paths. Recommendation **Investigate**; decision **Undecided**.

### WF-036 — Approved commit prose failed the repository's line-length rule

- Category/status: observed delivery friction; historical. First/last R006, one session E. Local publication drafts should fit inspected repository conventions before exact-text approval.
- Evidence: M4092 presents long prose paragraphs; M4238 reaches the repository commit hook and is rejected for body lines over 100 characters. M4245 shows the configured conventional commit rule. M4255–4257 explicitly authorize manual delivery with wrapped text and disclosed journal limitations. M4300 reports successful delivery and formatting by commit hooks. No approval bypass is inferred from this authorized fallback.
- Impact/recovery: failed commit attempt with staged files retained, another user decision and manual delivery outside helper receipts. The separate WF-027 defect had already blocked delivery; wrapping alone would not solve that defect. No future hook success is guaranteed by line wrapping.
- Confidence: observation High; cause High; recommendation High. Owner/action: final-package draft guidance should consult available commit conventions and wrap prose before the existing package/delivery approvals. Do not silently rewrite approved text at execution or disable hooks.
- Fix risk **Low** for that narrow drafting correction: no package schema, new gate, runtime hook execution or external mutation; code blocks/trailers and repository-specific limits must remain intact. Proposed verification — **untested**: focused drafting case with a known line bound produces compliant prose and preserves full text, qualifications and exact approval; existing hook-failure recovery still discloses actual state. Rollback only the isolated guidance/eval change. Recommendation **Fix**; decision **Undecided**.

### WF-037 — Later Execute phases ran inline without a new mode decision

- Category/status: adherence gap; observed sessions F and G, current instructions already require mode resolution and per-step dispatch. First R007, last R008; two distinct sessions. Expected a new plan version to resolve its execution mode through the controller, and an existing chosen mode to govern amended steps. Observed initial user selection of Subagent-Driven (M1664–1666), its controller event (M1670), and ten fresh step workers. After spec revision, v3 ran in the parent; the later two production fixes also ran there (M3545–3658, M4443–4534). The only later agents were clause mapping, independent reviews, fix planning and test preparation (M3601, M4228, M4292, M4349, M4779), not per-step executors. The saved execute-report Write explicitly describes inline mode (M4734). No later mode question or execution-mode event appears among the canonical calls.
- Basis/uncertainty: captured Execute/dispatch/integration reads (M1650, M1681, M1696) require mode resolution and fresh step workers in Subagent-Driven mode; current guidance agrees. `workflow.mjs` resets execution mode on spec conflict, so the v2 answer is **not** proof that a v3 choice was saved. The gap is unresolved new-version mode followed by inline execution, not simply failure to carry a field across versions. User approvals of test/docs scope and urgency do not explicitly select Inline. The separate test-preparation worker does not satisfy per-step execution isolation.
- Impact/recovery: requested execution structure was not consistently maintained; more implementation/verification work remained in the parent. No demonstrated product defect or lost work is attributed to the mode change. Independent review remained separate. Observation confidence **High**, cause **Unknown** (compaction preceded the change but does not establish causation), recommendation **Medium**.
- Proposed owner/action: investigate Execute/implement re-entry at v3 and amended steps using existing mode policy. Do not add another copy of the already explicit per-step rule, ask the user again when a valid current choice exists, or introduce a new hard gate by default.
- Fix risk **Medium**: dispatch, resume and checkpoint order; new/old plan modes and explicit Inline choices must remain compatible. No external writes or approval-schema change is needed for a bounded probe. Proposed verification — **untested**: revised-plan/resume scenario resolves an unchosen mode and honors a recorded one, actual worker calls cover amended steps, and Inline retains its pause policy. Rollback any later isolated integration/eval patch. Recommendation **Investigate**; decision **Undecided**.

- R008 recurrence (session G): the user explicitly chose Subagent-Driven after compaction (M872–874), and the helper saved that mode (M878–886). Step 1 had a worker, but the parent called Step 2 small and exact and edited production code and documentation directly (M1019–1034), without a subsequent mode change. This narrows the known issue beyond unresolved revised-plan mode selection: an already resolved current choice was also not followed. Independent review still used separate agents and final approval completed; no application defect is attributed to this deviation. **Distinct sessions: 2 (F, G)** — renewed consideration for repeated loss of the selected execution structure and extra parent context. Observation High; cause Unknown; recommendation confidence Medium. Recommendation **Investigate** the existing dispatch path with both a saved valid mode and an amended unchosen mode, without duplicating policy or adding automatic approval prompts. Fix risk remains **Medium**; proposed dispatch/resume/Inline compatibility verification is untested. Decision remains **Undecided**.

- R010 bounded recurrence (session I, plugin 5.17.2): the user selects Subagent-Driven (M1087–1094) and all three numbered steps receive genuine fresh workers (M1186/M1245/M1290), an improvement over the wholly inline stretches above. After Step 3's worker identifies the numeric discrepancy (M1307), the parent itself edits the production page with `sed` and reruns tests (M1329/M1337), then completes the step (M1343), with no new mode decision or worker continuation. The final summary still says all steps were done by subagents (M2121), which omits this parent-side corrective edit. **3 distinct sessions F/G/I**, last R010. This is a narrow corrective-work adherence recurrence, not an absence of all three dispatches, a model-override failure or a new replan. The loaded dispatch contract makes implementation/verification the step worker's responsibility and reserves parent progress bookkeeping separately. Observation **High**, cause **Medium** for why the boundary was crossed, recommendation **Medium** for bounded investigation of corrective handback handling. Fix risk **Medium** for execution/dispatch ownership and saved-mode compatibility. Prior investigation decision remains **Undecided**; no new enforcement or mandatory subagent is added by this review. Proposed verification/rollback of a future selected remedy remain untested.

### WF-038 — Later execution timing was almost entirely unclassified

- Category/status: observed reporting friction with an adherence gap; historical session F, current fallback inspected. First/last R007; one session. Expected meaningful phase-category estimates from existing activity checkpoints, while unknown intervals remain visibly unknown. H114 shows **93m28s total, 91m45s unclassified**; H137 shows **107m46s total, 107m10s unclassified**, despite documented gate and supplemental-test runs. These figures are elapsed estimates, not CPU/model time.
- Basis: `references/activity.md` already requires categories for meaningful chunks. `dashboard-checkpoint.mjs` defaults omitted category to unclassified; `activity-timing.mjs` summarizes declared intervals without inferring from prose. The later gate calls at M3708/M4584 are visible, but no corresponding categorized gate activity is established by the inspected records. Step transitions are brief and do not themselves account for the full gate wait. Detailed linked timing JSON was not supplied; exact interval attribution remains unknown.
- Impact/recovery: the saved summaries cannot explain most later delay, relevant to WF-039, but they honestly expose the missing attribution. No incorrect arithmetic or false active-work measurement is established. Observation confidence **High**, cause **Medium**, recommendation **Medium**.
- Proposed owner/action: investigate applying the existing category contract at substantial verification/gate boundaries; retain unknown categories for mixed or unsupported intervals. Do not infer historic categories from sentence text or create frequent heartbeat/model calls.
- Fix risk **Low–Medium** if limited to advisory reporting guidance/integration: affects timing history and interpretation, with no intended changes to gates, approvals, saved phase transitions or external services. Proposed verification — **untested**: a synthetic long gate is categorized through the existing boundary while mixed/legacy intervals remain unknown; compare state/approval bytes and preserve actual test outcomes. Rollback only future category wiring/guidance, retaining recorded history. Recommendation **Investigate**; decision **Undecided**.

### WF-041 — Gate cancellation recovery promised an unverified route and overstated the restriction

- Category/status: observed recovery/presentation friction; historical session H; complete supported recovery remains untested. First/last R009; one session. Expected cancellation to stop the active command and accurately explain supported continuation choices without fabricating a passing gate. The command was stopped, but M2981 announced a no-result route to Review before validating compatibility with the saved automated impact checks.
- Evidence: the user says skip (M2930). Subsequent evidence attempts fail for forbidden manual substitution, missing required check records, mismatched full-suite command and incorrect not-run command representation (M3047/M3053/M3096/M3103). At M3107/M3122 the agent says the validator rejects a not-run backend suite and offers another complete run or Stop. The user explicitly chooses the rerun (M3109); it times out after an estimate of about eight minutes (M3122/M3157). Those facts establish an unsuccessful promised recovery, not an unauthorized rerun or proof the validator forbids every no-result representation.
- Current basis/uncertainty: `repo-impact.mjs validateImpactGate` explicitly accepts check statuses pass/fail/not-run, requires their assessed structured commands and full inventory, and rejects manual acceptance replacing automated checks. `verification.mjs` separately requires null commands for not-run `full_suites`. These are different representations. The cited failures do not independently establish a universal no-result prohibition; nor does static inspection prove that a valid complete post-cancellation route would reach Review in this exact run. The initial failed run and an interrupted later run must retain their distinct observations.
- Impact/recovery: extra explanation, failed evidence repairs and a user-approved broad rerun; actual failed/incomplete outcomes remained visible. Recommendation **Investigate** a bounded cancellation/no-result evidence example and then correct route guidance to match demonstrated behavior. Do not weaken required checks, equate cancellation with pass, or remove the user's ability to stop a running command.
- Confidence: observation **High**, cause **Medium** for evidence-shape confusion versus full routing compatibility, recommendation **High** for investigation. Fix risk **Medium** for evidence/routing changes; a later wording-only correction may be **Low** once the compatible choices are established. Proposed verification — **untested**: mixed completed/failed/interrupted suites preserve real results and valid per-check/full-suite representations; manual substitution remains rejected, and cancellation never implies completion. Rollback future example/guidance/helper changes independently, retaining original audit history. Decision **Undecided**.

### WF-042 — Private artifact and source roots caused helper path retries

- Category/status: **Minor caller/contract friction**, current by source inspection; session I only, first/last R010. A source worktree and private artifact root are different directories. Expected valid calls to use each helper's documented base; observed two incorrectly based relative paths and successful absolute-path repair.
- Evidence: terminal verification supplies an artifact-relative plan path while running in the source worktree; `verification.mjs` cannot open it (M1421/M1423). Retrying with an absolute plan path succeeds (M1435). `review-context` submits repo-relative documentation paths with the private artifact root (M1596); root-based `realpath` fails (M1604). Prefixing the same paths with the approved source root succeeds without changing the intended files or phase (M1609/M1611).
- Current basis/owner: `skills/implement/scripts/verification.mjs` CLI reads `--plan` relative to process cwd, while `workflow.mjs` resolves `context_updated` relative to artifact root and checks approved repo containment. Controller guidance already specifies artifact-root-relative context paths. This is not proof of a resolver defect or authorization problem; caller adherence and examples are the initial investigation surface.
- Impact/recovery: two recovered helper retries and downstream parse noise; no replan, lost progress, incorrect approval or outside-repo write is evidenced. Confidence: observation **High**, cause **High** for differing documented/code bases, remedy **Medium**.
- Smallest proposal: retain as a bounded workspace call-site/example issue; if selected, characterize absolute and relative invocation contracts before changing either helper. Recommendation **Defer** behind material qualification work; decision **Undecided**.
- Fix risk **Medium** for resolver changes because legacy cwd-relative calls and approved-root checks must remain valid; a later selected example-only correction could be Low. Proposed verification — **untested**: private-artifact and conventional same-root examples resolve intended files, reject outside-approved paths and preserve prior cwd-relative callers. Rollback only future selected call examples/helper changes; retain saved state and receipts. No schema or universal path rewrite is proposed.

- R013 related recurrence (L): independent reviewer C5:64 supplies an absolute `review_target`; C5:65 rejects target/run binding. After inspecting helper code, C5:81 attempts to change the field to its artifact-root-relative form; that edit fails on shell portability (WF-055), then structured JSON editing and report writing succeed at C5:84 and its result. This is a different path field from I's examples but the same caller confusion over source/artifact path contracts; no evidence of a broken containment check. **2 distinct sessions I/L**, first R010, last R013; renewed consideration for cumulative retry cost, severity Minor. Observation/cause confidence High for this rejected field and correction; remedy confidence Medium. Owner also includes `scripts/review-report.mjs` call examples. Preserve D039's implemented absolute input-file resolver fix: this target-field repair does not show that resolver regressed. Any additional remedy is Undecided; Defer recommendation retained, examples-only risk Low, resolver changes Medium. Proposed verification/rollback untested: valid artifact-relative target accepted; wrong-run/outside-root/legacy cases still checked; revert only any selected examples, not containment rules.

- D046 update, 2026-11-28: the maintainer selected review-path examples only. Coordinator/reviewer guidance distinguishes absolute root/input-file paths from the unchanged artifact-relative target field, with a focused CLI contract fixture. Local deterministic verification passed; see D046. D039 and all resolver/containment behavior remain unchanged. Earlier verification/context-update call-site remedies are outside this selection.

- R014 related recurrence (M): M889 supplies an artifact-root-relative `--handoff` to standalone `handoff.mjs validate` from the source worktree; M891 returns ENOENT. The same shell then applies the controller handoff, which succeeds at plan-approval using its artifact-root-relative event field. This was not simply a failed call followed by the next-call retry as F4 suggests: the standalone error was piped through `head`, and the shell continued. Current CLI directly reads `options.handoff` from cwd; controller resolves its handoff against the artifact root. Three distinct sessions I/L/M, first R010, last R014; observation/cause High, remedy Medium. No broken containment or incorrect artifact acceptance established: controller validation succeeded. Retain D039/D046; neither promised to normalize this standalone CLI. Recommendation Investigate this broader example/adherence surface (including stopping dependent shell work on errors), separate from already-selected review examples. Low risk for explicit absolute-path examples; resolver changes Medium due to legacy cwd callers and containment. Proposed verification — untested: absolute helper-returned handoff works with split roots; conventional cwd-relative calls retain meaning, invalid handoffs still reject, and failed validation stops dependent apply. Rollback only future selected examples; no universal root rebasing proposed. Further remedy Undecided.

### WF-043 — Draft Markdown backticks executed inside an unquoted shell heredoc

- Category/status: **Minor draft-authoring mistake**, session I only, first/last R010; current final-package step delegates JSON writing to the agent. Expected prose to be literal data. M1801 embeds Markdown backticks, including a test command, inside an unquoted Python heredoc. Shell expansion occurs before Python JSON serialization; M1810 shows attempted execution of source paths/terms plus test-run output and then a built package with altered draft text.
- Impact/recovery: unintended commands, an unnecessary test run and corrupted local draft text. The coordinator switches to a literal quoted heredoc/file, inspects status, rewrites and rebuilds before asking for approval (M1825/M1827/M1839). A different corrected package hash is presented and explicitly approved (M1880–1883). No corrupted-package approval, published text or unintended product-source change is evidenced; the status listing is not a byte-for-byte proof against every possible side effect.
- Cause/owner: shell expands backticks before `json.dump`; structured JSON serialization alone cannot prevent earlier shell expansion. Implement final-package draft writing is the bounded surface, not final-package hashing or the approved delivery helper. Observation **High**, cause **High**, recommendation **Medium**; prior R007 shell-string friction is related context, not a counted identical occurrence without a matched mechanism.
- Smallest proposal: a literal-safe draft-writing pattern at the existing final-package instruction (use the existing Write tool, or a quoted delimiter with paths supplied as arguments). Do not add another document, stage, reviewer or approval. Recommendation **Fix bounded guidance**; decision **Undecided**.
- Fix risk **Low** for authoring guidance, because JSON keys, package contents, approval hashes and saved schemas stay unchanged; a new writer/helper API would require separate assessment. Proposed verification — **untested**: draft text containing Markdown backticks and shell-looking text stays byte-exact and does not execute, then the ordinary package check/approval binds those bytes. Rollback only future selected guidance/fixture changes, preserving corrected and historical package receipts. No new model run or source fix was performed by this review.

### WF-045 — Developer-reported excessive tests for a small Lightweight change

- Category/status: **user-reported issue, Minor**; historical session J only, first/last R011. Observation confidence High for the report and diff size; **Medium** for avoidable excess; cause confidence Medium; recommendation confidence Medium. No production failure or independently audited redundant-case count is claimed.
- Expected/observed: the developer wanted a few focused checks matching four ticket expectations. U14–26 reports roughly 390 changed test lines versus 35 production/translation lines and resulting review burden. M721 supports **391 changed lines across five test files**, versus **36** across four production/translation files; these are diff-stat churn, not added tests or proof of low value. M695 explicitly requests many fallback variants, changed-title behavior, unchanged labels and edit compatibility; this was partly parent-directed, not solely worker initiative. The accepted spec also enumerates several fallback states.
- Counterevidence/recovery: M730 reports reuse of the existing runner and a mutation check: removing schema lookup fails different-title cases, whereas equal title/fallback text cannot discriminate. Some setup changes accommodate the newly used query hook. Preserve meaningful normal, boundary and complement coverage and compatibility checks. The developer explicitly says the issue was solved and the result otherwise good. Child implementation bodies/full patch semantics are not audited, so do not select cases to delete from line counts.
- Smallest action/owner: Investigate `skills/implement/references/orchestration/lightweight.md` dispatch behavior and representative scenario selection. Its existing focused-test rule already applies; distinguish necessary accepted branches and test infrastructure from duplicated checks before proposing a narrow clarification. Do not impose a test/line cap or reduce coverage to ticket bullets automatically. Uncommitted TDD coverage metadata work in this checkout does not address Lightweight proportionality by itself.
- Fix risk **Medium**: changing agent test selection can drop distinct failure modes or move regressions later; affects initial/fix dispatch and repository conventions. No gate/schema/approval change or application-test deletion is selected. Proposed verification **untested**: inspect a disposable small-change dispatch for discriminating title/fallback, required branch and edit checks without duplicated assertions across layers; retain existing workflow tests. Rollback any eventual dispatch guidance change without altering saved runs. Recommendation **Investigate**; decision **Undecided**.

### WF-046 — Refinement question preceded reading the comments that addressed it

- Category/status: **adherence gap, Minor**; historical J, first/last R011; current adherence unverified. Observation/cause confidence High; recommendation confidence Medium.
- Expected/basis: captured refinement instructions and current `skills/close-the-gaps/SKILL.md` Phase 1 require extracting comments before gap analysis. Observed: first fetch M138/M143 lacks the detailed comment; the fallback question at M507 recommends a changed translation without that context. At M537 the agent admits only fetching the description; M540 supplies the existing fallback instruction after the user answered. The question therefore omitted relevant available intent.
- Impact/recovery: potential avoidable question or differently informed choice, not a proven wrong outcome. M552 explicitly records the deviation and M611 asks approval with the conflict named; approval followed. Preserve human authority to choose a different fallback. No need to ask the developer whether the later choice was deliberate: the approval already discloses it.
- Smallest action/owner: close-the-gaps ingestion adherence investigation using the existing requirement; inspect connector field selection and source-read ordering before adding wording. Alternative No change if current guidance and source ordering are sufficient. Fix risk **Medium** for targeted guidance: changes question timing/conflict framing and can cause redundant fetches; retain unavailable-comment disclosure, offline input and autonomy behavior. No tracker writes, schema or new approval gate proposed. Proposed verification **untested**: fixture with description/comment conflict checks comment-aware questioning and explicit user override; rollback only the eventual scoped guidance change. Recommendation **Investigate**; decision **Undecided**.

### WF-047 — Activity argument retries were misdiagnosed as a path problem

- Category/status: **observed friction, Minor**; J, first/last R011, repeated within one session. Observation/cause confidence High for positional rejection; recommendation confidence Medium. Current parser retains positional prefix by static inspection; no reproduction run.
- Expected/observed: failures should identify the rejected argument. M364 and M652 return usage-only errors after category was placed before activity; additional retries changed path/flag spelling. M391 succeeds without category, then M397 wrongly attributes success to the absolute state path. The category-order issue reappears at M665 before reading the parser. At least one checkpoint loses its intended timing category. This is distinct from WF-015's planning-hook timing behavior.
- Smallest action/owner: `skills/implement/scripts/dashboard-checkpoint.mjs` CLI error diagnostic that names the required order/offending token. Current lines 172–183 require `activity --state ... --activity ...` before optional flags, consistent with published examples. Keep successful invocation semantics; arbitrary-order parsing is a separate unselected option.
- Fix risk **Low** for bounded diagnostics: local error text and CLI expectations/tests; do not change state writes, category meaning, hook gating or legacy callers. Proposed verification **untested**: existing valid forms remain accepted, reversed prefix and duplicate/unknown options name their problem without writing state. Rollback message/test edit. Recommendation **Fix bounded diagnostics**; decision **Undecided**.

### WF-048 — Final sync maintenance refresh hit a workspace snapshot guard

- Category/status: **observed friction with suspected controller defect, Minor**; historical J, first/last R011. Observation confidence High; cause confidence Medium–High from captured/current code; recommendation confidence Medium; current runtime behavior untested.
- Expected/observed: the documented `sync-complete` route supports updated maintenance after documentation edits and then reopens review for changed scope. M1037 supplies fresh maintenance; M1039 fails with `Workspace changed since checkpoint` and a downstream JSON parse error. M1050 initially blames inspect; M1053's direct inspect succeeds; captured code M1062/M1074 shows the apply path. Omitting the supplied maintenance reuses the saved assessment and succeeds, reopening full review; no state corruption observed. That workaround is evidence of recovery, not guidance to omit genuinely changed evidence.
- Current basis/owner: `skills/implement/scripts/workflow.mjs` creates a new `workingState` when supplied sync maintenance is assessed (576–578); the general `workingState !== state` snapshot check (691–692) then rejects dirty documentation. `orchestration/review.md` explicitly allows refreshed maintenance in Final Sync. Object identity is a plausible overly broad condition; compatibility with pending-input/approval/resume enforcement remains uncharacterized. Do not merge with WF-028's Execute-phase impact refresh: this is a separate event and predicate.
- Smallest action: investigate the fresh/unchanged/omitted maintenance paths and legitimate stale-repo rejection in an isolated workflow fixture. Fix risk **High**: shared snapshot guard, phase routing, pending resolutions and saved/legacy state can be affected. No bypass or broader approval waiver proposed. Proposed verification **untested**: supported final-sync edits refresh maintenance and return to Review, while unauthorized drift/resume and stale evidence still reject. Preserve existing checks; rollback any eventual narrow predicate change with compatibility reader intact. Recommendation **Investigate**; decision **Undecided**.

### WF-049 — Known documentation discoveries were applied after the first review

- Category/status: **adherence gap, Minor**; historical J, first/last R011. Observation confidence High; cause confidence Medium (preparation happened but missed known facts); recommendation confidence Medium.
- Expected/basis: captured review-preparation contract and current `orchestration/review.md` already require maintaining known documentation before freezing scope. M730's report records schema lookup on panel open/cache sharing and documentation discoveries. Preparation M836–859 leaves related data-flow wording unchanged; CLEAN review exposes gaps; M991–1030 edits two docs in final sync. The controller correctly requires full current-scope cycle 2 (M1103), clean at M1137. Retrospective timing reports about 18 minutes for that cycle; child execution and causes of its duration are unavailable. This is a reported duration, not measured recoverable savings.
- Impact/recovery: one additional review due to known facts applied late, no fix/replan round or observed cap exhaustion. Related to WF-012's late-doc review friction, but its high-risk cap-removal remedy remains deferred and is not selected here. Exact current-tree review protected coverage and must remain.
- Smallest action/owner: investigate implement review-preparation adherence by comparing report discoveries with affected existing docs at the existing checkpoint. Do not add another reviewer, gate, checklist artifact or mandatory test rerun. Alternative No change pending live evidence on current guidance.
- Fix risk **Medium** for bounded maintenance-order guidance: may widen documentation edits unless kept ticket scoped; preserve review freshness, counters, independent review and saved runs. Proposed verification **untested**: fixture whose implementation report names an existing stale fact checks correction before first target freeze; genuinely new reviewer discoveries still reopen review as required. Rollback guidance edit. Recommendation **Investigate**; decision **Undecided**.

### WF-050 — Fixed migration version collided with a second source location

- Category/status: **observed friction, Minor**, historical K, first/last R012; currently no explicit namespace-specific check in inspected Lightweight dispatch guidance. Observation confidence High for collision/recovery; cause Medium; recommendation Medium. Expected: a chosen unique migration version covers every location the migration runner loads. M317–320 lists versions from one source directory; M511 fixes the next version before delegation. The delegate reports no existing match (M529); first review identifies a Java migration holding it (M647), and the parent's actual listings corroborate it (M661/M678). The fix and second reviewer report one new unused version across both directories and an unchanged body (M759/M824). Child check internals remain unavailable.
- Attribution correction: F says the dispatch explicitly restricted uniqueness checking to one directory. The actual M511 prompt fixes a path and asks to confirm the version is unused, but does **not** explicitly prohibit checking the other directory. Partial parent investigation, an unnecessary fixed identifier and a delegate validation miss are supported contributors; sole orchestration causality is not established. Captured/current `orchestration/lightweight.md` already delegates the implementation approach; investigate adherence before adding another broad rule. The captured convention excerpt emphasizes shared environment versions without fully describing the source-location namespace. Do not persist customer-specific conventions in universal guidance.
- Impact/recovery: one fix and extra review, caught before delivery. F estimates roughly seven minutes; not independently measured savings. The review's Critical product finding is not a Major escaped workflow defect. This is not WF-030 recurrence: Lightweight had no plan/self-review stage.
- Smallest action/owner: investigate `implement` Lightweight dispatch responsibility for derived identifiers. Consider leaving choice with the worker under actual project rules, or requiring a bounded whole-namespace check when the parent must choose. No universal all-branches scan or mandatory database execution. Alternative No change with current guidance and a project-local convention clarification.
- Fix risk **Medium**: narrowing parent constraints affects worker responsibility; indiscriminate searches could add considerable cost or overrule branch conventions. Preserve repository guidance, mode, independent review, counters and saved resumes; no schema or external write proposed. Proposed verification **untested**: disposable mixed-location identifier fixture demonstrates detection before first review and preserves ordinary single-location dispatch. Rollback eventual guidance alone. Recommendation **Investigate**; decision **Undecided**.

### WF-051 — Missing delivery CLI was discovered after exact-plan approval

- Category/status: **defect in prerequisite disclosure timing, Minor**, historical K and present by static inspection; first/last R012. Observation confidence High; cause High for CLI timing, Unknown for reported hook compatibility; recommendation High for bounded disclosure. Expected: known necessary delivery tooling is checked before asking approval to perform delivery. Observed: prepare succeeds (M1307); exact-plan approval M1327 precedes missing-CLI failure M1342. Inspection M1355 shows no commit/push, failed journal and empty repository progress. The parent reports manual options and stops (M1360). Later Git state shows an externally created commit, not successful helper recovery.
- Current basis/owner: `skills/implement/scripts/deliver.mjs` performs `gh --version`, authentication and repository reads in `run`, after approval; `prepareLocked` constructs the plan without those checks. Existing tests cover mutation-safe prerequisite failure and multi-repo SSO, not proof of pre-approval discovery. Different from WF-001's post-push repository-access failure; do not inflate its two-session count.
- U13–19 reports incompatibility with a no-commit hook. The parent mentions global restrictions at M1272, but no supplied hook configuration or hook rejection establishes actual compatibility. The user then explicitly grants a one-change exception (M1277, M1327); `gh` fails first. Never bypass hooks, protected branches or denial rules to satisfy delivery. Static checks cannot guarantee arbitrary hook/network/write success.
- Smallest remedy: surface read-only provider/tool/auth blockers at existing prepare, with actionable manual draft links, then retain prerequisite revalidation at run. No dry-run commit, hook execution, CLI installation, policy change or promise of complete permission prediction. Fix risk **Low–Medium**: moves command/network errors earlier, including multi-repo and provider cases; preserve exact-plan hashes, separate approval, partial-retry journals, legacy plans and late-failure recovery. Proposed verification **untested**: missing CLI/auth during preparation performs no Git mutation; working prerequisites preserve plan/approval; changed credentials still fail safely at run; resumed partial deliveries never repeat writes. Rollback early diagnostics only, retaining run checks. Recommendation **Fix bounded prerequisite disclosure**; decision **Undecided**.

### WF-052 — Developer reported an hour in the wrong repository

- Category/status: **user-reported issue, Minor**, earlier attempt reported with K, first/last R012. Report observation confidence High; underlying duration/sequence Low (not independently corroborated); cause Low; recommendation Medium. U7–11 says an ordinary chat suggested a backend repository, workflow steps there consumed about an hour before identifying a migration task, and switching repositories resolved the problem. Expected: users uncertain about ownership can discover it before investing in refinement/implementation. M6 already begins in the migration repository; the earlier routing conversation/attempt is absent. Do not attribute the initial suggestion to this workflow or count another distinct session.
- Current inspection: `find-the-repos` already provides bounded routing before refinement; workspace startup invokes it. A single-repo invocation does not establish permission to scan arbitrary siblings. README ticket quick-start leads to `implement`, while routing appears separately in the skills table. These facts support an entry-point/discoverability investigation, not proof that existing routing failed or that every startup must scan all repositories. U's token-cost concern is a preference, not measured consumption.
- Smallest action/owner: investigate README/startup discovery wording for uncertain repository ownership and recommend existing workspace routing where applicable. Alternative No change if the omitted attempt already received a clear routing option. Fix risk **Low** for a bounded entry-point clarification; **Unknown/Medium** for automatic single-repo detection changes (scope, token cost, approvals and legacy startup). Proposed verification **untested**: documentation scenario distinguishes known-repo from unknown-repo entry, uses existing bounded workspace discovery and adds no routine approval or source scan. Rollback wording only. Recommendation **Investigate**; decision **Undecided**.


### WF-054 — Preparation-only coverage status confused the user after tests passed

- Category/status: **observed friction, Minor**, historical L with current presentation mechanism inspected; first/last R013, one distinct session. Expected phase-specific evidence to make clear what did and did not run. The new component's negative case is planned as Regression, cannot import before implementation, and retains `not-run` under the explicitly titled **Pre-change baseline / preparation** column even after later passing execution. The human asks why one test is pending, whether it is regression, and when it should run (M1588, queued human-origin prompt). This is evidence of confusion, not an unexecuted final gate.
- Evidence: M778 preparation check lists five Progression scenarios and one Regression scenario with the missing-module reason; M1022 step handback reports both component tests passed; M1065 reports full suite 15 files/116 tests; M1519 package readback repeats the preparation-only row while separately reporting passing validation. M1732's embedded feedback calls it a stale result; M1767/M1789 repeat that explanation. That diagnosis is too strong: the historical baseline is accurately retained and should not be overwritten with a later pass. M1539/M1542 present and approve Limited assurance; recovery explains the later pass, with no package alteration or delivery observed.
- Current basis/owner: `scripts/lib/test-coverage.mjs` takes plan plus preparation, labels the column pre-change, and explicitly says counts are planned scenarios rather than executed tests. `skills/implement/scripts/final-package.mjs` calls it separately from verification. Its maintained tests preserve pre-change limits and purpose matching. Planning may legitimately identify protection of existing behavior through a new wrapper, so a new file or negative assertion alone does not prove its Regression label wrong. The test also does not establish all real UI toggle behavior; browser coverage remains pending.
- Impact/recovery: one captured user clarification and overbroad stale-status explanation; no false green, lost test result, failed gate or incorrect approval is established. Observation confidence **High**, cause **High** for presentation provenance, **Medium** for planning classification; recommendation confidence **Medium**.
- Smallest action: **Investigate** distinguishing historical preparation from later execution beside the row, and whether the claimed protected behavior has an executable pre-change check. Preserve baseline history, genuine progression/regression semantics, unresolved mappings and existing test selection. Do not relabel every new-file negative case or infer scenario passes from any unrelated full-suite pass. Decision **Undecided**.
- Fix risk **Medium** for linking later evidence at scenario granularity or changing package data: exact approvals, saved packages, stale evidence and legacy reports must retain their contract. A wording-only clarification could be **Low**, but a concrete remedy has not been selected. No new gate/schema is proposed.
- Proposed verification — **untested**: disposable new-component example with import-only preparation and later matching execution; historical not-run remains visible, later pass shown only with matching retained evidence, absent/stale evidence stays unknown, unchanged legacy packages and hashes remain valid. Retain shared-command/multiple-scenario controls. Rollback future rendering/adoption together while retaining historical artifacts and approvals; never rewrite an already approved package to change its baseline. No reproduction or tests performed here.


- Maintainer clarification after R013 (2026-11-27, direct review conversation): the pending acceptance count was confusing, including whether it referred to progression or regression. The maintainer accepted this reporting direction: detailed acceptance criteria, verification methods/evidence, progression/regression execution results, historical preparation and named pending checks belong in the existing final approval package, linked from Artifacts; final approval chat provides a concise consistent summary. Keep the dashboard's four existing sections: workflow circles, the blue/green current-status section, Artifacts and Audit log. Add no intervening data, panels or tables. Any concise pending-check wording belongs within the existing status section. Preserve audit detail there rather than adding summary blocks. This is an explicit presentation preference and accepted direction, **not a Fix/Investigate selection or implementation authorization**; WF-054 remains Undecided.
- Related accepted proposal, requiring contract investigation before implementation: support recorded diff inspection for suitable scope-only acceptance criteria and distinguish such evidence from automated tests. The captured run's scope criterion was inspected by parent/reviewer but remained pending in saved acceptance evidence. Do not retroactively declare it verified or promise a five-of-five result merely from chat; establish the existing evidence contract, reviewed scope binding and any valid inspection method first. Browser checks retain their actual pending status; no unnecessary test is proposed to prove an absence of source changes. Earlier example completion wording was illustrative, not a correction of the saved package. Recommendation remains bounded investigation, Medium risk for evidence/approval semantics, with the unrun verification/rollback above; no selected implementation plan follows from the maintainer's “ok.”

### WF-055 — Shell portability errors caused recovered worker retries

- Category/status: **observed friction, Minor**, historical L; first/last R013, one session with multiple manifestations. Expected commands to match the evidenced shell/platform and use available editing tools. Test worker C1:42/C1:61 fails on unquoted wildcard arguments under zsh; its C1:82 uses incompatible `sed -i`, then C1:86–96 switches to Edit and refreshes preparation evidence. Reviewer C5:81/C5:82 encounters the same in-place edit incompatibility while repairing its JSON field and recovers using structured Node JSON editing at C5:84. These are caller errors, not test failures or proof of a workflow parser bug.
- Impact: extra commands and source inspection; no product defect, data loss, replan or publication evidenced. Observation confidence **High**, cause **High** for shell diagnostics, recommendation **Medium**. Related earlier shell errors have not been matched to this exact mechanism; do not inflate distinct-session count.
- Smallest proposal/owner: existing worker/authoring guidance could prefer available structured Edit/JSON operations and quote search globs. **Defer** behind evidence clarity; decision **Undecided**. Do not create another helper, shell wrapper, capability gate or mandatory test stage.
- Fix risk **Low** for bounded examples only: no saved schema, approval, phase, dependency or external-write change. Guidance still influences agent behavior; universal adherence is unproven. Proposed verification — **untested**: inspect examples for literal glob handling and structured edits; if a patch is selected, a disposable local file can establish the intended field changes without application tests. Rollback only selected examples; preserve existing supported shells and tooling.

### WF-056 — Dashboard remained Paused while post-answer spec review ran

- Category/status: **observed friction, Minor**, historical M, first/last R014, one session. Expected the existing status section to identify what currently owns progress. The user had already chosen TDD at M382, but the coordinator held that approval unresolved while running the integrated spec review (M386/M412). At M417 the user asked whether HTML was updated because it said Paused; M430 explained the answer had not yet been recorded. Review returned CLEAN and mode/approval were saved before planning (M434–476). One clarification turn; no lost approval or improper advance established.
- F1's simple waiting-for-user framing omits this chronology: at the reported moment a reviewer was doing work after the answer. Rendered page and historical dashboard snapshot are unavailable; no claim that a waiting card was absent. Current `render-status.mjs` renders pending requests as waiting for input; the recent amber paused styling does not establish resolution of post-answer visibility. Observation confidence High, cause Medium for unresolved request sequencing, Unknown for exact displayed content; recommendation Medium.
- Smallest action/owner: Investigate coordinator sequencing and presentation in `implement` startup/spec-acceptance and `render-status.mjs`; characterize the TDD override review before proposing wording within the existing status section. Preserve required review and exact artifact approval, and do not mark approval consumed before its binding is valid. No new dashboard panel, saved status, marker or automatic approval.
- Fix risk **Low for presentation only**, **Medium for lifecycle/order changes** because mode overrides, artifact edits and pending approval binding interact. Compatibility of a lifecycle remedy is unassessed. Proposed verification — **untested**: unanswered approval clearly waits for the user; after a TDD answer, CLEAN/BLOCKED/delayed reviews show the actual dependency without accepting altered artifacts or losing the original answer; legacy pending requests retain behavior. Rollback any selected wording separately from lifecycle changes; preserve saved state/audit. Recommendation **Investigate**; decision **Undecided**.

### WF-057 — Repository skill loading selected the source checkout during worktree review

- Category/status: **observed friction, Minor**, historical M, first/last R014, one session with repeated source-checkout resolution. Expected mandatory repository guidance to correspond to the approved isolated checkout. C5:18/C6:18 and C7:30/34 invoke repository skills; their emitted base paths identify the original checkout rather than the isolated worktree. C7:43 compares hashes and observes differences for both relevant skill files; C7:42 and later inspection read the isolated copies. C7:89 discloses matching worktree guidance and the loader mismatch in the CLEAN review handback. This corroborates F3 without inspecting the application checkout in this review.
- Impact/recovery: extra provenance checking and a possible stale-guidance exposure, caught and compensated during review. No wrong implementation or review decision attributable to stale content is established; early execution loads also precede the later documentation edits. Observation confidence High; cause Medium for host skill resolution, Unknown for its internal lookup rules; recommendation Medium. This concerns loaded instruction content, unlike WF-042's artifact argument bases.
- Smallest action/owner: Investigate `implement` context/dispatch guidance and `review-the-code` repository loading against the host's evidenced skill mechanism. Existing context-discovery already requires the appropriate repository rules; characterize how to honor mandatory loading method and read the approved checkout's authoritative text. Do not recommend the existing rule again as though absent, modify host registration, or substitute source-checkout hashes for frozen review inputs.
- Fix risk **Medium**: guidance can redirect every delegate's mandatory skill-loading behavior; host-specific resolution and legacy standalone behavior need characterization. No new hash gate/schema or automatic skill registration proposed. Proposed verification — **untested**: disposable split-checkout fixture with differing guidance identifies the selected text, reads approved current guidance before dependent review, preserves repository loading gates, handles matching copies and genuinely unavailable mandatory guidance. Rollback only future selected dispatch guidance/examples, retaining provenance disclosures and frozen-target checks. Recommendation **Investigate**; decision **Undecided**.

### WF-058 — Pending output key confusion produced a failed approval and false empty-state claim

- Category/status: **caller adherence gap / contract friction, Minor**, historical M with current output shapes inspected, first/last R014, one session. Expected a successful inspect lookup before resolution and no empty-state claim on parse failure. Apply output at M891 supplies `pending`; the M909 script assumes the same key from inspect. M911 shows `KeyError: pending`, a dependent resolution rejected for a missing current ID, and downstream JSON parse noise. M916 incorrectly says no pending request remains. Inspect at M917/M919 finds the saved approval in `fields.pending_inputs`; M931 retracts the claim and M932/M934 correctly resolves it.
- Impact: one failed shell operation, misleading narration and recovery reads; no approval lost or unauthorized transition. Current `workflow.mjs` inspect returns `parseState` plus `state_hash`; `render-status.mjs` supplies parsed `pendingInputs` and raw `fields.pending_inputs`, while apply has its convenience `pending`. Current controller guidance says to use inspect but does not provide that lookup example. Its existing rule to stop dependent work on errors was not followed. Observation/cause confidence High, recommendation High for a bounded example, not output unification.
- Smallest action/owner: controller pending-input examples should use `inspect.pendingInputs` (or explicitly parse `fields.pending_inputs`), validate a real current ID before apply, and preserve the existing stop-on-failure rule. Do not add another mandatory inspection or infer an empty list from a missing key/error. F4's output-unification suggestion is broader than needed.
- Fix risk **Low for exact examples only**: preserves CLI JSON shapes, stable IDs, approval gates, schemas, legacy resumes and side-effect ordering. Changing inspect/apply output contracts is unselected and separately unassessed. Proposed verification — **untested**: documented lookup obtains an active approval ID, handles an actual empty list, and aborts on missing/malformed output without a resolution call; existing stale-ID rejection remains. Rollback only the example; retain controller validation. Recommendation **Fix bounded guidance**; decision **Undecided**.

### WF-059 — Enabled cost CLI exited 13 with an unsettled module import

- Category/status: **defect, Minor**, current by local reproduction at `ccfacde`, first/last R015. One reported live episode linked by the maintainer to session M; local reproduction is separate verification, not a second live session. Expected the documented enabled CLI to return structured cost/skip/unavailable status. The forwarded agent report says two CLI attempts exit 13 with unsettled top-level await and no output; direct function invocation returns the intentional delivery-already-offered skip. Those live observations are reported, not independently observed in the original host.
- Independent evidence: running the plugin CLI with `MIW_ESTIMATE_COST=1` and an intentionally nonexistent state path in review scratch space exits **13**, pointing to the top-level `await calculateImplementationCost(...)`. No customer state, file or lock is touched; it fails before the expected missing-state handling. `implementation-cost.mjs` dynamically imports `render-status.mjs`; the renderer statically imports the executing cost module. The CLI is awaiting a module that depends on its own still-unfinished initialization. Observation confidence **High**, cause confidence **High** for this enabled CLI import cycle, recommendation confidence **High** for a bounded separation. Similar exit wording in WF-023 does not establish the same cause; keep the findings distinct.
- Impact/recovery: cost unavailable through the documented enabled CLI, while implementation completion remains intact. Importing the estimation libraries separately and reading the supplied archive succeeds; this does not repair the CLI or update the live dashboard. Disabled behavior returns before the import; no claim that every library invocation or the disabled CLI fails. The automatic live pre-delivery route remains untested.
- Smallest action/owner: Fix the module/CLI dependency in `skills/implement/scripts/implementation-cost.mjs` and its renderer relationship, with CLI-process coverage. Separate entry execution or pure shared reading as narrowly as feasible. Preserve saved result validation, run/state/archive binding, locks, timeout, single calculation, dashboard/audit updates, finalized-feedback prerequisite, current opt-in and delivery cutoff. Default-on policy and late archive-only accounting are separate, unselected changes.
- Fix risk **Low–Medium**: bounded internal module initialization with no required saved schema change, but renderer loading, direct library consumers and legacy dashboards share the dependency; inspect that compatibility before finalizing the plan. Proposed verification — **untested for a fix**: enabled CLI on a valid disposable finalized run returns parseable result, missing state returns structured unavailable, disabled invocation remains immediate, importing renderer/library has no CLI side effects, and existing reuse/lock/finalization/delivery protections pass. Rollback only the selected dependency/entry-point patch and focused coverage; retain existing cost snapshots. Recommendation **Fix bounded CLI dependency**; maintainer decision **Undecided**.

- D047 implementation update, 2026-11-28: explicit maintainer selection and later separate Proceed request authorize the bounded CLI repair plus default-on estimation, excluding a late archive command. Implemented locally with fresh-process CLI/fixture validation; see D047 for exact scope and limits. This supersedes WF-059's earlier Undecided implementation status, not its historical evidence. No live account installation or production outcome established.

## Uncertainties and no-change observations

- **Startup continuation correction:** an earlier conversational assessment called ending after the dashboard a defect. The actual initializer and hook explicitly required a standalone finished response so the Stop hook could verify it and continue (262, 264, 266–273). That continuation happened. No supported defect or user interruption is established; preserve this safeguard.
- **Different risk labels:** Low mode-selection risk and Medium later production assessment are visible (504, 811). Current final-package instructions explicitly make assessment informational and prohibit it from changing routing or approvals. The two ratings alone do not establish a routing defect. Changing that contract is not recommended on this evidence.
- **Verification limits:** Docker-dependent tests were not run, unit results were delegate-reported, and browser/storage behavior was unobserved (565, 694). Those gaps were disclosed and accepted. No new mandatory regression gate, ledger, duplicate test run, or TDD requirement is selected or justified by the gaps alone.
- **Workflow housekeeping:** the workflow-generated ignore rule was disclosed in both approval presentations and included in the approved path set (842, 1082, 1086). No unauthorized scope expansion is established. Excluding it by default would be a separate design choice.
- **Overhead:** numerous contract reads/checkpoints are visible, but raw counts and the reported elapsed time do not establish unnecessary overhead or user dissatisfaction. The user assessed the session positively. Defer consolidation/redesign absent stronger evidence of material impact.
- **Feedback boundaries:** automatic feedback finishes before optional delivery by design. Failure to include a later delivery outcome is not, by itself, a collection defect. This maintainer review can assess the full supplied historical session without changing that lifecycle.
- **R003 observations, not findings:** the plan's overall risk was lowered from Medium to Low on code reading before the supporting test existed; the agent disclosed the limits when challenged and added a stop rule (1189–1311). A first full-suite gate used a fail-fast command and was re-run correctly (2000). The user deleted two unrelated untracked notes after a scope question (2232, 2256); harm and intent unknown. Reviewer prompts supplied prior findings and said to judge independently; no verdict steering seen, and any effect of telling the last reviewer it was the final cycle is unknown. Free-text answers to approval questions were accepted and handled (1188, 1277, 1311), so WF-004 did not recur.
- **R004 observations, not findings:** (1) direct connector writes when the publication journal was unusable (see WF-009 R004); permissibility unestablished. (2) A 57KB plan exceeded the tracker's comment limit, so only a summary was posted (1483); disclosed, not a defect. (3) The user-approved `stash -u` of unrelated work was disclosed with restore instructions. (4) The session ended before the terminal checkpoint, so no feedback or delivery behavior is assessable. (5) A JSON parse error (2079) came from the agent's own ad-hoc script; unrelated to the workflow.
- **R005 observations, not findings:** (1) session D also started with both repos on other tickets' feature branches and local edits; the 5.14.0 workspace flow asked for approval, so this is not a recurrence of the WF-010 missing prompt, but it is adjacent to WF-022. (2) The second independent review was a scope refresh after a one-line doc edit and was clean; no cycle-cap pressure, comparable to WF-012. (3) Not assessed: ticket-publication behavior (WF-009), delegate prompts and hand-backs, and plan or execute quality. (4) The agent's first shell-string and path guesses for helpers (1149, 1919–1929) resemble WF-017's pattern of reading helper source after a failure; one instance each, not counted as recurrence. (5) A checkout-switch by another of the user's sessions and a failed PR-to-session binding (2861) are environment-specific.
- Cross-session recurrence is established for WF-001 and WF-005 (sessions A, B), WF-007 (A, B, D), WF-009 (B, C) and WF-015 (C, D). None of the optional observations above is a maintainer-selected no-change decision; they are this review's recommendations and corrections.

- **R006 evidence corrections/limits:** final saved dashboard D123 correctly marks assessment stale, unlike the earlier feedback claim (WF-029). Its historical timestamped rating audit is not proof of a current-rating defect. Supplied patch contents, post-hook formatting semantics and exact delivered-tree equivalence were not audited. The reviewer reports one unmapped acceptance clause with coverage cited elsewhere and one unused query as advisories; these remain disclosed qualifications, not proof that all application requirements are met or a reason to reopen the completed workflow automatically. Test counts are recorded outputs, not independent reruns. The user-selected manual delivery was explicit and disclosed; unlike WF-020's earlier missing-subset menu, this run offered Adjust delivery scope and the failure had different causes. No recurrence of WF-020 is counted. No application-specific defect is added solely from an unverified reviewer or retrospective assertion.

- **R007 guard and wait observations:** M716/M826 activity denials followed narration that differed from the exact requested sentence; M1111/M1113 rejected drafting edits while the planning boundary was validation. These are compliant safeguards, not added WF-015 timing recurrences. Initial macOS missing-timeout recovery (M889), shell quoting retries (M2034/M3691), helper invocation/filename corrections (M734/M1244/M1480/M4085/M4325) and transcript-folder reveal/access failures (M4819/M4838) are retained as secondary friction; no new helper defect is established from them. Final macOS reveal/open calls returned success and were reported (M4853–4863); actual UI appearance was not checked here.
- **R007 gate interpretation:** progress stderr was captured separately (M2536/M3708/M4584); a long background wait and status questions do not alone establish another silent-stall defect under WF-021. Repeated gates after actual changes followed the current completion policy. Their cost is relevant to WF-039's investigation, with no approval to weaken that policy. Full-suite failures that passed alone are not independently proven unrelated; the final uncertain split had explicit user triage. Failed gates remain failed.
- **R007 review qualifications:** M2836's reviewer counted assertion locators pointing to declarations/setup and proxy coverage; M4243 reported one wrong test citation and advisory mapping omissions. The parent later re-resolved citations and retained four post-delivery clauses unverified (M4648/M4733). No independent semantic validation of those 135 verified rows is claimed. The known copy premise was corrected by the planner; do not treat M3164's claim that a production fix was needed as the actual implemented scope.

- **R009 preparation and guard limits:** core test preparation stopped because absent symbols would prevent whole-source-set compilation; the user explicitly chose authoring during Execute (M1252–1256), and later reports describe compile errors as red before passing real suites. This is related to WF-033 sequencing concerns, but no new scratch-tree verification occurrence is counted and no fake assertion pass is inferred. Claimed authorization false positives (M1332/M1398–1402) were disclosed and accepted; receipt/helper inputs were not sufficiently inspected to confirm a guard defect. The first planning-activity denial was a combined call; the next followed nonidentical narration (M677–684), so no new WF-015 flush recurrence is counted.
- **R009 gate/environment limits:** serial full-gate retries, a missing runner dependency, port clashes, an hour-long backend timeout and an unsupported eight-minute estimate contributed to waits. Sources do not establish a new WF-021 silent-stall mechanism or independently prove all failures unrelated. The user authorized dependency installation and each later rerun. Parent/delegate statements about Docker availability differ over time; do not infer a single fixed environment. The separate top-level-module probe is described as read-only in a handback but temporarily wrote/deleted a source class; this is a reported diagnostic mutation, not a read-only operation or action performed by this maintainer review.
- **R009 unverified application concerns:** the reviewer flags no production callers for the new adapters, test-local provider fakes for parity and incomplete import-suite evidence. The intended delivery may be preparatory adapters; no unapproved application defect is added from these observations alone. Original-child bodies, full plans and independent runtime behavior are missing. In v4, one parent Agent dispatch claims subagent-driven execution of all steps; nested dispatches are unavailable, so this alone is not counted as WF-037 recurrence.

- **R010 interpretation limits:** this successful small single-repo run does not exercise either impact-update route (WF-028/WF-040), and zero correction cycles do not measure a reduction relative to unmatched earlier runs. The worker/parent's numeric plan correction was contained before review; no WF-039 cost recurrence is added. The weaker unit-to-flow mapping and three manual criteria remain visibly qualified; no new browser gate is recommended. The separately supported compiler-qualification loss is WF-044.
- **R010 positive/non-findings:** a real compact boundary and saved-state recovery are observed; the three numbered steps each have a fresh Agent dispatch, but the subsequent production correction is performed by the parent while Subagent-Driven remains selected (WF-037). The broad claim that every implementation edit honored the selected mode would therefore be inaccurate. Expected future-component load failure after Step 1 is explicitly distinguished from the later passing full gate; no test was weakened to hide it. A stale test map causes scoped tokens to remain unresolved, but the full suite runs and that limitation is disclosed. Other helper-usage probes, a missing reference read and caller repo-selection corrections are observed recovered friction, without a separately established helper defect. Child retrospective CSS/tooltip concerns are expressly unverified rendering suggestions, not new findings. No question is prepared merely to have the user confirm these observations.


- **R011 retrospective qualifications:** the second reviewer calls the remaining wording point completeness-only and says a sibling domain document already covers it (M1141). The parent records no further edits and completes sync (M1163–1165). Its absence from the package is not independently established as a material omission; retain as an uncertainty rather than a confirmed new finding. No requirement to duplicate every fact across both documents is recommended.
- **R011 stale-target protection worked:** a comment was added to a tracked ignore file during review (M903/M913). Its author is unidentified. Reprepare and resume of the same reviewer succeeded. Do not exclude tracked files or relax frozen-target binding to remove this retry; no workflow defect is established by unrelated concurrent drift. This is neither a second session for WF-019 nor proof that the workflow authored the comment.
- **R011 secondary recovered friction:** shell glob/quoting, unsupported local `ls` option and a Node invocation with a Python-only flag caused retries; no cross-platform helper defect is established. The condensed export mislabels the human's initial command as injected system/skill text while explicitly acknowledging that classification in its closing explanation. Use canonical JSONL for intent; this ad hoc export is not a supported parser or separate user session. Dashboard wrapping/scroll-reset ideas in feedback remain unverified; its HTML preview is a report rendering, not the dashboard itself. Ordinary background waits, the user's package pause and the absence of automatic feedback while voluntarily stopped are not defects.

### WF-053 — Developer reported earlier artifact-folder deletion

- **Investigation item; not a confirmed deletion by this workflow.** Category **user-reported issue**, potential impact **Major** (loss of sole run history); historical earlier attempt, identity/linkage to K unknown, first/last R012. U21–25 reports that an ordinary agent removed the local workflow directory during cleanup in an earlier attempt. Report confidence High; underlying deletion/actor/loss confidence Low; cause Low; recommendation Medium. No deletion command or recovery record occurs in the supplied canonical run. The current run successfully retains and exports artifacts. One reported episode only; do not count it as another corroborated session or infer permanent loss.
- Expected: specs, reviews, packages and resumable history survive cleanup unless the user explicitly selects their removal. `docs/artifact-observability.md` and `scripts/lib/artifact-git.mjs` protect against accidental Git publication, preserve local files when unstaging, and intentionally retain the tracked ignore rule for ordinary review. Those protections do not guarantee that an unrelated later agent retains ignored files. The actual cleaner's instructions/tools and the scope of any deletion authorization are missing.
- Smallest action/owner: investigate recovery and which instructions the cleaner loaded before choosing a narrow persistent artifact-retention statement in existing guidance. No automatic repo-instruction edits, immutable files, backups/uploads, new gate or global cleanup ban. Alternative project-local cleanup guidance if this was outside the workflow's context. Fix risk **Unknown** overall until ownership is known; **Low–Medium** for scoped documentation (could conflict with intentional retention/deletion policy). Existing saved layouts, resumes, privacy and explicit deletion authority must remain. Proposed verification **untested**: an isolated cleanup scenario retains run evidence and still respects explicit user deletion; rollback eventual guidance only. Recommendation **Investigate**; decision **Undecided**. One recovery-impact question prepared for maintainer forwarding; not sent.

- **R012 housekeeping attribution:** F's ignore-file finding is not independently established as a scope defect. M209's initialization baseline already includes the ignore edit; M552 shows the rule; M617 freezes it; M1324–1327 explicitly includes it in the approved delivery. Current artifact policy deliberately keeps this edit in ordinary review. The original clean-tree premise is incomplete (M162 prints branch status through `head`, not exhaustive status); “pre-existing” can refer to worker start rather than session start. Preserve that provenance ambiguity. No WF-019 or WF-027 recurrence: this is neither unrelated pre-existing source scope nor post-approval preparation drift. Moving ordinary protection to local excludes is an unselected privacy/compatibility design, not an obvious fix.
- **R012 secondary friction/limits:** feedback check rejects missing numbered locators (M1134/M1178) and an ad hoc repair hits shell quoting (M1145), all recovered before valid save/readback/finalization (M1204–1235). Keep these observations without treating valid locators/privacy checks as defects. The report's F3 phase label is corrected under WF-005. No browser-rendering flaw is established by source-only feedback. The developer's reminder that humans need to understand their ticket and approve scope supports retaining the questions and independent review, not removing them. Missing DB tooling is a disclosed assurance limit, not justification for imposing a new Lightweight gate.

- R013 no-change/limits (L): successful Guided run, user-chosen TDD over assessed Lightweight, explicit plan/package approvals, authorized worktree and later declined delivery are preserved. The additional continue-versus-stop question (M823/M825) added friction after TDD selection, but the user explicitly continued; no skipped safeguard or dissatisfaction is established. Do not infer that 22 minutes, four step delegates, compaction/execution choices or normal waits require redesign. Six lifecycle wait observations exclude the later retrospective worker; seven child transcripts are supplied overall.
- R013 capability recovery: test worker C1:78/C1:79 attempts a fresh quality-review delegate and the host denies nested agents. `docs/artifact-quality-review.md` explicitly permits self-inspection when nested delegation is unavailable; worker recovery and review record follow. One denied attempt is not proof of a missing review or reason to enable nested agents. The main orchestrator's retained independent code review is separate. No remedy proposed from this event.
- R013 acceptance and retrospective qualifications: source-scope AC remains pending despite diff inspection; import-only red, stale map, partial generated-file review, browser/backend access and advisory keyboard-focus nit remain disclosed. The application's code was not inspected independently here. The retrospective's claimed hook conflict/flush timing and accurate-baseline-as-stale diagnosis are attributed model interpretations, not measurements or accepted causes. Dashboard source/rendering was not independently inspected; its embedded retrospective account cannot certify layout. No material follow-up question is needed to establish the user confusion or choices already captured; no questions prepared or sent.

- R014 no-change / qualifications (M): F2 is an allowed review fallback, not a confirmed missing safeguard. Captured `docs/artifact-quality-review.md` at C4:26 explicitly permits author self-review when nested delegation is unavailable. C4:138/139 proves host refusal; C4:142/147/151/156 records a boundary-assertion correction, refreshed evidence and disclosed self-review. Independent final code review remains separate. No evidence that a coordinator must dispatch an additional reviewer; recommending one as mandatory would change policy. Preserve the fallback and the successful plan review that caught the column-count mistake (M805–865).
- R014 evidence limits (M): Complete at M1844 follows the user's exact-package approval M1832, with 15 files/122 tests reported passing and disclosed UI/backend, lint/typecheck, map and partial generated-file review limits. Typecheck rose by two errors and stayed disclosed; do not call every check green. The roughly 31-minute metric includes waits; no active-time or efficiency claim. The supplied feedback is provisional, with no human satisfaction answer. Input validates at M2045, but the final write call M2054 has no paired result; the separately supplied report supports saved content, not verified readback/finalization or a later delivery choice. The archive's creation mechanism is not captured. No material follow-up questions needed for these bounded findings; none prepared or sent.
- R014 instruction ambiguity: M1360 invokes `run-regression` through Skill. The execute guide explicitly requires that mechanism, while the parent says not to start pipeline stage skills through Skill. The nested regression succeeds; record the overlap rather than confidently blaming model adherence or inventing another outcome defect. Temporary test-probe configuration failures recovered in C4 are investigation work, not evidence that the final tests were invalid. No application reproduction, browser inspection or external retrieval was performed.

- R015 late-accounting observation: the forwarded report says feedback was finalized, delivery was offered and declined, and direct enabled function invocation returned the documented delivery cutoff. Current code confirms the cutoff applies even to a declined offer. This is intentional current behavior, not proof that the archive is unreadable or cost inherently requires reopening completion. Retrospective archive-only accounting and default-on estimation merit a separate product decision; neither is implemented/selected here. Earlier maintainer questions about always calculating establish an expectation gap, not an explicit Fix selection.
- R015 archive-only result: the existing `readCostArchive`/`estimateArchive` libraries successfully calculate **$10.5248336 (approximately $10.52), partial API-equivalent**, from S014, with its saved run start and normal ticket binding, using the bundled pricing table labelled verified 2026-11-28. **216 deduplicated priced requests**, zero skipped priced candidates, one model. This is the calculator's coverage, not a claim of complete billing or independently verified live prices. No pricing fetch was made. Startup before the saved run boundary is excluded because the invocation's free-text arguments do not match the normalized ticket; later feedback/readback/finalization/delivery after capture and unseen/resumed usage are also excluded. Bundled prices were used as recorded, not independently reverified. No live state/dashboard or archive was modified; result returned in chat only. This bounded calculation and CLI reproduction are plugin checks following the maintainer's live-run follow-up, not application tests or replayed transcript commands.

## Maintainer decisions

R001 (historical): all WF-001 through WF-007 were **Undecided**. The maintainer requested conservative review, retention of minor findings, and explicit decisions before fix planning. Selecting this skill extension did not select a delivery, controller, sanitizer, feedback-lifecycle, or instruction fix.

R003 (historical): WF-009 through WF-014 are **Undecided**. The user's three added inputs are recorded as reported input; they describe expectations and suggestions, not fix selections. The earlier decisions on WF-001 through WF-008 are unchanged; the recurrence evidence for WF-001, WF-005 and WF-007 is recorded but does not alter them. No fixes are selected by this review.

R004 (historical): WF-015 through WF-018 are **Undecided**. WF-009's recurrence is recorded and does not alter its D003 decision. No fixes are selected by this review.

R005 (historical): WF-019 through WF-025 are **Undecided**. The WF-007 and WF-015 recurrences are recorded and do not alter their existing decisions. The user's context-window report is recorded as reported input, not a fix selection. No fixes are selected by this review.

R006: WF-027–WF-036 are **Undecided**. WF-007 and WF-015 retain their earlier implemented decisions, with **renewed investigation Undecided** following session E. The recommendations above are not maintainer selections. No new selected Fix/Investigate plans, implementation, test run, commit or external write is authorized by this review. Preserve the D010 preference for advisory, nonblocking handling of new scope/provenance findings and all existing exact-operation approvals.

R007: WF-037–WF-039 and the renewed WF-030 investigation remain **Undecided**. The maintainer supplied the session user’s replanning complaint; that is reported experience and priority context, not Fix/Investigate authorization. Prior decisions and selected plans remain unchanged. No new selected plan or implementation follows this review.

R009: retain the explicit **Fix WF-030** selection and its current implementation hold, recorded in D034. WF-028/WF-039 remain investigation recommendations without a new remedy selected; WF-040/WF-041 are **Undecided**. Reviewing the second complaint does not authorize broader controller, evidence, gate or test-permission changes.

D035: the maintainer explicitly selected **Investigate WF-040 and WF-028**. The bounded source/history/disposable-fixture investigation is complete. Both implementation choices remain **unselected**; WF-030 retains its existing selection and implementation hold.

D036: the maintainer selected the bounded **WF-040/WF-028/WF-030** local release candidate. Implementation and deterministic validation are complete for 5.17.2; targeted model evaluations and committed-PR release smoke have not run. The earlier holds and unselected entries above are historical. No publishing or account installation has occurred.

R010: the maintainer requested live verification of the already-selected WF-040/WF-028/WF-030 changes. Review and ledger update are complete; the outcome is successful with partial live evidence and the limits above. Earlier selected fixes remain recorded. WF-044 investigation, WF-043 bounded guidance, WF-042 and renewed WF-007/WF-015/WF-037 remedies are **Undecided**; no new source work or experiment is selected.


D038: the maintainer explicitly requested **Investigate WF-007 and WF-015 first to identify a narrow, safe remaining fix**. The bounded source/history and same-source evidence investigation is complete. Recommendations are an eight-literal WF-007 extension and a conditional WF-015 recovery wording clarification; neither source fix is selected. Recommend deferring WF-015 timing/policy changes. Preserve D004/D008 implementation history and all unrelated prior decisions.

R011: WF-045–WF-049 are **Undecided**. Developer feedback selects no fix; preserve all earlier decisions, including WF-005 implemented guidance and WF-012 deferral. Only this ledger was updated; no source fix, reproduction, test run, commit or external write was performed. No new selected Fix/Investigate plan exists until an explicit decision by stable ID.

R012: WF-050–WF-053 are **Undecided**. Earlier WF-005/WF-007/WF-008 decisions and pending renewed investigations are preserved. Recommendations and developer suggestions are not maintainer selections. Only the ledger changed; no selected plan or implementation is authorized.

R013: WF-054/WF-055 and further remedies for WF-007/WF-015/WF-042 remain **Undecided**. Preserve D004/D008/D038 and all other selections; recurrence and recommendations do not select implementation. Only this ledger is changed. No selected fix plan is added until an explicit Fix/Investigate decision.

D046 (2026-11-28): after requesting and reviewing the two-item plan, the maintainer explicitly said “Implement the plan.” This selects local implementation and deterministic validation of WF-015 recovery wording and WF-042 review-path examples only. No sanitizer, shell, test-presentation, runtime-policy, delivery or release change is selected.

R014 (2026-11-28): WF-056–WF-058 and renewed remedies for WF-006/WF-007/WF-042 are **Undecided**. D038's investigation, D046's bounded examples and all prior selections remain intact. No new selected plan; no implementation authorized. This review writes only this ledger.

R015: WF-059 **Undecided**; recommend a bounded Fix, but the forwarded report and this reproduction do not select implementation. No new selected plan. All prior decisions remain intact.

D047 (2026-11-28): the maintainer selected **Crash + automatic cost**, reviewed the resulting plan, and separately requested **Proceed** after leaving Plan mode. This selects local implementation/validation of WF-059 plus default-on estimation and explicit opt-out. It does not select the late archive command, historical backfill, other R014 findings, release, installation or publication.

## Review/source history

### R001 — Initial transcript review, 2026-11-18

- Source S001: one supplied JSONL transcript; SHA-256 `bd4e34a2108fd3fdbb87305e4a7fed27fcca9b43d650a5d4c972cba2d4b2ddd4`. Anonymous session A. Source locators below are physical JSONL record/line numbers, not application source lines.
- Captured versions: plugin 5.14.0; client 2.1.311. Guided autonomy, Lightweight implementation. Inspected maintainer checkout: `7602dae`, plus the local maintainer-review skill extension. That extension does not modify the implicated helpers.
- Coverage: main-session message/tool records across the 1,137-record export were surveyed; findings use targeted inspection of the locators below and relevant local instructions/helpers/tests. Diagnostic request replays were excluded. Full child-agent executions, raw test outputs cited only in child reports, live application behavior, and rendered dashboard appearance were not independently reviewed. This is not an exhaustive application/code audit.
- Intended result: refine a blocked upload ticket, implement the approved backend scope, review it, and optionally deliver it. Observed result: the approved local change completed independent review and final approval; commit and push succeeded; PR creation failed on organization SSO. The agent inspected the delivery journal, disclosed partial delivery, and did not blindly repeat mutations (1086–1124).
- What worked: explicit scope clarification, independent review, qualified integration-test limitations, exact-plan delivery approval, and partial-delivery recovery. No observed unauthorized delivery. Customer resolution remains unverified; the chosen scope was narrower than the original symptom report.
- User perspective in the current maintainer conversation: the overall session was good; preserve that experience and avoid risky workflow changes. Approval to build maintainer review did not select any findings for fixes.
- Recurrence baseline: one distinct session only. The transcript's embedded feedback and its readback are part of the same source/session, not independent corroborating sessions. Earlier review suggestions below are reassessed rather than treated as accepted findings or fixes.

### R002 — Focused synthetic model evaluations, 2026-11-18

- Source S002: local run `evals/results/full-2026-11-18T10-29-02-078Z/summary.json`,
  three disposable synthetic cases on the uncommitted D001 working tree, client
  2.1.311, base commit `7602dae`. Results are scenario evidence, not recurrence of
  the original customer session. The runner reports the maintainer checkout unchanged.
- After sandbox authentication still reported no sign-in, an out-of-sandbox status
  check confirmed the maintainer's completed sign-in. The runner then used that
  sign-in with a $6 cap. Reported usage, including grading: **$0.87383848**.
- Two cases passed; final-approval-evidence failed on omitted full PR text. Direct
  inspection of all three traces and saved reports/drafts confirmed preservation of
  delegate test attribution, integration-test limits and browser-hypothesis status.
  Feedback prose and generated failure/recovery notes were consistent. These narrow
  observations do not turn the failed approval case into a pass.
- Exact reviewed artifacts were copied from disposable runs into each case's
  `reviewed-artifacts/` results directory. The original failure is retained.

### R003 — Second transcript review (session B), 2026-11-18

- Source S003: one supplied archive containing a main-session JSONL (3,831 records; SHA-256 `1f68ce9cc8a2afc9e251999f5c19793f8f4123a4bdb00b3d5ccb2a71f8c05e20`) and 19 sub-agent JSONL/meta files. Anonymous session B; different user, machine and SHA from S001, so it is a **distinct session**. Locators are physical main-session JSONL line numbers.
- Captured versions: plugin 5.14.0 (from the skill base path); client 2.1.311. Guided autonomy, assessed medium risk, TDD mode. Inspected maintainer checkout: `95e1365` (plugin 5.15.0), clean tree at review start; it already contains the WF-001/WF-005 fixes that session B predates.
- Coverage: main session surveyed through narration, question results, errors and targeted tool records (1–3831). Sub-agent files checked only for dispatch descriptions (all 19 match the main session's Agent calls), four reviewer prompts and one delegate hand-back; full sub-agent executions, test code, application source and the rendered dashboard were **not** reviewed. The session's own claim of 25 sub-agent transcripts does not match the 19 supplied files (unexplained). User-gated waits of 7–50 minutes are not treated as overhead.
- Intended result: refine, plan, implement, review and optionally deliver a payroll cost-plan fix. Observed result: package approved (assurance Limited; 5 of 6 acceptance criteria verified; 20 disclosed environment-dependent suite failures accepted); commit and push succeeded; PR creation failed on organization SSO and the agent stopped without retrying (3770–3783).
- What worked: the publication failure was recorded and disclosed; independent review found two real Major defects and a fix-introduced regression, all fixed; the parent re-ran tests after each delegate step; the agent admitted the limits of its own risk reasoning when challenged (1281–1289); the delivery plan was shown in full and approved before mutations.
- User perspective: no overall assessment in the transcript. The user interrupted a question set (512), asked to restart on the base branch (514; reason not stated in the transcript), challenged a risk downgrade (1188, 1277), and ended the session (3792).
- User-supplied input after review (reported by the user, not visible in the transcript; attributed as reported): (1) the run began on a branch unrelated to the ticket being implemented, and the user expected `implement` to detect that the branch carries a different ticket number, alert them, and ask whether to continue on it or move to a new branch (see WF-010); (2) there were Jira access issues, with terminal warnings about the Jira CLI connection (see WF-009 note; relation unverified); (3) in planning, when a risk mitigation does not reduce a risk, the user suggests warning that risks above Low remain unmitigated and asking whether that is acceptable (suggested default, recommended) or whether to discuss alternatives (see WF-014).
- Recurrence baseline: two distinct sessions (A, B).

### R004 — Third transcript review (session C), 2026-11-18

- Source S004: one supplied archive (SHA-256 `86bdb4cae86eb4fbd05f5baee5dac2314b261fe3598e79e418e7fc17464f51a3`) with a main-session JSONL (3,581 records, about 8.8 MB), 27 sub-agent JSONL files with metadata, and 19 tool-result files. Anonymous session C; different user, ticket, repositories and archive from S001/S003, so a **distinct session**. Locators are physical main-session JSONL line numbers.
- Captured versions: plugin 5.14.0 (from the skill base path, 46); client version not captured in the records surveyed. Guided autonomy, TDD mode, spec-assessed High risk (plan risk High before mitigation, Low after; 1445), two-repository run. Inspected maintainer checkout: `51d1996` (plugin 5.15.0), clean tree at review start; it already contains the WF-009 fix (D003) that session C predates.
- Coverage: main session surveyed through a condensed per-record digest (user/assistant text and tool calls, truncated) plus targeted full reads of the startup, publication, hook-denial, regression-gate and tail records. The 27 sub-agent files, 19 tool-result files, repository code and the rendered dashboard were **not** reviewed. Elapsed time is not reported. The session ended before the terminal checkpoint, so no automatic feedback step ran.
- Intended result: implement a two-repository change (backend validation plus UI) from a ticket, creating sub-tasks. Observed result: spec, plan and 13 steps completed; completion gate passed after one related fix round; independent review returned Request changes (2 Major, 2 Minor, 2 advisories) and the run was paused at the user's request before any fix (3514–3561). The user then asked for this export (3573). Final outcome (fixes, approval, delivery) is unobserved.
- What worked: the user-approved stash of unrelated work was disclosed with a restore instruction (166–180, 845); the user's pause request was honored exactly (3518, 3543, 3561); a gate failure was triaged as plan-related and fixed through a plan amendment (3071–3331); a delegate step that needed out-of-plan files stopped and asked (2550); unclaimed acceptance clauses were disclosed (25 of 35 recorded; 3057); independent review found two real Major defects before packaging.
- User perspective: no overall assessment in the transcript; no user-supplied additional input yet.
- Recurrence baseline after R004: three distinct sessions (A, B, C).

### R005 — Fourth transcript review (session D), 2026-11-19

- Source S005: one supplied archive with a main-session JSONL (2,898 physical lines, about 8.7 MB; SHA-256 `7e9a619f608cd4e7a3fa580dcc416a8c0665645c74351fb17eacc489152f5682`; a second copy in the archive is byte-identical), 14 delegate JSONL files and 4 tool-result files. Anonymous session D; its SHA differs from S001/S003/S004, so it is a **distinct session**. The 14 delegate files match the main session's 14 `Agent` dispatches. Locators are physical main-session JSONL line numbers.
- Captured versions: plugin 5.14.0 (from the skill base path); client 2.1.326. Guided autonomy, TDD mode, medium assessed risk, two-repository workspace run (one product repo changed, one support repo unchanged). Inspected maintainer checkout: `51d1996` (plugin 5.15.0); the tree was clean apart from this ledger's uncommitted edits, which were preserved. Session D predates the D001–D004 changes in the checkout.
- Coverage: read in full or targeted — startup (105–300), planning-hook records, the completion-gate period (1560–1900), review, package, delivery and feedback (1895–2900), and the session's own saved feedback report (2695). Plan and execute records 300–1560 were surveyed only through human messages, every question and answer, every error result and every hook intervention. The 14 delegate transcripts, the 4 tool-result files, application code, the rendered dashboard and the correctness of reviewer verdicts were **not** reviewed. The export is a live capture and ends mid-turn at the user's request for it (2881). No story-point or estimate value was found in the transcript.
- Intended result: refine, plan, TDD-implement and review a small backend change, then optionally deliver it. Observed result: two independent reviews were clean; the package was approved with **Limited** assurance after the full-suite gate failed on unrelated specs (accepted by the user, 2456); at the user's chat request the agent committed 14 files, pushed and opened a PR (2785, 2817–2826). Whether the change works against real downstream services is unverified.
- Time accounting: about 6h12m wall clock from start to export request; the workflow's own metric (5h27m) stops at the terminal checkpoint. Answers to the agent's 20 question calls total about 198 minutes, including 94.7 minutes on gate triage (1879–1886), 33 minutes on final approval (2454–2456) and 21.9 minutes on the delivery offer (2713–2715); these are user-gated and not treated as overhead. Agent-side gate time 10:04–11:54 was about 110 minutes.
- What worked: the agent verified the helper-created branches and caught the wrong base (205–217); a controller check caught a branch moved by another of the user's sessions and the agent left that checkout alone (1985–2017); the stale local base was disclosed and consented to before its ref was moved (2194–2202); review ran twice, the second as a scope refresh after a doc edit (2298–2351); final approval named Limited assurance, the partial known-regression list and the 18 unrelated paths (2453); delivery staged 14 explicit paths and kept the gate and unrun-suite qualifications in the PR text (2768, 2823, 2870); progress replies were honest when asked (1645, 1788). No SSO failure occurred, so WF-001 did not recur.
- User perspective: no overall assessment. Three complaints during the gate period: "any progress?" (1641), "and now? look like it was stuck long time" (1655), "why did you stuck? this task is so simple why its taking more then hour?" (1793). Later requests: "can you tell me the path?" (2039), "commit only the related files" (2758), "push it and open the PR" (2802). The characterization of the task as simple is the user's; the records do not assess it. User-supplied input after the transcript (reported, not visible in it): the session reached about 85% of the context window (see WF-025).
- Recurrence baseline after R005: four distinct sessions (A, B, C, D).

### R006 — Implementation bundle review (session E), 2026-11-23

- Source S006: supplied archive SHA-256 `4b3aed02f7168a1d5ff711ee3755f121af9e419d18676d34efe2acb9eedbf784`. Main JSONL: 4,363 physical records, SHA-256 `847e3d3d00dbb9ee14c98f96826998d4d6e8c8903448c95f779a36841be41328`; earlier start: 110 records, SHA-256 `5b5a0f8e243c10e240c56cd68fb10b0ab72ec76417c11add0692cce69c1101f7`. Anonymous session E is distinct from A–D. The earlier start and main run implement the same task and count as one episode, not two occurrences. The bundle's feedback and artifacts also describe that episode.
- Captured versions: plugin 5.17.0, client 2.1.323. Autonomous, High assessed risk, TDD, two isolated repository worktrees. Inspected checkout `ad758549067312a82275ec2bcfa53d1da93ccff1`, plugin 5.17.0, clean before review. Version equality does not establish complete byte identity; implicated helper excerpts in the transcript agree with the inspected mechanisms. No application checkout, private service or ticket was accessed.
- Locators: **M** = main JSONL physical line; **E0** = earlier-start JSONL physical line; **F** = bundled workflow-feedback Markdown physical line; **P** = saved plan line; **X** = cumulative execute report line; **RV1/RV2/RV3** = numbered review report line; **D** = saved dashboard HTML line. These anonymous labels describe source roles, not repository filenames. Metadata and serialized request replays are not new human instructions or repeated operations.
- Coverage: surveyed canonical user/assistant narration, questions/answers, tool calls and selected errors across M1–4363; targeted full call/result reads for readiness, authorization, evidence refresh, assessment and delivery. All **362** canonical main tool calls pair with results by ID. Inspected the earlier start's canonical messages; it ends before initialization, with no supported reason for abandoning it. One main compaction boundary appears at M3914; its summary is secondary evidence. API request/blob, attachment, cost and other metadata were inventoried rather than semantically reviewed in full; their structures are not all supported as conversation evidence.
- Delegate coverage: **34 child JSONL + 34 metadata files**, matching 34 main Agent dispatches; the bundle's claim of 68 child transcripts counts more files than executable JSONL transcripts. Inventoried child prompts and selected handbacks, including initial test preparation and mock repair. Child execution bodies were not exhaustively reviewed. Inventoried **40** non-metadata external text results but did not read all their bodies. macOS `._` metadata was excluded. Read both identical feedback copies as one report, selected plan/preparation/execution/review/package/state data and dashboard markup. Oversized embedded dashboard scripts, most plan/test rows, application patches and full application source remain unreviewed. No browser rendering, reproduction, application tests or paid model evaluation was performed.
- Intended/observed outcome: implement a coordinated validation/UI change and deliver PRs for human review. The workflow reached Complete after three reviews and two fix rounds; the last review routed both remaining Minor items as advisories. The final package was **Limited** assurance. Saved execution evidence reports passing backend unit and frontend test suites plus separate API/integration runs; this review did not rerun them. Browser verification and frontend type compilation remained pending and were disclosed. The user approved the delivery plan and later explicitly chose manual delivery after helper failures (M4095, M4257). Commit/push/PR outputs support two PRs opened (M4282, M4290); the helper journal remains failed, as disclosed at M4300. No merge or completed deployment is evidenced.
- What worked: isolated checkout choice and exact creation approval; product clarification; scope reconciliation; independent review catching consequential defects; user resolution of legacy-record behavior; explicit Limited-assurance disclosures; initial delivery stop/inspection; and explicit consent for manual delivery. No unauthorized publication is established. Subsequent commit hooks formatted files; the source package is not proof of review/test coverage of the exact post-hook delivered bytes.
- User perspective: requested delivery to review the PRs (M4121), then requested a complete analysis bundle (M4305). No overall satisfaction or expected-duration answer is present. Reported 5h41m implementation elapsed includes waits, including roughly 1h49m awaiting the legacy-data decision; it is not all agent overhead. No timing target or verified monetary cost is inferred. One neutral whole-session follow-up question was prepared for the maintainer to forward, not sent or stored here verbatim.
- Result: **3 new Major findings, 7 new Minor findings**, plus renewed observations on WF-007 and WF-015. New IDs WF-027–WF-036 are Undecided. No implementation or fix plan is selected. Earlier decisions and validation history remain intact.

#### R006 supplemental cost attribution, 2026-11-23

The maintainer asked where the session spent most and whether cost could be reduced. This authorizes the completed recorded-usage analysis below, not a model-routing change, weaker review, source implementation or paid experiment. It extends WF-025's contributor investigation; no new source, session recurrence or defect is inferred from cost alone.

- Method: parsed all supplied main, earlier-start and 34 child JSONL usage records. Counted assistant message usage once per message-ID/request-ID pair, excluding request replays and repeated streamed blocks; repeated records had identical usage. There are 1,439 unique recorded model responses: 356 main, 3 earlier-start, 1,080 children. Matched every child to its main dispatch through the supplied metadata tool-use ID. **Actual response model**, rather than metadata's default model label, determines pricing: 28 children used Opus, 6 Sonnet. Main responses use Sonnet. All inspected usage records specify standard service/global inference.
- Pricing: API-equivalent estimate using published standard USD per million tokens, including cache duration. Sonnet input/output/read/5-minute-write/1-hour-write = 2/10/0.10/2.50/4; Opus = 4/20/0.20/5/8. Main and earlier-start cache writes are one-hour; child writes are five-minute. The earlier-start client's recorded total agrees within a fraction of a cent after its small auxiliary-model cost. This is not an invoice, subscription surcharge or complete account-usage statement; unrecorded auxiliary work and the capture tail are not estimated.
- Attribution: main requests assigned by response timestamp to saved audit phase boundaries; each child's complete cost assigned to its dispatch phase. Thus Review includes review preparation/documentation and controller work, not only reviewer reasoning. Post-completion work includes feedback, optional delivery and bundle preparation. Boundary allocation is approximate; the whole-recorded-session total reconciles to **$105.11**. Usage attribution reads do not establish semantic review of the child bodies or application code.

| Recorded phase group | Estimated USD | Share of recorded total |
| --- | ---: | ---: |
| Execution, three passes | 36.31 | 34.5% |
| Review, three rounds including preparation | 29.39 | 28.0% |
| Test preparation, three rounds | 16.85 | 16.0% |
| Planning, including two fix plans | 6.62 | 6.3% |
| Final assessment/package | 5.47 | 5.2% |
| Context/refinement | 2.23 | 2.1% |
| Final sync | 0.11 | 0.1% |
| Earlier start/startup | 1.17 | 1.1% |
| After completion: feedback, delivery and bundling | 6.96 | 6.6% |

- Iteration cost: initial execution **$26.67**, initial test preparation **$8.07**, first review phase **$12.16**. The work from first fix planning through the final review totals **$37.31** (about 35.5% of the whole session): **$20.08** fix planning, test preparation and execution, plus **$17.23** for the second/third review phases. This is a cost attached to corrections and reassurance, not all waste or achievable savings. Reviewer-only children cost **$8.50 / $7.46 / $6.49**; the first found consequential defects. Preserve independent review. Additional corrective children inside the first execution pass cost about **$1.51** before parent overhead and are not included in the later $37.31.
- Token cost components: **$49.67 cache reads (47.3%)**, **$36.20 cache writes (34.4%)**, **$19.23 output (18.3%)**, and less than **$0.01** uncached input. Context-related charges therefore account for about **81.7%**. This does not mean caching is harmful: caching lowers the cost of processing retained context. It indicates that reducing unnecessary retained context/round trips is more promising than merely shortening final prose.
- Context evidence: peak main request input plus cache tokens **958,620**, before the observed compaction. Canonical main Read results contain about **612,953 characters** of plugin instructions; Bash results about **316,653**. These are returned-character inventories, not token or dollar attribution. Execute's entrypoint, planning, startup and refinement instructions are the largest early plugin reads. No repeated plugin Read path appeared in the canonical results; broad claims that the parent repeatedly reloads the same skill are unsupported. Required application/domain context must not be discarded merely because it is large. The six repeated reads of one feedback-input artifact are separate from plugin reads and need semantic assessment before being called redundant.
- Waiting/caching: the first main response after the long human decision wait (M2515) costs about **$2.59**, including **645,621** one-hour cache-write tokens. Expired context is a supported explanation for this rewarming cost, not an independently observed provider cache trace. Waiting itself produces no periodic token bill; the resumed request incurs the charge. Do not remove product questions or send keepalive requests to avoid cache expiry.
- Routine-task routing candidate: four Opus children for documentation maintenance, informational assessment and feedback diagnosis cost **$9.14**. At identical token counts, Sonnet rates imply **$4.57**, a **$4.57** reduction (4.3% overall). Including test-preparation follow-ups would add an illustrative **$3.91** reduction, but changes test-authoring quality risk. All non-review Opus work totals **$42.91**; repricing all of it to Sonnet would reduce the estimate by **$21.45**, about 20.4% overall. This is a pricing counterfactual, not a tested recommendation to downgrade all implementation, and savings cannot be added independently to avoided rework/context savings.
- Source basis: `skills/execute/SKILL.md` derives executor tier from the whole plan and directs every step dispatch to use that tier. In this cross-repository High-risk plan, even the documentation-only step explicitly requested Opus (M2136). Informational assessment and feedback also explicitly requested Opus (M3433/M3733), without this evidence establishing they required it. This is a candidate policy refinement, not an adherence defect: the plan-wide execution policy was being followed.
- Post-completion cost is about **$5.71** feedback/terminal summary, **$1.11** delivery and **$0.15** bundle work (rounded components may differ by a cent). The visible delivery failures therefore are important reliability issues but not this run's largest model-cost target. Assessment/package cost **$5.47**, including **$3.14** for the assessment child; fixing its identity binding (WF-029) improves value, while simply repairing that binding does not remove the assessment's token cost.
- Proposed priority, **untested**: (1) evaluate Sonnet for bounded docs/informational tasks while retaining strong independent review; (2) improve adherence to existing planning/reachability/sibling rules (WF-030) to reduce some correction cycles; (3) measure a bounded reduction in coordinator instructions/tool-result payload and compare equivalent behavior before changing loading boundaries. Model routing risk **Medium** for docs/informational work, **Medium–High** for broad implementation/test changes; context restructuring risk **Unknown** until scope/compatibility is chosen. No exact savings or quality equivalence is established.
- Verification/rollback proposal, **untested**: compare one bounded task class against existing output/evidence requirements, actual model usage, total tokens and follow-on correction cost; retain initial failures rather than changing graders. A cheaper individual call is not success if it creates later rework. Restore only a future selected routing/loading change if quality or total cost worsens; preserve approvals, required review, valid passing evidence and legacy resumes. No source/eval change, benchmark, application test or external mutation was performed. Existing decisions remain unchanged; no cost remedy or implementation plan is selected.

#### R006 model-policy audit and external comparison, 2026-11-23

- Maintainer preference: the workflow must not interfere with model choices made by the user or harness. This supersedes the earlier suggested workflow-owned cheaper-model routing experiment as the preferred direction. The maintainer requested an audit and web research **before** implementation; no source change or fix plan is selected by answering those questions.
- Local policy audit: only `plan-the-work/SKILL.md` (executor-tier output and mapping) and `execute/SKILL.md` (tier applied to every step), reinforced by `execute/references/dispatch.md`, explicitly direct model selection. No current skill frontmatter pins a model. The original session loaded the execution rule at M1497, so this is captured-session evidence as well as current source inspection.
- Dispatch audit: the parent supplied explicit Opus for 20 execution/correction workers, 3 independent reviews, 2 later test-preparation workers, 1 review-context documentation worker, 1 informational assessment and 1 feedback retrospective. Another documentation worker explicitly selected Sonnet. Initial test preparation and 4 exploration workers omitted the parameter. The non-execution Opus calls are observed coordinator choices without an inspected skill requirement for Opus. They are not evidence that the worker skills changed their own models after launch. The session used Sonnet in its main thread; an explicit original-user prohibition on different subagent models is not evidenced.
- Primary-source research inspected current Matt Pocock `implement`, `implement-spec` and `code-review` skill files: delegation/context/verification are specified without a model-selection requirement in those three files. This is a bounded comparison, not an assertion about every file or historical version of that repository. Addy Osmani's per-agent configuration guide separates portable skills from opt-in runtime controls; its reviewer persona has no model pin. Superpowers' current subagent-driven-development skill takes the opposing approach: explicit model choice by task complexity and stronger final review. These are different design policies; there is no universal community consensus establishing mandatory workflow-owned routing.
- Current Claude Code documentation says per-invocation model selection takes precedence over agent-definition model fields, normal subagent environment defaults and parent model (with separately documented forced settings/mods). Consequently, simply replacing an Opus override with `inherit` can still bypass a configured environment default. For the stated preference, the proposed rule is **omit workflow-authored model overrides and leave native resolution intact**, unless explicitly instructed by the user/harness. Also avoid new fixed model frontmatter, model/effort escalation or replacing native specialized-agent choices solely to obtain a particular model. This is a recommendation, not an implemented guarantee.
- Research references: Claude Code `sub-agents` documentation, Choose a model section; `mattpocock/skills` engineering skill sources; `addyosmani/agent-skills` advanced per-agent configuration guide; `obra/superpowers` subagent-driven-development Model Selection section. Public source links are presented in chat. Risk of a future bounded guidance change **Medium**: dispatch behavior changes, though approval/state/test contracts need not. Proposed verification remains untested: dispatch traces omit model fields under different configured defaults while explicit user/harness directives remain authoritative. Rollback future guidance changes together without silently reinstating a superseded model policy. No implementation, application tests, paid evaluation or external mutation performed.

### R007 — Transcript and status snapshot review (session F), 2026-11-24

- Source S007: supplied Claude Code JSONL, 4,865 physical records, SHA-256 `3ea720984c0bf0ae3763d1cc4e6960b859bc19b3701ed6bb2fea8d570fe0ebdf`. Source H007: supplied status HTML, SHA-256 `0336417647078a0c177af4bae29499a567f23905455e9ba6b690d25a76e7abf6`. Anonymous session F; different source identity and task from A–E. The HTML and transcript describe **one** session. An earlier completed run mentioned inside it is not separately reviewed or counted.
- Captured plugin **5.17.0**, client **2.1.330**, Guided, TDD, isolated single-repository worktree. Inspected maintainer checkout **8edbc7de205f04be75f85c13d883dba8e13dd216**, plugin **5.17.1**, with substantial pre-existing local edits, including this ledger and planning/startup/controller helpers. Current source inspection is qualified by that dirty tree; it does not establish the captured installation's exact bytes. The D032 model-policy change postdates the captured plugin and remains selected/completed as recorded.
- Locators: **M** = physical JSONL line; **H** = supplied HTML's numbered audit row, or explicitly named timeline/banner field. All 463 canonical assistant tool calls pair with canonical user tool results by tool-use ID; no missing main-call result. Canonical messages were distinguished from 484 API-request and 180 request-blob diagnostic records, including replayed nested messages. Queue operations, attachments, relocated metadata and automated notifications are not additional human decisions. One compaction boundary at M2952; M2953 is secondary summary evidence.
- Coverage: surveyed user/assistant narration, question answers, tool calls and error results across M1–4865 in bounded digests, with targeted fuller reads of startup decisions, execution policy, replanning, reviewer handbacks, gate/triage and final records. Read the supplied HTML's visible text/markup, timeline and audit rows; **no browser rendering or linked artifact inspection**. Long prompts/tool bodies were selectively truncated in the survey; most application patches, raw logs, metadata/attachments and thinking were not semantically reviewed in full. Child execution transcripts, separate plan/spec/state/report/verification files and linked timing JSON were not supplied. Their embedded handbacks and excerpts are attributed accordingly. No customer checkout, private link, ticket, application test, reproduction, paid evaluation or external write was used.
- Intended result: a fresh local implementation of an audit feature, followed by review and approval. Observed endpoint: **independent re-review running, no final package, no commit/push/PR** (M4779–4863; H139 and Final package field). The session is unfinished; its eventual correctness, approval and delivery are unknown. The last reported scoped run passed 497 specs, with type/style and six supplemental slices passing; these are recorded-session claims, not reruns here. All three full-suite gates timed out at one hour and were retained as FAIL/incomplete (M2613, M4138, M4702).
- What worked: the user explicitly selected a new run, isolated worktree, re-asking earlier questions and the full rerun (M148, M231, M297, M543, M916); none is an accidental restart. Ticket writes stayed off by choice (M343). Residual risks and unavailable live acceptance checks were disclosed. Independent review surfaced requirements ambiguity and later two actionable defects; the parent sought scope decisions, obtained revised approvals, prepared tests and performed fixes. Uncertain final-gate failures were sent to the user, who chose unrelated (M4747–4749). No full-suite pass or completed delivery was fabricated.
- User perspective: repeated status/completion/PR questions and a requested 15-minute finish (M1577, M2457, M2471, M2717, M2803, M2977, M3090, M3160, M3288, M4653). The agent said the remaining pipeline could not fit 15 minutes and disclosed the gate limit (M3164). **Additional complaint supplied by the maintainer during this review, attributed as the session user's report, not independently corroborated:** discoveries after planning lead to loops of rewriting the plan lasting hours; a small program change brings the agent back to examining everything from the beginning. WF-039 records that central concern without treating every elapsed hour as processing or every replan as unnecessary. **Subsequent context supplied by the maintainer, attributed as the session user’s report:** “I’m not finished yet, it’s a session of a few days while doing other tasks.” This confirms the ongoing, intermittent nature of the session as reported; calendar duration and status questions do not establish continuous agent work, a stall, or an unsuccessful final outcome. No active-work duration is independently established by this report.
- This review adds WF-037–WF-039, extends WF-030 with a second session, and records related limits without inflating WF-015/WF-021 recurrence. Follow-up questions were prepared for material user-experience gaps; none were sent. No fix decision was supplied with the complaint.

#### R007 bounded iteration-cause investigation, 2026-11-24

The maintainer accepted the proposed joint WF-030/WF-039 investigation by asking whether it could be done from this transcript, then instructed continuation. Targeted additional inspection covered canonical planning/test/fix dispatches M3145/M3303/M4292/M4349, test-worker handbacks M3318/M4365, the reviewer handback M4243, plan-declaration recovery M3327–3516 and the existing planning/test/verification contracts. These are the same S007/H007 inputs and session F; no new occurrence or session is added. Most child execution bodies and full customer artifacts remain unavailable. The initial read-only investigation began in Plan mode; no ledger writes occurred until Default mode resumed. No customer commands, application tests or reproduction were run.

1. **A handoff promoted intended behavior into a premise.** At M3145, the coordinator says the implementation already sends no events for refusals before an action starts and that **no code change is expected** for the clarified requirement. It also incorrectly says the copy path is unaudited, although the first reviewer had said it already emitted an upload event (M2836). The planning worker corrected the copy premise (M3175), demonstrating useful independent investigation. The broader refusal premise survived. M3303 then instructs test preparation that new refusal scenarios should pass at baseline, with a stop if a test disproves that premise. This permits disconfirmation but may anchor coverage selection; it does not prove the worker deliberately avoided a failure. Observation High; causal contribution Medium; internal model reasoning unknown.
2. **Passing tests exercised insufficient branches of the clarified requirement.** M3318 reports passing refusal cases and mutation sensitivity, including removing a validation call. That establishes useful tests for the selected paths, not every sibling validation entry point. M4243 later identifies an automation-transfer path whose test replaces the whole upload operation with a plain error, bypassing the real validation/error conversion, and preview-success recording before a later failing operation. M4365 reports that tests driving real upload validation and preview failure/order fail on the existing code, while surrounding storage-error guards pass. These reports support a specific coverage mismatch; this review did not independently execute or adjudicate customer code. Do not characterize the earlier tests as fake, mutation checks as worthless, or ordinary scoped passes as proof of every requirement.
3. **The review diagnosis itself needed refinement.** M4243 and M4292 include unsupported extensions among examples of the leaking validation path. The subsequent fix-planner handback in M4300–4324 corrects that example: its error inherits from a type already suppressed; the remaining leak is the non-permission validation error converted to `BadRequestError`. The final test handback distinguishes that failing case from already-passing extension/storage/malware cases (M4365). Thus “all unsupported extensions emitted events” is not an established defect. This reinforces verification of error classes before prescribing a remedy; it does not invalidate the accepted validation finding.
4. **A structural omission caused avoidable evidence repair.** M3318 reports 54 retained regression rows using six test files absent from their owning revised step's explicit Tests declaration. The full preparation input is rejected despite the reported tests passing. M3349 adds the paths; M3381/M3392 regenerate/remap preparation entries; M3426 validates the new report; M3505–3516 records and accepts it. This is WF-016 recurrence, not a new product-requirements decision. The plan had passed structural validation earlier; that did not establish end-to-end compatibility with retained preparation rows. It is not evidence that the helper should accept arbitrary undeclared files or that a full plan rewrite was necessary.
5. **Correction cost was amplified downstream, while some work was reused.** The spec-conflict route restarted the downstream phase/evidence sequence, but M3145 explicitly required keeping valid work, and M3175 produced four delta steps. The later fix used amend mode: the handback in M4300–4324 preserves Steps 1–4 and appends six steps for tests, fixes, docs and verification. M4349 requires a fresh preparation report covering the amended plan with prior evidence reused/adapted. Each changed execution pass re-enters the broad completion gate; M3708 and M4584 launch subsequent full-suite attempts, both reaching the hour limit. Those facts explain iteration cost without proving any particular required gate was unnecessary or that earlier results could be silently reused as current.

**Bounded conclusion:** supported contributors are inaccurate coordinator premises, missed owning-layer/sibling-path coverage, one preparation-declaration mismatch, and repeated downstream evidence/gate work. The first rerun and earlier user-requested scope change remain legitimate and separate. This evidence does not establish infinite retries, defective deployment, avoidable total calendar duration or a complete causal account of child behavior. Current source already requires owning-layer tests, assumption reconciliation, bounded amendment and evidence qualification; duplicating those rules or adding another universal reviewer is not a demonstrated remedy.

**Recommendations after investigation, not selected fixes:** (a) a narrow coordinator-handoff correction should separate accepted desired behavior from observed implementation and unresolved coverage; replace unsupported “already works/no code change expected” claims with a request to verify the changed clause across the touched entry points; (b) evaluate whether planner/test preparation catches a validation path hidden by a mock and a success event recorded before a later failure, using existing semantic checks rather than a new gate; (c) make reused-test declarations consistent before preparation under the existing contract; (d) investigate compatible, dependency-scoped evidence reuse separately before changing invalidation/gate policy. The workflow already has bounded amendment/reuse guidance, so enforcement or schema redesign is not assumed necessary.

**Risk and validation:** (a)/(b) proposed fix risk **Low–Medium**, because dispatch/scenario selection changes but no new gate, schema or automatic scope expansion is needed; (c) **Low–Medium** if limited to existing declaration checks/examples, with arbitrary-path protection retained; (d) remains **Medium–High**, touching approval freshness, versioned receipts, phase routing and legacy resumes. All proposed remedy verification is **untested**. A synthetic case should expose a false handoff premise, distinguish the real invalid-parameter failure from already-suppressed extension errors, catch premature success, and retain adequate existing coverage. A preparation fixture should accept correctly declared reused rows and reject truly undeclared destinations before workers waste execution. A reuse investigation must distinguish unchanged evidence from changed behavioral inputs and keep failed/unavailable full gates qualified. Rollback future guidance/fixture corrections independently; any later routing change must retain saved versions, exact approvals and historical receipts. No source fix, test run, commit or external write was performed by this investigation.

### R008 — TDD compaction and completed continuation review (session G), 2026-11-24

- Source S008: supplied Claude Code JSONL, 2,049 physical records, SHA-256 `1e26e4bd2f7cbe6d00fb5b96944d9c44ab9a233a0fd401d19de698456828e839`. M locators are physical records, including metadata and request replays; replays are not additional actions. This anonymous session is distinct from session F. Earlier reviews of this same TDD run and its continuation count as one session. Captured client 2.1.323, local plugin 5.17.1; inspected maintainer HEAD `8edbc7d` with uncommitted compaction and renderer changes. The final five records were checked after the initial 2,044-record snapshot, including the closing response at M2046.
- Coverage/limits: main-conversation flow and relevant canonical calls/results across M1–2049, with focused semantic inspection of compaction, execution choice, waiver failure/recovery, review, approval, feedback and delivery. Request replays, raw encoded payloads and private application patches were not exhaustively reviewed. Embedded child handbacks were inspected as reports; separate child execution bodies and independently saved customer artifacts were not reviewed. No customer checkout, application test, private link or transcript command was used during this review. This verifies workflow evidence, not application correctness or a controlled comparison of context savings.
- Intended outcome and successful compaction: Guided TDD with an isolated worktree and explicit TDD override for a Low-risk change. Accepted planning preceded a saved pre-test compaction wait; the user chose Compact first (M593–606). An initial paste was correctly identified as ordinary chat (M615–619), followed by a real manual compact boundary (M636). Resume reread recovery/instructions and resolved the pending continuation before test preparation (M660–783). Four red tests were reported against 110 passing baseline tests. A valid current execution choice was made after compaction (M872–886); compaction is not established as the cause of the later mode deviation.
- Recovery from the earlier blocker: an explicit manual-check waiver was saved (M1088–1093). Rendering then failed because skipped-check validation lacked the accepted plan, although progress and later the Review transition were already saved (M1108–1222). A narrowly scoped renderer fix was separately authorized and implemented earlier in this maintainer conversation, not by this review. On continuation (M1327–1338), inspection found Review in progress, execution passed and no pending input. The session continued from Review without repeating production implementation. The waiver remained skipped/unverified through approval and completion. This is observed successful recovery; it does not make the original failure disappear.
- Review and approval: independent review found a numeric mismatch between an explicit empty/loading-row span and the actual column count. The user chose to retain the specified span and accept the cosmetic gap (M1510–1573). Documentation wording was corrected, a zero-new-step fix-plan handoff routed back to Review without incrementing the implementation fix cycle (M1595–1651), and a second independent review led to final sync (M1678–1716). That no-new-steps route is supported by the current Fix contract. The exact final package was presented, approved by the user and resolved through the controller (M1837–1873).
- Completion is now evidenced: outcome Complete, saved combined feedback with required readback, completion summary, delivery offer, explicit Not now, saved delivery status declined, and a closing response confirming uncommitted local work (M1873, M1978–1994, M2020–2046). No canonical commit, push or PR-creation action was observed. Final assurance remained **Limited**: 5/7 verification rows and 3/4 acceptance criteria were verified; these are different units, not conflicting counts. Two manual rows stayed unverified. The record reports 114 passing tests and a passing build, with the existing lint failure qualified; no tests were rerun here. The final High assessment was attributed to inherited complexity, separately from initial Low routing risk.
- Remaining issues: WF-037 recurs as a confirmed execution-choice adherence gap; WF-007 recurs as minor feedback-validator friction. Feedback initially also lacked required execution assessment and numbered evidence locators; those were legitimate separate corrections, not sanitizer false positives (M1950). A platform-specific text-edit command failed before the final valid check (M1965–1973). No new source fix is selected by this review, and no additional user-intent question is needed to establish the completed flow.

### R009 — Second iteration-complaint transcript review (session H), 2026-11-24

- Source S009: supplied Claude Code JSONL, **3,748 physical records**, SHA-256 `697443bc7f8adc452468c6519595b8a7a1ea51090b4b5572a3824ded73bc881f`. Anonymous session H is distinct from E/F/G by session identity, task, machine and source hash. No separate child executions, dashboard, saved plan/state or test logs were supplied. **M** locators here refer only to S009 physical records. All **346** canonical main tool calls have matching results by tool-use ID. API requests/blobs, attachments, queue operations and compaction summaries are not new conversation events or user approvals. One compaction boundary appears at M2783.
- Captured plugin **5.17.0**, client **2.1.330**, Guided TDD, three isolated repository worktrees after an approved scope expansion. Inspected maintainer checkout **1119773709903b3ef0b4132da69726353dc29070**, plugin **5.17.1**, clean before this ledger update. This newer checkout includes unrelated compaction/context changes and R008's separate review; preserve them. Implicated impact-handler excerpts captured at M1986/M2003 agree with the current phase restriction/reset mechanism by static inspection; no exact installed-source byte identity is asserted.
- Coverage: canonical narration, question/answer flow, tool-call inventory and errors surveyed across M1–3748 in bounded digests; fuller inspection of package guardrail, blocked impact refresh, amended-plan impact reset, gate cancellation/validation errors and reviewer/worker handbacks. Long prompts, application source/patches, most raw logs and metadata were selectively inspected or truncated. Child bodies and independently saved artifacts remain unavailable; handbacks are attributed reports. No customer checkout, private ticket/link, application test, reproduction, paid evaluation or external write was used.
- Intended outcome: implement coordinated import-read adapters and backend/provider changes, with parity/golden coverage, then review and optionally deliver. Endpoint: plan v4's 12 steps reported complete, the v4 completion gate still running, no final package/re-review outcome/commit/push/PR evidenced (M3737–3746). Test results are session/delegate reports, not reruns here. The last report names passing scoped suites and 664 core tests; backend full-suite assurance remains incomplete. Eventual outcome is unknown.
- What worked: scope expansion and reuse of the accepted spec were explicit (M497–560). Initial planning discovery challenged incorrect/incomplete refinement assumptions before execution, obtained decisions and revised the spec (M870–992). A worker stopped at the architecture constraint instead of silently weakening the test (M1924). Existing code was retained during replans. The parent disclosed failed/unavailable gates, obtained installation and rerun consent (M2866–2868/M3107–3109), honored cancellation by stopping the running gate, and sought explicit acceptance of failed-gate limits (M3157–3159). Independent review identified a real accepted requirement gap before delivery; the user explicitly started its fix cycle (M3439–3444).
- User perspective: the maintainer supplied this as another user's complaint about iterations; no verbatim additional complaint was provided for this session. Transcript questions include whether work was stuck (M1715), a worker taking more than 30 minutes (M1741), whether commit/push had happened (M2899), and a request to skip the gate (M2930). Do not infer continuous processing from calendar time. The latest gate remained active when the user requested the transcript.
- Main result: **WF-030 now has 3 distinct sessions (E, F, H)**; **WF-039 has 2 (F, H)**. WF-028's stale-evidence/phase dead end recurs in H. New **WF-040** isolates an observed path-declaration update that reset an otherwise amended plan; new **WF-041** records gate-route overstatement during cancellation recovery. These mechanisms share the user's iteration cost but are not interchangeable causes. A second source supports improving planning, while showing that the selected WF-030 guidance patch alone cannot eliminate controller-driven resets.
- Scope/decisions: the maintainer had explicitly requested implementation of the agreed WF-030 plan, then put it on hold to review this additional evidence. No WF-030 source edits or evaluation runs had begun. Preserve that selection and the hold; this review does not select WF-028/WF-039/WF-040/WF-041 fixes. One neutral user-experience follow-up was prepared, not sent.

### R010 — Live 5.17.2 outcome and bounded fix verification (session I), 2026-11-24

- Source S010: supplied Claude Code JSONL, **2,157 physical records**, SHA-256 `dc7cf85bb305f66d5de065dc0e00478a05130e631e0421a436fdb04922c447c6`. Anonymous session I is a new run, distinct from G despite a similar feature exercise; session identity, start time, source hash, client and captured plugin version differ. **M** locators refer only to S010 physical records. No malformed records or duplicate canonical message UUIDs; all **196** canonical tool calls have matching tool-result IDs. Request-shape/blob/replay records, attachments, queue events, loaded instructions, hook feedback and child handbacks are not independent human requests or approvals.
- Captured plugin **5.17.2** is present in initialized state (M239), resumed state (M822/M891) and terminal evidence (M1993/M2094); client **2.1.325**, Guided TDD in one approved isolated source worktree with a separate private artifact root. Inspected maintainer revision **`8aa08a1cd0f7eba408a8b3822fab9561b744f950`**, plugin 5.17.2, clean before this review. The new planning integration text is captured at M606; coordinator guidance is captured at M836. Loaded local paths and version markers do not prove exact installed bytes for every helper.
- Coverage: surveyed canonical narration/calls, actual question answers and errors across M1–2157, with focused inspection of the embedded accepted plan, test source/report, execution handbacks, local correction, verification and context-path repairs, reviewer conclusions, exact-package checks/presentation, feedback save/readback and declined delivery. Large raw source/results and API payloads were selectively inspected or truncated. Six Agent dispatches cover test preparation, three execution steps, review and retrospective; their handbacks are attributed model reports, not separate child execution audits. No customer checkout, private link, supplied command, application test, reproduction or paid evaluation was used by this review.
- Intended/observed result: add a date-display column while preserving actual product scope. The user chose Guided, an isolated worktree, date-only display on the selected screen, TDD despite Low assessed routing risk, compaction, Subagent-Driven execution, exact final-package approval and **Not now** for delivery (M88/M112/M194/M367/M453/M714/M745/M1089/M1883/M2130). Terminal state reports **Complete, plan version 1, fix cycle 0, replans 0, review cycle 1, execution mode subagent-driven** (M1993). The closing response confirms local uncommitted changes (M2154); no canonical commit/push/PR action is observed. This is a completed workflow with explicitly Limited assurance, not full application verification.
- What worked: real manual compaction (M773–777) and authoritative continuation before Write Tests (M820–927); two authorized test files, real helper/component behavior and no mocks (M651/M968/M980/M990); three actual per-step Agent dispatches (M1186/M1245/M1290), with the later parent-side correction qualified under WF-037; useful early discovery/correction before the full gate (M1307/M1317–1337); an independent CLEAN review (M1672/M1683); exact corrected package approval; feedback save/full readback/finalization (M2092–2109); and honored declined delivery. The main test result is **15 files/119 tests**, including 110 baseline and 9 new, with direct parent output at M1337 and later gate/handback evidence. These are captured results, not maintainer reruns.
- **WF-040 — not exercised:** there was no append-only fix amendment, no impact path addition and no `amend-paths` controller update. The initialized/resumed single-repository state lacks `repo_impact_version`; current initialization enables it only for an approved scope containing more than one repo (`workflow.mjs`, `initializeWorkflow`). Zero replans in this run therefore cannot validate the new impact-update branch. Existing D036 deterministic evidence remains separate.
- **WF-028 — not exercised:** no stale dependency-evidence stop, explicit `refresh-evidence` update or corresponding recovery handoff occurred; impact handling was inactive for this run. Successful local documentation edits are not a live test of the refresh/stop remedy.
- **WF-030 — partial positive evidence with a residual miss:** the new coverage guidance was loaded; the plan and preparation exercised real owning behavior and separated unavailable browser/round-trip evidence. However the plan repeatedly prescribed a numeric table span without counting a leading selection column (M651). The Step 3 worker exposed the mismatch; the parent counted and corrected it locally before gate/review (M1307/M1317–1337). It did not trigger a fix round or replan. A unit-level assertion was still mapped to a full input-to-display clause; reviewer/package notes properly disclose that weakness and three manual criteria (M1672/M1842/M1880). This supports better containment and concrete tests, not universal self-review adherence or a causal reduction in defects. Count I as a residual WF-030 occurrence, **4 sessions E/F/H/I**, without equating this bounded correction with the earlier costly failures.
- Material qualification issue: **WF-044** records a reported compiler-failure/unknown-baseline qualification lost between execution and final approval. Minor friction: WF-015 recurs (**4 sessions C/D/E/I**), WF-007 recurs (**6 A/B/D/E/G/I**), WF-037 recurs narrowly in the parent-side production correction (**3 F/G/I**), and new WF-042/WF-043 retain recovered path-base and draft-shell-expansion mistakes. None produced a global fix/replan cycle here. No new WF-039 occurrence is counted from ordinary checkpoints or these repairs.
- Timing/limits: terminal dashboard evidence reports about **22m 9s** from workflow initialization through approval, including waits; the canonical request-to-closing span is about **28m 13s**, including feedback and delivery choice. Active processing is unmeasured. This small single-repo task is not a controlled comparison with earlier complex multi-repo runs; even G differs in accepted details, tests and limitations. No measured time saving, fix-rate reduction, production correctness or universal model adherence is established. Browser checks remain unperformed, 3/8 criteria pending, and the pre-existing stale test-map baseline stayed disclosed rather than being stamped fresh.
- User perspective/decisions: the maintainer supplied this live transcript to verify the selected changes. No new complaint, subjective speed assessment or fix decision was supplied. Existing D036 selections remain implemented; this review selects no further remedy, runtime change, new gate, experiment, commit or publication. No follow-up question is needed to establish the bounded outcome; unexercised routes remain explicitly untested in this live run rather than asking the user to confirm a conclusion.

### R011 — Successful Lightweight run and developer feedback (session J), 2026-11-27

- Source S011: supplied archive SHA-256 `973edaa19a73574bf0034cd74a631f5d9fd68bd1ae83b651ff1f53da7a2265eb`. Main Claude Code JSONL: **1,904 physical records**, SHA-256 `db6cbeb006a23b8b4b86eb6afdc4ee91e81cc214fcde66c2a7fa1ca2a6728c8a`. Companion developer feedback SHA-256 `79083a388746b4fbb7ce5f97a0872751404a5efd68ca98a59440f5375a657715`; workflow retrospective `ef3ae145b1ee9246c78e85d43264c28a4f60921123f14e56b72f8f1001e657a0`; condensed transcript `f4719788051a46985189ac660338c2d17af111a6adedc1d0fdb4add28df46056`; retrospective HTML preview `7d5e389ae727f563ba2dc1c53a4a761578043dc88b4465f79ebd1da46ffafe84`. These describe one episode, **session J**, distinct from A–I by task/session identity; no extra recurrence for derived reports or the stopped earlier attempt whose artifacts appear at startup.
- Captured plugin **5.14.0**, client **2.1.326**, Guided Lightweight, low routing risk. Inspected maintainer HEAD **`55167e85c666f10d76f92092c2b34f828826bab4`**, manifest **5.17.5**, with pre-existing uncommitted test-coverage changes across planning, execution, review and packaging. Those edits were inspected only where relevant and preserved; they do not prove any reported issue fixed. Current TDD coverage presentation work explicitly retains Lightweight's verification model.
- Locators: **M** = raw JSONL physical record; **F** = retrospective Markdown line; **U** = developer feedback line. Surveyed canonical narration, human answers, dispatch prompts, calls/results and failures across M1–1904 through bounded digests and targeted full records. All **161** canonical tool calls pair with results by tool-use ID. API request/blob replays and metadata were inventoried, not treated as extra events/instructions. Read both feedback documents; inspected condensed-export structure and relevant text and HTML preview source, not a rendered dashboard. Four Agent dispatches/embedded handbacks are available; separate child transcripts, saved application artifacts and two external tool-result files mentioned at the end were not supplied. Long application source/patches, metadata payloads and child internals were not exhaustively reviewed. No customer checkout, private link, ticket fetch, application tests, reproduction or paid evaluation was used.
- Intended/observed outcome: correct a read-only field label while retaining edit behavior. Completed locally after two clean independent reviews, zero implementation fix rounds/replans, a user-selected stop at package approval, then explicit chat resume/approval of the unchanged package (M1367–1479). No commit/push/PR creation is observed. The developer reports that the change solves the issue and has no result complaint except excessive tests. Preserve this successful assessment; application correctness was not rerun here.
- What worked: existing-run detection and explicit Start over; required repository skills; disclosure and approval of a fallback choice that deviates from a ticket comment; a different-title test that detects removal of schema lookup; independent review, stale-target detection and same-reviewer recovery; honored Stop; verified unchanged-package resume; completed feedback save/readback/finalization. Limited assurance retained browser/build/live-service gaps and compiler failure qualification (M1348/M1751). Reported full-suite result is 67 suites/231 tests/42 snapshots; direct parent scoped output reports 23 suites/80 tests (M764), whereas the worker report says 73 scoped tests (M730). Do not silently equate those numbers or independently certify the full-suite result.
- Main result: no confirmed new Major defect. New Minor items WF-045–WF-049 below; WF-045 is a **user-reported proportionality concern**, not proof every extra test is unnecessary. WF-005 recurs historically before its fix. The retrospective's remaining wording-gap and unexplained ignore-edit claims are qualified below rather than accepted wholesale. No material follow-up question is required: user satisfaction and preferred test scope are already explicit; optional cosmetic/environment unknowns do not change a decision. No questions were sent or prepared.

### R012 — Small migration run and developer feedback (session K), 2026-11-27

- Source S012: supplied archive SHA-256 `cbd0b4bc5392db8662d4abc4626585b4131fca01b71bbfa3461038bcb6e6baee`; main JSONL SHA-256 `276fb7970a67f4880dc66ed423dfefb23645e3e4871308bbe084fa1f6cc85310` (1,483 physical records), developer feedback SHA-256 `346b10eec8dbdba2fbd9c66ed8bc8075ec9f628189452fbcb7ff46479cc3e3ec` (32 lines), generated workflow feedback SHA-256 `689a237198d3ae4646144e24ea5233a8724bdfe58fd81bd7000886f455e082b8` (138 lines), condensed Markdown export SHA-256 `e419aafde1a926e5b925d4fe59bc2d8d53e963cdd087f5c8dff00f3f40335f87` (3,500 lines). M = physical JSONL record; U = developer feedback line; F = generated feedback line. K is distinct from A–J by source identity and task. The two feedback reports and derived export count as one episode, not extra sessions. Earlier attempts reported in U have unknown linkage/identity and are not counted as additional sessions.
- Captured attribution: plugin 5.14.0 in saved feedback/state and loaded cache paths; client 2.1.326; Guided, assessed Low, Lightweight. Captured guide bodies, rather than the version label alone, support individual comparisons. Inspected checkout `55167e85c666f10d76f92092c2b34f828826bab4`, manifest 5.17.5, with pre-existing uncommitted ledger and workflow/test-policy edits. Those edits were preserved. Checkout identity verified via plugin manifest and skill sources; no applicable AGENTS.md found at checkout/ancestor/docs locations.
- Coverage: actual JSONL structure inspected; all 131 canonical tool calls have results correlated by ID. Surveyed canonical conversation/tool records M1–1483 through bounded digests, with targeted full reads for dispatch, captured contracts, collision evidence, approval and delivery. Read both feedback texts fully. Derived Markdown was inventoried and sampled as secondary/truncated evidence; not read exhaustively. Its HTML preview is a rendering of feedback, not a saved dashboard. macOS metadata excluded. API request/blob replays, attachments, mode/owner/title/queue/history metadata were inventoried, not interpreted as new conversation events; embedded delegate notifications are model reports, not human instructions. No compaction boundary observed. Child execution JSONLs and standalone state/plan/review/package/dashboard artifacts are absent; their embedded outputs/handbacks are partial evidence. No full child execution, customer checkout, private link, live dashboard, application test or reproduction was inspected/run.
- Intended/observed result: add one missing dropdown option through an idempotent reference-table migration. The run completed, after one rename fix and two independent reviews; the user approved a Limited-assurance package (M986–993). No database/Flyway/build execution was established; the reported SQLite approximation is not equivalent and the limit remained disclosed (M824, M1250–1255). Optional delivery was approved separately but failed on `spawnSync gh ENOENT` before Git mutation (M1327–1360). Later captured Git output shows a new commit including the migration and ignore rule, and a branch matching its remote (M1407–1415); the actor is unobserved, although the parent inferred manual delivery. No PR creation or production outcome is established.
- What worked: scoped product questions and answers; correct base-branch consent; independent review caught a collision before publication; parent corroborated the collision with listing/ref evidence; unchanged-body rename and independent re-review; disclosed verification limits; explicit exact-plan delivery approval; post-failure journal/Git inspection without automatic retry. The developer says the skills did the job and work went smoothly after repository selection (U3–11); human understanding remains necessary (U27–32), not a defect.
- Findings: new Minor WF-050–WF-052; historical recurrences WF-005 (4 live sessions), WF-007 (7 live sessions), WF-008 (2 live sessions plus one synthetic case). No newly confirmed Major defect. WF-053 preserves a Major-impact user report of an earlier artifact deletion as an investigation item with unknown loss/recovery; it is not a confirmed deletion by this workflow. One material follow-up question about recovery was prepared for the maintainer to forward; question text is not persisted here and nothing was sent. No decision, selected fix plan, source fix or test execution follows from this review.

### R013 — Successful small TDD run with embedded user clarification (session L), 2026-11-27

- Anonymous source S013: supplied ZIP SHA-256 `6a4688065f5a2c447290fe69233198243452718eaf3fcb9697513745c0464588`; main Claude Code JSONL SHA-256 `70768b5640006a63e5be47fb4945c09af6057a7419f322010ff40f5066ea4799`, **1,809 physical records**. Seven child JSONLs total **511 records**, plus seven metadata sidecars. Distinct task/session identity establishes L separate from A–K; embedded feedback and delegate handbacks count once, not as independent sessions.
- Locators: **M** = parent physical JSONL record. **C1** test-writing worker (103 records, SHA-256 `85cb1d3b143986d0144579159fb6bd5461e67198142c198d778ad49c79b6a6a1`); **C2** step 1 (39), **C3** step 2 (42), **C4** step 3 (48), **C5** independent reviewer (88, SHA-256 `9329aff2051b2ad425d0f999f3e8579205e5c7fbed5d5261c6ef36b8ce441b0c`), **C6** step 4 (34), **C7** retrospective (57). Child labels identify assigned roles without persisting private filenames.
- Captured plugin **5.18.0**, Guided, Low assessed risk, TDD explicitly chosen at spec approval; main model records identify a Sonnet model. Client version is not established by this review. Inspected clean maintainer checkout **`5ca19f8`**, manifest **5.19.0**, confirmed by plugin identity and skill sources. No applicable root/ancestor/docs AGENTS.md or CLAUDE.md found. Current source does not establish the original host's capabilities; nested-agent denial and shell behavior are assessed from original records.
- Coverage: parsed actual record structures across every JSONL, inventoried metadata/request replay records, surveyed canonical conversation, calls/results, human-origin queued prompts and delegated summaries via bounded digests and targeted full extracts. Parent has **176 tool calls/175 results**; the final ZIP command M1809 is cut off before its result. All **80 child calls** pair with results by tool-use ID. API request/blob copies and prompt snapshots are diagnostic duplicates, not new instructions; hook feedback and model handbacks are not human approval. The repeated initial skill payload is not counted as a second run. No compaction event was established. Parent errors, preparation/package rows, hook sequence, human choices and child retry sequences received targeted review. Embedded saved feedback at M1732 was read; original standalone feedback/artifacts and external tool-result text files are absent from the archive. Long source patches, replay payloads and worker internals were not exhaustively read; oversized digest outputs were followed with targeted extracts rather than claimed complete coverage. No independent dashboard source/render inspection or linked-file review is claimed. Existing ledger history was read for structure and relevant findings/decisions; unrelated historical detail remains unchanged.
- Intended/observed result: a small table-row display enhancement, completed locally in an authorized isolated worktree. Reported baseline 13 files/110 tests; later suite 15 files/116 tests and successful build. Independent first-cycle review CLEAN with one advisory nit; zero fixes/replans, Limited assurance approved. Browser interaction remains unverified and source-scope AC pending. User declined delivery (M1770); no commit/push/PR operation observed. M1793 requests transcript packaging; final archive command has no captured result, although the supplied ZIP is readable.
- What worked: refinement choices; explicit user TDD override, worktree preview/approval, test-only worker scope, disclosure of missing-module-only red, parent validation, independent review, maintaining documentation/map before review, exact package approval, retained limitations, bounded feedback repair/readback/finalization and honored delivery decline. Runtime plan validation catches malformed AC scenario references (M628) and local repair precedes acceptance; this safeguard is not a new failure finding. Test worker's blocked nested review falls back without weakening the independent code review.
- Findings: no new confirmed Major issue. WF-054 captures preparation/result confusion while correcting the retrospective's stale-status interpretation; WF-055 retains portable-command friction. WF-007/WF-015 recur; WF-042 adds related path-contract friction, without establishing regression of D039's different input-file remedy. No context-growth, total-cost, speed improvement, production correctness or universal model-adherence claim is established. The recorded roughly 22-minute workflow span includes waits; terminal feedback and later delivery response are separate. User explicitly chose TDD and continued the full pipeline, and specifically asked about a pending test; overall satisfaction and desired elapsed time were not supplied. Neither choice is a fix decision.
- Review boundary: no customer checkout, private URL, ticket fetch, transcript-command replay, application test, reproduction, paid evaluation, source fix, commit or external message. Only this ledger is the review output. No follow-up questions are necessary for the bounded recommendations; missing runtime visibility measurements cannot be supplied reliably from user recollection.

### R014 — Successful TDD display change and provisional retrospective (session M), 2026-11-28

- Source S014: ZIP SHA-256 `6e07b716f7a087352773476f37f3b03253e4d7604b03dae831ec389082563952`; main JSONL SHA-256 `9ddecbb2818a323c83240f9721ed872985f83e00c1d999b5fbe6574b28c3f232` (**2,054 records**); report SHA-256 `f8e417b64c0b2d42e2e1538f358d113a632f31dfbcdf65ae90a7cb9bf86bed72`. Read the report and manifest; all nine manifest entry hashes match supplied files. Distinct captured session/task/date establishes M separate from A–L. Derived report is the same episode, not another session.
- Locators: **M** parent physical JSONL record, **F** supplied feedback report section/F-number. Seven child transcripts (**533 records**) are labelled by role: **C1** spec reviewer (40), **C2** initial plan reviewer (44), **C3** confirmation plan reviewer (37), **C4** tests worker (157), **C5** execute step 1 (43), **C6** execute step 2 (62), **C7** independent code reviewer (90). No private filenames, IDs or original paths retained.
- Captured plugin **5.19.0** from report and loaded local sources, Guided, Low assessed risk, user-selected TDD over Lightweight and authorized isolated worktree. Captured source revision and client version not established: loading a mutable checkout is not a frozen revision. Inspected clean maintainer checkout **`ccfacde440a0dabe6d09e4934620f8d674a9cf7a`**, manifest 5.19.0, confirmed via plugin identity/skill sources. No applicable ancestor/root/docs AGENTS.md or CLAUDE.md found. The reviewing host's tools do not establish original capabilities.
- Coverage: parsed every supplied JSONL's actual record structure, inventoried metadata/request snapshots, surveyed canonical conversation/calls/results through bounded digests, and read targeted complete approval/error/contract/review extracts. Parent **188 calls/187 results** pair by tool-use ID; M2054 is cut off before its result. All **93 child calls** have paired results. API request/blob/shape records, attachments and mode/permission/owner/title/history/queue metadata are diagnostic or duplicate context, not additional human requests. Embedded handbacks are model claims. Stop summaries and turn durations inventoried; no compaction boundary established. Large application source outputs, replay bodies and child internals were not exhaustively read. External tool-output files and standalone package/state/dashboard/source artifacts are absent except embedded excerpts; no claim of full underlying artifact coverage. Ledger read for structure, related findings/decisions and preservation; unrelated historical detail remains untouched.
- Intended/observed outcome: read-only payment-date column in an admin table, completed locally, independent review CLEAN, zero workflow fixes/replans and one final review cycle. Integrated plan review found an off-by-one column count, corrected before acceptance. Baseline 13 files/110 tests; final full suite 15 files/122 tests, 7/7 acceptance criteria recorded Verified. User exact-package approval and terminal Complete observed (M1832/M1844), no commit/push observed. UI/backend interaction unverified, lint still failing with unchanged count, typecheck increases by two errors, bulk-path inspection only, stale map and generated-file skim explicitly disclosed (M1829). Saved metrics do not establish production readiness.
- What worked: user-chosen scope/mode/worktree, correction plus independent confirmation of the plan, test-only delegation, honest import-only red, actual component assertion failures before implementation, validated preparation, parent checks, regression/full-suite evidence, independent review's guidance-hash recovery, exact final package text and qualified approval. Normal waits and the chosen full TDD route are not defects. User asked about dashboard currency; overall satisfaction/expected duration unavailable. Supplied feedback remains provisional. No new Major defect; three new Minor findings and three related recurrences. No reproduction, customer checkout, ticket/private-link lookup, application tests, source fixes, commits or messages. Only ledger review output; no selected fix plan until explicit decisions.

### R015 — Cost follow-up for session M, 2026-11-28

- Source S015: maintainer-pasted agent report of later live cost attempts, following R014. No invented hash or new live session identity; related to M as supplied by the maintainer. Reports finalized feedback, declined delivery, direct-function skip, two CLI failures and no plugin edits. No original follow-up JSONL/state provided, so live actions/absence of files are attributed reports. The agent's import-cycle diagnosis was explicitly an inference in that source.
- Inspected plugin remains `ccfacde`, 5.19.0. Independently inspected cost helper, renderer, archive estimator/pricing, documentation and existing tests. Enabled CLI reproduction with scratch missing-state input returned exit 13 and unsettled top-level await. Direct archive-only library calculation on S014 returned the partial result recorded above, without network access or saved artifacts. Module dependency inspection supports the cycle diagnosis. No code edit, application test, live customer state access, reset of delivery/finalization, or external write. Only this ledger updated; complete ledger read back and prior selected plans preserved. No material follow-up questions prepared/sent.

## Selected fix plans

### D001 — Maintainer selection and execution, 2026-11-18

The maintainer replied **Proceed** to the recommendation of two narrow fixes,
priority evidence investigations, verification of existing feedback guidance, and
deferral of question-controller and sanitizer changes. This authorizes the local
work below. It does not authorize delivery or broader workflow redesign.

- **WF-001 — Fix.** Reuse the existing read-only GitHub PR query during the initial
  prerequisite loop for every target repo, before any repo's staging/commit/push.
  Keep the later PR query to detect current state; preserve approvals, package and
  plan hashes, progress journals, Bitbucket behavior and explicit-retry recovery.
  Completion: single-repo and later-repo access failures leave index, HEAD, remote
  refs and working status unchanged; successful delivery and late PR failure/resume
  still work. Rollback: revert only this preflight/helper extraction and associated
  test changes. Implemented locally; validation recorded below.
- **WF-005 — Fix.** Specify absolute report paths and the state-directory relative
  base at the existing stage-contract call site; retain resolver and containment
  semantics. Completion: disposable nested-run tests accept absolute reports,
  deduplicate repeated reports and reject outside paths/symlink escapes. Rollback:
  revert the documentation clarification and added symlink assertion. Implemented
  locally; validation recorded below.
- **WF-002 and WF-003 — Investigate.** Add an approval/draft-authorship scenario
  using synthetic delegate-only test evidence, accepted skipped integration tests
  and a backend-derived browser hypothesis. Strengthen the delivery-preparation
  case to inspect both copied PR text and accompanying narration. Use existing
  package/approval contracts; no runtime evidence schema, rerun requirement or gate.
  Completion of preparation: fixture seeding, inventory and deterministic harness
  checks pass. Behavioral conclusion requires signed-in model runs and trace
  inspection. Post-delivery narration remains outside these pending-approval cases.
  Rollback: remove only these fixture/grader additions and their headless registration.
- **WF-006 — Investigate existing behavior.** Strengthen the existing real rejected
  check/repaired-save case to require consistency between saved prose and generated
  collection notes. Existing closing-check guidance already covers the requirement;
  no production guidance or save lifecycle change is selected. Behavioral completion
  requires an authenticated run and saved-report inspection. Rollback: revert the
  added grader paragraph.
- **WF-004 and WF-007 — Defer.** Retain observations for recurrence/reproduction.
  No question schema/controller or sanitizer changes.

### D001 validation and limits

- Strict plugin manifest, skill-directory and marketplace validation passed. The
  plugin-directory check retains its existing missing-icon warning.
- Eval inventory validates 174 cases; the three selected evidence cases resolve
  through the existing headless runner. The new Guided approval fixture seeds
  successfully with retained evidence, no saved package and no extra commits.
- All **706 deterministic script/workflow tests** and **99 eval-harness tests**
  passed with zero failures or skips. The full run includes the new SSO cases,
  later-repo failure, late PR failure/resume, report deduplication and outside-path/
  symlink rejection. The earlier focused delivery/startup run also passed all
  62 tests. `git diff --check` passed.
- Attempted focused live run: `node evals/run-suite.mjs full
  --case=implement-final-approval-evidence --case=implement-delivery-prepare
  --case=feedback-collection-runtime-notes --max-cost-usd=6`. The authentication
  precheck reported Claude Code is not signed in for this shell; **no model run
  started**. This is not a behavioral pass or evidence that WF-002/003/006 persist.
  Re-run those cases after interactive sign-in, then inspect traces and saved text
  before selecting any production instruction change.
- No live hosting calls or maintainer-checkout commit/push/PR was performed.
  Disposable Git fixtures exercise local commits and bare-remote pushes. Controller,
  sanitizer and feedback lifecycle behavior remain unchanged. Existing unrelated
  work was preserved.

### D002 — Authenticated investigation and bounded approval correction

- WF-002/003: the tested approval draft/narration retained attribution and uncertainty;
  delivery preparation also passed. No extra evidence schema, test rerun policy or
  qualification guidance change is selected. Actual post-delivery narration remains
  untested by these pending-approval cases.
- WF-006: the real rejected-check/repaired-save case passed; direct saved-report
  inspection found consistent collection notes and narrative. Retain existing
  closing-check guidance and lifecycle; this single pass does not establish universal
  reliability.
- WF-008: implement only the complete-text presentation clarification and align the
  synthetic approval fixture's accepted spec. Rerun only the failed case under a
  separate $2 cap, retaining the initial failure. Complete when the unchanged grader
  and direct trace/draft inspection confirm the full text and qualifications are
  presented for pending approval. No other cases need repetition for this isolated
  guidance/fixture change.
- Eval inventory (174 cases), strict skill-directory validation and `git diff --check`
  passed after the correction. Earlier 706 workflow and 99 harness passes remain
  historical D001 evidence; they were not rerun for this guidance-only correction.

- Focused retry: `evals/results/full-2026-11-18T10-34-13-508Z/summary.json`,
  `implement-final-approval-evidence` only, unchanged grader, $2 cap. **Passed**;
  reported usage including grading **$0.25381863**. Direct comparison of the final
  response with the saved draft confirmed all three complete text blocks match,
  preserve attribution/uncertainty and leave approval pending. Reviewed copies
  are retained in the case's `reviewed-artifacts/` directory.
- Combined reported usage for the initial run and retry: **$1.12765711** (about
  **$1.13**). Initial result remains **2 passed / 1 failed**; focused retry is
  **1 passed / 0 failed**. Both runners report `repoUnchanged: true`. This establishes
  the selected scenario outcomes across two working-tree revisions, not a fresh
  all-case run on the final revision or a guarantee of future compliance.
- WF-008's local correction meets its selected completion criteria. No new
  production changes for WF-002/003/006 are selected from these results.
  WF-004/007 remain deferred. Changes remain uncommitted; release smoke and actual
  post-delivery-summary behavior were not exercised by this investigation.

### D003 — PR #114 follow-ups selected, 2026-11-18

The maintainer agreed to the prioritized recommendation and requested the fixes
on PR #114, with testing especially for WF-009. This authorizes the narrow
WF-009/010/013/014 fixes, investigation of WF-007/011 and continued deferral of
WF-012. Earlier source observations and D001/D002 results remain historical;
this section records current implementation and validation separately.

- **WF-009 — Implemented.** Accept both saved journal filename forms at the
  preliminary check. Exact run ID/ticket/start binding, containment, symlink
  rejection and explicit consent remain required. The new regression first
  reproduced the prefixed-run failure while the legacy case passed. Both cases
  now pass init, consent, CLI status/resume, idempotent init, prepare/begin/receipt,
  duplicate suppression, dashboard permission refresh and revocation. Negative
  checks reject default-sourced consent, cross-run/ticket identity changes,
  malformed/outside pointers and journal symlinks. All 39 publication tests pass.
  These are disposable local journal tests; no live Jira write was performed.
- **WF-010 — Implemented.** A read-only helper recognizes explicit different-ticket
  branch names; matching, generic, base and detached branches retain their existing
  paths. Guided/Autonomous ask once on mismatch; unresolved Autopilot mismatches
  stop without branch mutation. Workspace previews include mismatches in their
  existing combined approval. Explicit prior branch choices and saved Resume
  checks are preserved. Dirty-repository CLI testing confirms HEAD, index, branch,
  staged/unstaged edits and untracked notes are unchanged by detection. New branch
  creation is explicitly distinguished from restarting from the base branch.
- **WF-013 — Implemented.** Document the unprefixed handoff directory and
  layout-dependent JSON filename with exact examples. Both documented layouts
  validate through the real handoff CLI on the first attempt (21 handoff tests pass).
- **WF-014 — Implemented.** Surface above-Low residual consequences, mitigation,
  unchanged ratings and verification limits inside the existing Guided Plan
  approval. Approve accepts the disclosed risks; Redo permits alternatives.
  Acceptance recommendations require evidence. No new question, choice ID,
  risk arithmetic, approval hash, controller route or Autonomous/Autopilot gate.
- **WF-007 — Investigated; no sanitizer change.** A deterministic reproduction
  confirms all seven reported public compounds still trigger the project-term
  check. Retain this characterization and existing privacy rejection tests.
  A safe allowlist remedy remains unselected; reproduction alone is not privacy
  verification of a proposed exception.
- **WF-011 — Investigated; no new gate.** The focused synthetic
  coordinator hand-back case with an empty-list test substituted for a nonempty
  beyond-final-period boundary passed under existing reconciliation guidance.
  The coordinator identified the vacuous coverage and withheld Execute. No new
  production instruction for WF-011 is selected from this single isolated probe.
- **WF-012 — Deferred.** Keep review reopening and cycle limits unchanged.

Validation: the full deterministic workflow suite passed **711 tests**, with
zero failures/skips. After adding two handoff naming cases, the focused handoff
suite passed **21 tests** (the full suite was not repeated for those additions).
All **99 eval-harness tests** and **5 packaging/publication tests** passed. Strict
plugin, skills and marketplace validation and `git diff --check` passed; the
pre-existing missing-icon warning remains. Inventory validates **178 cases**.
Four new fixtures seed successfully. The branch case exercises actual startup; the two risk presentations
and compromise hand-back are isolated guidance probes, not complete end-to-end
runs. Live evaluation initially stopped at sandbox sign-in detection (no model
started). Existing sign-in was confirmed outside the sandbox, but automatic
approval review rejected the external evaluation call pending explicit egress
consent. The maintainer subsequently explicitly authorized that external run
with a $4 total cap; its results follow. Existing PR smoke evidence is historical
and was not rerun for these development edits.


### D003 authenticated behavioral results, 2026-11-18

- Authorized focused run: `evals/results/full-2026-11-18T12-27-15-853Z/summary.json`,
  client 2.1.311, tested commit `ffa5a1d7c45cf1ec0223eae8124e5044d5cfe0e8`.
  **4/4 passed, zero failures; reported usage including grading $0.64131344**
  (about $0.64 against the $4 cap). `selectionComplete: true`,
  `repoUnchanged: true`. This is the selected four-case run, not the full inventory.
- **WF-010 startup:** identified OLD-42 versus APP-12, presented continue/new-branch/
  stop choices before initialization or refinement, and explained the current-HEAD
  versus base-branch distinction. Direct tool-trace inspection found only read-only
  inventory and branch-check commands; no branch or local-file mutations.
  The judge's aside about a skipped autonomy question is not a supported defect:
  this fixture's prompt explicitly preselects Guided and live refinement.
- **WF-014 approval presentation:** the Medium case disclosed the unchanged residual
  rating, remaining consequence, stop rule and pending boundary verification.
  Approval remained pending through existing Approve/Redo/Stop choices. The Low
  case added no above-Low warning or separate acceptance question.
- **WF-011 hand-back investigation:** identified that `findPeriod([], 20)` does not
  cover a date after the final configured period in a nonempty list; withheld
  TESTS_PREPARED/Execute and proposed correcting preparation against the accepted
  scope. It also flagged the simplified report's missing structured evidence and
  unresolved period-end semantics. This probe does not establish behavior through
  a complete, structurally valid numbered-preparation pipeline; no new gate or
  instruction is selected from it.
- All four grader results and assistant responses were inspected directly. Reviewed
  response copies are retained in each case's `reviewed-artifacts/` directory.
  These are single synthetic scenarios, with the previously documented distinction
  between real startup and isolated guidance probes. They do not prove universal
  adherence or live tracker behavior. No case retry, additional smoke run or
  production-code change was needed after this run.
- GitHub CI validation passed on `ffa5a1d` (run `44303052674`). This evidence-only
  ledger update does not change the tested helpers, instructions or fixtures.


### D004 — Keep WF-007 in PR #114, 2026-11-18

After the recommendation to handle WF-007 separately, the maintainer requested
all selected work in the same PR. This selects the narrow sanitizer remedy for
PR #114. D001/D003's earlier deferral and reproduction-only decisions above remain
historical. WF-011's successful investigation remains in this PR without a new
gate; WF-004/012 remain deferred as previously recommended.

- **Implementation:** extend the existing exact public-vocabulary set with
  `pending-input`, `approval-time`, `cycle-3`, `future-dated`, `full-suite`,
  `fix-round` and `workflow-event`. Retain the compound-copy heuristic and all
  other share-safe checks. No prefix, substring, numbered wildcard or general
  hyphenated-word exception is introduced; unlisted terms still need paraphrasing.
- **Regression evidence:** replace the prior reproduction characterization with
  successful real writer/save checks for all seven terms and uppercase rendering.
  The success checks failed before the allowlist change and pass after it. Both
  saved reports contain the accepted wording without paraphrasing.
- **Privacy boundaries:** private compounds containing allowed words, representative
  proprietary terms, an audit-derived synthetic credential compound, private paths,
  a credential-bearing URL, an email and the current ticket ID remain rejected.
  Each rejected write preserves both previously saved reports. A separate check
  rejects the current ticket ID even when it equals an allowlisted term. These
  checks preserve existing safeguards; they do not establish a general secret
  detector or automatic anonymization of arbitrary prose.
- **Validation:** all 32 feedback-writer tests pass. Strict plugin, skills and
  marketplace validation, the 178-case eval inventory and diff checks pass;
  the existing missing-icon warning remains. The full deterministic workflow
  suite passed **715 tests**, including all **39 publication tests** for WF-009;
  **104 eval-harness/packaging tests** passed. All had zero failures/skips.
  No additional model run or repeated PR smoke was needed for this deterministic
  vocabulary change; the earlier four behavioral results retain their source
  commit and documented limits.
- **Compatibility/rollback:** no schema, saved-state, routing or feedback lifecycle
  change. Revert only the seven vocabulary literals and corresponding regression
  assertions to restore the previous behavior. Fix risk remains Medium because
  the exception changes a privacy-related heuristic.


### D005 — Narrow follow-up batch and same-source investigation, 2026-11-19

The maintainer replied **OK** to the proposed next implementation batch: truthful
branch-start previews and executable helper examples, alongside reproductions for
scope leakage, gate stalls and planning-hook timing. The maintainer then supplied
the full session archive. Its main transcript SHA-256 exactly matches S005 (2,898
lines); this is supplemental inspection of **session D**, not a fifth session.
No delivery, branch-start semantic change, broader scope redesign or hook bypass
is selected. Existing unrelated maintainer edits are preserved.
Supplemental coverage: targeted records 185–218, 648–700, 775–785, 925–978,
2105–2120 and baseline output 297; canonical main tool-result text inventoried
across the file by size, not semantically reviewed in full. Attachment kinds and
serialized sizes were inspected only to avoid treating them as token attribution.
The child transcript bodies and separate tool-result files were not reviewed in
this follow-up. No customer checkout was inspected or modified.

- **WF-022(a) — Implemented; deterministic validation passed.** New workspace selections bind
  the actual resulting branch-start SHA and ahead/behind counts against the local
  base into the existing plan hash. Creation is explicitly described as starting
  at current HEAD; an unequal start/base SHA is disclosed inside the existing
  approval. Available `origin/<base>` tracking refs also show local-base
  ahead/behind counts, with no fetch and no claim of current remote freshness.
  A changed/created/deleted tracking ref invalidates the displayed selection
  before approval/application. Existing create/switch/keep semantics, dirty work,
  explicit approval in all autonomy modes and legacy journal hashes are retained.
  Both preflight and proposed-scope dashboard views carry the disclosure.
  Disposable regression coverage includes a different-ticket feature branch,
  dirty tracked work, a stale local base, remote-ref drift, an existing branch
  target, missing tracking ref and a historical selection without new metadata.
  The primary new test failed on absent preview metadata before the helper fix.
  WF-022(b), changing the start to a remote base, remains investigation only.
- **WF-017 — Implemented; executable examples passed.** The regression contract now has
  a complete service-prerequisite argv example; Execute points directly to that
  contract and the existing complete per-repository gate example. Tests extract
  the exact fenced JSON and run it through the real regression/verification
  helpers, substituting only the absolute cwd placeholder. Shell-string service
  checks and omitted policy-required suite evidence remain rejected. The smoke
  command in the example is explicitly not product-test evidence.
- **WF-019 — Reproduced; remedy not yet selected.** Current
  `implementation-guard.mjs` deliberately excludes `.claude`, `docs` and Markdown
  paths from its application-edit baseline. `preexistingUntracked` reuses this
  baseline, so unchanged notes/skills in those categories cannot be listed even
  though delivery snapshots include them. A disposable Git reproduction retains
  unchanged nested skills, a docs file, a root note and a tracked modification in
  the review target after the existing exclusion helper removes only the ordinary
  nested untracked helper. No customer files or original commands were executed.
  S005's saved baseline output at 297 has four entries in the changed repo and
  none in the other, with no Markdown or `.claude` entries; the question at 2109
  explicitly calls those categories outside the helper's list. This supports a
  specific baseline-coverage mismatch, not proof of the provenance of every
  omitted historical path. Do not broaden the application guard just to collect
  review exclusions. Next design: separate review provenance from application
  edit enforcement; preserve legitimate run-created documentation/context and
  require explicit reconciliation of ambiguous tracked changes. Affected Code
  is a warning signal, not an automatic exclusion allowlist. WF-020 subset/hash
  redesign is not implemented by this batch.
- **WF-021 — Buffering reproduced; narrow guidance implemented.** A real CLI
  child prints output repeatedly but the parent emits no result until the timeout;
  retained `output_tail` then contains that output and the run fails as timed out.
  A healthy quiet command passes. Thus the empty redirected files at S005 1661
  do not establish a no-output child; process sleep state/low CPU does not alone
  prove a deadlock either. Existing timeouts remain unchanged. Guidance now
  distinguishes duration evidence from timeout bounds, discloses unknown timing,
  and preserves actual results across reporting failures. No new heartbeat,
  automatic idle kill, retry policy or reduced gate scope is implemented.
- **WF-015 — Snapshot dependency reproduced; historical timing remains uncertain.**
  A real hook test denies an activity absent from persisted chat, then accepts
  the same call after one timestamped announcement is persisted, without a Stop
  event or duplicated announcement. The existing startup flush loop exits once
  startup is announced; it does not retry planning-activity visibility. This is a
  reproducible mechanism, not proof of the client's write timing. S005 also
  contains distinct compliant denials: a combined/piped checkpoint (648–663),
  discovery reads before a typed discovery checkpoint (676–688), and a draft edit
  while validation was current (963–965). Literal narration immediately before
  a rejected standalone activity is visible at 691–693 and 932–934. Preserve the
  guards; do not count all interventions as a single timing defect. No hook
  production change is selected from the reproduction alone.
- **WF-025 — Initial contributor inventory completed; no context change.** Scan
  only canonical main-session assistant/user messages; match tool results to tool
  calls, exclude diagnostic request replays and deduplicate identical result IDs
  and contents. Visible result text totals **1,054,997 characters**: plugin Read
  results **571,569**, Bash results **307,626**, project/artifact Read results
  **140,401**, delegate hand-backs **15,470**, other tools **19,931**. Largest
  plugin reads include Execute (64,851 chars; 1193), Plan (47,664; 621), refinement
  (44,555; 312), startup (43,085; 49) and controller (33,123; 52). No repeated Read
  path was found in these canonical result records; apparent repeats in diagnostic
  replays must not justify deduplication changes. Child executions, attachments,
  system/tool definitions, thinking and client rendering are outside this result
  inventory; serialized attachment size is not prompt-token attribution. These
  character counts do not explain all reported 851k input/cache tokens or prove
  any read unnecessary. Prioritize stage-reference loading and Bash output for a
  fuller measurement before trimming delegate reports or weakening context gates.

Validation: the full deterministic workflow command passed **722 tests**, with
zero failures/skips; all **102 eval-harness tests** passed. Strict plugin, skills
and marketplace validation passed (the pre-existing missing-icon warning remains).
The inventory validates **181 cases**, including the maintainer's separate
follow-up-eval edits present in this tree. `git diff --check` passed. The branch
preview and hook cases exercise real helpers/hooks in disposable Git fixtures;
no model run has established whether approval narration follows the new guidance
in a live customer session. The seven added deterministic tests cover the two
preview/compatibility cases, two executable documentation examples, and the three
scope/buffering/hook reproductions. Earlier exploratory hook-fixture setup failed
before correcting its required mode/risk metadata; the corrected reproduction
and final full suite passed. No historical failed run is reclassified as passing.

Rollback is limited to the preview metadata/validation/rendering, call-site and
contract clarifications, and their new tests. Reverting preview metadata must not
rewrite or automatically approve an already saved selection. No live tracker,
customer test, paid model evaluation, commit, push or PR operation was performed.


### D006 — Independent review baseline selected and implemented, 2026-11-19

The maintainer replied **OK** to the explained first implementation slice: capture
independent review provenance for new runs and correctly identify unchanged
pre-existing untracked notes, docs and skills using the existing exclusion flow.
This selects that bounded WF-019 fix; automatic exclusion of tracked/mixed work,
inherited-commit removal and delivery-subset redesign remain outside this slice.
The implementation guard and its baseline/filtering are unchanged.

- **Capture and identity:** new initialization saves `review_baseline_version: 1`
  and a separate `review_baseline` in local state, bound to ticket/start time.
  The record inventories Git-visible changed tracked and untracked paths,
  including Markdown, `docs` and `.claude`, with hashes, file/link type and
  executable-mode bits. Each repo records capture time, HEAD and branch.
  Ignored paths and `make-it-work/` are excluded. File contents are not stored;
  symlinks are hashed by link text without following their targets.
- **Lifecycle:** resume and ordinary transitions retain the capture. Approved
  scope updates capture newly selected roots only; retained/reselected roots
  keep their first evidence. Removed roots remain historical records but are
  not visited by exclusion queries. Legacy runs are not backfilled.
- **Conservative eligibility:** a file is offered for the existing exclusion
  decision only if it was untracked at capture, is still untracked, and its
  type, hash and executable mode still match. Tracked changes and staged
  removals with untracked on-disk counterparts cannot qualify. Modified starting
  files and first-seen docs stay in review; matching bytes do not establish
  authorship. A symlink replaced with a regular file does not qualify even if
  its bytes/mode match the old link. The independent application-edit guard
  continues to permit its existing planning/context paths.
- **Existing scope flow preserved:** Guided/Autonomous keep the existing combined
  decision; Autopilot retains its existing policy. Approved exclusions still use
  the marked local `.git/info/exclude` block. No user file is deleted, restored,
  staged or committed. An invalid mixed subset is now rejected before writing
  any exclude block, rather than failing after partially applying its valid
  paths. No new review cycle, approval type or package/delivery filtering route
  is introduced.
- **Compatibility:** absence of both new fields retains the historical
  implementation-baseline fallback and its documented coverage limits. A
  malformed, unsupported or cross-run new record fails validation instead of
  silently downgrading. New queries reject missing selected-root evidence.
  Existing package hashes and older state contracts are not rewritten.
- **Verification:** new tests exercise independent capture, no raw contents,
  ignored/artifact omissions, staged/unstaged work, executable modes, symlinks,
  staged-removal overlap, identity/shape rejection and legacy absence. An actual
  initialize/pause/resume test preserves provenance and the application guard's
  behavior. The workspace expansion test preserves the retained root and captures
  pre-existing docs when the second root joins. An end-to-end disposable Git
  test excludes unchanged local skills, a sensitive dotfile and a literal
  wildcard/Unicode note; keeps changed and newly created docs; records synthetic review
  evidence through the real helper, builds the final package and prepares the delivery plan; and asserts
  the same path set and bound delivery hash throughout. All excluded user files
  remain on disk. Preparation uses a synthetic remote configuration and makes
  no network calls; actual delivery is not run.

Validation history: the first broad run reported **726 passed / 3 failed**.
During that run the implementation was tightened to retain/check file type;
already-running workers had loaded the prior capture format while their CLI
subprocesses loaded the newer reader. All three failures reported invalid review
baseline file evidence. That mixed-revision run is retained as failed. A separate
focused run on the final format passed **18 baseline/review tests**, including
symlink-to-file conversion and end-to-end delivery preparation. The full suite
was then repeated with implementation/test files frozen: **729 passed, zero
failures/skips**, including the original three failed cases. Checksums confirm
the baseline implementation and affected test sources remained unchanged through
the repeat. No validator was relaxed or grader changed to resolve the mismatch.
The failed run remains historical, not a pass. All **102 eval-harness tests**
passed during development; strict plugin/skills/marketplace validation and the
**181-case** inventory passed. The pre-existing missing-icon warning remains.
`git diff --check` passed. These are deterministic helper, hook and disposable
repository checks, not a paid model evaluation or proof of universal live agent
adherence. No customer repository, tracker or remote service was accessed by the
fix tests; no maintainer commit, push or PR operation was performed.

After the broad pass, a final capture edge case was added: an index-only tracked
edit whose working-tree bytes already match HEAD. Capture now unions cached and
working-tree changed paths, preserving that tracked provenance. The final
baseline/review run passed **19 tests**, zero failures/skips, including the new
case and end-to-end package/delivery preparation. The 729-test broad result
predates this narrow capture refinement; the full suite was not repeated for it.

The selected first slice is complete. Tracked/mixed work and inherited branch
commits still require explicit reconciliation; missing historical provenance is
not reconstructed. Fix risk remains
**Medium**: startup state and review exclusion eligibility change, though
implementation enforcement, approvals and delivery mechanics are preserved.
Rollback must remove the new capture/reader wiring and tests together, and
reconcile any new saved runs explicitly; it must not silently relabel their
provenance or rewrite approved packages. Existing unrelated edits are preserved.


### D007 — Gate observability selected and implemented, 2026-11-19

The maintainer replied **OK** to WF-021 as the next priority: expose measured
progress, retain completed results/available timeout output, keep timeouts tied
to evidence, and add no automatic idle termination or retries. The approved
sequence also included focused review of the current baseline changes first.
That source/test review found no blocking issue within the selected first slice;
it was performed by the implementing agent, not an independent reviewer or a
full repository audit. Earlier D005/D006 validation remains historical.

- **Progress:** the regression CLI emits JSONL `regression-progress` events on
  stderr at start, every 30 seconds while active, and finish. Events identify
  repository, cwd, suite/prerequisite stage and service where relevant. They
  include elapsed time, timeout bound, received-output bytes and last-output
  timestamp/idle duration. No output yet is represented by null, not a stall.
  Timing uses a monotonic clock for durations and wall timestamps for display.
  Command labels are capped at 500 characters with explicit truncation; raw
  child output is not copied into progress. Complete argv stays in final results.
  Stdout remains one final JSON result or the requested text report.
- **Execution and evidence:** suite/prerequisite commands keep their actual exit
  semantics. New per-command diagnostics retain timing, configured bound,
  byte counts, truncation and the existing 16,000-character output tail. Timeout
  reports explicitly label execution incomplete; earlier completed suite results
  remain in the aggregate. Failed service checks retain their own diagnostics
  under the not-run prerequisite without becoming failed attempted suites.
  All effective timeout bounds are checked before any command starts; equivalent
  scoped requests with differing bounds are no longer silently merged.
- **Reporting failures:** short synchronous library observers are optional;
  ordinary library calls remain silent. Exceptions/async observers are reported
  separately from actual test outcomes, with observed results retained on
  `error.regressionResult`. CLI stderr writes are buffered to avoid blocking
  execution timers; a closed progress pipe produces nonzero exit while retaining
  stdout evidence. Progress failures do not cancel/rerun commands or change their
  pass/fail. Existing audit/render recovery continues to retain actual results
  and blocks dependent work until repaired; no duplicate Result is added.
- **Bounds and behavior preserved:** default suite timeout remains 300,000 ms,
  maximum 3,600,000 ms; service checks retain 10,000 ms. Heartbeats stop on command
  close. An optional progress interval (10–60,000 ms) supports disposable probes;
  normal use remains 30,000 ms. No idle-kill policy, polling loop, automatic retry,
  weaker gate, new approval, workflow route or persistent result journal is added.
  A parent process killed before return still cannot provide a final aggregate.
- **Guidance and compatibility:** runner/skill instructions distinguish progress
  stderr from final stdout, unknown duration from an estimate, and last-output
  age from process health. Capture both streams and use completion notifications
  rather than repeated polling. Older timeout results render an incomplete
  message without requiring new timing fields. The result schema remains version
  1 with additive diagnostics; saved verification/package formats are unchanged.
- **Focused evidence:** five new initial scenarios failed before implementation.
  The final focused run passed **19 tests** (10 progress cases plus 9 existing
  runner cases), covering healthy quiet/noisy commands, heartbeat cleanup,
  measured timeout and retained earlier results, observer/start/finish/async
  failure, closed stderr pipe, prerequisite and launch diagnostics, preflight
  timeout validation, bounded labels/output, legacy rendering and timeout-aware
  merging. Both existing audit/recovery cases also passed. Tests use disposable
  local commands and Git fixtures; no customer tests or external services ran.

Final validation: **740 deterministic workflow tests** and **102 eval-harness
tests** passed, with zero failures/skips. Strict plugin, skill-directory and
marketplace validation passed; the existing missing-icon warning remains.
The inventory validates **181 cases**, and `git diff --check` passed. Source
checksums confirm the runner and its focused tests were unchanged throughout
the broad run. That run also covers D006's final cached-index capture refinement,
which previously had focused-only follow-up evidence. No extra model run,
external evaluation or repeated smoke was performed. The selected WF-021
observability slice is complete; it does not establish the historical stall's
environmental cause or select an automatic idle-termination policy.
Fix risk remains **Medium** because execution observation/reporting paths change.
Rollback: revert progress/timing/timeout-preflight wiring, its new tests and
associated guidance together; preserve original observed results and the
unchanged workflow approval/state contracts. No commit, push or PR is authorized
or performed by this selection. Existing unrelated edits are preserved.


D007 follow-up — the maintainer questioned whether 30-second heartbeats were too
frequent and consumed tokens. They do not initiate model calls, but log text can
consume context when returned to the model. Default CLI/library heartbeats now
use **300,000 ms (five minutes)**, with start/finish events unchanged; shorter
intervals remain opt-in for diagnostics. The supported interval range is now
10–300,000 ms. The prior 30-second implementation and 740-test evidence above
remain historical. All **19 focused runner/progress tests** passed, with zero failures/skips, and
`git diff --check` passed. The full suite was not repeated for this bounded
configuration change; no gate timeout, result or retry policy changes.


### D008 — Bounded planning transcript flush selected and implemented, 2026-11-19

The maintainer replied **OK** to WF-015 as the next priority: briefly reread the
transcript for valid planning activity calls before denying missing narration,
while retaining exact matching, prerequisite enforcement and rejection of
non-chat evidence. No hook bypass, approval/state change or general retry policy
was selected. Source history and the C/D recurrence counts remain unchanged.

- **Narrow policy distinction:** the pure planning check now returns a reason
  plus `pendingChat`. Its existing reason-only interface remains available.
  A nonempty single-line activity, standalone helper invocation and valid
  optional boundary are checked before waiting for chat. Piped/combined calls,
  empty/invalid boundaries and missing activity text therefore report their
  actual defect without a transcript wait. Skipped discovery/drafting/validation
  prerequisites remain denied under the existing rules.
- **Bounded local wait:** only a PreToolUse Bash activity call in an active
  TDD Plan/fix-plan with `test_writing_version: 1` can wait for missing chat.
  The hook uses a one-second monotonic waiting budget and roughly 100 ms local
  rereads, then retains the existing denial/repair path. Transcript parsing and
  current state are refreshed on each retry, including phase-entry timestamps;
  the budget is not reset as the file changes. This is a local hook wait, not
  another model call, assistant message, tool invocation, activity checkpoint
  or workflow pause. A final filesystem read/parse can extend wall time beyond
  the waiting budget; no hard deadline on filesystem I/O is claimed.
- **Safeguards retained:** the unchanged matcher requires the actual literal
  main-session chat sentence and current-cycle timestamp where recorded.
  Tool results, thinking, fenced code, synthetic/meta/child streams and stale
  narration do not qualify. Chat alone does not record the activity or authorize
  the subsequent work: the original helper must still execute successfully.
  A changed planning cycle during the wait cannot reuse prior-cycle narration.
- **Compatibility and limits:** the startup announcement's existing 40-by-100 ms
  flush path and runtime confirmation remain intact. Other tools, stages and
  runs without the TDD test-writing marker do not acquire a planning wait.
  No saved schema, approval hash or controller route changes. If the client
  flushes only after the response ends, or persists later than this budget, the
  existing standalone-response repair may still be necessary. This fixes a
  reproduced visibility mechanism, not proof that all historical denials had
  that cause; genuine prerequisite/shell violations remain separate.
- **Focused evidence:** both initial scenarios failed before implementation:
  immediate same-call acceptance of delayed chat, and direct syntax-error
  reporting when chat is absent. Final focused checks passed **5 policy tests**
  and **4 targeted hook tests**. The hook probes cover Plan and fix-plan,
  partial-then-completed JSONL append, a single announcement without a Stop event
  or helper retry, unchanged state, still-required activity execution, finite
  missing-chat denial, fake/stale evidence, and a phase-entry change during the
  wait. They are disposable real-hook tests, not captured client-runtime timing
  or a paid behavioral evaluation. Existing broader hook tests run below.

Final validation: **744 deterministic workflow tests** and **102 eval-harness
tests** passed, with zero failures/skips. Strict plugin, skill-directory and
marketplace validation passed; the pre-existing missing-icon warning remains.
Inventory validates **181 cases** and `git diff --check` passed. Source checksums
confirm both planning-hook modules and their tests stayed unchanged through the
broad run; the regression runner's five-minute heartbeat default also remained
unchanged and is now covered by that full run. No paid model run or live customer
execution was performed. The selected bounded-wait slice is complete, with the
response-end-only/late-flush limitation retained above. Fix risk remains **Medium** because hook timing and denial ordering change. Rollback:
revert the typed planning-decision/wait wiring, its focused tests and activity
contract clarification together; leave literal matching, state contracts,
startup confirmation and all independent review/delivery safeguards intact.
No maintainer-checkout commit, push or PR was performed; unrelated edits are preserved.


### D009 — Reconcile remaining scope ambiguity before review, 2026-11-19

The maintainer replied **OK** to the remaining WF-019 slice: compare starting
review provenance, current full delivery scope and the approved plan; consolidate
unexpected paths before independent review; reuse actual explicit scope choices;
and preserve legitimate context maintenance. Tracked/mixed work and inherited
commits must not be silently filtered. WF-020 delivery-subset design remains
separate and unselected. Earlier source counts and D006 results are historical.

- **New-run contract:** fresh initialization adds `review_reconciliation_version:
  1`, requiring the original version-1 review baseline. New `review-scope.mjs
  inspect` is read-only; `prepare` returns `ready: false`, its consolidated report
  and no review target while scope is unresolved. Existing saved runs without
  the marker keep their current target/package behavior and are not backfilled.
- **Facts and relevance:** report entries distinguish starting tracked edits,
  mixed tracked work, unchanged/changed starting untracked files, unexpected
  paths, inherited starting commits and replacement of starting history. Literal
  per-repo Affected Code rows and recorded workflow context are relevance hints,
  not file-author attribution or blanket permission for older work in those
  files. Lightweight retains accepted hand-back path hints in controller-owned
  metadata bound to report/spec/plan version; it never needs an invented plan.
  Already-starting local work stays ambiguous even on a planned/context path.
- **Reuse and explicit resolution:** `reconcile` records listed item IDs against
  the current preview fingerprint, actual `source: user`, chat/question origin,
  reason and answer reference in a run-bound local decision journal. Policy
  defaults, invented IDs, stale previews and exclusion actions are rejected.
  Specific choices persist across review cycles when their facts remain the
  same; unrelated choices do not become permission for changed ambiguous work.
  Actual earlier user answers can be referenced without asking again. An explicit
  `revoke` appends a later choice; the latest decision wins, including over prior
  starting-point approval. It does not edit files, remove commits or grant
  delivery permission.
- **Inherited history:** the exact approved workspace start SHA and original base
  can resolve its original inherited commits. A generic carry-edits choice does
  not include local edits. Moving the base backwards does not implicitly accept
  newly exposed older commits. Changed/replaced history is surfaced, not rebased
  or reset. This is starting-history provenance, not proof of authorship of all
  post-start changes; existing checkout-change safeguards remain required.
- **Existing work stays intact:** the helper records inclusion/revocation only.
  Unchanged untracked exclusions still use the existing local exclude mechanism;
  its default now preserves active recorded inclusions. A later exclusion first
  revokes the earlier choice using that same actual user answer. Revoked scope
  is not revived merely by removing an exclude block. Tracked/mixed work or
  inherited commits needing separation require separately authorized checkout
  handling. No automatic stash, reset, rebase, deletion or staging subset is added.
- **Before review and packaging:** ready targets freeze file provenance and
  inclusion reasons in `scope_reconciliation`. Only the metadata summary, IDs
  and fingerprint are returned to the caller; opaque image/patch hashes remain
  local. Review writing and packaging recheck the current decisions and full
  target. Missing, revoked or stale evidence cannot certify a clean review.
  Final-sync drift still returns uncovered scope through its existing re-review
  route. Inclusion accepts delivery scope, not correctness, test evidence or a
  waiver of findings; reviewers still inspect the complete delivery diff.
- **Interaction:** context maintenance precedes the consolidated scope discussion,
  so new legitimate docs/test-map paths can be recognized. No extra question is
  needed for ordinary planned/context-only changes. Remaining ambiguity uses one
  existing scope discussion and current blocker/input routes; Autopilot cannot
  invent permission for ambiguous tracked work/history. No new controller phase,
  approval type or external-write authorization is introduced.
- **Focused evidence:** 24 scope/review tests passed, including 10 new reconciliation
  cases. They cover ordinary/context paths, planned-but-mixed files, stable choice
  reuse, changed facts, preview/identity/source checks, idempotence/revocation,
  exclusion preservation, inherited starting-point reuse, newly exposed older
  commits, replaced history, Lightweight relevance, legacy contracts, target
  freshness and existing re-review routing. Three actual guided/autonomous/
  multi-repo red-to-green integrations passed with an explicit synthetic user
  scope choice where the fixture contains pre-existing context. The fixture
  choice does not weaken production enforcement; negative cases verify blocking
  before any target is written. Synthetic review evidence tests exercise helper
  binding, not independent semantic review by a model.

Final validation: **754 deterministic workflow tests** and **102 eval-harness
tests** passed, with zero failures/skips. Strict plugin, skill-directory and
marketplace validation passed; the existing missing-icon warning remains.
The inventory validates **181 cases** and `git diff --check` passed. Source
checksums confirm reconciliation, scope preparation, controller/parser and the
integration fixture stayed unchanged through the broad run. The full run covers
both existing saved-contract behavior and the new-run readiness contract.
No paid model evaluation was performed: helper enforcement is exercised, while
live agent adherence to the consolidated questioning guidance remains unproven.
The selected remaining WF-019 reconciliation slice is complete; authorship
inference and automatic tracked/history separation are not claimed. Fix risk
remains **Medium**: startup metadata and review/package readiness gain scoped
checks and durable local decisions. Rollback must remove the marker/capture,
reconciliation/receipt wiring, targeted tests and guidance together, explicitly
reconciling any new saved runs rather than silently downgrading their contracts.
No live customer tests, tracker updates or hosting calls are part of this fix.
No maintainer-checkout commit, push or PR was performed. Unrelated edits remain.


### D010 — Keep new findings advisory and make consultation optional, 2026-11-19

The maintainer explicitly requested that the session's fixes avoid blocking the
user from moving forward, then approved consultation in non-Autopilot modes.
This supersedes the new hard gates described in D005–D009; those entries and
their test results remain historical. No new source/session or recurrence is
claimed.

- **Scope:** unresolved tracked/mixed work, unexpected paths and inherited history
  remain visible advisories. Full review targets are created without per-item
  inclusion receipts. Guided and Autonomous may consolidate material ambiguity
  into one optional consultation with Continue with the full scope / Adjust scope.
  The consultation is nonblocking and prior specific answers are reused while
  facts remain unchanged. Autopilot continues within existing authorization and
  discloses scope/provenance assumptions. Actual instruction conflicts and new
  operations still follow the existing authorization rules.
- **Metadata:** unavailable, malformed, unsupported or cross-run review provenance,
  plan hints and optional decision journals produce warnings and unknown
  provenance. They do not block normal state parsing/rendering, review or
  packaging. Initialization and scope-update capture failures retain a warning
  instead of failing the workflow. Original evidence is never reconstructed;
  unknown evidence cannot justify automatically excluding content.
- **Review:** available advisory context is frozen for the reviewer. Receipt-only
  changes do not invalidate an otherwise complete review, including when preparing
  again: identical scope and required context preserve the frozen target bytes.
  Actual delivery-diff
  changes, target tampering, incomplete coverage, correctness checks and existing
  final-operation approvals retain their checks. Full review does not infer
  authorship, waive findings or authorize delivery.
- **Choices:** optional recorded user inclusions remain reusable. Default untracked
  exclusion preserves them; a later explicit exclusion of a still-eligible
  unchanged untracked path can supersede inclusion in one command. No separate
  revoke step or second question is required. Tracked/history changes still need
  their existing authorization; no automatic stash/reset/rebase/deletion is added.
- **Progress:** observer failures and closed stderr pipes return warnings alongside
  the observed suite results, without causing a failing progress-only process
  exit, test retry or cancellation. Actual test failures/timeouts remain failures;
  existing audit-checkpoint recovery is unchanged. The five-minute heartbeat
  default is retained, with no new model call or polling loop.
- **Branch preview:** remote-tracking freshness remains visible; tracking-only
  drift warns and reuses approval when the actual local operation is unchanged.
  Current HEAD, worktree, local base, target branch and assessment checks remain.
- **Validation:** **758 deterministic workflow tests** passed with zero failures
  or skips. Strict plugin/skills/marketplace checks passed with only the existing
  missing-icon warning; inventory validates **181 eval cases**. Checksums confirm
  all **228 source/test modules** remained unchanged during the full workflow run.
  The final **102 eval-harness tests** also passed with zero failures/skips;
  `git diff --check` passed. Focused assertions cover optional
  consultation in Guided/Autonomous, Autopilot disclosure without receipts,
  unknown metadata, stable full review despite receipt changes, actual source
  drift rejection, direct exclusion, broken progress pipes and remote-only drift.
  Synthetic helper evidence does not establish live model adherence.

Fix risk remains **Medium**, because review/controller paths change. Rollback
must preserve the maintainer's advisory preference rather than reinstating the
superseded hard gates accidentally. No live customer tests, paid model runs,
external writes, maintainer-checkout commit, push or PR are part of this change.
Unrelated working-tree edits are preserved.


### D011 — Verification CLI completion and advisory reporting recovery, 2026-11-19

The maintainer approved investigating and fixing WF-023 after the recommendation
to preserve actual verification results, provide reporting-only recovery and add
no new routine blocker. This is local authorization for that selected slice;
no delivery, external writes or broader reporting-policy change is selected.

- **Reproduction:** an actual verification CLI child with a valid ledger, matching
  state and an existing final-approval dashboard exited **13** with the reported
  unsettled top-level await at `await checkpointResult` and no JSON result.
  The audit row had been written; dashboard refresh then dynamically imported
  `verification.mjs` while that same module's top-level command awaited refresh.
  Workspace dashboards use the same import path. This deterministically explains
  the reproduced failure and matches the historical signature; it does not prove
  the exact runtime state of the original customer checkout. No stale lock was
  needed and no timeout/retry policy is introduced.
- **Fix:** run the existing CLI through the shared asynchronous command wrapper,
  allowing module initialization to finish before audit/rendering can re-import
  its validators. Exported verification rules and successful `{ "valid": true }`
  output remain unchanged. No module-scope command await remains.
- **Reporting failures:** only after ledger validation and ticket/plan state
  binding succeed, an informational checkpoint failure returns `valid: true`
  with `checkpoint.status: "pending"`, its actual warning and the exact retained
  note/state for retry. It does not claim that the audit or dashboard succeeded,
  advance Progress, supply a handoff or grant approval. Invalid evidence, malformed
  state and mismatched ticket/plan bindings remain nonzero failures without
  successful output or audit mutation. Existing conflicts are never overwritten.
- **Guidance consistency:** the shared activity contract explicitly defers to
  the producing script and names verification's pending-report exception, so it
  does not reintroduce a blocker through a generic audit/render instruction.
- **Recovery:** `dashboard-checkpoint.mjs result --state STATE --input NOTE.json`
  reuses the existing typed informational-result writer. Save the returned
  `checkpoint.retry.input` unchanged and use its returned state path. Retrying
  writes/reuses that same note and refreshes an existing dashboard, without
  invoking the original verification command or tests. A dashboard may still
  validate available ledger data for display under its existing rules. A retained
  note records the original ledger hash, never proof that changed evidence is
  currently valid. Repair the actual reporting cause before retrying; no automatic
  loop, mandatory question or new gate is added.
- **Focused evidence:** all **13 verification tests** pass. The four additional
  cases exercise the real audited CLI with re-entrant dashboard loading,
  dashboard failure after audit persistence and idempotent reporting-only recovery,
  audit conflicts before persistence with conflict-preserving recovery, and
  invalid evidence/wrong ticket/wrong plan rejection. Normal output, ledger
  containment, manual policy and clause-evidence cases continue passing. A retry
  test removes the ledger after validation to demonstrate that the original
  verification command is not rerun; dashboard absence of evidence stays visible.
- **Final validation:** **762 workflow tests** and **102 eval-harness tests**
  passed with zero failures/skips. Strict plugin/skills/marketplace checks passed
  with only the existing missing-icon warning; inventory validates **181 eval
  cases**. Checksums confirm all **228 source/test modules** stayed unchanged
  through the broad run, and `git diff --check` passed. No live customer session
  or paid model evaluation is claimed.

Fix risk **Low–Medium**: CLI initialization and informational error reporting
change, while verification rules, state transitions and operation approvals are
retained. Rollback the CLI wrapper/reporting catch, result command, targeted
checks and recovery guidance together; do not treat reporting failure as an
actual test failure or erase retained evidence. All changes remain local and
uncommitted; unrelated working-tree edits are preserved.


### D012 — Separate evidence files by repository, task and worker, 2026-11-19

The maintainer selected the simpler approach of separate files per worker/repo
and approved retaining the ticket before the repository in the naming format.
This addresses WF-018 through dispatch/output-ownership guidance. The recorded
shared-file overwrite remains one historical incident; the original worker
prompts have not been inspected and their exact naming decision is unconfirmed.

- **Format:** marked runs use
  `miw-<TICKET>-<repo-id>-<task>-w<N>.md` for auxiliary worker evidence/reports,
  inside the existing central `make-it-work/<TICKET>/` directory. Examples:
  `miw-DEMO-api-docs-w1.md`, `miw-DEMO-web-test-map-w2.md`, and
  `miw-DEMO-api-docs-w3.md` for another backend worker. The number is a short
  parent-assigned label available before dispatch, not a native agent ID. Structured
  reports/raw logs retain their required extension with the same identity pattern.
  Legacy runs keep their saved unprefixed convention.
- **Ownership:** the parent passes each worker its exact absolute output path
  before launch. Fresh workers/attempts or occupied names get a fresh number
  automatically, preserving earlier evidence without a user question. Workers
  return their exact paths; the parent uses those paths in each repository's
  existing maintenance evidence list rather than reconstructing a generic name.
  Workers in the same repo/task also use distinct files. Each actual documentation
  or test-map file has one writer; other workers return separate contributions.
  The parent owns consolidation and existing workflow checkpoints. Canonical
  state, plan, stage-report, ledger and dashboard names/owners are unchanged.
- **Scope:** shared workspace storage is retained. No helper, allocator, lock,
  state marker, schema, approval, user question, extra worker or workflow gate is
  introduced. Existing maintenance already accepts multiple evidence paths per
  repo. Guidance is wired into the general stage contract, workspace path rules
  and bounded Review-preparation/Final-Sync maintenance procedure.
- **Disposable check:** three concurrent Node child processes wrote distinct
  assigned reports, including two with the same repo/task. All bytes were
  retained; the real `assessContextMaintenance`/`checkContextMaintenance` helpers
  accepted the exact paths and hashes (two reports for API, one for web). A fourth
  fresh-name attempt retained all prior files. Fixture writes used exclusive
  create to avoid destroying evidence during the check; no new production write
  enforcement is claimed. This demonstrates the naming/consumer compatibility,
  not live model adherence or a guarantee against an agent ignoring its prompt.
- **Validation:** strict plugin/skills/marketplace checks passed with only the
  existing missing-icon warning; inventory validates **181 eval cases**. The
  existing maintenance test and disposable concurrent-writer check passed, as did
  `git diff --check`. Checksums confirm all **228 JavaScript source/test modules**
  are unchanged from D011, whose **762 workflow / 102 eval-harness** results remain
  the broad code baseline. No broad or paid model run was repeated for this
  guidance-only change; live adherence is untested.

Fix risk **Low–Medium**: dispatch wording changes, with evidence ownership made
explicit; worker adherence remains to be observed. Rollback only this naming/
ownership guidance and its changelog/ledger entry. No historical report is
renamed, and no customer checkout, tracker or hosting service was changed.
All changes remain local and uncommitted; unrelated edits are preserved.


### D013 — One measured reduction in routine feedback-save output, 2026-11-19

The maintainer approved the bounded WF-025 measurement-and-trimming pass: find
large instruction/command outputs, choose one concrete reduction and preserve
required evidence. This completes that selected slice, not the entire context
pressure finding. No recurrence, source session or live token-saving claim is added.

- **Source:** the supplied archive's canonical main transcript still hashes to
  S005 `7e9a619f608cd4e7a3fa580dcc416a8c0665645c74351fb17eacc489152f5682`
  (2,898 records), the same historical session D. Targeted reads/call-result
  inspection and character-size profiling were performed in temporary local
  files; customer commands and code were not executed. Child transcripts,
  attachments, system/tool definitions and thinking were not attributed.
- **Current baseline:** Implement already uses per-phase guides and a fresh
  test-writing worker. Execute and Plan remain substantial mandatory reads
  (about 64.5k and 46.5k bytes currently); the historical largest plugin-read
  results were Execute, Plan, refinement, startup and controller guidance. These
  observations do not establish that required text is redundant. Large Bash
  results also include source/helper discovery and evidence that cannot safely
  be blanket-truncated. No mandatory instructions were removed.
- **Selected redundant output:** S005 line 2684 is a successful feedback-save
  receipt of **13,225 characters**. It repeats hook interventions, agent waits,
  combined hook analysis and source compounds already supplied before saving.
  Hook analysis itself repeats intervention details. The full saved reports and
  required post-save readback remain authoritative. Another large result at
  1158 is preparation evidence with 22 scenarios and their reasons; this slice
  deliberately retains that scenario-level disclosure in full.
- **Change:** `write-feedback.mjs write --compact` now returns a supported compact
  save receipt; this flag was previously limited to inspect. It omits only the
  four repeated arrays and supplies their explicit item counts. All other fields,
  including run/state bindings, outcome, source-packet evidence, warnings,
  collection notes, report paths and the full-report readback instruction, are
  retained. Generated write commands and the existing feedback guide select it.
  Default full CLI output and library returns remain compatible. Validation,
  source inspection, saved Markdown, privacy checks, lifecycle proof and complete
  parent readback are unchanged. Errors remain errors; no new question, gate,
  periodic check, schema marker or model call is introduced.
- **Measurement:** applying the actual compact receipt formatter to that retained
  historical response yields **1,427 characters**, a reduction of **11,798 / 89.2%**
  for this one response. Readback is identical. Omitted array item counts are
  10 interventions, 11 waits, 10 analysis items and 73 source compounds; these are
  item counts, not claims about unique incidents. This counterfactual character
  comparison is not measured token/billing savings, a replay of the full session,
  or an explanation of the reported 851k input/cache tokens. WF-025 remains open
  for broader attribution and comparable live-run context measurement.
- **Focused validation:** 45 feedback writer/handoff tests passed, including new
  compact-receipt reduction/binding/readback assertions and a CLI failure case
  proving missing diagnosis cannot become a successful save. Real CLI checks
  preserve default full output, saved report bytes, state bytes and combined
  readback pointers; generated compact commands run successfully. The frozen-source
  broad run passed **764 workflow tests** and **102 eval-harness tests**, with zero
  failures/skips. Strict plugin/skills/marketplace validation passed with only the
  existing missing-icon warning; inventory validates **181 eval cases** and
  `git diff --check` passed. All **228 source/test modules** remained unchanged
  during the broad run.

Maintainer follow-up during this pass: their discussion with the reported user
suggests several sessions were running concurrently on the same repo, and the
reported user suggested worktrees. This is reported concurrency context and a
causal hypothesis, not proof that most findings share that cause or a new session
count. Per-session worktree isolation is a promising separate next priority;
branch/worktree interference can be reduced, while WF-023's reproduced loading
cycle and WF-015's reproduced timing behavior have independent mechanisms.
A disposable current-code probe used two private session workspaces, each with
API/web linked worktrees. Stable repository IDs, workspace roots, separate
working files/indexes/branches and same-ticket artifact paths all passed; original
checkouts remained unchanged. This validates existing foundations, not automatic
setup, resume, delivery or cleanup. The recommended next design gives each fresh
session its own worktree(s) and private artifact root, with startup choice folded
into existing repository/branch selection and the normal resume path retained.
No live worktree orchestration change or checkout migration is part of D013.

Fix risk **Low–Medium**: a supported presentation mode and its generated command
change; retained evidence and finalization rules are preserved. Rollback the
formatter/flag support, generated command selection, focused tests and guidance
together. All changes remain local and uncommitted; unrelated edits are preserved.


### D014 — Optional private session workspaces and linked worktrees, 2026-11-19

The maintainer approved prioritizing session isolation after reporting that
several sessions ran on the same repo. Worktrees address checkout interference;
that report does not establish a common cause for every finding or another
source session. The maintainer also requested a concise handoff and compaction
once this item is finished. Existing local edits are preserved.

- **Startup choice:** fresh interactive runs offer Use isolated worktrees
  (recommended) / Continue here with the existing startup/branch selection.
  `--worktree` and `--continue-here` resolve that choice explicitly. Autopilot
  retains current checkout behavior unless isolation is explicitly selected,
  without a new checkout question. Actual isolated repository/branch actions
  retain existing exact user approval in every mode. Existing runs are not
  moved or silently opted in on Resume; Continue here retains existing paths.
- **Private layout:** `session-workspace.mjs allocate` creates unique durable
  preflight storage under `~/.make-it-work/sessions` (configurable with
  `--directory` outside Git working trees). It creates no branch/worktree/state.
  Worktrees go in `<session>/repos/<repo-id>`; artifacts go in the separate
  `<session>/make-it-work/<TICKET>`. This also supports a repo named make-it-work.
  Repeated allocations for the same ticket are distinct. Source-aware assessment
  writes its existing report to the bound private root instead of shared source
  artifacts. Unreadable discovery entries are warnings, not a claim of absence.
- **Selection/application:** the existing scope prepare/approve/run protocol
  supports private sessions, including one selected repository. The preview shows
  source/destination, source branch, actual immutable starting SHA and inherited
  history. Defaults use a unique session branch and the resolved base commit;
  `start_ref` can explicitly select another commit. No forced branch reset,
  stash, dirty-work copy or source branch switch is introduced. The source HEAD
  and dirty files are advisory for this operation; a detached source can still
  supply a valid base for a new named worktree. Current-checkout guards remain.
- **Concurrent and interrupted setup:** source checkout activity does not stale a
  pinned worktree operation. Two same-ticket sessions propose different default
  branch names. All selected targets are checked before the first Git mutation.
  Occupied destinations, redirected parents and stolen branches are preserved.
  Durable per-repo creation intent and partial progress permit exact retry,
  including an already-created clean worktree or a matching unoccupied branch
  left before checkout. Completed worktrees are not recreated, reset or removed.
- **Bound execution/resume:** new isolated runs save the normal workspace
  contract with target roots and Git common-directory bindings. Root resolution
  recognizes the session from inside its worktrees, or from an explicit saved
  root while invoked in the original source. Bounded session listing finds
  matching saved runs/preflights. Regression repository resolution follows the
  private repos directory. Initialization, normal controller events and packaging
  verify the target bindings; supplying original checkout roots or substituting
  another Git repository at the same target path cannot authorize work. Pause/
  Stop retain their existing recovery behavior. Original checkout activity is not
  accepted into a session baseline. Fixed artifact names remain safe across
  sessions; worker-specific filenames still isolate concurrent outputs within one.
- **Limits:** Git refs/configuration and external services remain shared. Ignored
  local setup and credentials are not copied; existing readiness rules apply.
  Worktrees/artifacts are retained after completion; no automatic deletion, merge,
  commit, push or PR is added. A partial operation reports actual progress and its
  saved journal. A setup failure retains the current-checkout option; explicit
  isolation requirements are not silently bypassed. Existing approval, actual
  correctness and scope-change rules are preserved.
- **Validation:** focused checks and a real isolated multi-repo red-to-green
  integration passed through preparation, regression, independent-review helper
  binding and exact final packaging. Synthetic review evidence verifies mechanics,
  not live semantic review by a model. The frozen-source broad run passed
  **775 workflow tests** and **102 eval-harness tests**, with zero failures/skips.
  Strict plugin/skills/marketplace validation passed with only the existing
  missing-icon warning; inventory validates **181 eval cases** and
  `git diff --check` passed. All **231 source/test modules** stayed unchanged
  throughout the full run. Logs: `/tmp/worktree-full.log` and
  `/tmp/worktree-harness.log`. No paid/live agent evaluation is claimed.

Fix risk **Medium**: approved Git creation, root discovery and checkout bindings
change. Rollback must preserve created worktrees, branches, private artifacts and
journals; do not delete them or silently reinterpret a saved isolated run. Older
runs keep their existing paths/contracts. No live maintainer/customer checkout
was switched or migrated, no paid model evaluation ran and no external writes
were made. Only disposable fixtures created Git worktrees/branches during tests.

Compaction handoff — item complete and verified: all session changes are
local and uncommitted. Read D010 for advisory/nonblocking policy, D011 for the
verification fix, D012 for worker filenames and D013 for the measured compact
feedback receipt. D014 is the current worktree item. The implementation guide is
`skills/implement/references/session-worktrees.md`; its two helper entrypoints
are `scripts/session-workspace.mjs` and the existing workspace-scope script.
Other undecided findings remain proposals; completing this item does not select
another change. Compact before starting the next item, as requested.

Final handoff: D014 is complete locally. Validation is 775 workflow tests,
102 eval-harness tests, strict validation and clean diff checks. The worktree
route is optional; Autopilot keeps current checkouts unless isolation is
explicitly selected, and existing exact workspace approval remains required.
Private layout is `<session>/repos/<repo-id>` plus
`<session>/make-it-work/<TICKET>`. Created worktrees/artifacts are retained.
No production/customer checkout or Git branch was migrated. All prior edits
remain uncommitted. No next item is authorized; compact before continuing.


### D015 — Bounded delivery-subset investigation, 2026-11-19

After compaction, the maintainer approved investigating WF-020's package,
branch-history and approval semantics before implementing a file selector.
This selects investigation only. D014 remains complete; no delivery behavior,
existing approval or customer checkout is changed by this entry. Worktrees reduce
checkout interference but do not remove intentional partial-delivery needs.

**Current contract, inspected:** `skills/deliver/SKILL.md` offers Deliver this
exact plan / Stop. `deliver.mjs prepare` copies each changed package repository's
entire path list into the delivery plan. Its `targetTree` starts with the saved
HEAD and stages those paths in a temporary index. The plan hash binds the package,
draft, repository identities, selected paths and target trees. Run verifies the
current full package before initial actions, checks the commit tree and hooks,
pushes the entire source branch and journals per-repo commit/push/PR progress.
Existing partial-operation recovery retains that exact plan.

`snapshotDeliveryRepo` in `scripts/lib/delivery-scope.mjs` inventories the final
working-tree diff against the base merge point, with renames represented as
delete/add and Git-visible untracked files included. It is not an inventory of
only new commit changes. `checkFinalPackage` reconstructs and compares the full
package, evidence and draft; filtering a delivery plan does not validate a newly
reduced tree or create test evidence for it.

**Disposable evidence:** `/tmp/wf020-investigation.mjs` imports the real snapshot
helper and exercises the existing HEAD-plus-selected-paths Git mechanics in a
new temporary repository. Results are in `/tmp/wf020-investigation.json`.
This probes a proposed selection mechanism; current delivery has no selector.

- The full package lists `app.mjs`, `notes.txt`, `util.mjs`; its existing test
  exits 0. Selecting only `app.mjs` into a temporary index produces a candidate
  whose same test exits 1: the omitted `util.mjs` provides its required export.
  Passing full-tree tests cannot be relabeled as passing candidate-tree tests.
- A prior branch commit edits `prior.txt`, then an uncommitted reversion restores
  its base content. The full package therefore has no `prior.txt` diff. Omitting
  that reversion leaves the inherited edit in the selected candidate: its actual
  branch-to-base paths are `app.mjs` and `prior.txt`. A candidate can expose a
  path absent even from the full package's net path list.
- A fixture commit and push to a local bare repository retain that earlier
  commit and its `prior.txt` content. Selecting new commit paths cannot remove
  reachable history. The original fixture HEAD, real index, status and unrelated
  notes stay unchanged. No network, customer commands or maintainer Git mutation
  was used. This is synthetic evidence of mechanisms, not another occurrence of
  the historical incident or a live delivery evaluation.

**Recommended implementation slice — proposed, not implemented:**

1. Preserve default full delivery. Add optional Adjust delivery scope, accepting
   explicit whole-file selections keyed to existing package repositories, for
   example a structured `--selection FILE` input to prepare. Repositories may be
   omitted. Start with whole files, not hunks or automated commit selection.
   Validate exact literal paths against the package and disclose any selection
   with no new commit changes; never silently substitute a broader selection.
2. Keep the completed final package immutable as source evidence. Derive a
   separate delivery candidate using the existing temporary-index approach.
   Bind package hash, selection, candidate trees, pinned comparison base,
   candidate branch diff and scope-accurate draft text into the new delivery
   hash. Retain prior decision references and actual operation journals. A changed
   selection needs the existing exact-plan approval for its new preview.
3. Show selected new-commit changes, omitted local changes, and the actual
   resulting branch-to-base diff separately, including inherited history and
   content outside the package's net diff. Explain that omitted committed work
   still publishes with that branch. If the user wants that history excluded,
   recommend a separate approved clean-branch/worktree operation; do not silently
   reset, rebase, cherry-pick or rewrite the current branch.
4. Preserve all existing review/test qualifications. Evidence continues to name
   the full source tree where that is what was reviewed/tested; reduced candidates
   get an explicit assurance limitation unless separately checked. A subset is
   not automatically behaviorally safe. When candidate review or tests are run,
   bind their evidence to its exact tree. Known correctness failures follow
   existing rules; do not add a universal rerun, a new approval round for advisory
   metadata, or a claim that user approval makes failures pass. In interactive
   modes, material uncertainty may use the existing optional Continue / Adjust
   consultation; explicit delivery approval still applies in every mode.
5. Keep source files and omitted changes in place. Retain existing access
   preflight, literal staging, exact tree/hook validation, remote checks and
   per-repo recovery. Scope can change before operations start; after any action,
   resume the saved plan rather than rewriting a partially executed journal.
   Commit-only and clean-history extraction remain separate possible features.

**Verification required if selected:** explicit subset retains omitted tracked
and untracked changes and the real index during preview; additions/deletions and
rename pairs are represented truthfully; inherited and reverted-history cases
show the actual candidate branch diff; dependency omission never inherits a
passing candidate-test claim; full and subset paths bind exact approval hashes;
stale/tampered candidates and hook changes are rejected under existing rules;
multi-repo omission and partial retry retain actual receipts without duplicate
commits/pushes/PRs; legacy full delivery keeps its existing contract.

**Investigation validation:** all **14 existing delivery tests** passed, with
zero failures/skips; log `/tmp/wf020-delivery-tests.log`. The disposable probe's
assertions passed and `git diff --check` passed. No production source or test
module was edited for this investigation; no broad or paid model run was added.

Fix risk remains **Medium–High**: scope selection changes the deliverable tree
and its assurance meaning, as well as approval/recovery binding. The recommended
next item is this optional candidate-plan implementation, not automatic branch
history surgery. No new gate, model call, production behavior or external write
is introduced by this investigation. Unrelated local changes are preserved.


### D016 — Optional selected-file delivery, 2026-11-19

The maintainer approved the D015 recommendation after its bounded investigation.
This authorizes local implementation and disposable validation, not delivery of
the maintainer's changes, external writes or paid model evaluations. No new
source session or historical recurrence is claimed. Existing unrelated edits,
including planning-visual work visible after compaction, remain preserved.

- **Choice and input:** delivery now offers Deliver this exact plan / Adjust
  delivery scope / Stop. A scope request prepares a candidate without granting
  commit/push/PR approval. `deliver.mjs prepare --selection FILE` accepts version
  1, explicit package repo names, exact whole-file paths and a complete
  scope-accurate draft. Repositories may be omitted. Unknown/duplicate paths or
  repositories and empty selections are rejected with correction guidance;
  committed-only selections cannot silently broaden scope to create a commit.
  Default preparation still uses the full package, and users can return to it.
- **Separate candidate:** the completed source package, its approval and source
  evidence remain unchanged. Temporary indexes derive selected target trees.
  Optional `selection_version: 1` data in the existing version-1 delivery plan
  binds the selection, pinned base/merge point, actual commit and branch diff
  hashes, inherited commit IDs, omitted work and new draft into the existing
  exact-plan approval hash. Full/legacy plans retain their existing shape and
  preview. Candidate branch diffs are saved next to the plan with its existing
  `miw-` or legacy prefix and verified on execution/retry.
- **Truthful preview:** selected paths, actual new-commit changes, retained local
  changes, omitted package paths/repositories, inherited branch paths/commits,
  resulting branch-to-base paths and paths outside the source package's net diff
  are presented separately. Guidance requires reading the exact linked candidate
  diffs before showing the full preview. Omitted committed history still publishes
  with the branch; excluding it requires a separate approved branch/worktree
  operation. No reset, rebase, cherry-pick or automatic history extraction is added.
- **Assurance:** the preview and generated PR text explicitly qualify source
  review/test evidence as applying to the full source package. A selected
  candidate is not claimed separately reviewed or tested. Existing review-depth,
  validation and browser qualifications are retained, including evidence about
  omitted source paths. Known correctness failures retain existing rules;
  missing candidate-specific evidence is advisory. No mandatory suite rerun,
  model call or additional advisory approval is introduced. Non-Autopilot modes
  may consult on material ambiguity with Continue / Adjust and reuse unchanged
  answers; Autopilot discloses assumptions. Explicit exact-plan delivery approval
  is still required in every mode.
- **Integrity and recovery:** source files and omitted work stay in place;
  preparation leaves the real index unchanged. Existing access preflight,
  literal staging, target-tree/hook validation, remote checks and per-repo
  receipts remain. Preparation, offer/decline and execution share the existing
  delivery lock, including failure reporting, so a scope change cannot replace
  a plan as it starts running. A pre-action failure can be corrected, prepared
  again or declined. Once repository actions have receipts, scope cannot replace
  that saved plan; an explicitly authorized retry resumes it without duplicate
  commits/pushes/PRs. Interrupted locks retain existing inspection/recovery rules.
- **Focused evidence:** actual CLI checks use temporary repos, local bare
  transports and a stub PR CLI. They cover retained tracked/untracked changes,
  source-package/approval/state preservation, old-hash rejection, full-delivery
  restoration, marked/legacy artifact paths, literal filenames, additions,
  deletions and rename pairs. The inherited-edit/reversion case exposes content
  outside the full source net diff and confirms it reaches the local remote.
  A dependency-omission candidate actually fails the same test that passes on
  the full tree, while its preview/PR retain the evidence limitation. Additional
  checks cover malformed/committed-only selection correction, concurrent-lock
  preservation, changed content, candidate-diff tampering, hook tree rewrites,
  omitted repos without remotes and multi-repo partial retry. These verify helper
  mechanics, not live model adherence or customer delivery behavior.

**Final validation:** **787 workflow tests** and **105 eval-harness tests** passed,
with zero failures/skips. Strict plugin, skills and marketplace validation passed
with only the existing missing-icon warning. Inventory validates **184 eval
cases**, including the unrelated planning additions already in the workspace.
All **291 JavaScript source/test/fixture inputs** across scripts, skills and evals
remained byte-identical throughout the broad run; `git diff --check` passed.
Logs: `/tmp/delivery-selection-full.log` and
`/tmp/delivery-selection-harness.log`; frozen hashes:
`/tmp/delivery-selection-source-hashes.json`. No paid/live model evaluation is
claimed. The focused marked-name case also passed; broad results include the
final marked/legacy and full-delivery-restoration coverage.

Scope limit: candidate branch-diff disclosure is added to the optional selected
route. Default full delivery keeps its existing path-staging behavior. D015's
HEAD-plus-paths mechanics also apply to that route when a local reversion hides
an inherited edit from the source package's net path list; this slice does not
claim to fix full-delivery tree equivalence or to remove any earlier commits.

Fix risk remains **Medium–High**, because selected trees, qualification wording
and approval/recovery bindings change. Rollback must retain source packages,
candidate plans/diffs and actual journals, and preserve support for already
started selected deliveries rather than silently treating them as full plans.
No maintainer/customer branch was committed, pushed or migrated. All changes
remain local and uncommitted; no subsequent item is selected by this entry.

Continuation handoff: D016 is complete locally. Selected delivery is optional;
the source package stays immutable, every regenerated plan still needs explicit
delivery approval, and full delivery remains available. The implementation is
`skills/implement/scripts/deliver.mjs` plus `delivery-selection.mjs`; conditional
guidance is `skills/deliver/references/selected-delivery.md`. Read D010 for the
advisory policy and the scope limit above before proposing further changes.
All prior fixes and unrelated edits are uncommitted. No commit, push, PR,
customer checkout change or next implementation item is authorized.


### D017 — Default full-delivery equivalence investigation, 2026-11-19

The maintainer approved a small reproduction-first investigation after asking
about value and implementation risk. This selects investigation only. The
concern previously recorded as D016's scope limit now has its own finding,
**WF-026**; WF-020's optional selection feature remains completed locally.

**Reproduction:** `/tmp/wf026-default-delivery-reproduce.mjs` reuses the existing
review-scope test fixture scaffolding, adding a base `setting.txt` with `false`.
An inherited fixture commit sets it to `true`, then the working tree restores
`false`. A separate code change ensures there is work to commit. Actual imported
review/controller/package functions and the actual default delivery CLI are used;
no production helper/validator is replaced and no `--selection` is supplied.
The structured review result is synthetic evidence of binding mechanics, not
an independent semantic judgment by a model.

- `controller_version: 1` and `review_scope_version: 1` are enabled. The probe
  prepares the full review target, writes matching structured evidence, applies
  the real review handoff and final sync, builds the package, then completes the
  run using the normal controller. Autonomy is Autonomous; no Guided-specific
  final-package approval behavior is claimed. The shared delivery checks and
  exact shown-plan hash are exercised.
- Review target, final-package paths and default delivery paths all contain only
  `src/code.js`. The working setting is `false`; the package check returns
  current and its review-scope status is covered. Delivery's proposed target
  tree contains `true` because the reversal is absent from that path list.
- Running the actual helper with the prepared hash commits, pushes to a **local
  bare Git repository**, consumes a stub `gh` PR response, returns
  `delivered: true` and saves a delivered journal. Inspecting the local remote's
  branch confirms `setting.txt` is `true`; the source checkout still contains
  `false` as an uncommitted reversal. The source-package file is unchanged.
  Preparation left the source HEAD, real index and status unchanged as expected.
- The case reproduced twice. These are repeated disposable executions of one
  scenario, not additional customer sessions or historical recurrence. On the
  second run, **293 JavaScript source/test/fixture inputs** were snapshotted before
  execution and remained byte-identical through result inspection. Current
  source hashes are in `/tmp/wf026-source-hashes.json`; stability result:
  `/tmp/wf026-source-stability.json`.
- Exact result and fixture root:
  `/tmp/wf026-default-delivery-result.json`; CLI log:
  `/tmp/wf026-default-delivery-reproduce.log`. The retained fixture contains the
  review target/evidence, package/diff, plan, progress journal and local remote
  for inspection. No network or live PR service was contacted. No maintainer or
  customer Git history/index/working files were changed.

**Cause confirmed:** the package/review path list answers "what differs from the
base in the final working result?" Delivery reuses it to answer "what must be
staged on top of HEAD?" Those lists differ when local work cancels an inherited
change. Package freshness still validates the first representation, and existing
commit-tree/hook checks still validate the second; neither checks their tree
equivalence. This is a full-delivery correctness issue distinct from the optional
selected-delivery limitation that deliberately permits omitted local changes.

**Recommended next slice, proposed only:** derive the intended full-delivery tree
from the pinned reviewed base and saved full-result diff; calculate the actual
HEAD-to-intended-tree changes for staging and show them, including reversals, in
the existing delivery preview. Bind that tree and actual commit scope into the
existing exact-plan approval. Preserve explicit exclusions, selected-delivery
semantics, historical package/plan compatibility and partial-operation receipts.
Do not blindly stage all local files, silently reinterpret an already started
plan, rewrite history, add a routine user question or mandate another test run.
Implementation risk remains **Medium–High**; correctness value is high while
frequency and customer impact remain unknown. Worktree isolation reduces one
source of inherited history but does not remove the need for faithful delivery.

**Validation and limits:** two existing control tests passed (normal default
delivery with idempotent resume, and selected delivery with inherited-content
disclosure/local push); log `/tmp/wf026-delivery-controls.log`. The reproduced
mismatch is asserted as the observed defect, not claimed as a passing correctness
test. No production or test source module was edited by this investigation.
Other workflow source edits are present since D016's broad run and were preserved;
its 787/105 results describe that earlier frozen snapshot, not blanket validation
of the current unrelated edits. No broad, paid or live model evaluation was
repeated. `git diff --check` passed after the ledger update.

Investigation complete; WF-026's implementation remains unselected. All prior
local changes remain uncommitted. No external delivery or next implementation
item is authorized by this entry.


### D018 — Narrow full-delivery tree fix, 2026-11-19

The maintainer explicitly selected the narrow fix after the D017 reproduction
and risk/value discussion: **newly prepared full-delivery plans only**, preserving
saved/partial plans and selected-file delivery. The scoped risk assessment is
**Medium**, with high correctness value and unknown incident frequency. This
authorizes local code/tests/docs, not delivery of maintainer changes or a new
customer-session count. Other ongoing local workflow edits are preserved.

- **Saved result, actual commit:** `delivery-full-tree.mjs` reconstructs the saved
  binary package diff on its pinned merge base using a disposable index. Git's
  patch parser checks interpreted paths against the package, supporting standard
  prefixes and `diff.noprefix`. Delete/add pairs for the same path may cancel in
  the final tree, so a packet path need not survive as a final base diff. These
  bounded interpretation attempts do not retry any actual delivery operation.
- **Scope binding:** a new `full_delivery_version: 1` marker lives in newly
  prepared full plans, leaving the package and existing plan version unchanged.
  Each repo's `full_result` binds the reconstructed tree, source-package paths,
  actual HEAD-to-result commit paths and required reversals outside that source
  list. Staging eligibility is the union of source paths and required commit
  paths. The existing preview/hash presents all of it under the same exact-plan
  approval. A zero-net-diff repo with a required reversal is no longer silently
  skipped; truly unchanged supporting repos still need no delivery.
- **Tree equivalence:** the candidate must match the reconstructed result in the
  delivery scope and retain HEAD's excluded workflow-artifact subtree. Explicitly
  excluded untracked files remain outside the candidate. Preparation changes
  neither the real index nor working files. Execution/retry verifies immutable
  package/diff hashes, repository identities, scope and candidate equivalence;
  existing actual index, commit-hook, remote and per-repo receipt checks remain.
  No blind whole-worktree staging, reset, rebase, force push, model call, routine
  question or mandatory test rerun is added.
- **Compatibility:** saved full plans without the marker keep their original
  preview, approved tree and retry behavior; they are not silently upgraded or
  invalidated. This deliberately preserves the old WF-026 exposure for those
  saved plans. An explicitly regenerated, unstarted plan gets the new result and
  needs approval of its fresh preview. Partially executed plans cannot be
  regenerated. Selected plans retain their own candidate/assurance contract.
- **Focused evidence:** **45 delivery/review-scope tests** passed. A permanent
  enforced-review/controller/package integration now publishes the restored
  source result and resumes without duplicate commits. Real helper tests on
  disposable local remotes cover binary changes, executable modes, inherited
  additions/deletions, restored literal paths, ignored local notes/secrets,
  standard/no-prefix patches and marked/legacy naming. Source package, approval
  and state bytes remain intact. Other cases cover zero-net-path reversals,
  exact old-plan behavior, legacy partial recovery and immutable saved-diff
  checks during a new full plan's multi-repo partial retry. Synthetic review/PR
  evidence establishes mechanics, not live model quality or hosted PR behavior.
  Focused log: `/tmp/wf026-focused.log`.

**Final validation:** **802 workflow tests** and **108 eval-harness tests** passed,
with zero failures/skips. Strict plugin, skills and marketplace validation passed
with only the existing missing-icon warning. Inventory validates **186 eval
cases**, including the other local workflow additions. All **296 JavaScript
source/test/fixture inputs** remained byte-identical throughout the broad run;
`git diff --check` passed. Logs: `/tmp/wf026-fix-full.log` and
`/tmp/wf026-fix-harness.log`; frozen hashes:
`/tmp/wf026-fix-source-hashes.json`. This validates the current combined snapshot,
including other authorized work since D016, rather than reusing its earlier
broad results. No paid/live model evaluation is claimed.

Rollback must preserve packages, new/legacy plan hashes, diffs and actual
journals; keep execution support for already started marked full plans rather
than reinterpreting them as legacy or selected plans. No maintainer/customer
checkout was committed, pushed or migrated; Git mutations and stub PR operations
were confined to disposable fixtures. All work remains local and uncommitted.

Continuation handoff: D018 is complete locally. WF-026 is fixed for newly
prepared full plans; the permanent integration publishes the intended reversal.
Saved old full plans retain their exact behavior, so an unstarted one needs
explicit preparation and approval of a fresh preview to adopt the fix. Never
regenerate a partial plan. Selected delivery is unchanged. Implementation:
`skills/implement/scripts/delivery-full-tree.mjs` and `deliver.mjs`; regression
coverage is in `deliver.test.mjs` and `review-scope.test.mjs`. No subsequent
implementation item, maintainer commit, push or PR is selected/authorized.


### D019 — WF-016 planning-gap investigation, 2026-11-19

The maintainer approved a bounded investigation of what was knowable before the
repeated corrections in session C. This authorizes evidence gathering and a
recommendation only. No planning/runtime behavior, authorization gate, production
code or test module is changed. Existing local planning and other workflow edits
remain preserved.

**Source identification:** the later supplied November 19 ZIP contains session
D, so it was not substituted for C. A retained extracted main transcript was
found under the earlier review's temporary scratchpad. It has **3,581 records**,
SHA-256 `044f74905e4f2f63295221a7480667a3c5505a109dc82a3d661b0b318d868a98`,
and all ten checked WF-016 locators (1581, 1711, 1746, 1867, 2200, 2240, 2550,
2746, 3071, 3331) match their recorded events. This identifies the retained C
transcript by content/locators; R004's original archive SHA was not reverified.
The final pre-approval plan was recovered from the actual Write input at 1386
(57,293 characters; earlier draft at 1335). No new session or recurrence is added.
Customer commands/code were not executed. Targeted main-session records and its
visible hand-backs were read; the 27 child transcripts and original customer
repositories remain unassessed.

**Episode findings:**

- **Test support, 1581:** the API helper is already in Step 9's Files and Affected
  Code, and its intended edits are explicit in What to do. It is absent from
  Tests, which the authorizer actually consults. This is inconsistent declaration
  across fields, not an undiscovered dependency. A second authorization issue
  was a not-yet-created test directory, resolved by creating the directory. At
  1590/1613/1618 the coordinator kept helpers private inside the already authorized
  test file; no plan amendment was needed for this episode.
- **Result propagation, 1711–1867:** Step 4 describes a blocked execution result
  and a changed call signature; Step 5 consumes that result. The existing handler
  returns a context object (signature at 1720), and the context fields shown at
  1727 contain no execution field. The plan's context references are parameter
  types, with no declared storage/propagation edit. This exposes a contract gap
  between planned producer and consumer. A complete contract trace could have
  caught it; whether the planner inspected the missing field before approval is
  not established by the main transcript.
- **Integration caller, 2191–2240:** an existing integration test still calls the
  old two-argument handler after Step 4 adds a parameter. It first appears by name
  in the inspected main evidence at 2191; user permission is recorded at 2231.
  An all-callers search is a plausible earlier detection route. No inspected
  pre-approval record proves that this exact caller had already been discovered,
  so its precise historical preventability is less certain than the UI case.
- **UI wiring, 2550–2746:** refinement hand-back 486/489 and planning hand-back
  1089/1096 already identify the two production callers. Step 12 nevertheless
  lists only the button helper, dialog, container and bulk-action component; it
  sends an option through the container while the actual per-item callers own
  opening the dialog. The shared type file is known globally but absent from
  that step. Worker hand-back 2546 reports the discarded callback argument and
  missing prop, and warns that prepared helper/dialog tests bypass the callers
  with casts. The recovered plan independently confirms separate helper/modal
  test coverage and missing caller files; actual prepared test source was not
  inspected. This is strong evidence of missed known integration work, rather
  than a newly requested feature.
- **Repository coverage, 3071–3331:** Step 2 explicitly adds two query methods,
  while its Tests line names a service test with mocked repositories. The gate
  later reports the repository-method coverage validator, followed by Step 13's
  integration tests. The method/owning-layer mismatch is visible in the plan.
  The exact project validator was read at 3117; no inspected pre-approval record
  establishes earlier awareness of that validator. Crucially, the existing
  planning skill loaded at 974/981 already requires each new method to be reached
  through a named test with its owning layer unstubbed.

**Current helper check:** a read-only call to the real plan parser and declaration
predicates confirms the Step 9 helper is in Files but not declared for test
authorization. Its `src/test-api/.../AppClient.java` path also fails the default
dedicated-test filename heuristic. A registered-map fallback may qualify it;
the original map was not assessed. Consequently, merely adding it to Tests is
not a demonstrated complete fix. Do not fabricate a test-map identity, weaken
production protection or promise arbitrary shared helper edits. Resolve the
actual permitted destination during planning, using an existing test file for
private helpers when suitable. No customer checkout was used for this check.
Local results: `/tmp/wf016-analysis.json`; retained copies/index:
`/tmp/wf016-session-c.jsonl`, `/tmp/wf016-original-plan.md`,
`/tmp/wf016-symbol-index.json` and `/tmp/wf016-source-search.json`. These temporary
source copies contain customer material and are not repository artifacts.

**Recommendation, proposed only:** use the existing self-review to reconcile
each changed input/output/signature/prop with its immediate production and test
callers, then reconcile those exact edits with the relevant step's Files and
Tests. Resolve test-support placement against the existing authorization contract
before approval. Add a short, concrete self-review reminder/example for these
cross-field and caller-wiring gaps; reuse the current owner-layer reachability
rule rather than adding another copy or a new gate. A future focused planner
evaluation should check whether it actually catches the omitted caller and
support destination; no live model adherence improvement is claimed here.

Expected incremental value **Medium** (fewer avoidable corrections), with **Low**
risk for that guidance-only slice. Broadening helper authorization or relaxing
scope/amendment rules would be a separate, unassessed change. Existing stopping
and user-approval safeguards worked when omissions surfaced; preserve them.
No blanket symbol/file equality validator, mandatory new question, automatic
scope expansion or runtime blocker is recommended. Genuine later discovery
continues through existing amendment rules.

Investigation complete. No production/test source changed, no broad or paid
model run was needed, and `git diff --check` passed. This records mixed causes
and a bounded next proposal; the guidance change itself is not selected. All
prior local work remains uncommitted, with no external write or delivery.


### D020 — WF-016 bounded planning self-review clarification, 2026-11-19

The maintainer approved the D019 guidance-only recommendation. Using the
skill-creator guidance for a narrow update, two existing Step 5.5 self-review
items in `skills/plan-the-work/SKILL.md` were clarified; no stage or checklist
item was added. Existing planning-visual and other local edits remain preserved.

- **Names and contracts:** reconcile method/type/field names across steps and
  trace changed signatures, results and props through immediate production/test
  callers. Put required caller, callback-forwarding and type/context edits in
  the relevant step's Files. The dialog-option example explains why a direct
  component test alone cannot establish that the real caller forwards its input.
- **Test-support placement:** under Implement, reconcile Files/Tests with the
  linked existing pre-edit eligibility rules before approval. Merely listing a
  path does not prove it is eligible. Private helpers in an already permitted
  test file remain an option when suitable; no fabricated map identity, broader
  file authorization or early test edit is authorized.
- **Boundaries:** existing owner-layer reachability, authorization, scope-change
  and amendment rules remain. Genuine later discovery still follows them. No
  new parser/helper/schema, runtime gate, receipt, mandatory question, invocation
  or model call was added. The checklist remains at eight items, with one
  conditional link to the existing authorization contract. The plan template
  and integration guide did not need another copy of the same instructions.
- **Validation:** `claude plugin validate skills --strict` passed. The existing
  checklist count/order and local authorization link were checked, and
  `git diff --check` passed. The generic skill-creator `quick_validate.py` could
  not run because checked Python interpreters lack PyYAML; no environment/package
  installation was made. Skill frontmatter is unchanged and the plugin's own
  strict skill validator is the completed platform check. All **296 JavaScript
  inputs** still match D018's frozen hashes, so no code suite was repeated for
  this prose-only change; D018's **802 workflow / 108 eval-harness** tests remain
  the code baseline. No paid/live planner evaluation or improved adherence is
  claimed. A future real run can show whether these reminders reduce corrections.

Fix risk **Low**; expected incremental value **Medium**. Roll back only these two
self-review clarifications and their changelog/ledger entry, preserving prior
guidance and unrelated edits. This selected slice is complete locally. All work
remains uncommitted; no external write, commit, push, PR or subsequent fix is
authorized. The remaining WF-025 attribution question benefits from observing a
fresh real session before proposing further context reductions.


### D021 — Fresh interactive startup omitted the worktree offer, 2026-11-19

A maintainer-reported live session started a fresh local Implement request with
no checkout flag and selected Guided mode. Its branch menu offered a new branch,
proceeding on main, or Stop, then switched branches and initialized in the source
checkout. It never offered isolated worktrees or Continue here. The user approved
a branch action without being shown the required isolation choice. The sanitized
evidence comes from transcript lines 5 (invocation), 97 (Guided answer), 100–102
(branch menu/answer), and 105–107 (source checkout switch and initialization).
No raw transcript or customer project content is copied into this repository.

The loaded skill came from the current local plugin, and the startup read
included the new worktree routing paragraph. No read of session-worktrees.md
occurred. This rules out an older installed skill as the explanation for this
observation; the linked policy and later branch-only menu were an instruction
integration weakness. This does not establish that the worktree helpers fail.

The maintainer approved the narrow startup correction. The entrypoint now states
the interactive checkout offer; Start names both choices directly before the
current-checkout guard, describes the actual branch action, and routes isolation
through the existing private-session preview approval. Explicit checkout choices
are reused. Autopilot defaults and saved Resume roots are preserved. An already
approved exact branch action is not asked again; custom branches and unresolved
ticket mismatches keep their existing handling. No new hook, state field,
runtime blocker, approval stage or automatic migration is added.

A new focused behavioral eval reproduces the unanswered fresh Guided startup
choice; source bytes must remain unchanged. Five existing downstream startup
probes now explicitly select Continue here. The new case stays outside smoke
and critical. Strict skills validation, inventory (187 cases / 16 smoke skills),
108 eval-harness tests and diff whitespace checks pass. Generic skill-creator
quick validation remains unavailable because PyYAML is absent; the plugin's
strict skills validation is the completed platform check. Focused live evidence
is recorded separately after the committed candidate is exercised.

D021 live validation: three scoped startup cases passed on `c4e171e`; direct
review then exposed an early-precheck ordering gap outside the original offer
rubric. A one-clause entrypoint clarification and strengthened grader passed
the focused offer rerun on `3153300`, including successful precheck before the
question. Combined reported usage **$1.09039211**. Both reports are complete for
their selected cases with an unchanged source checkout. Exact report paths,
per-commit scope and limitations are recorded in `evals/AUDIT.md` under the
PR #115 interactive worktree-offer follow-up. Runtime build/integrity and strict
exported-skills validation also passed on `3153300`. The fix is guidance only;
it improves the observed startup choice without claiming guaranteed model
adherence or a complete new worktree lifecycle test.


### D022 — Worktree checkout recommendation reversed, 2026-11-19

A fresh reported Guided run did offer both checkout routes, but placed Continue
here first and marked it Recommended. The loaded startup text already named
isolation as recommended (sanitized transcript line 40); the actual question
reversed it at line 115. The screenshot shows a local .gitignore edit. This is
a recommendation failure, not a stale-install explanation or worktree-helper
failure. The reason for the model's reversal is not established.

The entrypoint and startup menu now explicitly put isolated worktrees first as
the only recommended checkout option. The current-checkout guard's recommended
branch action applies only after choosing Continue here. Base-branch status
and local edits do not reverse the checkout recommendation. Existing explicit
choices, Autopilot defaults, Resume roots and approvals retain their behavior;
no runtime gate or new question was added.

The focused fixture now contains a tracked, uncommitted .gitignore edit and
checks exact preservation of that edit as well as source bytes. On `44f31be`,
the strengthened live case passed with the correct option order/recommendation
and early precheck before the pending question. Strict skills validation and
187-case inventory passed. A deliberately wrong recommendation was rejected
by the semantic grader (FAIL/FAIL). Full report paths, control limitations and
reported usage are retained in evals/AUDIT.md. This is observed focused
adherence, not a guarantee that every future model run follows the guidance.


### D023 — Name checkout actions and offer optional worktree branch naming, 2026-11-19

The maintainer approved replacing the ambiguous Continue here label: on main it
could sound like staying on main rather than creating a feature branch. The
startup option now names its actual action, Create branch in current checkout,
with the suggested name and starting commit. A suitable feature branch uses
Use current branch: <branch>. Isolation remains first and uniquely recommended;
existing mismatch/base guards and --continue-here behavior are preserved.

Both routes expose optional custom naming without a mandatory name-entry step.
The existing worktree creation approval shows the actual suggested name, source,
starting ref/commit and destination, and offers Create worktree and branch, Use a
different branch name, or Back. Naming changes reuse the same private session,
set the existing target_branch selection and prepare a refreshed preview/hash
for approval before creation. Back leaves preflight storage without creating
branches or worktrees. Existing exact approval and no-force/no-reset rules stay.
No new runtime code, state schema, gate or approval stage is introduced.

The existing offer eval now rejects a bare Continue here label on base and
requires the optional naming path. A new extended/full-only preview case chooses
isolation, prepares an actual preview and leaves approval unanswered, checking
the suggested name and change-name action without branch/worktree creation.
Strict skills validation, 188-case inventory (16 smoke skills), diff whitespace
and focused selection dry-run pass. Live evidence follows the committed probe.

D023 validation: report
`evals/results/full-2026-11-19T17-19-49-588Z/summary.json` on
`b7a1fef74a032a85005a8f9aebab440c54cbb4f0` passed both selected live cases,
reported usage **$0.68108172**, with complete selection and unchanged source.
The offer used the explicit branch-creation label and optional naming note; the
actual prepared worktree preview showed its suggested branch and rename/back
actions without approval or creation. All 21 existing session-workspace and
workspace-scope helper tests passed. Runtime build, integrity and strict exported
skills validation passed on the same source. Actual rename input, Back execution
and native terminal UI interaction were not exercised by these unanswered-choice
cases; no guarantee of future model adherence is claimed. Detailed evidence is
retained in evals/AUDIT.md.


### D024 — Worktree approval dialog displayed raw wide Markdown, 2026-11-19

A reported native question screenshot showed the correct create/rename/back
choices, but its question body contained a Markdown link with a long local path
and a wide repository table. The raw syntax, wrapping and long source/destination
paths obscured the branch decision. Functional choices matched D023; this was
a presentation failure. The screenshot's local-base lag and uncopied .gitignore
edit were useful disclosures that should remain visible before approval.

Full creation details and the clickable preview link now go in ordinary
assistant chat before the question. Compact labeled fields per repo replace
the wide table; long paths have their own lines. The dialog asks a short plain
confirmation with the actual branch and starting ref/short SHA, referring to
that preview. The same create/rename/back choices and exact preview hash bind
the approval. No additional acknowledgment, approval, fetch/reset, branch-name
change, workflow state field or runtime gate is added. Both the shared workspace
guide and private-worktree guide describe the same chat/dialog presentation.

The existing preview grader now rejects raw tables, Markdown links, hashes and
long paths in a dialog question, and requires chat details before asking. It
also accepts an explicitly separate compact chat confirmation when a headless
harness cannot collect native replies; that fallback does not certify terminal
rendering. Strict skills validation, 188-case inventory and whitespace checks
pass. Focused live evidence follows the committed candidate.

D024 focused evidence: report
`evals/results/full-2026-11-19T17-33-59-278Z/summary.json`, source
`027f10fa65802c235c7aedd084737e236a5c868e`, passed the strengthened preview
case, reported usage **$0.42478654**, complete selection and unchanged source.
Direct inspection confirmed a real prepared plan, chat field lists with paths
on separate lines, linked HTML, preserved source/starting-point disclosures,
and a separate compact confirmation with the same create/rename/back choices.
No AskUserQuestion call occurred: the model used the allowed headless chat
fallback. This supports generated presentation compliance only; it does not
certify the native terminal question widget. Source and .gitignore exact-byte
checks passed; creation stayed unapproved and unexecuted. No runtime/helper code
changed, so existing source-qualified helper results are retained. Details are
recorded in evals/AUDIT.md.


### D025 — Repo/workspace-local worktree defaults, 2026-11-19

The maintainer approved moving fresh single-repo worktrees to the repository's
.claude/worktrees/<session> and grouping multi-repo sessions under the already
resolved workspace's .claude/worktrees/<session>/repos/<repo-id>. This replaces
the surprising home-directory default for fresh sessions only. Single-repo
preflight/reports live separately under .claude/miw-sessions/<session>, so approval
can be prepared without occupying the checkout path. Multi-repo reports remain
beside repos in the private session root. No common ancestor is guessed.

Version-1 marker/container bindings and explicit external --directory overrides
are preserved. Default discovery includes the new local parent and the legacy
~/.make-it-work/sessions parent; custom saved parents remain available explicitly.
A version-2 marker binds the single-repo sibling paths. Resume, scope and repo
lookup follow those saved targets even though private artifacts now sit inside
the source Git checkout. Recorded repository identities may differ from folder
names; both inventory IDs and recorded IDs resolve only the bound checkout.

Exact new session paths are locally excluded through Git metadata, preserving
the source .gitignore, tracked/untracked changes, branch and index. Private
artifact writes reuse that exclusion rather than rewriting source ignore files.
Conflicting explicit unignore rules return an actionable error/custom-location
option; no automatic fallback, cleanup, reset or migration is authorized.
Symlinked managed parents, occupied targets and identity drift retain their
existing rejection/recovery behavior. Optional current checkout, Autopilot
defaults and exact creation approval are unchanged.

New integration coverage exercises both defaults, custom naming/hash revisions,
source preservation, concurrent local exclusions, source-vs-target lookup,
recorded IDs unlike folder names, saved-root/subdirectory resume, legacy discovery
and an explicit workspace nested under another Git checkout. The broad 807-test
workflow run passed before the final recorded-ID lookup correction; its new
regression first reproduced Repository not found, then passed with the bounded
lookup fix. The final affected routing/regression/workflow-integration selection
passed 53 tests. Eval harness and packaging tests passed 113 tests after fixing
a missing disposable-fixture guard caught by initial inventory/catalog checks.
Strict skills validation, whitespace and the 189-case inventory pass. No paid
smoke was repeated; the existing preview case now tests the single-repo default
and a new extended/full case checks the multi-repo default. Live results follow
the committed candidate.

D025 live evidence: the multi-repo preview passed on `b604a61`, proposing the
workspace-local session with api/main and web/develop worktrees and excluding
unrelated. The initial single-repo allocation was denied by Claude Code's auto
mode classifier before execution. Its prompt prohibited any checkout change,
which conflicted with the requested repo-local bookkeeping. The denial itself
reported Destructive or Unwanted Actions; the prompt conflict is the diagnosed
authorization issue, not proof of the classifier's internal reasoning.

`a894ea3` clarifies the test's permission for new private directories and exact
local exclusions while preserving existing files, index, HEAD, branch and
creation approval. Guidance now states those side effects accurately and honors
an explicit user prohibition rather than promising zero metadata writes. No
permission mode, tool allowlist, grader or creation approval was relaxed. The
single-repo retry passed with actual local paths and only scoped bookkeeping.
Both previews remain unanswered; no model-run branch/worktree creation occurred.
Initial report: `evals/results/full-2026-11-19T18-07-59-299Z/summary.json`
(**$0.86788070**, 1/2 passed); single-case retry:
`evals/results/full-2026-11-19T18-10-58-497Z/summary.json`
(**$0.49496416**, 1/1 passed). Combined **$1.36284486**, complete selected reports,
unchanged source checkout. The passing multi-repo case was not repeated. Runtime
from `b604a61` built, integrity-verified and clean-installed (16 skills / 201
files). The retry commit changes only prompt/guidance. Detailed source and scope
qualifications are retained in evals/AUDIT.md.


### D026 — Per-repository worktrees with workspace-level shared state, 2026-11-19

The maintainer approved following Claude Code's per-repo location convention
for fresh multi-repo sessions. Selected checkouts now use
<workspace>/<repo>/.claude/worktrees/<session>; shared preflight/state/reports
use <workspace>/.claude/miw-sessions/<session>/make-it-work/<TICKET>. Single-repo
version-2 layout and explicit external containers retain their behavior.
Version-1 workspace-grouped and home sessions remain discoverable at saved paths.

A version-3 session marker binds repo-local targets to the explicit workspace.
Discovery inside a worktree checks only known layout locations and requires a
matching saved target; it does not widen fresh-run scope from an assumed parent.
Conflicting matching bindings require an explicit saved root. Allocation touches
only shared storage. Preparing a selected preview creates parents/exclusions
only in selected repos, preserving existing source contents, .gitignore, index
and branches. Occupied targets are rejected before exclusions could hide them.
No migration, cleanup, reset or new routine approval is introduced.

End-to-end testing reproduced Duplicate delivery repo name because both local
checkout folders use the same session name. Fresh version-3 plans/contracts now
opt into repo-ID snapshot names for review and final packaging. Older contracts
retain basename naming and existing approval hashes. A second integration check
found an older assertion for a dashboard Full suite label removed by the other
session's UI simplification; it now verifies actual passing package/per-repo
verification evidence instead. The isolated red/green workflow then completed
through regression, review and final packaging with api/web names.

Validation: 76 affected routing/review/package helper tests passed; the full
isolated red/green integration passed after those corrections; eval-harness and
packaging/publication checks passed 113 tests. An initial new test report fixture
missed its required Assessment Evidence heading; the fixture was corrected and
the helper selection passed. Strict skills validation, whitespace and the
189-case inventory pass. The existing multi-repo live case now checks per-repo
paths, shared state, selected-only bookkeeping and unchanged sources; focused
live evidence follows the committed candidate. Earlier passing evidence retains
its original source/scope qualifications; no full smoke was repeated.

D026 live/runtime evidence: report
`evals/results/full-2026-11-19T21-08-03-530Z/summary.json`, source
`ce2b3e8d1e400236d1fb020abacc107ac3be1ef0`, passed the changed multi-repo
preview case, reported usage **$0.57108957**, selectionComplete/repoUnchanged
true. Direct inspection confirmed api/web repo-local paths, one shared workspace
.claude/miw-sessions root, actual pending approval and no creation. All three
source byte checks passed; api remained on main, web on develop, unrelated on
main, all with clean working trees. Unrelated had no private worktree directory.
The model used headless chat confirmation, not a native terminal widget.

The committed runtime built, integrity-verified, passed strict exported plugin/
skills checks and clean-installed 16 skills / 201 files as 5.16.0. Source is the
same ce2b3e8 candidate as the live preview. Full details, initial failures and
testing limits are retained in evals/AUDIT.md. No existing live user session was
relocated. The single-repo artifact-location proposal discussed earlier remains
a separate lifecycle change; this approved slice changes multi-repo defaults.

### D027 — Readable testing-readiness audit results, 2026-11-19

The maintainer's live dashboard showed a readiness completion as internal
serialization: repeated ticket paths, a JSON receipt, raw baseline tokens and
duplicate plan/plan columns. The useful result was difficult to scan.

The dashboard now presents a baseline summary and View readiness report link.
Only all-passing automated baselines receive Testing readiness passed. Failed
and unrun baselines stay visible as limitations; manual verification explicitly
states that no automated baseline ran. Multi-repo results have one item per repo.
Expandable Technical details retains the original record, paths and digest,
with a JSON receipt link. Unchanged audit phases occupy one combined cell;
actual transitions keep both endpoints. Existing document previews handle the
report link. Historical versioned reports retain their own links.

This is presentation only: readiness receipts, state/audit bytes, hashes,
completion checks, approvals and retry behavior are unchanged. Recognized
receipt/report paths must match the ticket and same plan version; unknown or
unsafe historical entries remain escaped text rather than guessed summaries.

Validation: 102 renderer, readiness, document-preview and epic-dashboard tests
passed, including preserved state bytes, legacy/prefixed filenames, historical
versions, mixed baseline results, escaping and unsafe-link fallback. A synthetic
dashboard was inspected in Chrome: collapsed summary, expanded original evidence
and report-reader navigation worked. A preview fixture initially retained its
plugin-version placeholder; replacing it with 5.16.0 allowed rendering. No live
user files were changed and no model evaluation or complete smoke was repeated.

### D028 — Compact Execute timeline progress, 2026-11-19

The maintainer's live screenshot repeated Execute as a skill name and combined
execution mode, running-step position and verified completion counts beneath one
timeline dot. The approved display is Execute / Step 1 of 3 / In Progress.

The duplicate (execute) label is removed. Active Execute shows its actual saved
step position, or multiple positions for parallel dispatch. Execution mode and
verified completion counts remain in a tooltip. Without an active running step,
the label retains completion-only progress rather than inferring the next step.
The current-activity panel, plan, execution report and execution checks retain
their existing detail and behavior.

Validation: 113 render-status, plan-status and step-control tests passed (zero
failures/skips), including real dispatch, completion, parallel batches, failure
and resume checks. Existing integration assertions now also verify compact
visible text and detailed tooltips. A synthetic active-step dashboard was
visually checked in Chrome. No paid eval or full smoke was repeated. The other
session's committed badge-label change (9911aa3) is preserved.

### D029 — Repository locations without a generic Details column, 2026-11-19

The maintainer approved reducing the repository table to repository, working
branch and base. Each repository now has a collapsed Worktree location disclosure
(Checkout location for current-checkout runs), with wrapping for long paths.
Selection rationale remains in saved assessment/approval records; the approved
table no longer repeats it. Proposed changes, branch-mismatch warnings and
selection history are unchanged. No state or approval contract changes.

All 97 existing workspace-scope, render-status and epic-dashboard tests passed,
zero failures/skips. Chrome inspection confirmed three-column tables and
collapsed location controls for both checkout modes in a synthetic preview.
Expanded layout was not manually certified; user browser activity interrupted
that check. No paid eval or full smoke was repeated. Unrelated edits from the
other session were left outside this change.

### D030 — Acceptance details in artifacts and audit links, 2026-11-19

The maintainer approved replacing the standalone acceptance-detail table with
a compact notice: Acceptance checks: 3 of 5 verified · 2 pending, followed by
View verification report. A new Acceptance checks artifact opens the readable
report through the existing document reader. Recognized verification audit
results link the same report; original audit records remain unchanged.

The per-plan `<TICKET>-acceptance-v<N>.md` report (prefixed with miw- for new
naming) presents every saved criterion/clause/scenario, status and evidence note,
and links the original verification JSON. It is derived after existing ledger
validation at final approval/completion and rewritten only when content changes.
Missing evidence remains Not recorded; unverified scenarios stay pending and a
criterion counts as verified only when all its scenarios are verified. Gates,
ledger bytes, final-package contents, approved hashes and legacy eligibility
are unchanged. No checks are rerun to produce this report.

Validation: 111 acceptance-summary, renderer, verification and final-package
tests passed, zero failures/skips; 20 artifact/preview checks passed. The first
selection had one stale assertion expecting clause text in the main HTML;
it now checks the derived report and retains pending-clause validation. Final
checks verify report-reader links, escaped evidence, unchanged ledger bytes,
current package identity and idempotent audit retries. A synthetic 3-of-5 preview
was generated locally; this follow-up has no new native browser certification,
model eval or full smoke rerun. The other session's 4fad415 changes are preserved.

### D031 — CI assertions lagged dashboard changes, 2026-11-20

GitHub Actions run 44623667682 at c822341 passed 818 of 820 helper tests. Two
integration assertions still expected presentation removed by earlier dashboard
changes: context-only verification prose in the repository table and the old
Autonomy badge label. The latest focused acceptance/report selection did not
include either file, so its passing result did not establish full helper-suite
coverage. The separate GitHub Actions Node-20 deprecation warning was not the
test failure. No action-runtime upgrade was included in this repair.

Both cases reproduced locally. The impact test now verifies the persisted
context-only classification and absence of required checks for that repo;
the queued-autonomy test expects Control: Autonomous while retaining its queue,
replay and phase-boundary assertions. No runtime behavior or checks were removed.
The focused pair passed, then the exact CI helper command passed all 820 tests
with zero failures/skips. Eval-harness/package checks passed 113 tests; strict
manifest, skills, marketplace and the 189-case inventory checks passed too.
No paid eval or full smoke was repeated. Local logs are retained under
`/tmp/pr115-ci-*`; hosted validation follows the repair commit.


### D032 — Execution respects user and harness model selection, 2026-11-24

The maintainer replied **OK** to the execution-focused source change after the
model-policy audit: remove plan-wide model selection in Execute, update its
dispatch guide, and remove planning's automatic-tier claim. This is a separate
implementation request following the earlier review-only work. No model policy
change for review, test-preparation, assessment or feedback dispatch is selected.

Execute now omits the subagent model argument unless the user or harness
explicitly directs an override. It does not force inherit, derive a model from
risk/complexity, or revive a historical executor-tier recommendation. Inline
execution keeps its current model. The dispatch reference uses that one rule,
including corrective work. Planning no longer prints or computes an executor
model tier; its risk assessment and next-step handoff remain.

The existing execution smoke case now checks actual worker calls for absent
model overrides, permitting native harness-selected models. The planning case's
obsolete tier-string grader now checks the useful final summary and handoff
semantically. No paid case or smoke run was launched; these grader updates are
coverage preparation, not demonstrated live model adherence.

Risk **Medium**: generated dispatch arguments change, with no runtime helper,
saved schema, approval, state transition or gate change. A byte comparison
confirms Execute's Phase 1 onward and all dispatch mechanics following the
model-selection bullet are unchanged. Existing step isolation, verification,
retry limits, manual-policy handling and operation approvals remain. Rollback
would revert this isolated guidance/eval change together; it must not silently
restore model interference against the maintainer's current preference.

Validation: the full deterministic workflow command passed **820 tests**, zero
failures/skips. The initial eval-harness/packaging run passed **112 of 113**;
its grader-parser check caught missing `focus: trace` on the updated semantic
graders. Both definitions were corrected, and the focused check parsing every
headless grader then passed (1 test, zero failures/skips). The other 112 passing
checks were not repeated. The 189-case inventory, strict skills, plugin and
marketplace validation and whitespace checks pass; the pre-existing missing-icon
warning remains. The skill-creator Python validator could not start because
PyYAML is unavailable; platform strict validation is the completed skill check.
No paid model evaluation, live execution-skill run or post-install behavior is
claimed. The source correction is complete locally; live model adherence remains
unverified. Existing unrelated ledger content is preserved.
Earlier review text, decisions and plans are retained. No commit, push, PR,
customer checkout, account configuration or installed plugin was changed.


D032 delivery follow-up: the maintainer separately requested commit, push and a
PR, then a version bump. The patch release is 5.17.1, dated 2026-11-24. The
manifest validates and all 14 artifact-observability tests pass after the bump.
The prior release branch was already merged; delivery uses a fresh branch from
current main. The PR stays draft pending its required smoke and hosted checks;
no merge or runtime publication is authorized by these requests.


D032 readiness follow-up, 2026-11-24: after the maintainer said Proceed, the
source-only PR commit `a3bffd34852c46925f9ea6d9fb2afcba73e3204d` ran its initial
complete smoke inventory in a clean isolated checkout, plugin 5.17.1 and client
2.1.323. All **16/16 cases passed**, no retries; reported usage including grading
**$5.36998095** against a $12 cap. selectionComplete and repoUnchanged are true.
Direct trace inspection confirms the execution-worker call omitted the model
argument; both the new model-choice grader and revised planning summary passed.
Report retained locally at
`evals/results/smoke-2026-11-24T09-55-29-350Z/summary.json`, with the cumulative
PR smoke ledger in Git metadata. Hosted validation passed. This is a bounded
smoke result, not universal model adherence or coverage of unrun extended cases.
The session-review ledger remains outside the source-only PR; the evidence
update is local. PR readiness is separate from merge or runtime publication.


### D033 — Bounded investigation of late findings and correction cost, 2026-11-24

The maintainer accepted the proposal to trace why one late finding escaped earlier checks and why its correction reopened broad work: “OK - can we do that based on this transcript?”, followed by “continue”. This selects **Investigate WF-030 and WF-039**, using the supplied transcript and current maintainer sources. It does not select source fixes, customer-code execution, paid evaluations or changes to approval/review policy. Earlier Undecided entries remain historical. WF-037/WF-038 remain Undecided; WF-016's existing implemented guidance decision is preserved, with newly observed recurrence and its next remedy Undecided.

- Intended outcome: identify evidence-supported contributors and the smallest useful improvement candidates without assuming every correction or calendar hour was avoidable.
- Performed: trace the refusal/validation and preview-success episode through coordinator dispatch, planner/test/reviewer handbacks, preparation repair and later amendment/gate calls; statically compare the applicable existing contracts. Results and source locators are in R007's bounded investigation above.
- Result: **the bounded transcript investigation is complete**. Evidence supports handoff premise errors, insufficient branch/layer coverage, a reused-test declaration omission and substantial required downstream revalidation. It does not establish complete child execution causes, runtime defect reproduction, or the safety of a changed evidence-reuse policy.
- Next proposals: bounded handoff/coverage correction for WF-030; declaration-consistency follow-up for WF-016; a separately scoped design investigation before any WF-039 reuse/routing change. These remain recommendations and require explicit selection. No new implementation plan is selected here.
- Compatibility and dependencies: preserve actual user scope choices, current amendment/reuse behavior, test ownership, truthful failed-gate limits, independent review and exact operation approvals. Broader reuse requires validating input dependencies and saved/legacy contracts before choosing an interface or migration. No external side effects are necessary for the recommended bounded checks.
- Verification: all proposed corrective fixtures, model adherence checks and routing experiments remain **untested**. Investigation validation was source/call-result comparison and ledger readback, not customer tests or synthetic behavioral passes. Completion means a traceable causal explanation and bounded recommendations, achieved here; it does not mark either underlying behavior fixed.
- Rollback: this investigation changes only the findings ledger; retain its historical evidence. Future isolated fixes must define their own rollback without erasing saved approvals or receipts. No code, configuration, installed plugin, user checkout, branch, commit or external service was changed.


### D034 — WF-030 selected plan, implementation held for second-source review, 2026-11-24

The maintainer approved planning the bounded WF-030 change, requested comparison with public workflow guidance, accepted the revised plan, and then explicitly said **Implement the plan**. Before source work began, the maintainer asked to review another user's transcript first; implementation is on hold. This entry preserves both the Fix selection and the subsequent hold. No source change or behavioral evaluation has been performed for WF-030. The hold is ordinary task scope, not a new approval gate.

- Selected outcome/scope: improve `implement` planning/test handoffs and `plan-the-work`'s existing coverage review. Separate accepted behavior, supported implementation observations and unresolved assumptions. Make critical scenarios name the exercised interface, observable result and mocked dependencies; preserve the logic that owns the behavior. Use existing plan sections and authoring rules. Do not add a report schema, reviewer, gate, routine question or change the test-preparation execution model.
- Selected verification: synthetic coordinator case with a misleading “already implemented” premise; synthetic planner case with real validation bypassed by a mock and success recorded before a fallible preview. Deterministic fixture checks establish the specific defects, sensitive assertions and already-correct controls. Semantic model evaluations are prepared, not launched without a separate request. Run repository-required deterministic/strict checks; report actual evidence and unverified model adherence separately.
- Ordering/compatibility: preserve unrelated maintainer edits and historical ledger decisions. Guidance/evaluation preparation precedes behavioral claims. No changes to schemas, approval hashes, saved-run routing, gate policy, publication, installed plugin or old reports. No version bump, install, commit, push or PR. Future rollback reverts only selected guidance/evaluations; it does not rewrite saved state or receipts. Selected fix risk **Low–Medium**.
- New evidence from R009: the same class of late semantic miss includes architecture-path inconsistency and a shared requirement tested on only one sibling path. A known gap was also visible before the broad gate. These strengthen the case for concrete coverage checks, and suggest additional evaluation coverage; they do not establish that handoff wording alone prevents these events. Changes to handling already-known correctness gaps before the gate require checking existing routes rather than adding an automatic scope override.
- Separate mechanism: WF-028 stale-evidence phase restrictions and WF-040 path-definition resets forced downstream revalidation. They are outside the selected WF-030 patch. Recommendation is a separately selected bounded investigation of those mechanisms, not silently expanding this implementation into a controller redesign.
- Completion criteria remain prospective: narrow guidance and valid synthetic fixtures, required deterministic checks, accurate ledger evidence and preserved contracts. Live reduction of fix rounds is unmeasured and cannot be promised. The maintainer must resolve the implementation hold before work resumes; this review ends with recommendations and preserves the current selection.


### D035 — Investigate WF-040 and WF-028; scope the reset/recovery remedies, 2026-11-24

The maintainer said **Proceed with your recommendation to investigate 40 and 28**, then asked whether repeated fixing was always part of Implement or a degradation. This authorizes the bounded investigation and ledger update below; no source fix, customer reproduction, paid evaluation, commit or external mutation is selected. No new historical source or occurrence is counted. Inspected source remains `1119773709903b3ef0b4132da69726353dc29070`, plugin 5.17.1; only this ledger was locally modified before and after the investigation.

**Performed and observed**

- Read impact assessment/validation, controller transition and event handling, readiness receipts, preparation validation, execution journals, maintenance bindings, relevant tests and history. Correlated S009 M1950/M1956 and M3470–3528 with the identified current mechanisms. No customer checkout, private service, supplied command or application test was executed.
- Ran eight pure transition/comparison probes against current exported helpers. Exact same-definition refresh preserves phase/version/execution in fix-plan. Each of a path addition, rationale-only edit, evidence-locator change and required-command change alters the same full definition digest and resets to a new Plan/version. Same-definition refresh is rejected in Execute but allowed in fix-plan and Review. These are synthetic policy observations, not customer recurrence or semantic proof that changed evidence is harmless.
- Ran a disposable two-repository fixture through actual scope preparation/approval/application, workflow initialization, impact assessment, freshness checking, controller transitions and default dashboard rendering. Fixture state was explicitly seeded at an active completed-plan/amendment boundary; this is not a full semantic implementation pipeline. Planned evidence-byte changes produce the real freshness failure. Refreshing the unchanged definition in Execute fails with state preserved; the same refresh in fix-plan succeeds without version reset and binds the current evidence bytes. Adding one declared path then forces version 4, clears the active plan/execution and consumes one replan despite unchanged classifications/checks. Prior plan and edited-file bytes remain intact. No fixture product-test command or network operation ran; temporary fixture repositories were removed.
- The first custom fixture reproduced WF-028, then failed at rendering because its synthetic plan lacked Execution Status. That run is retained as a failed fixture setup. After supplying a parseable Mode/Progress section, the corrected fixture reproduced both mechanisms with the real renderer. No production validator or renderer was changed to obtain that result.
- Existing `repo-impact.test.mjs` passed **9/9 tests**, zero failures/skips, about 45 seconds. These cover existing repository drift, protected skipped repos, exact required-check matching, current readiness, scoped execution and tree-bound verification. They do not test a future remedy or demonstrate fewer live fix rounds. No broader suite or paid model run was needed for this source investigation. Final ledger readback and whitespace checks completed; no tracked source/test module changed.

**Why the loops expanded**

1. **WF-040:** the single definition digest includes repo rows, path lists, evidence locators, rationale and required checks. Every digest change with an existing plan takes the same replan branch. A path declaration update therefore gets the same global invalidation as changing which test command must run. The transcript's local amendment was valid in concept; current saved-scope reconciliation converted it into a larger lifecycle operation.
2. **WF-028:** saved dependency evidence includes file hashes even inside changed repos. Planned edits can invalidate them. Refresh is prohibited in Execute, while `applyWorkflow` checks impact freshness before accepting non-refinement done handoffs, including GUARDRAIL/other stop reports. A report whose purpose is to stop or replan can be blocked by the stale evidence it needs to escape. The user-approved refinement workaround preserves work but adds requirements approval and downstream recovery that are not intrinsically needed to record a technical stop.

**Compatibility findings and recommended boundaries**

- **WF-040 proposed scope:** first consider only additive paths in repositories already classified change, during an existing append-only fix amendment. Keep the accepted spec, approved repo identities/roles/classifications, required checks, evidence locators and rationale identical. Preserve all previous paths and completed step definitions. Any required-check, role/classification, dependency-meaning or completed-step change remains on the existing reconciliation/replan path. Do not generalize this initial fix to deleting paths, promoting repos or ignoring arbitrary definition differences.
- Preserving the phase alone is insufficient. Readiness receipts bind the impact-definition hash; preparation binds the complete plan hash and test-file images; execution journals bind hashes of individual steps; maintenance can bind the impact hash. An unchanged-step append-only amendment is already supported by step control. The remedy should reuse that mechanism, regenerate preparation against the amended plan and refresh affected readiness/maintenance bindings without pretending old tests were freshly run. Existing readiness begin/complete supports rebuilding its binding from retained report evidence in fix-plan; that is not proof that all historical reports are semantically adequate. Retain real evidence limitations and actual check freshness.
- A minimal fix need not remove hashes or invent a general evidence-reuse schema. Use the existing recorded assessment/history and amendment route where compatible, rebind what changed and preserve actual completed-step progress/mode/counters. Design implementation recovery for partial reporting/receipt updates before editing code; existing saved plans and exact pending approvals must not be silently reinterpreted. No universal new approval prompt or repeated test run is recommended.
- **WF-028 proposed scope:** permit validated correctness-stop recording/replan recovery without requiring stale impact evidence to certify success. Continue validating run identity, current handoff, repository/branch scope, user decisions and stop conditions. Separately support explicit semantic reassessment at a durable Execute boundary for evidence bytes changed by the approved plan when the resulting definition/checks/spec/scope are unchanged. Do not automatically bless changed dependency meaning, carry a prior tree-bound verification result forward or restore old files merely to satisfy hashes. A true changed definition continues to reconciliation; stopped/paused recovery must preserve its existing user decision and not resume implementation implicitly.
- Recommended ordering: scope WF-040's path-addition amendment repair and WF-028's stop/refresh recovery as independently reviewable slices. They address different triggers and neither is fixed by WF-030's handoff guidance. Validate shared binding behavior together before claiming the user can continue without rebuilding prior steps. Overall proposed implementation risk remains **Medium–High** because authorization/evidence/phase compatibility changes; the safety of a concrete candidate remains untested.

**History: always present versus newer regression**

- Initial Implement commit **`3e58a6f` (2026-10-01)** already specified bounded fix-plan and replan loops, with three fix rounds and two replans. Corrective review itself is original intended behavior.
- The repository-impact helper, full-definition reset and Execute refresh exclusion appear in **`880372854e056c07e68baeb78adb827d1c24f1f7` (2026-11-19)**; the parent revision lacks that helper/reset mechanism. Both this commit and its parent show manifest 5.15.0, so do not infer a release boundary from their equal version strings. Captured sessions E/H use 5.17.0 after its introduction.
- Separate test preparation was introduced by **`4cbb639` (2026-11-17)**, adding a downstream stage when a plan is legitimately regenerated. That is history, not evidence it should be removed or that it caused every late defect.
- Conclusion: fix rounds were present from the beginning; these particular reset/recovery amplifiers are later additions. Source attribution is strong, but there is no matched before/after user-session experiment establishing an increase in overall defect rate, fix-round frequency, total time or cost. Avoid claiming a quantified performance regression or blaming all iteration on this change.

**Next decisions, validation and rollback**

The investigation is complete. Recommend planning narrow fixes for WF-040 and WF-028, with **implementation still unselected**. Before either is called fixed, a proposed candidate must demonstrate that an additive two-step amendment retains earlier step progress and still refreshes the current plan/preparation bindings; a planned evidence edit can reach valid stop/replan or same-definition refresh without an unchanged-requirement refinement round; real changed verification/scope still reconciles; partial retries/legacy resumes retain their contracts; failed/unrun gates remain qualified; and immutable saved evidence/approval history is retained. These are proposed acceptance checks, **not performed candidate verification**.

Rollback future source slices independently, retaining all already-written assessments, plan versions, execution journals and approval/operation receipts. Do not roll back by deleting user work, disabling freshness, globally allowing context-repo edits or silently downgrading saved contracts. No new source fix plan, schema migration, gate change or installation is authorized by this investigation. WF-030 remains selected but on hold pending the maintainer's next direction.


### D036 — One release candidate for WF-040, WF-028 and WF-030, 2026-11-24

The maintainer requested a single version for reporting users and replied **OK** to the recommended WF-040/WF-028/WF-030 release scope. Together with the earlier explicit implementation request, this selects local implementation of the three bounded fixes and resumes that work. Other findings remain unselected. Publishing, account installation and broader evidence-reuse/gate redesign are separate from preparing this candidate.

- Candidate version: 5.17.2. WF-040 uses an explicit `repo-impact` update mode for additive paths during an append-only fix amendment. It requires unchanged completed step hashes, existing change classifications and unchanged other definition fields; phase/version/progress/mode remain while readiness and preparation bind current evidence. Existing calls without the new update mode retain their historical replan behavior, including saved version-1 runs.
- WF-028 permits validated correctness-stop routing without impact freshness certifying dependent work. Explicit evidence refresh requires the identical definition and plan, evidence changes already declared inside change repos, a durable execution boundary and no attached verification proof. Direct edit/resume and successful handoffs retain freshness checks; actual changed scope/checks still reconcile.
- WF-030 changes coordinator and planner guidance, using existing plan sections and authoring rules. Synthetic behavioral cases target false implementation premises, validation bypassed by mocks, sibling coverage and premature success. No additional stage, reviewer, user gate or test-authoring permission is added.
- Validation plan: positive saved-run amendment/refresh and stop-recovery fixtures; negative changed checks/steps/evidence, active steps and stale-success controls; existing deterministic workflow/eval/package checks, strict validation, and exact fixture defect/sensitivity checks. Focused paid cases are prepared only. Release smoke remains governed by the existing committed-PR sequence and is not implied to have run.
- Compatibility/rollout: reporting users must reload/invoke the current plugin and resume the saved root using current helper paths; old cached helper paths in chat still execute old behavior. Existing state/plugin-version history is retained; no automatic migration or rewrite of approved packages/journals. Readiness may reuse actual retained evidence under its existing procedure, while current-plan preparation and required completion checks remain mandatory.
- Fix risk **Medium** for this bounded opt-in implementation (broader impact/invalidation changes remain unassessed). Validate all event inputs before writing a new immutable assessment; ordinary state/audit/render retry semantics remain. Rollback guidance/helpers/tests together while retaining written assessments, original receipts and old default-call behavior. No customer checkout is changed. Implementation and verification results follow; this selection is not itself completion evidence.


**Implementation and verification results**

- Implemented optional `repo-impact` updates without a saved-state schema migration. `amend-paths` verifies an append-only fix plan against completed step hashes and the existing assessment, preserves phase/version/mode/progress/counters, and leaves readiness/preparation to their existing current-binding procedures. `refresh-evidence` preserves an identical definition/accepted plan at supported boundaries, permits only evidence already declared for editing, and discards old tree verification. Normal calls retain the previous reconciliation behavior.
- Correctness-stop reports can reach their existing stop/replan route despite stale dependency bytes. Successful handoffs and direct `edit-and-resume` remain freshness-protected. The change preserves artifact, workspace/branch and decision validation; it is not a successful gate or implicit implementation restart.
- Updated existing Implement coordinator/fix/execution guidance and Plan-the-work integration. Accepted behavior is separated from unverified implementation claims; affected coverage considers real validation, pending/failing later operations, sibling entry points and architecture/path consistency. There is no new approval, reviewer, report schema or exhaustive repository review.
- Added four repository-impact regression tests (13 total in that file) and two isolated headless semantic cases with a shared disposable fixture. The fixture's real validator and preview-order defects are demonstrated with already-correct controls; correcting the exact defects in memory makes the assertions pass without modifying fixture source bytes. The semantic cases are registered only in the optional headless suite; the required smoke suite remains 16 cases.
- Workflow/controller/execution/helper deterministic command: `node --test skills/write-the-tests/scripts/*.test.mjs skills/implement/scripts/*.test.mjs skills/execute/scripts/*.test.mjs scripts/*.test.mjs` — **838/838 passed**, zero failed/cancelled/skipped, about 402 seconds. Coverage includes legacy and saved runs, delivery/retry, readiness/preparation and the new amendment/refresh/stop controls. A final test-only strengthening combines planned evidence edits with a path amendment; its maintained focused case passed **1/1**, about 20 seconds, after that broad run. Runtime source was unchanged between those checks.
- Harness/package deterministic command: `node --test evals/*.test.mjs tools/anthropic-release/package.test.mjs` — **115/115 passed**, zero failed/cancelled/skipped, about 57 seconds. This includes the new fixture sensitivity check. An earlier separate headless grading regression run passed 29/29; it overlaps the broad harness results and is not added to the total.
- Initial new-test runs exposed fixture setup mistakes: an incomplete correctness-stop handoff, an incorrectly seeded plan after a deliberate legacy reset, and a missing verification artifact. The fixture inputs were corrected without weakening production validation. The final broad run and focused amendment check passed with those corrections. These failed setup attempts are not reported as product failures or hidden as clean first-run results.
- Strict plugin manifest, skill and marketplace validation passed. The manifest validator also reports the existing missing-icon directory advisory; its validation result is passing. Evaluation validation passed with **191 cases**; targeted semantic-case dry runs resolved both fixtures. Smoke dry run resolved all 16 cases. No model evaluation or paid service was invoked.
- Built and verified a 5.17.2 runtime package from a disposable snapshot of the local tracked candidate, including a fixture-only commit in the temporary clone. Its 16 skills/208 files passed integrity and exported strict validation; an independent temporary install copy verified successfully. This is packaging/install-layout evidence, not a published source commit, actual reporting-user installation or a clean production rollout. Temporary packaging fixtures were removed. The later maintained test strengthening and this ledger result update do not change the packaged runtime helper/guidance bytes.
- Release boundary: local manifest/changelog now identify **5.17.2**. No commit, push, PR, publishing, installed-plugin update or customer checkout change was made in the maintainer workspace. Required model smoke still needs the existing committed-PR sequence; reuse that release sequence rather than launching a separate full smoke per fix or version bump. Optional focused semantic evaluations remain prepared and unrun.
- Result/limits: the selected local implementation and deterministic verification are complete. Concrete reset/recovery cases are covered; WF-030 model adherence, end-to-end user continuation and actual reduction in fix rounds remain unverified. Independent review and required checks remain necessary. Preserve immutable old assessments/receipts and user work when rolling back the optional helpers and guidance together.


**Delivery status update — 2026-11-27.** Repository history at `5c0fd6b` confirms the 5.17.2 change `8aa08a1` reached main through PR #118 (`1ebfaf9`). The local-candidate boundary above is historical, not a current uncommitted-delivery status. Retain all validation qualifications and R010's unexercised-route limits; this update establishes no additional live result or installed-user version.

### D037 — Deliver the 5.17.2 candidate as a separate PR, 2026-11-24

After accepting separation from PR #117, the maintainer said **Proceed**. This selects committing/pushing the completed 5.17.2 candidate, opening its own draft PR, and completing the repository-required smoke sequence before marking it ready. PR #117 remains open at the time of selection, so the new PR initially targets its branch to isolate this candidate's diff; retarget to main after that dependency merges. GitHub assigns the actual PR number. This does not select merging either PR, publishing a release or installing into reporting users' accounts.

- Source scope remains WF-040/WF-028/WF-030 and the associated findings, tests, evaluations, version/changelog. Deterministic and strict results are recorded in D036; they are not rerun merely for a commit or PR. Verify packaging/isolated installation against the committed source and record its exact SHA in the PR.
- Run only the required 16-case smoke inventory, once initially, with the existing $12 reported-usage cap. Preserve its per-PR ledger and reports. Investigate any failure and retry only unresolved cases after needed fixes are committed. The two new focused semantic evaluations remain prepared and unrun unless separately requested.
- Keep PR #117's branch/receipts intact and retain the current 5.17.2 working files. Delivery results and any remaining blockers belong in the new PR; this selection itself is not smoke, hosted-CI or release evidence.


### D038 — Renewed WF-007/WF-015 investigation, 2026-11-25

**Selection, scope and completion.** The maintainer requested investigation of the two recurring findings to identify narrow, safe remaining fixes. This selects investigation and ledger updates only. Inspected revision `8aa08a1` / plugin 5.17.2; the ledger already had uncommitted R010 work, preserved here. Checkout identity was confirmed from its plugin manifest and skill sources. No customer checkout, private service, installed client, customer command, application test, reproduction, model evaluation, source edit, commit or external write was used. Current helpers, prior D004/D008 decisions and their maintained tests were read; historical passing tests were not rerun or represented as new results.

**Evidence scope.** Reopened the hash-verified S006 main export and inspected M807–829, M1036–1050, M2547–2558, M3810–3814 and M3870–3874 selectively, plus its saved hook journal lines 8–10 and 14–16. S006 is the existing E episode, not a new source/session. Other historical occurrences, including I, rely on the existing ledger review; S010 was not reopened in this investigation. No exhaustive rereview of child executions or customer source. The available final transcript and hook journal record message/event times, not hook-time transcript snapshots or filesystem append times. There is no material question for the session user that can establish those missing runtime observations.

**WF-007 conclusion and proposed fix (not selected).** `inspectState` in `skills/implement/scripts/write-feedback.mjs` derives complete hyphenated compounds from audit prose and removes only exact `WORKFLOW_TERMS`; `safeLine` separately rejects the ticket ID, paths, URLs, markup/contact details and copied remaining compounds. D004 added seven literals and deliberate negative tests, not a general vocabulary recognizer. S006 M3812 rejects the public plugin name; M3872 rejects a generic access adjective. D/E/G/I together expose eight still-unlisted terms: `not-run`, `self-review`, `per-step`, `make-it-work`, `read-only`, `pre-existing`, `display-only`, `test-map`. D004's earlier seven additions remain intact. Observation/cause confidence **High** for the mechanism and confirmed E examples; recommendation confidence **High** for a bounded extension, not elimination of all future false positives.

- Intended outcome/owner: allow these eight reported public/generic literals through the existing compound heuristic, using the current exact vocabulary set. Change only that set and its focused tests in `write-feedback.test.mjs`; no automatic document-derived vocabulary, fuzzy matching, whole-word-family exemption, other sanitizer exception or new helper.
- Preserved behavior/compatibility: retain complete private compounds even when they contain an allowed word; current-ticket collisions still fail. All other share-safe checks, numbered evidence requirements, output paths, saved schemas, state hashes and collection lifecycle remain. Existing saved reports are not rewritten. The exception affects future validation of these exact terms only.
- Fix risk **Medium**: changes a privacy-related heuristic. Small scope and existing negative-test surfaces bound the risk but do not make it a general privacy guarantee. Human review before sharing remains required.
- Proposed verification — **unrun**: extend the existing real writer/save fixture across all eight literals and uppercase renderings, proving that current source rejects the observed wording when present in audit prose and that selected code permits it. Include mixed-case and embedded private compounds such as `customer-display-only`, `test-map-client` and `make-it-work-customer`; retain ticket collisions, URLs, private paths, contact details, proprietary/credential-shaped audit terms and both-output preservation on rejected saves. Run appropriate maintained feedback tests after implementation. No paid model case is needed to establish deterministic literal behavior; any later release follows its existing checks.
- Completion/rollback: selected patch must allow exact literals without allowing private compounds or replacing saved reports on rejection. Revert only the new literals and their test expectations if needed; retain historical reports, D004 entries and all collection receipts. No evidence that this removes unobserved future generic-term retries.

**WF-015 conclusion and proposed clarification (not selected).** `planningActivityCheck` in `skills/implement/scripts/planning-activity.mjs` already separates invalid syntax from pending literal chat; `startupHook` in `startup-presentation.mjs` rereads transcript/state for up to one second before denying an otherwise valid missing-chat call. `chatContains` retains literal/current-cycle/main-session constraints. The maintained tests cover delayed/partial appends, rejection of fake/stale evidence, phase changes and retry after persisted chat without a duplicate sentence or Stop record. These tests are source evidence, not newly observed executions.

- Confirmed E sequence: narration at M811 precedes the equal activity argument at M812 by 1.334 seconds; denial follows at M814. Narration at M1038 precedes the equal argument at M1039 by 1.603 seconds; denial follows at M1041. The matching text records are not marked child/meta/synthetic. The corresponding journal denial/Stop/clear sequences corroborate the recovery order, not file visibility. Repeated narration occurs at M823/M1043, Stop feedback at M824/M1044, followed by retries at M828/M1048. Thus streamed message timestamps alone cannot prove either that the hook ignored readable text or that a longer wait would solve the issue. M2550 follows a different drafting-narration sequence and is not counted as another proved identical-match visibility failure.
- Narrow proposed outcome/owner: clarify only the missing-chat denial text in `planning-activity.mjs` and its explanation in `references/activity.md`. Branch the instruction in prose: already sent the exact current-cycle sentence → do not resend it; finish the response without tools and retry the unchanged checkpoint on automatic continuation. Not yet sent or different wording → send the exact sentence first. Retry must succeed before dependent work. Do not add a confirmation, unconditional yield or a second activity entry. This is a proposed reduction in duplicate narration only, not a remedy for the underlying visibility delay or all Stop holds.
- Preserved behavior/compatibility: no change to `pendingChat`, one-second budget, matcher, phase timestamps, syntax/prerequisite checks, return shape, state, Stop continuation, approvals or legacy runs. The ordinary denied checkpoint still needs real chat and must execute; no narration receipt or tool-argument-as-chat exception.
- Risk/confidence: **Low** for the bounded recovery message/contract clarification because it describes the already-supported retry path without releasing a denied call. Observation confidence **High** for the E duplicate sequence; timing-cause confidence **Medium**; recommendation confidence **Medium**, since model adherence and live flush behavior remain untested. Runtime timing/policy changes remain **Medium** risk and are not recommended from this evidence.
- Proposed verification — **unrun**: retain existing pure-policy and hook checks, add a focused assertion that the missing-chat recovery distinguishes already-sent narration and calls for an unchanged retry, and confirm one persisted main-session sentence releases a subsequent attempt with no duplicate/extra activity or changed state. Missing, paraphrased, tool-only, stale/child/fenced text and malformed/combined calls must remain denied; phase changes retain freshness. A future live observation would be needed to claim fewer duplicate messages; existing saved exports cannot validate hook-time visibility. Do not add frequent instrumentation/model calls or broaden waiting merely to measure it.
- Completion/rollback: selected clarification must preserve policy results and explain the conditional retry accurately. Revert only its wording/docs/test expectations if it causes confusion; keep D008 and existing state/history. Recommend **defer runtime change**, with optional **Fix recovery wording** as a separately selectable small patch.

**Result.** Both selected investigations are complete. Recommend the exact WF-007 extension first; optionally include the WF-015 recovery clarification with its modest stated benefit. Implementation remains unselected. Distinct-session counts stay 6 and 4. No new review episode, recurrence or defect severity is inferred. Broader sanitizer, hook/Stop, timing, gate, workflow and release changes remain outside this selection.


### D039 — Script-owned draft preparation and paths, 2026-11-26

**Selection.** After the maintainer requested the recommendation for a more deterministic workflow, the assistant recommended implementing (1) script-owned draft preparation and (2) script-assigned evidence/input paths, with (3) a bounded WF-044 propagation investigation alongside them. The maintainer replied **OK**, selecting that local implementation and investigation. This does not select WF-007 exceptions, WF-015 timing/policy changes, WF-037 orchestration, automatic compilation/baseline builds, new gates, schema migration, publication, installation or a release/version bump. Earlier uncommitted ledger reviews are preserved.

**Implemented scope.**

- WF-043/WF-036: new `final-package.mjs draft` reads three prose files inside the active run directory and serializes the existing `commit_message`, `pr_title`, `pr_description` JSON shape through `final-draft.mjs`. Prose is data, never shell/code interpolation. An optional explicit `--body-width` wraps commit-body prose before approval, keeping subjects, fenced/indented code, trailers and unsplittable tokens intact and reporting overlong lines. No limit is guessed and no repository JavaScript/hook/config is executed. PR description text is retained exactly; the title is normalized to a single trimmed line. Existing JSON drafts and build/check/approve calls remain compatible. Draft changes still require package rebuild and exact reapproval; delivery never reformats approved text.
- WF-018: `artifact-output.mjs allocate` exclusively reserves a new UUID-suffixed file using existing artifact naming/Git protection, with no saved-state schema change. Each worker receives its own returned absolute path; empty reservations are explicitly not evidence. Continuation of the same worker reuses its assigned path. Aggregate reports, handoffs and journals retain their existing owners. D012 naming guidance remains historical; the new script removes worker filename allocation from the model's choices when used as directed.
- WF-042: `artifact-output.mjs inputs` resolves saved artifact-plan references and explicitly selected source-relative context files to absolute inputs. It checks existence/containment and distinguishes source from artifact root, without choosing or approving repositories. Core legacy helper resolution semantics are unchanged; controller approved-root checks still apply. Execute integration and final-sync call sites use these outputs. Existing `resolve` remains non-reserving.
- Wiring: final-package, Execute dispatch/integration, activity and final-sync guidance now use these existing helper entrypoints; deterministic-artifact documentation describes the same contracts. Input prose is authored through Write/Edit into allocated files rather than generated shell/Python. No new workflow stage or user approval is added. All semantic authoring, review and scope decisions remain with the agent/user.

**Risk and compatibility.** Selected runtime additions are **Low–Medium** risk: local draft formatting, artifact allocation and call inputs, with existing approval hashing, containment and Git protection preserved. They do not promise arbitrary commit-hook success or compliance if the agent bypasses the documented helper calls. Old saved packages, state, evidence and receipts are not migrated or rewritten. Roll back the new draft command/helper, allocation/input commands and their call-site guidance/tests together; retain completed artifacts/history and restore the prior manual drafting/path procedure. Existing commands and historical approvals keep their contract. This implementation does not establish measured time savings or a live reduction in recurrence; historical counts remain one session for each of WF-018/WF-036/WF-042/WF-043.

**WF-044 investigation completed; propagation implementation unselected.** `review-report.mjs renderReview` and `captureReviewEvidence` preserve supplied `validation_notes`; `final-package.mjs assemble` copies that array from the bound review-evidence report, its Markdown renders those notes and `check` returns them. The Execute artifact is hashed/bound but its free-text compiler claims are not turned into independent machine-owned command records. Thus package binding cannot recover a qualification omitted or strengthened before the reviewer creates that input. Current source is consistent with the observed loss being upstream of package copying, not proof of the exact original model decision. A synthetic local render probe supplied a reported compiler failure/unknown baseline alongside passing runtime tests: report and chat kept the exact qualification. An empty note list did not recover it. This is a renderer characterization, not an application compilation or an end-to-end assurance fix. Its initial stdin invocation encountered the existing shared CLI guard's handling of `argv[1]` equal to `-`; retrying with no CLI entrypoint succeeded, without changing that unrelated helper.

Recommended next design: capture command/revision/status/raw-output references once through a script, then preserve those records in reviewer inputs and derive approval qualifications from them. Keep observed failure, baseline attribution and runtime passes distinct. Unknown provenance stays unknown; no automatic baseline checkout/build or mandatory compile gate, and accepted unrelated failures must not block solely because they are recorded. Investigate reuse of the existing regression command-result data before adding a record format. A model cannot be removed from judging whether evidence establishes inheritance, but it should not need to reconstruct the recorded command outcome at each boundary. This broader capture/propagation remedy is **Medium** risk (freshness, superseding evidence, legacy packages and approval content), remains unselected/unimplemented, and needs a scoped design with positive/negative propagation controls before source changes. WF-044 count remains one session.

**Verification completed.**

- Required deterministic workflow command (`node --test skills/write-the-tests/scripts/*.test.mjs skills/implement/scripts/*.test.mjs skills/execute/scripts/*.test.mjs scripts/*.test.mjs`): **843/843 passed**, zero failures/cancellations/skips, about 379 seconds. This covers existing package/delivery/approval, legacy naming/resume and source/worktree contracts alongside the new helpers.
- Harness/package tests (`node --test evals/*.test.mjs tools/anthropic-release/package.test.mjs`): **115/115 passed**, zero failures/cancellations/skips. Strict plugin manifest, skill directory and marketplace validation passed; the existing missing-icon directory advisory remains. Evaluation inventory validates **191 cases**, including the unchanged 16-case smoke inventory. `git diff --check` passed.
- Focused final checks passed **4/4** helper/formatting cases and **1/1** draft/package approval case; these overlap the full suite and are not added to its count. Coverage includes concurrent exclusive allocations, marked/legacy names, traversal/symlink rejection, actual CLI calls from a separate source cwd, separate private-artifact/source roots, literal Markdown/shell-looking prose without command execution, preserved code/trailers/qualifications, explicit line wrapping, invalid inputs/phases and old approval invalidation. Final added negative assertions also reject formatting flags outside draft preparation and multiline titles without changing the saved draft. The initial focused run failed two newly added assertions because macOS temporary-directory aliases differed from canonical paths; fixtures were canonicalized, preserving the canonical-return contract, then the final focused/full checks passed. No production behavior was weakened to satisfy those assertions.
- A disposable source snapshot containing the current local helper/guidance bytes built a runtime distribution with **16 skills / 209 files**. Integrity/dependency-reference verification passed and the new `final-draft.mjs` was included. The snapshot commit existed only in the temporary fixture, which was removed; no maintainer-workspace commit or installation occurred. Subsequent findings-ledger result text differs from that packaging snapshot, while runtime helper/guidance bytes are unchanged. This is packaging evidence, not a released artifact or live plugin installation.
- No paid smoke/model evaluation or live LLM skill session was invoked. This establishes deterministic helper behavior and compatibility, not adherence by every future model invocation or a measured reduction in user-session errors. Any later PR/release retains its existing smoke/approval procedure; no version bump, external publication or installed-plugin update was made.

**Result.** Selected local implementation and WF-044 investigation are complete. Changes remain uncommitted. WF-007/WF-015 proposals remain unselected, and the broader WF-044 propagation implementation remains a separate proposed next step.


### D040 — Deliver deterministic artifact helpers as 5.17.3, 2026-11-26

The maintainer explicitly requested **commit, push and open a PR, while bumping the version**, then specified **no smoke testing yet**. This selects a 5.17.3 patch bump, changelog, commit/push of the selected local work and a draft PR against main. Preserve D039's deterministic evidence; the base main tree is byte-identical to the previously inspected 5.17.2 source tree despite its merge commits. Include the existing sanitized R010/D038/D039 ledger updates. Do not start smoke, mark ready, merge, publish a release/tag or install the plugin. Smoke remains pending under the normal ready-for-review procedure at the maintainer's explicit timing.

- Source scope: script-owned literal drafts/explicit body formatting and unique evidence/absolute input paths, their tests and call-site guidance, findings ledger, plugin version and changelog. The WF-044 propagation change and WF-007/WF-015 remedies remain unimplemented.
- Prior validation: 843 workflow tests and 115 harness/package tests passed, plus focused final checks and strict validation as recorded in D039. No full repeat is needed solely for delivery/version metadata. Validate the bumped manifest and build/verify the runtime from the final committed source; include results and limitations in the PR.
- Publication boundary: this selection authorizes branch/commit/push/PR creation only. The draft must explicitly say smoke is deferred by request and must retain the distinction between completed helper fixes and the WF-044 investigation.


**Delivery status update — 2026-11-27.** Repository history at `5c0fd6b` confirms PR #119 merged into main at `a8edd0c`, including the D039 5.17.3 artifact helpers and the later planning-smoke fixture alignment `5a47c30`. The draft/smoke-deferral statements above describe the earlier selection checkpoint. This update records the merge only; it does not reconstruct smoke results from a merge or certify later user adherence. Its then-unselected WF-044 status is superseded only by the later explicit D041–D044 decisions.

### D041 — WF-044 command-fact propagation design, 2026-11-26

**Selection and boundary.** After D040's delivery, the assistant recommended starting WF-044 with a narrow design using existing command-result data, preserving current gates/approvals. The maintainer replied **ok**. This selects the local design below, not its implementation. Inspected clean source `13f2b307c9795e9f50fae527e550c32f4232d27e` (5.17.3); draft PR #119 contains D039/D040. Only this ledger is changed for the design; do not commit/push it into that PR without a further delivery request. The maintainer's smoke deferral remains in force. No new session, occurrence, runtime result or severity is inferred.

**Outcome.** A reported command failure and its actual provenance should survive Execute, independent review, package approval, completion and delivery as script-rendered facts. The model still selects already-authorized checks and assesses diagnostics; it should not reconstruct process outcomes or strengthen unknown provenance in successive summaries. This is a **Medium-risk** proposed implementation, not another guidance-only fix.

**Current constraints verified by source inspection.**

- `scripts/regression.mjs runCommand` already provides structured argv with `shell: false`, exit code, signal, startup error, timeout and timing. It keeps only a bounded 16,000-character combined output tail; `output_truncated` reports the loss. It does not retain complete separate streams or bind the result to the actual dirty source snapshot. Reuse its process/timeout semantics, not an unchanged result artifact presented as full compiler evidence.
- The verification ledger has exact allowed fields and accepts only passing/exempt/authorized-skipped step checks. Recording a supplemental failed compiler command as an ordinary completed step check would change completion semantics and is rejected. Leave its version-1 schema and gate policy unchanged.
- Review rendering/evidence copies the model-supplied `validation_notes`; final packaging copies that bound evidence. There is no independent command-fact inventory to recover an upstream omission. `review-scope.mjs verificationContext` already binds review inputs, and final-package evidence/hash binding already invalidates stale approval. Extend these existing seams rather than adding a stage or reviewer.

**Proposed first implementation slice (unselected).**

1. **One capture path.** Add a local `command-evidence` entrypoint for already-selected validation commands, backed by the existing `runCommand` implementation. An optional capture sink streams original stdout/stderr bytes into separately allocated private artifact files while preserving the current bounded tail/progress behavior. Existing callers without capture options keep their present output/exit/timeout contract. Regression-owned commands can use the same capture option; do not execute them twice. Do not route compiler commands through test-suite classification or infer a test gate from recording them.
2. **Fact identity and durable capture.** Register a script-allocated invocation ID before launch in a run-bound capture inventory, then atomically finalize its immutable result. Use short locked registry updates with separate per-invocation files so parallel workers cannot overwrite one another or hold the registry lock while a command runs. Bind to saved run ID, approved repo ID/root, plan version when present, exact argv/cwd, start/end times, HEAD and the existing working-tree snapshot/fingerprint before/after the check. HEAD alone is insufficient for uncommitted implementation. Exclude private artifacts through the existing snapshot rules. Result fields reuse `exit_code`, `signal`, `timed_out`, `error`, `result` and timing; add full-stream paths/hashes and an explicit capture-completeness state. An unfinished registration, missing result/log or failed stream write is incomplete evidence, never an implicit pass. Retain the observed process outcome if logging fails; do not rerun automatically to repair reporting.
3. **Separate facts from interpretation.** Render process success/nonzero exit, failure to spawn, signal/timeout and incomplete capture distinctly. A wrapper exit is evidence about that wrapper; it does not prove compiler startup/status if the wrapper masks them. Default baseline/destination attribution to unknown unless separately supported. Analyst explanations and comparison references may accompany a record but cannot overwrite the captured exit or erase it. A failed command outside ticket fix scope remains a recorded failure; passing runtime tests remain separate observations. No output keyword matching or diagnostic-count heuristic declares baseline inheritance.
4. **Inventory and disclosure owned by scripts.** Review preparation inventories every registered invocation for this run, produces a deterministic summary with raw-output references, and binds its digest in the existing review verification context. Reviewer inputs use this generated inventory; they do not choose which command records to forward. The review writer merges generated fact qualifications with optional semantic `validation_notes` instead of trusting a replacement array. Final packaging independently derives/checks that same inventory, binds its files in the existing evidence map, and renders its factual block through package/check output and approval/completion/delivery presentation. Keep the package's human-authored behavior summary separate; generating a full PR description is outside this slice. Use the existing exact-package presentation/reapproval contract, not an added user approval.
5. **History and freshness kept explicit.** Show records with their actual source snapshot and capture time. A run on a changed tree cannot certify the current tree. A later pass does not silently delete an earlier failure or prove an earlier failure was inherited. The first slice retains both observations, labels earlier/different-tree records as historical and current coverage as unknown where appropriate; it adds no automatic supersession policy, baseline build or broad rerun. New captures or altered/missing evidence invalidate the bound review/package through existing consistency routes. Repair/refreshed evidence follows those routes; do not fabricate a fresh review or force a replan merely to refresh a fact summary.
6. **Compatible rollout.** Use an explicit new-run feature marker and a small versioned, run-bound sidecar inventory; enable it only in future initialized runs. This is an additive capture contract and needs versioned validation. Keep historical runs without the marker, verification ledgers, old review targets, packages and approvals on their saved contracts. Do not auto-enable or migrate saved approvals, interpret missing old records as passing, or retrofit purported compiler exits from old prose. New runs with no captured compilation say no compilation result was captured, not that compilation passed or was required. Required tests/compilation still come only from the existing plan/repository policies. Completion/package consistency must reject tampered facts, but a faithfully disclosed failed supplemental check does not introduce a new pass requirement.

**Illustrative retained qualification.** A generated block can state: selected command exited 1 at its recorded snapshot; starting-baseline comparison not recorded; destination provenance unknown; a different recorded unit-test command exited 0. If only a worker's prose is available, mark its failure as reported/uncaptured, with unknown exact exit, rather than minting a captured result. Neither representation establishes a verified compiler diagnostic or a passing build. Historical counts from S010 remain reported evidence only.

**Adoption limit.** This slice makes capture and propagation deterministic for commands routed through the supported runner. It cannot observe every arbitrary Bash invocation or recover output that was never captured. Update the existing Execute/Lightweight delegate check instructions to use the runner for selected validation and pass its exact fact paths; no generic shell interception or new hard hook is included. Capture absence remains an explicit assurance limit. The design must not claim universal prevention of WF-044 if callers bypass the capture path or if the model omits the required generated approval text.

**Owning surfaces and order.** First implement/test the optional full-stream capture in `scripts/regression.mjs` and the run-bound sidecar helper using existing artifact allocation/containment. Then wire fresh-run initialization and Execute/Lightweight inputs, review verification-context/renderer, final package and completion/delivery presentation. Reuse existing approval binding and fact rendering at every boundary. The sidecar is necessary because the existing runner result lacks complete output/snapshot identity and the passing-step ledger is the wrong container; do not expand the ledger merely to reuse its filename. No changes to product requirements, review-cycle caps, independent review ownership, execution mode, scope approval or sanitizer policy.

**Proposed verification — all unrun.**

- Controlled real subprocess exits 1 while printing a success footer and emits more than 16,000 characters across both streams: retain complete byte-exact files/hashes and nonzero status while the old bounded-tail interface stays compatible. Include UTF-8 chunk boundaries, empty streams, timeout/signal and executable-not-found. A started wrapper returning 127 must not automatically become an observed TypeScript failure.
- A dirty-tree capture binds the actual worktree rather than only HEAD; changed source, changed command, changed run/plan, symlink/outside-approved roots, modified logs/results and missing/unfinished registered captures cannot become current passing evidence. Parallel captures keep distinct records and complete outputs. Simulate interrupted finalization and logging failure without silently rerunning the command.
- Failed supplemental typecheck with unknown baseline plus passing unit tests remains visible from Execute through review notes, exact-package approval, completion and delivery. Deliberately omit or contradict the model's note: script-generated facts remain. A genuine evidenced baseline comparison adds attribution without changing the actual failure status. Passing runtime evidence never certifies compilation.
- Earlier failure plus later pass on another snapshot retains both statuses and their provenance; missing current comparison stays unknown. Current failed-gate policies still fail as before, accepted unrelated failures retain their existing route, and supplemental failures are not silently promoted into new required gates. Empty capture inventory cannot claim a successful compile.
- Legacy saved runs/targets/packages/approvals retain their original contract and byte presentation. A new fact or tampered evidence changes package binding and invalidates prior approval. No repeated suite execution is needed solely to render or propagate retained facts.
- Use deterministic fixtures first. Run maintained affected suites and required broader checks after source implementation. No paid model, smoke or customer command is authorized by this design; any future model-adherence claim requires separately authorized evidence.

**Rollback/completion criteria.** Revert fresh-run enablement and call-site adoption plus the capture/propagation implementation together while retaining sidecars/logs and previous approved packages as history. Never delete failed records or relabel a new-format saved run as legacy to bypass its consistency contract; provide an explicit safe continuation/read path for any new-format run created during rollout. The design is ready for a bounded implementation only when tests demonstrate immutable factual status across all presentation boundaries, full-output provenance and compatibility without adding a compile-pass requirement. Design selection is complete; source implementation, schema details, commits, PR changes and smoke remain unselected.


### D042 — Optional command capture, first lower-risk stage, 2026-11-26

**Selection/scope.** Following the smaller staged-rollout recommendation and the explanation that capture happens during Execute/Lightweight, the maintainer replied **OK**. The assistant stated it would start with optional local capture, leaving downstream propagation and smoke pending. This selects that first-stage local implementation, not D041's full capture/registry/review/package design. Preserve the pre-existing uncommitted D041 design on top of `13f2b30` and draft PR #119. No commit, push, PR update, version bump, live model evaluation, customer command or smoke is selected here.

**Implemented foundation.** `scripts/regression.mjs runCommand` now accepts an optional asynchronous `onOutput(stream, bytes)` observer. It keeps original stdout/stderr buffers separate for the observer, with per-stream backpressure; the existing combined 16,000-character tail, progress, actual exit/error/signal/timeout and regression gate aggregation remain. Observer failure yields `output_capture_error`, drains remaining output and does not convert a passing child into a failed command or trigger a retry. Calls without an observer retain their existing result fields. A final targeted negative check covers observers that throw an error with no message, so a falsy string cannot hide a capture failure.

`scripts/command-evidence.mjs run` adds optional active Execute/Lightweight capture for one already-selected command. It validates the saved run path/identity, approved source scope, cwd containment, branch and managed-session repository binding; reuses the existing source snapshot and runner; and allocates distinct local record/stdout/stderr files. The record is written as started before launch and finalized atomically after the single execution. Raw logs and records use private file modes. It records exact argv/cwd, run/plan identity, before/after HEAD and dirty-tree fingerprints, actual process result, stream byte counts/hashes, warnings and capture completeness. Baseline/destination provenance remain unknown. Boundary equality is not proof of unchanged source throughout execution or a current-tree test certificate. File hashes are capture metadata, not a tamper-proof log or a downstream freshness check.

**Failure semantics.** Setup rejection means no command ran. A started command's nonzero result remains nonzero even if its output says success; the capture CLI preserves that exit where representable, with full result JSON still on stdout. Missing executable/startup failure, wrapper exit 127, signal/timeout, logging-only failure and missing/unfinalizable record stay distinct. A failed final record save returns the actual observed process result with `record_saved: false`/incomplete capture rather than rerunning or losing the exit. Interrupted started/empty files never imply pass. Raw output stream files and record paths stay under the existing Git-protected artifact root; argv/raw data is not share-safe feedback and must not enter product delivery. No automatic upload occurs.

**Integration and preserved behavior.** The existing compilation-evidence guide, already passed to Execute/Lightweight workers, documents the opt-in invocation, manifest, separate result/capture flags and manual qualification obligations. Lightweight grants the narrowly described helper-owned capture output and input-file exception when the parent supplies capture context; workflow state remains parent-owned. The regression guide documents the optional observer. There is no automatic command selection, dependency installation, baseline checkout/build, new initialized-run marker, new required state field, capture registry, verification-ledger migration, reviewer/gate/routing change or approved-package rewrite. Existing manual qualification preservation remains mandatory; optional capture does not itself fix the downstream WF-044 omission.

**Risk and limits.** **Low–Medium** for optional local capture: disk/source-snapshot I/O and process-observer handling are new, while existing execution/gate policy remains. Stream backpressure may slow a noisy process; the existing process timeout is not extended and filesystem completion has no new hard deadline. Capture failures are explicit limits, not a newly mandatory passing check. The first stage observes only calls using the helper/observer and does not certify arbitrary Bash commands. The broader D041 registry, automatic fact propagation, new-run compatibility/freshness enforcement and package binding remain unimplemented/unselected. Historical WF-044 count stays one session. Existing records can be retained/read as data even after rollback; remove the optional caller/helper/observer additions together without rewriting saved workflow state or historical packages.

**Verification completed.**

- Full maintained workflow command (`node --test skills/write-the-tests/scripts/*.test.mjs skills/implement/scripts/*.test.mjs skills/execute/scripts/*.test.mjs scripts/*.test.mjs`): **852/852 passed**, zero failures/cancellations/skips, about 446 seconds. Existing regression/gate outcomes, progress failures, saved/legacy workflows, package approval and delivery checks remain passing.
- Harness/package command (`node --test evals/*.test.mjs tools/anthropic-release/package.test.mjs`): **115/115 passed**, zero failures/cancellations/skips. Strict plugin manifest, skills and marketplace validation passed; the existing missing-icon advisory remains. Inventory validates **191 cases**; `git diff --check` passed.
- Focused final-source capture/regression/progress command: **28/28 passed**, zero failures/cancellations/skips. These overlap the full suite and are not added to its count. Coverage includes full large UTF-8 byte streams with split codepoint writes, nonzero status despite success output, dirty-tree fingerprint differences, source mutations during a command, timeout, missing executable versus wrapper exit, literal argv, distinct concurrent files, CLI nonzero exit plus progress/JSON separation, rejected scope/branch/cwd/phase, managed-worktree binding, same-root legacy/marked naming, private file modes and unchanged workflow state. A started record is observed before the child runs. Simulated sink failure (including an empty error message) and a deliberately unfinalizable record retain the actual command result without a second execution; a replaced/symlinked output is incomplete rather than overwriting its target. The final focused run includes the CLI progress wiring and empty-observer-error robustness correction made while the broader checks were running.
- An initial new Lightweight fixture lacked the existing adaptive metadata and failed before execution; the fixture was corrected while retaining the production state validation. Later focused and broad checks passed. Do not interpret this setup failure as a new customer/runtime occurrence.
- A disposable source snapshot containing current helper/guidance bytes built and verified a **16-skill / 210-file** runtime package, including `command-evidence.mjs`. Integrity and a separate clean-copy integrity/strict-skills check passed. The temporary fixture commit/copies were removed; no maintainer checkout commit or account installation occurred. Later result text in this ledger differs from the packaging snapshot, while runtime helper/guidance bytes remain unchanged.

**Completion and remaining boundary.** The selected optional capture stage is implemented and deterministically verified locally. D041's registry/new-run marker, automatic review/package/completion/delivery propagation and downstream freshness policy remain unimplemented. WF-044's approval-omission issue is not marked fixed by this foundation. No paid model, smoke, customer command, version bump, commit, push or PR update was performed. All code/design/result changes remain uncommitted; existing PR #119 is unchanged.


### D043 — Captured-command propagation into Review and approval, 2026-11-26

**Selection/scope.** After D042, the assistant recommended stage 2: generate facts from captured records, include them in reviewer inputs and bind/render them in the final package, preserving old runs and deferring baseline inference, automatic supersession and new gates. The maintainer replied **OK**. This selects local implementation of that bounded propagation. Preserve the existing uncommitted D041/D042 design/capture work on top of `13f2b30`; no version bump, commit/push, update to draft PR #119, installation or smoke/model evaluation is selected.

**Implemented behavior.** `scripts/lib/command-facts.mjs` inventories the run-local command-capture filenames produced by D042, verifies applicable run identity and basic recorded process semantics, streams hashes of record/raw-output files and generates factual notes. It includes captured failures and passes independently, marks malformed/unfinished/incomplete data as unknown or unverified, ignores identifiable records from another run, and rejects unsafe references/symlinks. It does not execute a check, classify diagnostics, infer baseline inheritance/current-tree coverage, select a latest winner or alter passing-gate policy. Raw argv, output/error text, repository names and paths are excluded from generated delivery notes; private records retain the exact details.

- Newly prepared delivery-aligned review targets optionally include `verification_context.command_facts` when captures exist. Preparation returns the whole inventory to the reviewer. Known record identities from same-run prior targets are retained across preparation; a missing bound record becomes an explicit unknown rather than silently disappearing. This reuses existing target/evidence history, not a new registry or initialized-state feature. Captures lost before their first binding cannot be reconstructed.
- `review-report.mjs write` reads the bound facts independently and merges their generated notes with the model's semantic `validation_notes` before rendering report/chat/evidence. The reviewer cannot omit a captured result merely by leaving its input note array empty. Scope validation checks the fact inventory and generated-note presence along with existing report/target/diff bindings. Source locations, required-rule assessments, mappings and review routing retain their prior enforcement.
- Final packaging independently verifies the reviewed inventory, includes its optional manifest and private record links, and preserves generated qualifications through its Markdown, `check` response and assurance summary. Known missing records display as unavailable, not broken record links. Existing delivery preparation already appends `validation_notes` to its separately approved PR draft; no new publication action is introduced, and safe generated notes contain no raw arguments or logs. Existing required-gate outcomes remain separate: a recorded supplemental nonzero exit can coexist with CLEAN review and a passing configured gate, with the qualification visible. As with other validation notes, the existing assurance presentation can become Limited; eligibility, mode and approval requirements do not change.
- Added, changed or removed bound capture data invalidates the existing reviewed context/package hash. Inspection with `requireCurrent: false` can identify command-fact drift as uncovered without certifying it, so the existing `refresh-review`/final-sync route can return to Review instead of becoming a stale-evidence dead end. Only command-fact drift is relaxed for this inspection; other verification context, target/diff integrity and report bindings stay strict. The controller derives that condition itself and explains evidence-only refresh truthfully. Execution/fix progress, source approval, review ownership and review-cycle caps are preserved. No command rerun is needed to repair or re-render reporting.

**Compatibility and adoption.** Saved targets without the optional fact field do not suddenly inventory captures during checks; saved package reconstruction remains unchanged when the reviewed evidence lacks command facts. Explicit new preparation adopts captured records. Ordinary uncaptured commands and legacy reports retain their current behavior; there is no shell interception, mandatory compilation, baseline build, automatic test execution, state/verification-ledger migration, new workflow stage or added user question. Capture-enabled targets/packages need compatible current helpers; rollback must retain their reader or leave them pending, never delete bindings or rewrite an approval as legacy. The first-stage capture helper remains optional. A model still owns semantic interpretation, source/code review and presentation of returned approval/completion text; this does not guarantee all future model adherence or recover omitted facts from old free-text reports.

**Risk/rollback.** **Medium** for evidence binding, generated disclosure, compatibility and finalization recovery. The selected scope adds optional fields to newly prepared targets/review evidence/packages while preserving existing saved formats without them. It does not add an independent registry, source-freshness/supersession policy or hard compile-pass gate. Raw-file hash verification adds local I/O; logs are streamed, not loaded wholesale or re-executed. Revert adoption and propagation together while preserving capture files and a safe read path for enabled artifacts. Do not waive failed product checks, erase prior failures or relabel new-format approvals merely to downgrade.

**Focused verification so far.** Synthetic reader controls establish retention of historical failure plus later pass, unknown baseline despite a contrary metadata claim, redaction of raw command/output from generated notes, malformed/contradictory/missing captures and unsafe path rejection. A real disposable Git/Node fixture exercises capture → target → review writer with an omitted failure note → package build/approval → local delivery preview: failure and pass remain disclosed, supplemental failure does not create a new gate, and private argv/output does not enter generated PR text. Negative controls cover stripped review facts, changed/missing raw files, added captures, stale approval, idempotent preparation and old-target compatibility. Recovery uses the actual controller refresh event, preserves execution/fix progress, retains a removed known record as unknown and successfully packages that limitation without rerunning commands. The inspection recovery does not bypass corrupted diff artifacts. These are controlled fixture observations, not customer compilation or a live model run.

**Verification completed.**

- Full maintained workflow command (`node --test skills/write-the-tests/scripts/*.test.mjs skills/implement/scripts/*.test.mjs skills/execute/scripts/*.test.mjs scripts/*.test.mjs`): **858/858 passed**, zero failures/cancellations/skips, about 389 seconds. This includes prior saved-package, legacy, source-scope, approval, gate and delivery cases alongside the new fact controls.
- Harness/package command (`node --test evals/*.test.mjs tools/anthropic-release/package.test.mjs`): **115/115 passed**, zero failures/cancellations/skips. Strict plugin manifest, skill directory and marketplace validation passed; the pre-existing missing-icon directory advisory remains. Inventory validates **191 cases**; `git diff --check` passed.
- Focused reader/writer/review-scope checks passed **33/33**; a final reader-only run passed **3/3** after the boundary-comparison wording was made explicit. The final targeted recovery case passed **1/1**, including successful packaging of an unknown/missing bound record and rejection of corrupted diff evidence even in recovery inspection. These overlap the full suite and are not added to its count. Final generated facts distinguish matching/different/unavailable recorded boundary snapshots without certifying source freshness; this small presentation strengthening was covered by the final focused controls.
- A disposable snapshot of the final local runtime/helper/guidance bytes built a **16-skill / 211-file** distribution. Runtime integrity, a separate clean-copy integrity check and strict validation of its exported skills passed. Fixture-only commits/copies were removed. Later findings-ledger result text differs from that package snapshot; runtime bytes remain unchanged. No account installation, public artifact, tag or release was created.

**Completion/limits.** The selected propagation stage is implemented and verified locally for supported, capture-enabled new review targets. It prevents omitting those recorded outcomes merely by dropping a model-supplied qualification and binds them into the existing approval/delivery path. It does not recover uncaptured commands, infer compiler behavior behind wrappers, prove baseline inheritance, infer current-source coverage, automatically supersede old results or guarantee chat adherence. Old targets/packages without captures keep their original contract until explicit preparation; a lost record before any binding is not reconstructible. Historical WF-044 count remains one session; no live customer reduction in omission/error rate is established. Source/design/ledger changes remain uncommitted alongside D042. No smoke/model test, version bump, commit, push, PR update or user-plugin installation was performed.


### D044 — Deliver capture and propagation together as 5.17.4, 2026-11-26

**Selection.** After PR #119 became ready, the maintainer selected one follow-up PR with two separately reviewable commits: optional capture first, then bound fact propagation. This authorizes focused review, necessary fixes, a 5.17.4 version/changelog update, commit/push and a draft PR. Preserve the original uncommitted checkout and prepare the changes in an isolated worktree based on PR #119's latest head `5a47c300c063a35dd85461aea0120a352e3e91f6`. While #119 remains unmerged, target its branch so this PR shows only the follow-up; retarget to main after the dependency merges. No merge, paid smoke/model evaluation, release/tag or user-plugin installation is selected.

**Scope/risk.** Keep D042's capture optional and D043's propagation restricted to explicitly prepared capture-enabled targets. The combined change retains Medium risk because it binds review/package evidence and approval. Preserve actual process results when capture fails, private raw output, unknown baseline/current-source coverage, existing gates, old saved artifacts and the reader needed for capture-enabled artifacts during rollback. The historical WF-044 count remains one session; deterministic fixtures do not establish live error-rate reduction or universal model adherence.

**Review and verification completed.** Focused source review found no additional blocker in the selected capture/result, raw-file containment, generated-note, approval-binding or saved-target compatibility boundaries. No further runtime changes were needed after D043; the delivery preparation adds the version/changelog and this record.

- Full maintained workflow command (`node --test skills/write-the-tests/scripts/*.test.mjs skills/implement/scripts/*.test.mjs skills/execute/scripts/*.test.mjs scripts/*.test.mjs`): **858/858 passed**, zero failures/cancellations/skips, about 367 seconds.
- Harness/package command (`node --test evals/*.test.mjs tools/anthropic-release/*.test.mjs`): **116/116 passed**, zero failures/cancellations/skips. This includes PR #119's additional saved-planning-log grader control.
- Focused capture/facts/regression/progress/review-scope command: **49/49 passed**, overlapping the full suite. Real disposable Git/Node fixtures retained a nonzero exit despite success output, full separate output, omitted failure qualifications through package approval and delivery preview, unknown missing evidence, stale approval rejection and old-target compatibility. These are controlled fixture checks, not customer compilation or a live model run.
- Capture-only commit `4027b4d` independently passed **28/28** capture/regression/progress checks in a separate detached checkout; no propagation files were needed. These overlap the full candidate checks.
- Strict plugin/skills/marketplace validation, `git diff --check` and the **191-case / 16-skill** evaluation inventory passed. The manifest validator retains its existing missing-icon advisory. Version **5.17.4** is set in the plugin manifest and changelog.
- Committed-runtime packaging, isolated installation and hosted CI evidence are recorded in the follow-up PR at its exact source head. Historical D042/D043 results retain their original source boundaries and are not counted as new delivery checks.

**Remaining boundary.** The follow-up stays draft pending its own required per-PR smoke sequence and human review; PR #119's smoke does not certify this change. No paid evaluation, merge, release/tag or user-plugin installation was performed. Preserve the original checkout's uncommitted files; the two delivery commits live on the isolated follow-up branch.


**Delivery status update — 2026-11-27.** Repository history at `5c0fd6b` confirms both capture and propagation commits (`4027b4d`, `a43259f`) reached main through PR #120 (`24543f1`). The draft-only boundary above is historical. Retain D043's capture-enabled applicability and all legacy/uncaptured qualifications; this merge record establishes no live customer-run verification.

### D045 — Earlier delivery checks, checkpoint diagnostics and routing guidance, 2026-11-27

**Selection.** The maintainer selected implementation of the three-item next batch (WF-051, WF-047, WF-052), chose stopping before approval on prerequisite failure, and agreed to include authenticated read-only Bitbucket repository access checks alongside GitHub checks. Existing uncommitted R011/R012 ledger additions are preserved. This is local implementation only; no version bump, commit, push, PR, installation or paid model/smoke evaluation is selected.

**Implementation and boundaries.** Delivery preparation checks the provider selected from each included repository's origin before saving a replacement plan or entering awaiting-approval. A shared helper checks GitHub availability/auth once and repository-specific PR read access for each GitHub repository; Bitbucket validates credentials and performs an authenticated repository GET per included repository. Prerequisite subprocesses/requests have 30-second timeouts; Bitbucket preflight refuses redirects. Errors expose safe provider/repository/stage classifications, not arbitrary provider output or credentials, and preparation points to the existing package draft. Invalid Bitbucket credential JSON no longer echoes its raw contents. No commit, push or PR write is part of preflight. Existing package validation, artifact protection and temporary candidate-tree construction retain their contracts. Existing saved plan/preview formats and exact approval hashes are unchanged. Initial execution revalidates through the same helper; partial retries preserve their prior journal/recovery behavior. Passing reads do not establish write permissions, hook compatibility or future connectivity.

Activity CLI diagnostics identify required-prefix ordering, missing values, duplicate options and unknown options before reading state. Valid forms, category meaning, hook gating and successful state updates retain their contract. README quick-start guidance points uncertain repository ownership to existing bounded workspace discovery; it adds no automatic scan or startup gate. These are independent changes that can be reviewed separately.

**Risk/rollback.** WF-051 remains Low–Medium because preparation now performs bounded network reads and Bitbucket access is checked earlier; provider/network failure stops before a new approval request. WF-047 and the WF-052 wording change are Low. Revert early checks and the added Bitbucket read check while preserving original run-time prerequisites, saved delivery artifacts and partial-retry recovery; revert diagnostics/guidance independently. No migration or approval rewrite is required. Historical findings retain their original session counts; no live reduction in failure rate, review burden or lost time is claimed.

**Verification completed.** Disposable Git/provider fixtures cover early failure, later credential failure, multi-provider selection, timeout/redaction, saved plans and partial recovery. Provider reads in existing package/review and delivery evaluation fixtures are mocked locally; unexpected provider writes fail.

- Full CI workflow-helper command (`node --test skills/write-the-tests/scripts/*.test.mjs skills/implement/scripts/*.test.mjs skills/execute/scripts/*.test.mjs scripts/*.test.mjs scripts/lib/*.test.mjs`): **869/869 passed**, zero failures/cancellations/skips, about 431 seconds.
- Harness/package command (`node --test evals/*.test.mjs tools/anthropic-release/*.test.mjs`): **116/116 passed**, zero failures/cancellations/skips.
- Renderer/startup focused run: **130/130 passed**. Final delivery controls: **4/4 passed**, covering early blockers, expired authentication, missing CLI/saved-plan retention and mixed-provider/timeout behavior, including existing partial-retry safety assertions. Final CLI diagnostics and provider-only checks each passed **1/1** after tightening duplicate-required-option/missing-value diagnostics and exact provider command counts. These focused checks overlap the full suite and are not added to its total.
- Initial focused runs exposed one test expecting verbatim prior SSO output. Its assertion now requires the affected repository and safe SSO classification; the unchanged-Git-state and recovery assertions remain. Subsequent full and final targeted runs passed.
- Strict plugin/skills/marketplace validation, `git diff --check` and the **191-case / 16-skill** evaluation inventory passed. The manifest validator retains its existing missing-icon advisory. README commands and its workspace anchor were reviewed manually.

**Completion/limits.** The selected local batch is implemented and deterministically verified. Existing uncommitted ledger content is preserved; all changes remain uncommitted. No customer repository, provider account, live publication, paid model/smoke run, version bump or installation was used. These fixtures do not establish live provider availability or reduced customer failure rates; future PR readiness still requires the repository's per-PR smoke sequence.


**D045 delivery selection — 2026-11-27.** The maintainer explicitly requested commit, push and PR creation with a version bump, then authorized smoke testing with a cost cap to make the PR ready. Prepare version 5.17.6 with the bounded runtime/docs/fixture changes and this D045 record. Preserve the pre-existing review additions and ledger reorganization as local edits outside this delivery. Earlier local-only boundaries above are historical. Run smoke from a clean isolated checkout of the final commit; use the existing per-PR initial run and only unresolved-case retries, with an aggregate $12 budget across attempts. Do not merge or install the plugin. Publication and smoke results follow in the PR; deterministic validation above retains its original source scope.


**D045 delivery outcome — 2026-11-27.** Version **5.17.6** is committed and pushed as three reviewable commits: delivery prerequisites `8ea80a8`, checkpoint diagnostics `a290961`, and routing/release documentation `4dc071b`. [PR #122](https://github.com/insideout-ai/make-it-work/pull/122) targets main and is **ready for review**, verified at exact head `4dc071bffe67c3bda6b591e9e4eefde5724df0ca`. Hosted validation passed. The required initial smoke sequence passed **16/16**, zero failures, on a clean isolated checkout with the source unchanged, reported execution/grading usage **$6.22678543** under the initial $9 allowance and aggregate $12 cap. No retries were needed. Command: `node evals/run-suite.mjs smoke --pr=122 --ready --max-cost-usd=9 --concurrency=3`. Initial report retained locally under `evals/results/smoke-2026-11-27T13-06-16-838Z/summary.json`; cumulative shared ledger is `.git/miw-smoke/pr-122.json`; case results and source/cost evidence are recorded in the PR description. Only this batch's D045 record was staged from the mixed ledger; the pre-existing review/reorganization edits and this outcome note remain local. No merge, tag/release, live provider/customer verification or plugin installation occurred.


### D046 — Planning recovery wording and review-path examples, 2026-11-28

**Selection and scope.** The maintainer requested implementation of the proposed two-item plan after prioritization of R012/R013 findings. Prepare one local patch for WF-015 recovery wording and WF-042 review-path examples, retaining historical decisions and unrelated work. No version bump, installation, commit, push, PR or paid evaluation is selected.

**Implementation.** The missing-chat denial and activity reference distinguish already-sent current-cycle narration from missing/different text: do not repeat the former, end the response without tools and retry the unchanged checkpoint on automatic continuation; send the exact sentence for the latter. Dependent work still requires checkpoint success. Coordinator/reviewer examples distinguish absolute artifact-root/input-file paths from the exact helper-returned artifact-relative `review_target` and its unchanged hash. Reading via an absolute resolved path does not change that JSON field. No naming convention is constructed.

**Preserved contracts and risk.** Low risk for these bounded wording/examples changes. Transcript matching, one-second reread, phase freshness, Stop recovery, return shape, resolver/containment checks, schemas, approval hashes and saved artifacts remain unchanged. Runtime hook changes and broader verification/context-update path remedies remain unselected. Existing D008/D038/D039 evidence and qualifications remain historical; deterministic fixtures cannot establish universal model adherence or fewer live retries.

**Verification.** Completed locally. Extended the maintained recovery fixture across Plan/fix-plan with one persisted narration and unchanged state. Added an actual review CLI invocation from another cwd using an absolute input file and helper-returned relative target; absolute, wrong-run and outside-root target fields remain rejected with the saved report preserved. Existing stale-hash and legacy coverage is retained.

**Rollback/completion.** Revert only this patch's wording, examples and regression changes if needed; retain saved state, reports, receipts and historical decisions. The focused checks and repository-required local deterministic/strict validation passed as recorded below; no live customer or paid-model verification is implied.


**D046 verification outcome — 2026-11-28.** All checks passed on the local patch:

- Focused planning-activity/startup-presentation/review-report/review-scope tests: **88/88**, zero failures, cancellations or skips. This includes both Plan/fix-plan recovery and the actual cross-cwd review CLI example with rejected target variants.
- Full CI workflow-helper command (`node --test skills/write-the-tests/scripts/*.test.mjs skills/implement/scripts/*.test.mjs skills/execute/scripts/*.test.mjs scripts/*.test.mjs scripts/lib/*.test.mjs`): **909/909**, zero failures, cancellations or skips, about 417 seconds.
- Harness/package checks (`node --test evals/*.test.mjs tools/anthropic-release/*.test.mjs`): **116/116**, zero failures, cancellations or skips. Focused counts overlap the full suite and are not additive.
- Strict plugin manifest, skill and marketplace validation passed. The manifest validator retains its existing missing-icon advisory. Evaluation inventory passed with **194 cases / 16 smoke skills**. Whitespace validation passed.

**Completion/limits.** The selected patch is implemented and verified locally, uncommitted, with no version bump, installation or publication. Existing saved artifacts and runtime policies are unchanged. Fixture recovery and path enforcement are observed; live model adherence, host transcript-flush behavior and actual reductions in repeated narration/retries remain unverified. No application test, customer checkout, paid model evaluation or external write was used. The earlier D038 runtime remedy and broader WF-042 path remedies remain unselected.


**D046 delivery selection — 2026-11-28.** The maintainer explicitly requested adding these fixes to existing PR #124. This authorizes committing the seven-file local patch on its existing release branch, pushing it and updating the PR description with the bounded scope and recorded validation. The earlier local-only/uncommitted boundary describes the initial implementation checkpoint. Retain version 5.19.0, existing smoke evidence and its original source qualifications; no merge, installation or additional paid smoke is selected. Hosted validation of the new head remains separate from the local passing checks above.

### D047 — Cost CLI repair and automatic estimation, 2026-11-28

**Selection and intended outcome.** Direct maintainer conversation selected Crash + automatic cost, accepted a plan with `MIW_ESTIMATE_COST=0` as opt-out, and later explicitly requested Proceed outside Plan mode. Repair the documented CLI and run best-effort estimation after finalized feedback, before the completion summary/delivery offer. No late archive command, automatic historical backfill or other R014 remedy is selected. Preserve all earlier decisions. This separate implementation request supersedes the review-only boundary for this selected source work.

**Implementation.** Reusable functions now live in `skills/implement/scripts/implementation-cost-core.mjs`. The existing CLI file is a thin wrapper, re-exporting the four prior public functions for compatibility; the renderer imports the core directly. The CLI entry module is no longer part of the renderer's dependency loop. Extraction preserves the calculation/persistence code except the explicit default change and removal of CLI-only imports. `costEnabled` now returns true unless `MIW_ESTIMATE_COST` equals `0`; unset and previous `1` settings work. The renderer displays only validated saved cost snapshots, never synthesizes a pending-cost promise from the flag, and still displays saved estimates when new calculations are disabled. Completion/feedback instructions, README, observability documentation and Unreleased changelog explain the behavior.

**Preserved behavior / compatibility.** Same CLI arguments, JSON output, function exports, result schema, naming conventions, run/state/archive binding, pricing and coverage qualifications, timeout, locks, saved partial/unavailable reuse and eligible retry-stop handling. Feedback must be finalized; offering delivery still prevents a fresh late calculation. Rendering never calculates or collects transcripts. No changed workflow/approval/package fields or new gate; failures remain nonblocking. Estimates remain partial API equivalents through archive capture. Existing frozen approvals, feedback receipts and historical audit entries remain intact.

**Validation observed.** New fresh-process tests cover default enablement, explicit `1` and `0`, missing state (structured unavailable instead of exit 13), finalized state with no archive, silent library/renderer import in both orders, and actual offline ZIP-to-worker calculation followed by saved result, dashboard refresh and reuse even after archive removal. A disposable finalized run with an existing dashboard produces the independently expected fixture amount; workflow fields, approved package and feedback receipt remain unchanged. Opt-out leaves files/state untouched; saved results still render under opt-out. Legacy/no-snapshot dashboards neither promise cost nor create cost files.

- Focused cost/renderer checks: **107/107 passed**, no failures/skips/cancellations. An initial new fixture omitted the existing dashboard, so its refresh assertion failed; the fixture was corrected to create the dashboard as a real run does, preserving the existing no-backfill behavior. The complete focused set then passed.
- Full workflow checks (`node --test skills/write-the-tests/scripts/*.test.mjs skills/implement/scripts/*.test.mjs skills/execute/scripts/*.test.mjs scripts/*.test.mjs scripts/lib/*.test.mjs`): **918/918 passed**, no failures/skips/cancellations, approximately 377 seconds. Focused counts overlap and are not additive.
- Harness/package checks (`node --test evals/*.test.mjs tools/anthropic-release/*.test.mjs`): **116/116 passed**, no failures/skips/cancellations.
- Strict plugin manifest, skills and marketplace validation passed. Existing missing-icon advisory remains. Whitespace validation passed.

**Risk, rollback and completion.** Fix risk remains Low–Medium: shared module initialization and default behavior changed, with the saved schema and side-effect rules preserved and covered by deterministic compatibility tests. The selected local implementation and checks are complete, uncommitted, with no version bump, publication or installation. Actual live model invocation/adherence, a live customer completion and billing agreement were not tested; pricing behavior was tested with deterministic fixtures, not a new live-price verification. No original live session/dashboard/archive was modified. Roll back the module split, enablement default, matching renderer/docs and focused CLI tests together if needed; retain existing cost snapshots and audit history. No unrelated cleanup or further remedy is implied.

**D047 delivery selection — 2026-11-28.** The maintainer explicitly requested adding this work to existing PR #124. This authorizes committing the tested CLI/default-estimation patch and its review ledger on the existing release branch, pushing it and updating that PR's description. Retain version 5.19.0 and existing paid-smoke evidence with its original source qualifications; no merge, installation or new paid evaluation is selected. Local checks above precede publication; hosted checks on the new head remain separate.
