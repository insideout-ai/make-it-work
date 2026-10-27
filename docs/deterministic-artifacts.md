# Deterministic artifact helpers

These helpers own mechanical operations. Read the section for the current skill only. Semantic analysis supplies the inputs; scripts validate relationships and render derived output. None of these helpers grants permission to write to an external service. Do not switch tools/paths to bypass denied writes.

## Refinement questions

Before Phase 5C handles an offline file, run `node <plugin-root>/scripts/questions.mjs inspect --file <questions.md>`. Use its conflicts, unanswered IDs, active TBD count and decision IDs rather than manually counting checkboxes or evaluating nested conditions. Only active questions enter the Decision Log. Conflicts remain hard stops under Autopilot. Reverify code premises and reconcile conflicting hand-entered/Slack answers under the existing semantic contract; the parser does not settle them.

For live refinement/planning, first identify semantic question dependencies, then pass `[{"id":"Q1","depends":[]}, {"id":"Q2","depends":["Q1"]}]` to `questions.mjs waves --input <json>`. Use the returned batches (maximum four) and recompute after answers materially change the graph. The helper detects missing IDs/cycles; it does not infer dependencies from prose.

`exactSlackAnswer` accepts an exact option label or letter, or the full answer to an open question. Natural-language ambiguity stays unresolved for the existing model/user path. Slack recipient selection, source provenance, latest-message precedence, delivery reconciliation and code drift remain outside this parser.

## Documentation inventory

Run `context-inventory.mjs inspect --root <repo> [--days 30]` before go-deep prior-run/repair/naming decisions and implement's Context check. It reports signals, missing completeness pieces, referenced-but-missing skills, frontmatter/size warnings, naming convention and next domain ID including missing/reserved references. Existing unnumbered repositories retain that convention; mixed naming is a visible decision to resolve, never an automatic renumbering. Allocate new IDs once from this inventory and pass exact names to writers.

With a selected 10/30/60/90-day window, the helper compares actual commit paths with explicitly declared code areas in documentation tables and returns stale candidates plus touching commits. An unavailable Git scan stays unavailable. Changed code only identifies a candidate for semantic reassessment; it does not prove the document is wrong. Prose-only/undeclared code ownership still requires the existing model analysis. The helper writes no project files, changes no permissions, and does not replace content-quality review.

## Test strategy consistency

Before saving/returning a strategy, run `test-strategy.mjs check --file <candidate> [--input <decisions.json>]`. When a discussion selected layers, supply `{"selected_layers":[{"layer":"Component","status":"planned"}]}` from those actual decisions. The validator checks projection into Layers/destinations/guidance, planned/deferred example commands, and Test Locations activation. Legacy rows without Status remain configured; it never promotes tooling based on a proposal. Actual runner discovery and behavioral coverage adequacy remain semantic.

After both strategy/map artifacts are saved and validated, use `test-strategy.mjs pointer --root <repo>` for the CLAUDE.md pointer. This is an explicit script-write exception to DTS's Write/Edit-only rule for this narrow operation. It validates the saved artifacts and matching Repo IDs, keeps other rows/content, and inserts exactly one canonical pointer under Other Skills. Missing CLAUDE.md/Skills Reference is reported without inventing it. Final semantic map reassessment/baselines still follow the test-map contract after pointer edits; the helper never stamps freshness to hide stale relationships.

## Slice artifacts

Draft semantic slices in one version-1 JSON object with `title`, `goal`, optional `source`, `approach`, `rationale`, `assumptions`, and `slices`. Each slice has stable `id` (`S-1`), `title`, `summary`, complete story/technical-task `content`, `hard` predecessor IDs, `recommended` predecessor IDs, `reasons` keyed by predecessor, and optional named `external` prerequisites. Select boundaries, value, actual dependencies and risk ordering with the existing skill analysis; do not invent relations to fill a graph.

Run `slices.mjs check --input <json>` to validate references/reasons and hard cycles. Optional `stages` is an ordered array of arrays of IDs, each slice once with every hard predecessor earlier; otherwise the helper derives feasible parallel waves. Optional `mvp` IDs receive their hard-prerequisite closure. Recommendations remain advice, not execution barriers.

Use `slices.mjs write --input <json> --directory <project-root>/make-it-work` instead of independently authoring diagrams/tables/files. The helper allocates one timestamped collision-safe prefix for the entire set and generates the overview, summary, Mermaid, dependency table, stages and complete linked slice files from that same graph. Show its returned summary in chat. Every generated local link names a file in the set. Jira opt-in and publish/link operations remain separate and use the generated IDs/content; a saved artifact never authorizes publication.

## Epic artifacts

After the discovery interview and semantic analysis, supply `epic.mjs write --input <epic.json> --directory <project-root>/make-it-work [--existing <prior.md>]`. The version-1 input has `title`, `mode` (`product` or `technical-debt`), selected `categories`, optional global `open_items`, `out_of_scope`, and `decisions`. Each selected category uses its catalog `id`, `assessed: true`, explicit semantic `ready`, optional `applicable: false` for genuinely inapplicable optional sections, complete Markdown `content`, `open_items`, `exclusions`, and `unconfirmed` when relevant. Do not supply unselected categories as assessed. The model still decides applicability, content quality and materiality; the renderer only enforces/project those decisions.

Decisions use `topic`, `decision`, optional stated `rationale`, and status `Confirmed|Proposed|Open / Deferred|Out of scope`. Confirmed entries require `source: user|project-policy` and an actual `reference`; proposals/defaults cannot confirm themselves. Preserve autopilot markers in the supplied text. The helper owns fixed section order, Draft status, inline/consolidated open items, assessed readiness boxes, Not assessed list and stable decision-status ordering. With `--existing`, canonical unselected sections and unrelated custom sections are preserved. Supply the full retained decision/open-item history when revising shared sections.

The writer saves a new timestamped collision-safe artifact. It does not publish, infer ownership, approve a draft, or validate Gherkin meaning. Existing explicit user requests for an in-place edit retain their requested destination; render first and apply only that authorized edit through the normal file tool. Jira publication continues to use the full latest saved artifact and its existing read-back verification.

## Repository assessment collection

After resolving the workspace boundary under find-the-repos, use `repo-assessment.mjs inventory --root <workspace>` for immediate Git repos, including `.git` files. It does not climb arbitrary ancestors or decide whether siblings form a system. Use `collect --root <workspace> --input <queries.json>` with compact `terms` (1–8), optional grounded `followup_terms`, and optional metadata-named `named_repos` to retain missing checkouts. It visits each candidate once, collects source/line-qualified catalog and CODEOWNERS evidence, and runs at most two bounded searches (20 files/60 matching lines total per repo).

Use these actual matches/queries/limitations in the one existing report. Truncated/failed searches are incomplete, never evidence of absence. Simple catalog scalars are extracted without executing YAML; unsupported catalog syntax is returned as raw unparsed evidence. Root and .github CODEOWNERS rules remain separate; the helper never claims effective platform ownership. The model still assesses code context, documentation, concept-specific expansion, Definite/Possible tiers and feature completeness. Reuse collected results; do not repeat equivalent searches or broaden the workspace without the skill's actual concept-specific evidence.

## Review reports

After the adversarial semantic review, use `review-report.mjs write --root <artifact-root> --input <review.json>` for both report tiers and, on version-1 handoff runs, the JSON handoff. Input has `version: 1`, `ticket`, `branch`, `commit`, `coverage`, `findings`, optional `solid`, `preexisting`, `context_gaps`, `known_regressions`, `decided`, and explicit `repo_roots` keyed by repo ID. Each finding supplies `severity`, `claim`, inspected `evidence`, `locations: [{repo?,file,line}]`, optional `rule`, and in implement mode `route`, stable `region`, and `introduced_by_fix_of` (or null). Set `working_tree: true` for local uncommitted reviews; otherwise use an exact hex commit or HEAD and the helper reads locations at that Git revision.

Supply `implement: {plan_version,review_cycle,handoff_version:1}` for version-1 handoff callers. Older implement callers still supply `implement` but omit `handoff_version`: they receive routes and outcome lines without a new handoff. Standalone callers omit `implement`. Set `actionable: false` only for Minor nits accepted as nonblocking; Major/Critical findings cannot be hidden. The helper derives counts, verdict, route precedence and Markdown/JSON from one findings list, validates source file/line bounds before saving, and allocates a fresh review handoff. Known hosted source links may be supplied as a location's `url`. Display its returned summary. Location validation checks existence and bounds, not whether the finding is true; source-chain verification, severity/business impact, semantic route choice and adequate review coverage remain the reviewer's responsibility.
