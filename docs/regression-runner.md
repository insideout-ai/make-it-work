# Structured regression execution

The exported `runCommand` also supports an optional asynchronous `onOutput(stream, bytes)` sink. It receives original stdout/stderr Buffers separately, applying per-stream backpressure while the existing combined tail stays bounded. Sink failures return `output_capture_error`, keep draining output and preserve the actual process result; callers must distinguish complete capture from execution success. Callers without a sink retain the existing result shape. This is not an additional regression/gate invocation.

For optional private validation capture during active Implement Execute/Lightweight, use [command capture](../skills/implement/references/compilation-evidence.md#optional-local-capture-during-executelightweight) through `scripts/command-evidence.mjs`. It reuses this runner without classifying a supplemental command as a test gate or changing existing regression CLI behavior.

After the skill's semantic discovery/map assessment, use `scripts/regression.mjs run --input <manifest.json>` for command execution and aggregation. The caller may keep JSON in memory or its existing verification artifact; this helper writes no result files. A standalone run must not create a project manifest file: pass a disposable input under the OS temporary directory, remove it afterward, or call exported `runRegression` directly. Use `regressionReport(result)` or `--format text` to render the existing chat labels from the same observed result; do not rerun commands just to render text.

Manifest example:

```json
{"version":1,"mode":"tokens","runs":[{"repo":"app","cwd":"/absolute/app","scope":"scoped","command":{"bin":"npm","args":["test"]},"adapter":"npm","selectors":["test/save.test.js"],"prerequisites":{"local":"yes","env":[],"services":[]}}],"not_run":[],"unmapped":[]}
```

`mode` is `full` or `tokens`; bare full in a multi-repo workspace also supplies `workspace: true`. Each run names one repo and explicit cwd. Full runs omit adapter/selectors. `command: null` records command discovery failure; bare-full workspace treats it as its documented FAIL, while other runs retain no-result/not-run behavior. Preserve the single-repo bare-full stop-and-ask before constructing such a run. A factual strategy `none` row belongs in `not_run` with `no tests in repo`, never as an undiscovered command.

Commands are argv objects, not shell interpolation. Convert a compound full-suite command to `{bin: "sh", args: ["-c", "<exact discovered command>"]}` only when that exact project command actually requires a shell. Scope must reach a supported underlying runner: adapters support package-manager test scripts with argument forwarding (`npm`), `node --test` (`node`), pytest (`pytest`), and direct Jest/Vitest/Mocha/Playwright test invocations (`direct`). Unrecognized wrappers are refused before execution. Never silently run an unsupported scoped wrapper unfiltered. Embedded/module/documentation selectors still require actual runner evidence; disclose bounded enclosing runs before execution and record them as the explicit command/scope selected. Never infer mappings from a broader executed suite.

Prerequisites contain optional `local`, env-var names and services `{name, command}`. Missing prerequisites are not run, not FAIL. Timeouts/launch errors are recorded as failed attempted runs with details. Overall is `pass` only with at least one run and no failures; nothing executed is `null`. Reports keep skipped/unresolved scope visible without converting it to FAIL. Test counts are not guessed from output. Equivalent selections merge only with the same repo, cwd, command, adapter, scope and prerequisites.

A service check uses the same argv object as a test command, never a shell string.
This disposable smoke example exercises both shapes (it is not product-test evidence).
Replace the cwd, service check and suite with discovered project values:

<!-- workflow-findings: structured-prerequisite-example -->
```json
{
  "version": 1,
  "mode": "full",
  "runs": [{
    "repo": "api",
    "cwd": "/absolute/api",
    "scope": "full",
    "command": { "bin": "node", "args": ["-e", "console.log('suite passed')"] },
    "timeout_ms": 300000,
    "prerequisites": {
      "local": "yes",
      "env": [],
      "services": [{ "name": "example-service", "command": { "bin": "node", "args": ["-e", "process.exit(0)"] } }]
    }
  }]
}
```

Inside Implement, copy retained results into `gate.full_suites`, including each
suite's required `note`; see the [complete gate object](../skills/implement/references/verification.md).
Do not write only a gate-level pass when the plan requires per-repo suite evidence.

The CLI emits JSONL progress events on **stderr** at command start, every five
minutes while running, and command finish. Each `type: regression-progress`
event names the repo, cwd, command and stage (`prerequisite` or `suite`), with
elapsed milliseconds, the configured timeout, output-byte count and last-output
timestamp. `last_output_at: null` means no child output has arrived; it does not
mean failure. `output_idle_ms` is time since the last received chunk, or null
before any output. Command labels are limited to 500 characters with
`command_truncated: true` when abbreviated; the final result retains full argv.
Progress contains no raw child output. Other stderr lines can still contain
diagnostics; identify progress by its type rather than treating all stderr as
JSON or as failure. Capture/drain both streams when spawning the CLI.

**Stdout remains the one final JSON result or `--format text` report.** Child
stdout/stderr are still buffered into a bounded tail, not streamed as a live test
log. Empty stdout is normal while execution is active. Use progress events for
status updates and the completion notification for waiting; do not repeatedly
poll or rerun tests to obtain progress. A quiet suite can be healthy, and recent
output does not prove it is healthy or predict when it will finish.

`--progress-interval-ms N` changes the heartbeat interval (integer 10–300000 ms;
300,000 is the normal default; shorter intervals are available for diagnostics
and disposable tests).
Library calls remain silent unless supplied a **synchronous**, short
`onProgress(event)` callback; `progressIntervalMs` selects the same interval for
`runRegression` or `runCommand`. Observer exceptions/async callbacks are recorded
without cancelling or rerunning commands. `runCommand` exposes `progress_error`;
`runRegression` returns the actual result with `progress_warnings`. The CLI
retains that result on stdout; progress failures, including a closed stderr pipe,
do not change the test outcome or cause a failing process exit. Text reports
disclose these warnings. No tests are rerun to repair progress reporting.

Select `timeout_ms` from known suite durations or disclose an unknown duration;
a timeout is a bound, not a completion estimate. All timeout values are validated
before any command starts. Limits remain 300,000 ms by default, at most 3,600,000
ms per suite, and 10,000 ms for service checks. There is no new idle termination
or automatic retry. Timeout results retain earlier completed runs and available
output tails, with `timed_out`, `timeout_ms`, `started_at`, `duration_ms`,
`last_output_at`, `output_idle_ms`, `output_bytes` and `output_truncated`.
Text reports label timed-out execution incomplete and disclose truncated output.
Failed service checks retain command/result details under the not-run entry's
`prerequisite`; they do not become failed attempted suites. Preserve returned
results when a progress/audit/render step fails; never rerun a suite only to
obtain its report. Process termination before a command returns still cannot
produce a final aggregate; this slice adds no persistent result journal.

`parseScope` validates invocation grammar; `canonicalToken` matches exact inventory IDs, avoiding UC-1/UC-10 collisions. Equivalent scoped selections merge only when their effective timeout also matches. Workspace discovery, command discovery, mapping freshness/semantic relevance and human questions retain their skill contracts.

Execute consumes `overall` and per-run command/exit evidence directly. `null` routes to GATE_NO_RESULT, never PASSED. An explicit policy still requires every automated product repo's full suite; copy actual runs into the existing ledger and validate it. Legacy prose reports remain readable but are not the new machine interface.

When running the completion gate inside Implement's active Execute phase, supply `--state <exact-state-path> --audit-id <gate-occurrence-id>` (or `{ statePath, auditId }` to `runRegression`). Use one stable ID per gate invocation, including plan/fix round; a genuinely new run uses a new ID. The runner appends a typed Result with the observed aggregate, run/not-run/unmapped counts, and manifest/result digests after execution. It changes no workflow fields and creates no missing legacy dashboard. Standalone regression omits both arguments and remains report-only. On a result-render failure, repair/refresh the existing dashboard rather than rerunning suites for logging. This narrow audit write is separate from the live regression report; returned JSON and the Execute ledger/report retain detailed evidence.

If auditing or rendering fails after tests finish, the CLI still emits the observed result on stdout and exits nonzero with the checkpoint error on stderr; the exported function attaches the observed result as `error.regressionResult`. Retain that evidence, repair the failed checkpoint, and block dependent work until recovery succeeds. A failed checkpoint must not turn an observed test failure into a pass or require rerunning tests solely to recover their report.
