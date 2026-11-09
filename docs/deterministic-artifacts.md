# Deterministic artifact helpers

These helpers own mechanical operations. Read the section for the current skill only. Semantic analysis supplies the inputs; scripts validate relationships and render derived output. None of these helpers grants permission to write to an external service. Do not switch tools/paths to bypass denied writes.

## Repository identity

Use `repo-identity.mjs identity --root <selected-repo>` before writing a test
strategy or test-map namespace. It returns the canonical `repoId` and the
selected Git `root`, preserving a recorded strategy/map ID when available.
Readable, conflicting recorded IDs stop for explicit resolution. A malformed
map with a valid strategy ID returns a warning and retains that ID; it does not
bypass the map's normal refresh/discovery rules. Neither artifact is rewritten
by identity lookup.

For fresh linked worktrees, the fallback comes from Git's main working-tree
metadata rather than a temporary directory name. Fresh bare-owned worktrees or
unresolvable owner layouts need an explicit recorded token-safe ID. Existing
IDs, including historical temporary ones, are never migrated automatically.

Use `regression.mjs resolve --root <invocation-root> --repo <prefix>` for token
lookup; `--workspace-root` is optional and must name an already selected
workspace. It prefers a matching current checkout, supports recorded IDs in
renamed folders and directory aliases, and searches only immediate Git roots
within supplied boundaries. Multiple matches require explicit checkout
selection. Use returned `root` for tests and `repoId` for map tokens. Main-tree
metadata supplies a default name, never permission to run code in another tree.
Within implement, approved workspace IDs/roots remain the execution scope:
resolve identity in the approved checkout, keep its approved ID in manifests
where the contract requires it, and use its canonical test ID for map queries.
Neither identity nor token lookup widens approved scope or changes branches.

## Refinement questions

Before Phase 5C handles an offline file, run `node <plugin-root>/scripts/questions.mjs inspect --file <questions.md>`. Use its conflicts, unanswered IDs, active TBD count and decision IDs rather than manually counting checkboxes or evaluating nested conditions. Only active questions enter the Decision Log. Conflicts remain hard stops under Autopilot. Reverify code premises and reconcile conflicting hand-entered/Slack answers under the existing semantic contract; the parser does not settle them.

A skipped gate leaves its descendants `blocked-by-tbd`, recursively, rather than `not-applicable`. These count as unresolved TBD items and remain in `unanswered`, but do not enter `decision_ids` until actually asked. Defer them until the gate is resolved; carry them into the Product handoff or final TBD list with their conditions. Only a resolved answer that rules out the condition makes a question `not-applicable`.

For live refinement/planning, first identify semantic question dependencies, then pass `[{"id":"Q1","depends":[]}, {"id":"Q2","depends":["Q1"]}]` to `questions.mjs waves --input <json>`. Use the returned batches (maximum four) and recompute after answers materially change the graph. The helper detects missing IDs/cycles; it does not infer dependencies from prose.

`exactSlackAnswer` accepts an exact option label or letter, or the full answer to an open question. Natural-language ambiguity stays unresolved for the existing model/user path. Slack recipient selection, source provenance, latest-message precedence, delivery reconciliation and code drift remain outside this parser.

## Documentation inventory

Run `context-inventory.mjs inspect --root <repo> [--days 30]` before go-deep prior-run/repair/naming decisions and implement's Context check. It reports signals, missing completeness pieces, referenced-but-missing skills, frontmatter/size warnings, naming convention and next domain ID including missing/reserved references. Existing unnumbered repositories retain that convention; mixed naming is a visible decision to resolve, never an automatic renumbering. Allocate new IDs once from this inventory and pass exact names to writers.

With a selected 10/30/60/90-day window, the helper compares actual commit paths with explicitly declared code areas in documentation tables and returns stale candidates plus touching commits. An unavailable Git scan stays unavailable. Changed code only identifies a candidate for semantic reassessment; it does not prove the document is wrong. Prose-only/undeclared code ownership still requires the existing model analysis. The helper writes no project files, changes no permissions, and does not replace content-quality review.

## Test strategy consistency

Before saving/returning a strategy, run `test-strategy.mjs check --file <candidate> [--input <decisions.json>]`. When a discussion selected layers, supply `{"selected_layers":[{"layer":"Component","status":"planned"}]}` from those actual decisions. The validator checks projection into Layers/destinations/guidance, planned/deferred example commands, and Test Locations activation. Legacy rows without Status remain configured; it never promotes tooling based on a proposal. Actual runner discovery and behavioral coverage adequacy remain semantic.

After both strategy/map artifacts are saved and validated, use `test-strategy.mjs pointer --root <repo>` for the CLAUDE.md pointer. This is an explicit script-write exception to DTS's Write/Edit-only rule for this narrow operation. It validates the saved artifacts and matching Repo IDs, keeps other rows/content, and inserts exactly one canonical pointer under Other Skills. Missing CLAUDE.md/Skills Reference is reported without inventing it. A changed pointer returns a `reassess-map` next action and a bounded read-only packet of actual post-edit context, assertions and referenced mapping evidence. The read-only `test-strategy.mjs evidence --root <repo>` command can retrieve the packet again without another pointer write. Skill hooks hold a truncated delivery until that data is retrieved in full; the checks do not judge semantics. The packet reports deferred/unavailable inputs explicitly and performs no semantic assessment or baseline write; review the contents and complete remaining reads before claiming reassessment. Complete the affected locations' semantic reassessment after the pointer edit, then take final snapshots/discovery and generate the report, as Phase 6 requires. The helper never advances map baselines or stamps freshness to hide stale relationships.

After the final authorized map save, regenerate `.claude/testing/TEST-MAP.md` with `test-map-report.mjs --root <repo> --write` per the shared [test-map contract](test-map-contract.md#developer-report). The report projects the explicit per-test layers, feature relationships, uncertainty and evidence without running tests or advancing snapshots. `--check` detects drift from the saved map and feature labels; it does not establish semantic freshness. Read-only regression/review and coverage-only workflows do not write it.

## Slice artifacts

Present the approach choices directly in assistant chat before running artifact helpers or writing backlog input, then apply the skill's selection policy. A user-specified approach needs no invented alternatives. Standalone runs need no preview file or rendering command. For callers that already hold structured candidates, `slices.mjs preview --input <approaches.json>` remains available: `title` and 2–3 `options`, each with `label`, `fit`, `tradeoff`, and `examples` containing 2–3 distinct example slice titles; exactly one has `recommended: true`. It renders without writing files. Its tool output does not replace the assistant message, and it introduces no preview receipts or approval gate.

Draft semantic slices in one version-1 JSON object with `title`, `goal`, optional `source`, `approach`, `rationale`, `assumptions`, `open_items`, and `slices`. `open_items` renders a separate **Open questions** section; do not classify unresolved questions as assumptions. Each slice has stable `id` (`S-1`), `title`, `summary`, complete story/technical-task `content`, `hard` predecessor IDs, `recommended` predecessor IDs, `reasons` keyed by predecessor, and optional named `external` prerequisites. Select boundaries, value, actual dependencies and risk ordering with the existing skill analysis; do not invent relations to fill a graph.

Run `slices.mjs check --input <json>` to validate references/reasons and hard cycles. Optional `stages` is an ordered array of arrays of IDs, each slice once with every hard predecessor earlier; otherwise the helper derives feasible parallel waves. Optional `mvp` IDs receive their hard-prerequisite closure. Recommendations remain advice, not execution barriers.

Use `slices.mjs write --input <json> --directory <project-root>/make-it-work` instead of independently authoring diagrams/tables/files. The helper allocates one timestamped collision-safe prefix for the entire set and generates the overview, summary, Mermaid, dependency table, stages and complete linked slice files from that same graph. Read the saved overview to verify its diagram, relationship table, flow and file links. Include its returned `chat_summary` verbatim in chat; this keeps the table identical to the saved overview and names the first slice in the initial stage as the recommended starting point. Every generated local link names a file in the set. Jira opt-in and publish/link operations remain separate and use the generated IDs/content; a saved artifact never authorizes publication.

## Epic artifacts

After the discovery interview and semantic analysis, supply `epic.mjs write --input <epic.json> --directory <project-root>/make-it-work [--existing <prior.md>]`. The version-1 input has `title`, `mode` (`product` or `technical-debt`), selected `categories`, optional global `open_items`, `out_of_scope`, and `decisions`. Each selected category uses its catalog `id`, `assessed: true`, explicit semantic `ready`, optional `applicable: false` for genuinely inapplicable optional sections, complete Markdown `content`, `open_items`, `exclusions`, and `unconfirmed` when relevant. Do not supply unselected categories as assessed. The model still decides applicability, content quality and materiality; the renderer only enforces/project those decisions.

Decisions use `topic`, `decision`, optional stated `rationale`, and status `Confirmed|Proposed|Open / Deferred|Out of scope`. Confirmed entries require `source: user|project-policy` and an actual `reference`; proposals/defaults cannot confirm themselves. Preserve autopilot markers in the supplied text. The helper owns fixed section order, Draft status, inline/consolidated open items, assessed readiness boxes, Not assessed list and stable decision-status ordering. With `--existing`, canonical unselected sections and unrelated custom sections are preserved. Supply the full retained decision/open-item history when revising shared sections.

In standalone autopilot, represent each automatic decision once as `{topic, auto_resolution}` in that same `decisions` list. `auto_resolution` is the complete shared decision-log entry, including `phase`, `site`, `kind`, `chosen`, `rationale` and any question/options fields. The epic renderer derives its Proposed row from `chosen` and `rationale`; do not supply a second `decision` string or status for that row. After the epic is saved, pass the **same epic input file** to `decision-log.mjs write shape-the-epic --root <project-root> --input <epic.json>`. It extracts every nested resolution and removes the input file after reading, just as for ordinary decision arrays. Keep confirmed facts and open decisions as ordinary rows. No second log payload is needed.

Put material unknowns and unconfirmed dependencies in each affected category's `open_items` or `unconfirmed`, not only in prose or the global list. The renderer leaves that category unchecked whenever either carries unresolved content, regardless of its supplied `ready` flag. User-confirmed targets do not confirm their missing measurement definitions; represent those as separate open decisions.

The writer saves a new timestamped collision-safe artifact. It does not publish, infer ownership, approve a draft, or validate Gherkin meaning. Existing explicit user requests for an in-place edit retain their requested destination; render first and apply only that authorized edit through the normal file tool. Jira publication continues to use the full latest saved artifact and its existing read-back verification.

## Epic orchestration

When `drive-the-epic` runs the shaping and slicing stages, use `epic-workflow.mjs` and [its controller contract](../skills/drive-the-epic/references/controller.md). It calls the same artifact writers with the dedicated run directory, adds source references (the epic renderer accepts optional `source`), and checkpoints progress, decisions, HTML, review waits, and the future per-slice implementation handoff. Its stage-specific destination rules replace standalone root-level artifact/log destinations. It does not start implementation workers or grant Jira publication permission.

## Repository assessment collection

After resolving the workspace boundary under find-the-repos, use `repo-assessment.mjs inventory --root <workspace>` for immediate Git repos, including `.git` files. It also retains names in workspace-root CLAUDE.md tables with a Repo/Repository column, including missing checkouts. Other metadata formats supply their names through `named_repos`. It does not climb arbitrary ancestors or decide whether siblings form a system. Use `collect --root <workspace> --input <queries.json>` with compact `terms` (1–8), optional grounded `followup_terms`, and optional metadata-named `named_repos`. It visits each candidate once, collects source/line-qualified catalog and CODEOWNERS evidence, and runs at most two bounded searches (20 files/60 matching lines total per repo).

Save the report with `repo-assessment.mjs report --root <workspace> --input <report.json>`. Input contains `ticket`, complete `markdown` with one `## Assessment Evidence` section, optional `named_repos`, and `assessments: [{id, status, owners, docs, skills, search, flags}]` carrying the actual inspected evidence as text. Status is Definite, Possible, No match, Excluded, or Not assessed / unavailable. The writer replaces that section's table with one row per inventory candidate; missing checkouts remain unavailable with `absent on disk` regardless of a supplied match. Present candidates without supplied conclusions remain visibly unassessed. All other report sections come from the semantic assessment. It saves the existing canonical `make-it-work/<TICKET>/<TICKET>-repos.md`; use `report_path` for an established legacy path inside make-it-work. Read the current report before revising it and preserve user content in `markdown`. The returned `file` is the path to link in chat. A denied report write retains the skill's existing failure handling.

Use these actual matches/queries/limitations in the one existing report. Truncated/failed searches are incomplete, never evidence of absence. Simple catalog scalars are extracted without executing YAML; unsupported catalog syntax is returned as raw unparsed evidence. Root and .github CODEOWNERS rules remain separate; the helper never claims effective platform ownership. The model still assesses code context, documentation, concept-specific expansion, Definite/Possible tiers and feature completeness. Reuse collected results; do not repeat equivalent searches or broaden the workspace without the skill's actual concept-specific evidence.

## Review reports

Working-tree reviews supply `review_scope: [{repo: "app", base: "main", scope: "branch" | "working-tree", paths: ["src/view.jsx"]}]`, with `repo` naming an explicit `repo_roots` key. `branch` snapshots merge-base-to-working-tree diffs; `working-tree` snapshots HEAD-to-working-tree diffs. Include only paths actually inspected. The writer saves `<TICKET>-review-evidence.json` bound to the report hash; final packages compare per-path diff hashes against delivery's full branch diff. Missing/changed evidence is disclosed as unknown/partial coverage, including earlier changes in the same path and post-review documentation edits. The evidence is bound into package freshness and delivery checks. Older reports without evidence remain unknown; normal package rebuild rules apply.

Supply `ui_verification: {status: "passed" | "pending" | "not-applicable", note: "actual observations or concrete reason"}`. UI changes require an available browser walkthrough or a visible pending check explaining what remains unchecked; no browser observation may be inferred from unit tests. `not-applicable` needs a no-UI-impact reason. Missing evidence defaults to pending. Packages, completion summaries, delivery previews and generated PR descriptions preserve both scope and browser limitations. These disclosures do not add user approval gates or waive existing review/manual-policy stops.

After the adversarial semantic review, use `review-report.mjs write --root <artifact-root> --input <review.json>` for both report tiers and, on version-1 handoff runs, the JSON handoff. Input has `version: 1`, `ticket`, `branch`, `commit`, `coverage`, `findings`, optional `solid`, `preexisting`, `context_gaps`, `known_regressions`, `decided`, and explicit `repo_roots` keyed by repo ID. Each finding supplies `severity`, `claim`, inspected `evidence`, `locations: [{repo?,file,line}]`, optional `rule`, and in implement mode `route`, stable `region`, and `introduced_by_fix_of` (or null). Set `working_tree: true` for local uncommitted reviews; otherwise use an exact hex commit or HEAD and the helper reads locations at that Git revision.

Supply `implement: {plan_version,review_cycle,handoff_version:1}` for version-1 handoff callers. Older implement callers still supply `implement` but omit `handoff_version`: they receive routes and outcome lines without a new handoff. Standalone callers omit `implement`. In implement mode, each finding explicitly chooses `route: fix|replan|human|advisory`. Routes `fix`, `replan` and `human` are actionable at every severity, including Minor; `advisory` is allowed only for nonblocking Minor nits. The optional `actionable` boolean must agree with the route; contradictory input is rejected rather than silently dropping a fix. Advisory findings stay visible as unfixed in both report tiers and the final package, but are excluded from the actionable handoff. Standalone Minor findings with no route retain their advisory default; standalone Major/Critical findings cannot be hidden. Older implement inputs that used `route: fix` with `actionable: false` must explicitly choose `route: advisory` instead. Existing saved reports/handoffs are not rewritten. The helper derives counts, verdict, route precedence and Markdown/JSON from one findings list, validates source file/line bounds before saving, and allocates a fresh review handoff. Known hosted source links may be supplied as a location's `url`. Display its returned summary. Location validation checks existence and bounds, not whether the finding is true; source-chain verification, severity/business impact, semantic route choice and adequate review coverage remain the reviewer's responsibility.


### Review and delivery scope

Fresh implement runs (`review_scope_version: 1`) prepare a frozen delivery target
with `skills/implement/scripts/review-scope.mjs prepare --root ROOT --state STATE`.
The target contains all selected roots/bases and the complete binary-safe diff,
including earlier branch commits. Pass its returned path/hash to independent
review. The report input must include `review_target`, `review_target_sha256`,
`implement.review_scope_version: 1` and branch-scoped evidence for every path.
The renderer rejects HEAD-only, omitted-path or drifted targets before writing
a clean report, evidence or handoff. The controller separately validates CLEAN.
Final sync routes changed delivery content back to independent Review under the
existing cap. Final packages require full matching coverage and bind the target
and its diff artifacts. Later final-approval drift uses `refresh-review`; the
helper refuses an unchanged tree. Standalone reviews and legacy saved runs keep
the existing partial/unknown-scope disclosure behavior.

### Clause-level acceptance evidence

New Implement runs carry `acceptance_evidence_version: 1` alongside `verification_version: 1`. The accepted plan has three-column AC traceability (`Acceptance criterion | Requirement clause | Test scenario`); acceptance rows preserve each exact clause. Verified rows require the cited step/scenario/type to contain a concrete assertion or manual observation with `clause`, `expected`, `observed`, and `source`. The controller and final package reject name-only evidence or omitted planned clauses; explicit unverified rows remain pending. Package and dashboard summaries aggregate all clauses/scenarios under each criterion. The independent review compares the inventory to the spec and inspects cited evidence for semantic coverage. Historical runs are not migrated. See [verification contract](../skills/implement/references/verification.md).

### Planning test authorizations

Fresh initializer output includes per-path implementation-baseline evidence.
Before changing tests in Plan, `planning-tests.mjs authorize` checks the active
TDD phase, accepted spec, approved repo and exact draft-step test declaration,
then records the original file image in a run-bound local receipt. The startup
guard exempts only those exact test paths (or bounded embedded-test regions),
while comparing all other changes with the original baseline. It rejects early,
undeclared, deleted, stale or out-of-scope changes and changed HEADs. Ordinary
stage continuation and review remain required. Receipt prefix/suffix bytes are
local working data, never automatically exported. See the [planning-test
contract](../skills/implement/references/planning-tests.md).

### Readiness before planning

New runs opt into `testing_readiness_version: 1`. The parent begins a pending
checkpoint, waits for readiness handbacks, reconciles the structured report and
completes it with `testing-readiness.mjs`. Runtime hooks reject beginning/completing
readiness under a live current-phase delegate. Planners check before starting;
test authorization, plan handoff, Execute entry and final packages require the
same current report/policy proof. Completion changes only the existing readiness
pointer and records an informational Result, without new approvals or counters.
Existing-run markers are not backfilled. See the [readiness contract](../skills/implement/references/testing-readiness.md).

### Final-package assurance presentation

New package builds add `assurance_version: 1` and lead with a derived assurance
headline. `final-package.mjs check` returns `assurance_summary` alongside the
ledger-only `verification_summary`. Pending/missing acceptance evidence, partial
or unknown delivery review, pending browser checks, absent automated gates,
open review nits and known unrelated regressions prevent the qualified
`Recorded checks complete` headline. These facts remain separate from workflow
completion, Guided approval and release readiness. Existing package hashes and
legacy Markdown are preserved on check; a rebuild uses the new format and normal
approval binding. See the [verification contract](../skills/implement/references/verification.md).
