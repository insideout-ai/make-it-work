# Workflow findings

Maintainer review ledger. Recommendations are proposals; they do not authorize changes. Preserve successful behavior and record minor friction so recurrence can inform later decisions. Fix risk describes a proposed remedy, independently of issue impact. R001 records the initial undecided review; D001/D002 below record the subsequently authorized decisions, implementation and validation status.

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

## Decision summary

| ID | Issue impact | Distinct sessions | Proposed action | Fix risk | Recommendation | Maintainer decision |
| --- | --- | --- | --- | --- | --- | --- |
| [WF-001](#wf-001--repository-access-failed-after-commit-and-push) | Major: delivery | 2 (A, B) | Repository-specific read-only preflight | Low, bounded prerequisite check; later writes can still fail | Fix | Fix — implemented; checks below |
| [WF-002](#wf-002--delegate-test-attribution-was-omitted-from-proposed-publication-text) | Major: evidence trust | 1; repeated presentations | Inspect existing qualification-to-summary path | Unknown until enforcement approach is chosen | Investigate | Investigated — qualifications preserved; see R002 |
| [WF-003](#wf-003--frontend-cause-was-stated-more-definitively-than-the-investigation-supported) | Minor: diagnostic wording | 1 | Preserve hypothesis wording in handoffs | Low for a narrow guidance correction | Investigate | Investigated — hypothesis preserved; see R002 |
| [WF-004](#wf-004--question-options-mixed-scope-decisions-and-the-custom-answer-was-rejected) | Minor: refinement friction | 1 | Improve option/dependency guidance before considering schema changes | Medium: agent questioning behavior | Investigate | Defer |
| [WF-005](#wf-005--delegate-report-path-base-was-unclear-at-the-call-site) | Minor: helper retry | 2 (A, B) | Document absolute helper-returned paths | Low: documentation; keep resolver semantics | Fix | Fix — implemented; checks below |
| [WF-006](#wf-006--saved-feedback-narrative-conflicted-with-its-collection-notes) | Minor: report accuracy | 1 | Apply existing bounded closing check to visible failures | Low for narrow guidance; enforcement design unassessed | Investigate | Investigated — consistency case passed; see R002 |
| [WF-007](#wf-007--sanitization-rejected-generic-workflow-vocabulary) | Minor: validator retry | 3 (A, B, D) — new terms need characterization | Assess narrow public-vocabulary exception | Medium: privacy protection must remain effective | Investigate | Fix — exact public-vocabulary exception implemented; see D004 |
| [WF-008](#wf-008--approval-narration-paraphrased-the-proposed-pr-body) | Minor: approval reviewability | 1 synthetic eval | Copy complete built-package text into approval | Low: guidance only | Fix | Implemented — focused retry passed; see D002 |
| [WF-009](#wf-009--publication-helper-rejected-the-miw--journal-filename-after-consent) | Major: consented ticket updates unavailable for the whole run | 2 (B, C) | Make the journal-name check accept the saved `miw-` form while keeping run binding | Medium: external-write path and legacy-name compatibility | Fix | Fix — implemented; deterministic regression checks passed, see D003 |
| [WF-010](#wf-010--run-began-on-another-tickets-feature-branch-without-a-question-and-was-restarted) | Minor: startup friction (user-reported expectation) | 1 (session B) | Detect a branch naming a different ticket; alert and ask continue vs new branch | Medium: startup/branch gating | Investigate (user's expectation raises confidence) | Fix — implemented; startup probe passed, see D003 |
| [WF-011](#wf-011--delegate-flagged-test-compromise-on-a-spec-clause-was-accepted-and-two-fix-rounds-followed) | Minor: avoidable fix rounds (safeguard worked) | 1 (session B) | Investigate reconciling delegate-flagged modelling compromises before execution | Medium: planning/test-prep behavior | Investigate | Investigated — focused hand-back probe passed; see D003 |
| [WF-012](#wf-012--a-one-line-final-sync-documentation-edit-consumed-the-last-allowed-review-cycle) | Minor: review budget | 1 (session B) | Observe only; no change proposed yet | High if the cycle cap or reopen rule changed | Defer | Defer — retain current review safeguards; see D003 |
| [WF-013](#wf-013--handoff-directory-was-resolved-with-the-miw--prefix-the-helper-requires-none) | Minor: helper retry | 1 (session B) | Clarify directory vs file prefix at the handoff call site | Low: documentation | Investigate | Fix — path guidance clarified; naming checks passed, see D003 |
| [WF-014](#wf-014--plan-approval-did-not-call-out-risks-left-above-low-after-mitigation-user-suggested) | Minor: user-suggested approval warning | 1 (session B) | Warn on unmitigated risks above Low at plan approval; default accept, offer discussion | Medium: approval-prompt content | Investigate | Fix — implemented; risk-presentation probes passed, see D003 |
| [WF-015](#wf-015--planning-activity-hook-denied-same-turn-narration-and-forced-repeated-narration-and-stop-hook-rounds) | Minor: repeated hook denials and duplicate narration in planning | 2 (C, D) | Investigate transcript-flush timing and the compliant repair path | Medium: hook gating in plan/fix-plan | Investigate | Fix — implemented; 744 workflow tests passed, see D008 |
| [WF-016](#wf-016--plan-file-lists-missed-files-the-tests-and-steps-needed-requiring-repeated-amendments) | Minor: repeated scope/preparation corrections and user decisions | 1 (session C) | Reconcile known contract callers, per-step edit lists and test-support destinations during existing self-review | Low for selected guidance; broader authorization changes unassessed | Fix (guidance) | Guidance clarification implemented; authorization unchanged and live adherence unverified, see D019/D020 |
| [WF-017](#wf-017--regression-and-verification-helper-input-shapes-were-learned-by-reading-helper-source) | Minor: helper retry, first gate ran no tests | 1 (session C) | Add exact input examples at the call sites | Low: documentation | Fix | Fix — examples implemented; validation below, see D005 |
| [WF-018](#wf-018--parallel-delegates-wrote-the-same-evidence-filename) | Minor: evidence overwritten, recovered | 1 (session C) | Investigate dispatch wording for parallel delegates | Low–Medium | Investigate | Fix — distinct worker evidence naming guidance implemented; see D012 |
| [WF-019](#wf-019--unrelated-pre-existing-local-files-entered-the-review-target-final-package-and-delivery-plan) | Major: review/delivery scope | 1 (session D) | Find why the helper listed 3 of 18+ files; flag out-of-plan paths once at `prepare` | Medium: review/package/delivery path sets | Investigate | Fix — advisory scope handling for new runs; D010 supersedes the D009 gates |
| [WF-020](#wf-020--delivery-plan-offered-no-path-subset-so-a-subset-was-delivered-with-raw-git-and-gh) | Minor: delivery outside helper (user-directed) | 1 (session D) | Optional selected-file delivery with exact candidate-tree and branch-scope preview | Medium–High: approval/hash binding and candidate assurance | Investigate | Fix — implemented and validated locally; see D015/D016 for evidence and limits |
| [WF-021](#wf-021--silent-completion-gate-stall-and-mis-estimated-gate-cost-drew-three-user-complaints) | Major: about 110 min gate time, user complaints | 1 (session D) | Idle detection in the runner or call-site guidance on timeouts/estimates | Low (wording) to Medium (runner) | Investigate | Fix — progress retained; reporting failures are advisory, see D007/D010 |
| [WF-022](#wf-022--branch-helper-created-the-ticket-branch-at-current-head-not-the-previewed-base) | Major: startup/delivery integrity (agent recovered) | 1 (session D) | (a) Truthful preview of the start point; (b) consider `origin/<base>` start | (a) Low–Medium; (b) Medium–High | Fix (a), Investigate (b) | Fix (a) — implemented; tracking-only drift is advisory, see D005/D010; (b) remains investigation |
| [WF-023](#wf-023--verificationmjs-check---state-exited-13-with-an-unsettled-top-level-await) | Minor: verification CLI result lost | 1 (session D) | Investigate the unsettled await | Low–Medium | Investigate | Fix — reproduced and implemented; 762 workflow tests passed, see D011 |
| [WF-024](#wf-024--branch-pause-message-gave-no-path-to-restore-the-branch) | Minor: wording | 1 (session D) | None until recurrence | Low | Defer | Undecided |
| [WF-025](#wf-025--context-grew-to-about-854k-tokens-user-reported-85-of-the-window) | Major (user-reported, observed growth): context pressure | 1 (session D) | Identify the largest context contributors | Unknown until cause is established | Investigate | Partial — compact feedback-save receipt implemented; broader context attribution remains open, see D005/D013 |
| [WF-026](#wf-026--default-full-delivery-can-omit-a-local-reversal-and-publish-a-different-tree) | Major: delivered content can differ from the source package | 0 historical; disposable helper reproduction | Derive the full-delivery tree from the reviewed result and preview the required commit changes | Medium for the selected narrow scope: newly prepared full plans only | Fix | Narrow fix implemented and validated locally; saved older plans retain their contract, see D018 |

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

### WF-006 — Saved feedback narrative conflicted with its collection notes

- Category/status: report consistency/adherence gap. First/last R001; one saved inconsistency. Observation confidence High; cause confidence Unknown; recommendation confidence Medium.
- Evidence (paraphrased): a feedback input check failed (985), was repaired, and succeeded (1001). The saved report said no helper failure was visible before saving, but its generated collection notes recorded the failed check and later success (1015, embedded lines 99 and 107). The final response explicitly acknowledged this inconsistency and left the saved report unchanged (1038).
- Impact: a maintainer reading only the saved report must reconcile contradictory claims. Existing bounded closing-check guidance now explicitly reconciles visible failures; the inspected current instruction may already address the historical omission. Current persistence is unverified.
- Smallest action/owner: feedback collection guidance/evaluation; test and apply the existing pre-save check, rather than reopening successful saves to describe every later save. Avoid a save-review-save loop.
- Fix risk **Low** for a focused evaluation/guidance clarification; a new writer or lifecycle redesign is unassessed and not recommended here. Proposed verification — untested: a failed check followed by recovery yields consistent narrative/collection notes using one necessary repair/save, without delaying delivery. Rollback the scoped change. Recommendation **Investigate**; decision **Investigated; consistency case passed, see R002**.

### WF-007 — Sanitization rejected generic workflow vocabulary

- Category/status: validator friction; current heuristic inspected, privacy-safe remedy not reproduced. First/last R001; one failed check and successful paraphrase. Observation confidence High; cause confidence High for the diagnostic/heuristic, recommendation confidence Medium.
- Evidence (paraphrased): the share-safe checker rejected the public workflow term `pending-input` as copied project terminology (985). Paraphrasing it allowed validation to pass (990–1001). This is the same check failure discussed in WF-006, counted once as a runtime event with two distinct concerns, not two failed attempts.
- R001 inspection: `write-feedback.mjs` derives distinctive hyphenated terms from audit prose and excludes an existing workflow-vocabulary set. The feedback skill explicitly permits useful public controller vocabulary. Do not weaken customer-identifier protections based only on this one event.
- Smallest action/owner: investigate a narrow known-public-vocabulary exception in the feedback sanitizer, using its existing mechanism rather than removing the heuristic.
- Fix risk **Medium**: privacy enforcement is affected even by a small allowlist change. Proposed verification — untested: public workflow vocabulary passes while project names, private paths/URLs, credentials and representative proprietary terms remain rejected. Rollback the narrow exception. Recommendation **Investigate**; decision **Defer, see D001**.
- R003 recurrence (session B): the share-safe check rejected generic hyphenated workflow phrases ("approval-time", "cycle-3", "future-dated", "full-suite", "fix-round", "workflow-event") as copied project terminology; three failed checks (3559, 3591, 3644) and paraphrasing preceded the successful write (3672). Related validator messages: an owner field rejected as not a share-safe line, and a dashboard observation lacking an inspected source line. **Distinct sessions: 2 — flagged for renewed fix consideration** (cumulative cost: repeated pre-save repair loops; no data loss or privacy failure). Severity stays Minor; the Medium privacy risk of any exception is unchanged. Decision remains **Defer** until the maintainer revisits.
- R005 recurrence (session D, plugin 5.14.0, predating D004): the writer rejected the generic hyphenated terms "not-run", "self-review" and "per-step" as copied project terminology, plus locator and line-shape errors, in two failed checks before success (2627, 2663). None of the three terms is in the exact public-vocabulary set at `skills/implement/scripts/write-feedback.mjs:43`. **Distinct sessions: 3 (A, B, D)** — flagged again. This indicates an exact-term list keeps missing new generic words; it does not weaken the privacy rationale, and the D004 decision is unchanged. Not reproduced against the current checkout.

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

## Maintainer decisions

R001 (historical): all WF-001 through WF-007 were **Undecided**. The maintainer requested conservative review, retention of minor findings, and explicit decisions before fix planning. Selecting this skill extension did not select a delivery, controller, sanitizer, feedback-lifecycle, or instruction fix.

R003 (historical): WF-009 through WF-014 are **Undecided**. The user's three added inputs are recorded as reported input; they describe expectations and suggestions, not fix selections. The earlier decisions on WF-001 through WF-008 are unchanged; the recurrence evidence for WF-001, WF-005 and WF-007 is recorded but does not alter them. No fixes are selected by this review.

R004 (historical): WF-015 through WF-018 are **Undecided**. WF-009's recurrence is recorded and does not alter its D003 decision. No fixes are selected by this review.

R005 (historical): WF-019 through WF-025 are **Undecided**. The WF-007 and WF-015 recurrences are recorded and do not alter their existing decisions. The user's context-window report is recorded as reported input, not a fix selection. No fixes are selected by this review.

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
