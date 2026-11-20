# Repository impact in multi-repo runs

Apply this contract only when saved state has `repo_impact_version: 1`. New multi-repo Implement runs enable it; standalone, single-repo and older saved runs retain their existing behavior. Impact is separate from repository/branch approval and product/test/support roles. Never remove an approved repository to avoid verification. Keep all approved repos in review and final packaging; existing delivery skips unchanged repos.

## Assess before doing work

Use bounded read-only discovery from the request, accepted spec, actual changes and dependencies. Before acceptance, treat classifications as provisional: do not start setup, generate strategies/maps or demand onboarding in a repo merely because it was selected. Read available relevant guidance. After the spec is accepted and before readiness or Lightweight implementation, inspect actual branch-to-base changes:

```sh
node "<implement-base>/scripts/repo-impact.mjs" inspect --state "<state-path>"
```

The helper includes earlier branch commits, staged/unstaged and untracked paths, excluding workflow artifacts using the existing delivery snapshot. An empty working-tree diff alone does not mean unchanged. Classify every approved repo:

| Classification | Treatment |
| --- | --- |
| `change` | Planned edits or actual changes; normal change-specific readiness, test preparation and verification. Automated product repos retain their full-suite gate. |
| `verify` | No edits, but a concrete dependency/compatibility impact or required test-provider role; run the selected targeted checks. |
| `context` | No edits and no verification impact; relevant context inspection and Git identity checks only. No tests, builds, setup, strategy generation, documentation or map maintenance. |

Do not infer no impact just from an empty diff or a support role. Trace changed contracts and relevant consumers/providers. Record evidence supporting each classification. If impact is uncertain, investigate the bounded dependency path or conservatively include verification; essential unknowns remain blockers. Documentation-only edits count as changes and retain existing change-specific rules.

The parent submits an ordinary `workflow.mjs apply` event with `event: "repo-impact"`, the explicit approved `repos` roots, stable `id`, and `assessment` using this shape:

```json
{
  "version": 1,
  "repos": [{
    "repo": "api", "role": "product", "classification": "change",
    "planned_paths": ["src/handler.js"],
    "reason": "The accepted request changes the handler response.",
    "evidence": [{"repo": "api", "path": "docs/contract.md"}]
  }],
  "checks": [{
    "id": "api-suite", "repos": ["api"], "run_repo": "api", "scope": "full",
    "command": {"bin": "npm", "args": ["test"]},
    "scenario": "Handler compatibility", "expected": "Existing and new assertions pass.",
    "prerequisites": "Existing dependencies and test database.",
    "source": "configured", "reason": "Changed API retains its configured full-suite gate."
  }]
}
```

Include all approved repos, not just the illustrative row. `planned_paths` is empty outside change repos. Evidence names existing files in approved roots; the controller retains their hashes. Prefer the narrow contract/configuration evidence that actually supports the decision. Checks have stable unique IDs, owner `repos`, execution `run_repo`, `scope` (`full`, `scoped`, `manual`), structured command argv (or `null` for manual), scenario, expected observation, prerequisites, source and reason. Source is `configured`, `user` or `project-policy`; manual checks require `user` or `project-policy`. If normal changed-repo work needs new setup or test paths not yet known, return the concrete paths for parent reassessment before sealing the plan or authorizing writes. Deduplicate a shared QA command into one check covering all its owners, with the unchanged QA repo classified verify. No check may run in or cover a context repo.

A definition revision with an existing plan saves `impact_previous_plan` and returns to Plan with a new plan version, preserving earlier artifacts. A required automated check without usable tooling/access must remain in the assessment with `availability: "unavailable"`, a concrete `blocker`, and `command: null` when no supported command exists. Keep scope `scoped` or `full` as required; this is not manual consent. Use source `project-policy` for a requirement established by the accepted spec when there is no configured check. The impact assessment can be saved/inspected, but readiness completion, execution manifests and passing verification reject unavailable required checks. Do not invent a command or list an owner on a partial QA check merely to satisfy the validator: its actual assertions must establish that owner's required behavior. A caveat on a ready row is not a blocker.

The controller saves the artifact and its definition hash without approving a plan or advancing the phase. Use helper-returned paths. Verify it before dependent stages:

```sh
node "<implement-base>/scripts/repo-impact.mjs" check --state "<state-path>"
```

## Readiness and planning

After recording impact, follow the parent-owned [testing readiness barrier](testing-readiness.md): begin it, write/reconcile the report, and complete/check it only when the required capabilities exist. Recording impact or observing baseline passes does not complete readiness. For a missing required check, save the blocked report and leave the receipt pending; never seal a ready row with an explanatory caveat.

Only change and verification-only product repos need Verification Policy rows. Test-provider repos are included through their required checks/locations. Context-only repos do not need an invented manual policy, missing-strategy warning or setup proposal. For verify repos inspect existing relevant commands/maps only; do not establish tooling, generate strategies or use the absent-tooling automatic manual default. Prefer existing external automation. An explicit user/project manual choice is permitted; otherwise report the concrete missing-verification blocker. Broaden targeted checks only when the enclosing suite is necessary or an explicit project/user rule requires it, recording why. Preserve stronger requirements and saved choices.

New impact-enabled plans include `**Repository impact contract:** 1` after the header and a `## Repository Impact` section containing the exact saved definition (`version`, `repos`, `checks`) in one fenced `json` block, with a brief plain-language summary. The readiness report retains its normal policy/results tables; do not copy the plan's Affected Code section there. Keep Affected Code limited to planned edits. Coverage and AC traceability include verification-only checks; write-the-tests may reuse existing tests without editing an unchanged repo. Needing new tests promotes that repo to change through reassessment/replanning before writes.

If there is no implementation or verification work at all, report that explicitly through the existing no-work/stop route. Do not invent steps, tests or an automated PASS to finish a vacuous plan.

## Verification and maintenance

For automated completion use the assessed commands, not `full:<repo>` for every policy row. Obtain the deterministic manifest and save it using the normal artifact resolver:

```sh
node "<implement-base>/scripts/repo-impact.mjs" manifest --state "<state-path>" --plan "<plan-path>"
```

Pass that manifest to the existing regression runner with its `--state` and stable `--audit-id`. The manifest's `adapter: "exact"` runs the already-selected structured argv without adding selectors; it is accepted only with a current impact assessment. It never authorizes arbitrary unassessed commands or bypasses prerequisite checks. Run required manual checks separately with actual observations. In Lightweight runs the assessed dependency checks can use the same audited runner while phase is lightweight; ordinary changed-repo Lightweight verification otherwise retains its existing rules. Before its implementation handoff, submit a same-definition repo-impact event with a `verification` gate containing actual `checks` observations. The controller binds that proof to the current tree; review and packaging reject missing/stale required checks. This does not create a TDD plan or claim a full regression gate for Lightweight. Unavailable commands/access are not passing checks or permission to install tooling.

Record every required check exactly once in verification `gate.checks`: `{id, run_repo, scope, command, result, note}`. Copy the assessed command (structured argv or null); result is `pass`, `fail` or `not-run`, and note records the actual observation/blocker. Required skipped checks prevent successful completion. Existing `full_suites` entries may describe only actually executed full suites, using their ordinary command string; scoped checks must never appear as full-suite passes. Continue normal per-step and clause-level acceptance evidence.

Context-only repos can have `test_map_maintenance` status `not-applicable`, `affected_tests: []` and the impact rationale even if an unrelated existing map is stale. Verify-only repos may reuse existing mappings without rewriting them when no tests/mappings changed. Changed repos retain existing maintenance checks. Review still checks relevant cross-repo contracts and all approved scope; skipping unrelated suites does not waive correctness review.

## Reassessment and reporting

Check impact before dependent readiness, preparation, execution, review and packaging. Reassess on spec/scope/plan revisions, unexpected edits in verify/context repos, or changed dependency evidence. A stale check is a concrete reconciliation stop, not a reason to silently run every suite. Submit another repo-impact event after examining current evidence. Identical definitions can refresh evidence while preserving valid before-planning readiness. Changed definitions with an existing plan return through normal replanning, invalidate readiness/verification through the new plan version and retain Guided plan approval. Never reset completed execution counters to hide a required reassessment.

The dashboard and final package show each repo's classification, reason and selected checks; context-only is “not required”, not “passed”. Keep failed/unavailable checks visible. Maintain existing branch/workspace approval, delivery consent and older-run behavior.
