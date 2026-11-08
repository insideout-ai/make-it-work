# Drive the Epic evals

Six isolated headless model cases exercise full autopilot preparation, the interactive full-epic review gate, a scoped slice-only resume, an inaccessible sole Jira source, and unresolved/resolved uncertainty handoffs. The new-skill smoke case is `drive-the-epic-autopilot`.

```sh
node evals/run-suite.mjs smoke --case=drive-the-epic-autopilot --dry-run
node evals/run-suite.mjs smoke --case=drive-the-epic-autopilot
node evals/run-suite.mjs full --case=drive-the-epic-review-gate --case=drive-the-epic-scoped-resume --case=drive-the-epic-jira-unavailable
```

Use a signed-in Claude Code installation. No API key is requested. Read [the shared eval instructions](../README.md) for automated local/semantic grading, model overrides, budgets, and permission-refusal behavior. Fixture setup is guarded and must run only in disposable directories. It never writes to the plugin checkout.

Local controller/artifact regression checks need no account:

```sh
node --test scripts/epic-workflow.test.mjs scripts/epic.test.mjs scripts/slices.test.mjs
node evals/validate.mjs
```

Successful autopilot/resume cases also check that per-event JSON, duplicate decision journals, stage JSONL files, and leftover scratch input do not accumulate.

Those deterministic tests verify orchestration gates, graph consistency, scoped invalidation, artifact integrity, checkpoint recovery, and HTML links. They do not substitute for model-level skill-following evals; report whether the authenticated model cases actually ran.

Uncertainty handoff regressions start at slicing with a saved epic, avoiding
unrelated shaping choices. `drive-the-epic-uncertainty-unresolved` keeps login
handling unknown in affected slices without firm invented criteria. The paired
`drive-the-epic-uncertainty-resolved` records an explicit user answer and epic
revision first; slicing must use that latest resolution instead of reopening a
historical question. Both preserve source/epic state and never implement work.
The semantic grader receives the fixture baseline alongside final state.
