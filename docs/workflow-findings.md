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

## Decision summary

| ID | Issue impact | Distinct sessions | Proposed action | Fix risk | Recommendation | Maintainer decision |
| --- | --- | --- | --- | --- | --- | --- |
| [WF-001](#wf-001--repository-access-failed-after-commit-and-push) | Major: delivery | 2 (A, B) | Repository-specific read-only preflight | Low, bounded prerequisite check; later writes can still fail | Fix | Fix — implemented; checks below |
| [WF-002](#wf-002--delegate-test-attribution-was-omitted-from-proposed-publication-text) | Major: evidence trust | 1; repeated presentations | Inspect existing qualification-to-summary path | Unknown until enforcement approach is chosen | Investigate | Investigated — qualifications preserved; see R002 |
| [WF-003](#wf-003--frontend-cause-was-stated-more-definitively-than-the-investigation-supported) | Minor: diagnostic wording | 1 | Preserve hypothesis wording in handoffs | Low for a narrow guidance correction | Investigate | Investigated — hypothesis preserved; see R002 |
| [WF-004](#wf-004--question-options-mixed-scope-decisions-and-the-custom-answer-was-rejected) | Minor: refinement friction | 1 | Improve option/dependency guidance before considering schema changes | Medium: agent questioning behavior | Investigate | Defer |
| [WF-005](#wf-005--delegate-report-path-base-was-unclear-at-the-call-site) | Minor: helper retry | 2 (A, B) | Document absolute helper-returned paths | Low: documentation; keep resolver semantics | Fix | Fix — implemented; checks below |
| [WF-006](#wf-006--saved-feedback-narrative-conflicted-with-its-collection-notes) | Minor: report accuracy | 1 | Apply existing bounded closing check to visible failures | Low for narrow guidance; enforcement design unassessed | Investigate | Investigated — consistency case passed; see R002 |
| [WF-007](#wf-007--sanitization-rejected-generic-workflow-vocabulary) | Minor: validator retry | 2 (A, B) — flagged for renewed consideration | Assess narrow public-vocabulary exception | Medium: privacy protection must remain effective | Investigate | Fix — exact public-vocabulary exception implemented; see D004 |
| [WF-008](#wf-008--approval-narration-paraphrased-the-proposed-pr-body) | Minor: approval reviewability | 1 synthetic eval | Copy complete built-package text into approval | Low: guidance only | Fix | Implemented — focused retry passed; see D002 |
| [WF-009](#wf-009--publication-helper-rejected-the-miw--journal-filename-after-consent) | Major: consented ticket updates unavailable for the whole run | 1 (session B) | Make the journal-name check accept the saved `miw-` form while keeping run binding | Medium: external-write path and legacy-name compatibility | Fix | Fix — implemented; deterministic regression checks passed, see D003 |
| [WF-010](#wf-010--run-began-on-another-tickets-feature-branch-without-a-question-and-was-restarted) | Minor: startup friction (user-reported expectation) | 1 (session B) | Detect a branch naming a different ticket; alert and ask continue vs new branch | Medium: startup/branch gating | Investigate (user's expectation raises confidence) | Fix — implemented; startup probe passed, see D003 |
| [WF-011](#wf-011--delegate-flagged-test-compromise-on-a-spec-clause-was-accepted-and-two-fix-rounds-followed) | Minor: avoidable fix rounds (safeguard worked) | 1 (session B) | Investigate reconciling delegate-flagged modelling compromises before execution | Medium: planning/test-prep behavior | Investigate | Investigated — focused hand-back probe passed; see D003 |
| [WF-012](#wf-012--a-one-line-final-sync-documentation-edit-consumed-the-last-allowed-review-cycle) | Minor: review budget | 1 (session B) | Observe only; no change proposed yet | High if the cycle cap or reopen rule changed | Defer | Defer — retain current review safeguards; see D003 |
| [WF-013](#wf-013--handoff-directory-was-resolved-with-the-miw--prefix-the-helper-requires-none) | Minor: helper retry | 1 (session B) | Clarify directory vs file prefix at the handoff call site | Low: documentation | Investigate | Fix — path guidance clarified; naming checks passed, see D003 |
| [WF-014](#wf-014--plan-approval-did-not-call-out-risks-left-above-low-after-mitigation-user-suggested) | Minor: user-suggested approval warning | 1 (session B) | Warn on unmitigated risks above Low at plan approval; default accept, offer discussion | Medium: approval-prompt content | Investigate | Fix — implemented; risk-presentation probes passed, see D003 |

Cross-session updates in R003: WF-001, WF-005 and WF-007 are now each evidenced in **two distinct sessions** (A and B). See their R003 bullets; WF-007 is flagged for renewed fix consideration under the minor-recurrence rule.

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
- Cross-session recurrence is now established only for WF-001, WF-005 and WF-007 (sessions A and B). None of the optional observations above is a maintainer-selected no-change decision; they are this review's recommendations and corrections.

## Maintainer decisions

R001 (historical): all WF-001 through WF-007 were **Undecided**. The maintainer requested conservative review, retention of minor findings, and explicit decisions before fix planning. Selecting this skill extension did not select a delivery, controller, sanitizer, feedback-lifecycle, or instruction fix.

R003 (historical): WF-009 through WF-014 are **Undecided**. The user's three added inputs are recorded as reported input; they describe expectations and suggestions, not fix selections. The earlier decisions on WF-001 through WF-008 are unchanged; the recurrence evidence for WF-001, WF-005 and WF-007 is recorded but does not alter them. No fixes are selected by this review.

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
