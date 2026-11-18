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

## Decision summary

| ID | Issue impact | Distinct sessions | Proposed action | Fix risk | Recommendation | Maintainer decision |
| --- | --- | --- | --- | --- | --- | --- |
| [WF-001](#wf-001--repository-access-failed-after-commit-and-push) | Major: delivery | 1 | Repository-specific read-only preflight | Low, bounded prerequisite check; later writes can still fail | Fix | Fix — implemented; checks below |
| [WF-002](#wf-002--delegate-test-attribution-was-omitted-from-proposed-publication-text) | Major: evidence trust | 1; repeated presentations | Inspect existing qualification-to-summary path | Unknown until enforcement approach is chosen | Investigate | Investigated — qualifications preserved; see R002 |
| [WF-003](#wf-003--frontend-cause-was-stated-more-definitively-than-the-investigation-supported) | Minor: diagnostic wording | 1 | Preserve hypothesis wording in handoffs | Low for a narrow guidance correction | Investigate | Investigated — hypothesis preserved; see R002 |
| [WF-004](#wf-004--question-options-mixed-scope-decisions-and-the-custom-answer-was-rejected) | Minor: refinement friction | 1 | Improve option/dependency guidance before considering schema changes | Medium: agent questioning behavior | Investigate | Defer |
| [WF-005](#wf-005--delegate-report-path-base-was-unclear-at-the-call-site) | Minor: helper retry | 1 | Document absolute helper-returned paths | Low: documentation; keep resolver semantics | Fix | Fix — implemented; checks below |
| [WF-006](#wf-006--saved-feedback-narrative-conflicted-with-its-collection-notes) | Minor: report accuracy | 1 | Apply existing bounded closing check to visible failures | Low for narrow guidance; enforcement design unassessed | Investigate | Investigated — consistency case passed; see R002 |
| [WF-007](#wf-007--sanitization-rejected-generic-workflow-vocabulary) | Minor: validator retry | 1 | Assess narrow public-vocabulary exception | Medium: privacy protection must remain effective | Investigate | Defer |

| [WF-008](#wf-008--approval-narration-paraphrased-the-proposed-pr-body) | Minor: approval reviewability | 1 synthetic eval | Copy complete built-package text into approval | Low: guidance only | Fix | Implemented — focused retry passed; see D002 |

## Major findings

### WF-001 — Repository access failed after commit and push

- Category/status: observed delivery friction with a preflight gap at R001; addressed locally by D001. First/last seen R001; one failure in session A. Observation confidence High; cause confidence High for the reported SSO rejection; recommendation confidence High.
- Evidence (paraphrased): the user approved the displayed plan (1086). The delivery command returned an organization SAML/SSO authorization error from its PR operation (1106). The journal and Git inspection recorded a completed commit and push, with delivery `partial` and no PR (1115). The agent explained the recovery and retained the approved plan (1124). No rollback or duplicate delivery was observed.
- R001 inspection: `skills/implement/scripts/deliver.mjs` checks CLI availability and general authentication before mutations; its repository PR query is later, after push. General authentication did not establish repository-specific access in this session. The external SSO restriction itself is not a plugin defect.
- Smallest remedy/owner: delivery helper; perform the existing read-only repository PR-access query during prerequisites for every target GitHub repo before staging/committing/pushing any repo. Preserve approvals, hashes, journals, Bitbucket behavior, and late-failure recovery. This does not guarantee write permissions or eliminate races.
- Fix risk **Low**: bounded earlier read, no schema or approval changes; mocks/query counts and error ordering need updates. An unavailable API may now block before mutation, which is intended for an all-steps delivery request.
- Proposed verification — untested: mock general auth success with SSO failure on the repository query; assert unchanged index, local HEAD and remote refs. Include later-repo failure before any mutations, successful delivery, and post-push PR failure/resume without duplicates using existing delivery fixtures.
- Rollback: revert only the added preflight and its tests; existing journal/recovery remains. Recommendation **Fix**; decision **Fix; implemented locally, see D001**.

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
- No cross-session recurrence is established yet. None of the optional observations above is a maintainer-selected no-change decision; they are this review's recommendations and corrections.

## Maintainer decisions

R001 (historical): all WF-001 through WF-007 were **Undecided**. The maintainer requested conservative review, retention of minor findings, and explicit decisions before fix planning. Selecting this skill extension did not select a delivery, controller, sanitizer, feedback-lifecycle, or instruction fix.

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
