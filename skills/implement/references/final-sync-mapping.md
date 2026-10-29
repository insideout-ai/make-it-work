# Bounded test-map maintenance at Final Sync

Read with `docs/test-map-contract.md` after the final documentation edits. This pass maintains mappings affected by the implementation; full onboarding/repair needs its own explicit scope.

## Establish scope and readiness

Use the spec, the finished change's paths, the plan/Lightweight report, review discoveries and final documentation edits to identify affected behavior, test identities and repo-qualified UC/domain tokens. Include tests whose recorded evidence depends on changed code/docs, plus new or changed tests and necessary traced dependencies. File names/imports alone do not prove either relevance or irrelevance. Reuse earlier semantic analysis only when its assertion, implementation and documentation evidence still matches the finished tree; inspect changed evidence rather than replaying discovery from scratch.

Read the registered strategy, map completeness/assessed-token fields, and presence of repo snapshots and location discovery signatures before interpreting freshness. Run the existing read-only `inspect` helper, synchronizing changed registrations/vocabulary as the shared contract requires. Its repo-wide inventory is mechanical; it is not permission for repo-wide semantic reading. With no saved snapshot, hundreds of reported changes and all known tests being stale mean there is no comparison baseline, not that this feature changed every file. Do not claim those tests are current or unrelated solely from that list.

- **Usable baseline:** follow targeted freshness dependencies. A genuine configuration change, missing evidence or unknown behavioral impact may still require broader discovery under the shared contract; explain that cause instead of treating all rebuilds as onboarding debt.
- **Pre-existing missing baseline/incomplete discovery:** follow the shared contract's bounded Final Sync exception. Review the feature's affected/new tests and evidence, preserve unrelated entries and user decisions, and leave unfinished scope incomplete. Do not silently undertake full onboarding. If an explicit full rebuild is already in scope, complete it under the normal refresh protocol.
- **Unavailable or ambiguous evidence:** retain uncertainty and report what could not be established. If the prior gate/review depends on that unresolved scope, use Final Sync's stop rule; an incomplete map alone is not a passing validation result.

## Keep the model inputs bounded

Keep the full mechanical inspection result in approved temporary storage or in process memory. Return a compact summary: per-location readiness/refresh reason, unavailable repos, counts of changed/stale items, and the affected test/evidence paths. Read full entries or source snippets only for relevant candidates; avoid dumping repo snapshots, hundreds of paths or the entire map into each tool response. Reuse an inspection result until inputs change; a final inspection after metadata edits may be needed for baseline validation.

When delegation is warranted, give the agent this bounded assignment:

> Maintain the supplied affected test identities and UC/domain relationships against the final code/docs. Here are the repo roots, affected paths/tokens, baseline/completeness summary, relevant prior evidence and map location. Read the shared mapping contract, strategy and relevant assertions/dependencies as needed. Preserve unrelated entries and user decisions. Do not repair pre-existing onboarding, reread every test, run tests or change source/tests. Report reviewed IDs, changed relationships, preserved uncertainty, map/report paths and whether test selection or validation assumptions changed. If scope must expand, name the concrete dependency or uncertainty and retain unresolved scope when it cannot be established within this maintenance pass.

Do not supply a broad "reconcile the whole repo" brief or copy the full parent conversation. The agent may inspect additional code/docs when a traced dependency requires it; compact inputs must not replace behavioral evidence with filename guesses.

## Save and report the actual outcome

Persist only reviewed changes; record layers on newly assessed tests, retaining `unknown` when needed. Preserve unrelated decisions and entries. Advance snapshots/discovery only after every affected location sharing that baseline has completed the required assessment. A partial pass leaves pre-existing baselines unchanged (missing stays missing), unfinished locations `complete: false`, and unassessed tokens unassessed. Never stamp a fresh baseline to make the map look current.

Validate the saved map, query the affected tokens and generate `TEST-MAP.md` through `test-map-report.mjs --write` per the shared contract. Keep query uncertainty visible: new relationships may remain unresolved for selection until onboarding is completed. Report either "affected mappings reconciled" with supporting current-query evidence or "affected mappings updated; existing map remains incomplete", naming the unresolved scope and deferred full refresh. Include actual map/report changes in `context_updated` and the final package.

Reuse the completed gate/review unless the maintained evidence changes their selection or behavioral assumptions. Do not add a full test-suite run to this metadata pass; follow Final Sync's stop rule if affected validation/review is required.
