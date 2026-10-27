# Structured regression execution

After the skill's semantic discovery/map assessment, use `scripts/regression.mjs run --input <manifest.json>` for command execution and aggregation. The caller may keep JSON in memory or its existing verification artifact; this helper writes no result files. A standalone run must not create a project manifest file: pass a disposable input under the OS temporary directory, remove it afterward, or call exported `runRegression` directly. Use `regressionReport(result)` or `--format text` to render the existing chat labels from the same observed result; do not rerun commands just to render text.

Manifest example:

```json
{"version":1,"mode":"tokens","runs":[{"repo":"app","cwd":"/absolute/app","scope":"scoped","command":{"bin":"npm","args":["test"]},"adapter":"npm","selectors":["test/save.test.js"],"prerequisites":{"local":"yes","env":[],"services":[]}}],"not_run":[],"unmapped":[]}
```

`mode` is `full` or `tokens`; bare full in a multi-repo workspace also supplies `workspace: true`. Each run names one repo and explicit cwd. Full runs omit adapter/selectors. `command: null` records command discovery failure; bare-full workspace treats it as its documented FAIL, while other runs retain no-result/not-run behavior. Preserve the single-repo bare-full stop-and-ask before constructing such a run. A factual strategy `none` row belongs in `not_run` with `no tests in repo`, never as an undiscovered command.

Commands are argv objects, not shell interpolation. Convert a compound full-suite command to `{bin: "sh", args: ["-c", "<exact discovered command>"]}` only when that exact project command actually requires a shell. Scope must reach a supported underlying runner: adapters support package-manager test scripts with argument forwarding (`npm`), `node --test` (`node`), pytest (`pytest`), and direct Jest/Vitest/Mocha/Playwright test invocations (`direct`). Unrecognized wrappers are refused before execution. Never silently run an unsupported scoped wrapper unfiltered. Embedded/module/documentation selectors still require actual runner evidence; disclose bounded enclosing runs before execution and record them as the explicit command/scope selected. Never infer mappings from a broader executed suite.

Prerequisites contain optional `local`, env-var names and services `{name, command}`. Missing prerequisites are not run, not FAIL. Timeouts/launch errors are recorded as failed attempted runs with details. Overall is `pass` only with at least one run and no failures; nothing executed is `null`. Reports keep skipped/unresolved scope visible without converting it to FAIL. Test counts are not guessed from output. Equivalent selections merge only with the same repo, cwd, command, adapter, scope and prerequisites.

`parseScope` validates invocation grammar; `canonicalToken` matches exact inventory IDs, avoiding UC-1/UC-10 collisions. Workspace discovery, command discovery, mapping freshness/semantic relevance and human questions retain their skill contracts.

Execute consumes `overall` and per-run command/exit evidence directly. `null` routes to GATE_NO_RESULT, never PASSED. An explicit policy still requires every automated product repo's full suite; copy actual runs into the existing ledger and validate it. Legacy prose reports remain readable but are not the new machine interface.
