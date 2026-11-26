# Compilation and branch verification qualifications

Apply this when interpreting checks already selected by the plan, repository or
executor. It adds no compilation gate, baseline-build requirement, approval or
authority to fix unrelated code.

## Scope and provenance

- Separate the ticket's starting branch/revision from the PR destination and its
  comparison revision. A failure inherited from another commit may remain
  outside this ticket's fix scope, while the current branch build still fails.
  Disclose both facts; “outside this ticket” never means “the PR builds.”
- Attribute evidence to the revision it establishes. Source history, retained
  diagnostics or an actual comparison may establish inheritance on the starting
  branch. They do not establish a successful destination build or prove the
  failure already existed there. Keep unknown destination provenance explicitly
  unknown; do not require building or checking out that destination to proceed.
- Assess any diagnostic introduced or worsened by the ticket under ordinary
  review rules. A similar older diagnostic is not evidence that a new one is
  inherited. Preserve existing fix scope, stops and gate policies.

## Command evidence

- If compilation is run, retain the compiler command, revision, actual exit
  status and complete stdout/stderr before filtering or summarizing. Use raw
  output files/native tool results, then inspect those retained outputs. Capture
  the compiler's status before a later command overwrites it. A pipeline's last
  utility, `head`, `tee`, a success footer or emitted files cannot certify the
  compiler's exit status. Inspect wrappers that might mask it; a wrapper's zero
  status alone is not a compiler success.
- When a required command utility or compiler cannot start, report compilation
  as **not performed**, with the startup failure. A shell's command-not-found
  status is not a TypeScript diagnostic or an executed failing compilation. If
  the wrapper started but compiler startup/status cannot be established, keep
  that uncertainty explicit. Do not install tools or fix unrelated failures
  automatically to replace missing evidence.
- Passing tests against emitted JavaScript establish only those runtime test
  results. TypeScript may emit JavaScript despite a nonzero compiler exit.
  Report the JavaScript test result and compilation result separately; neither
  “tests pass” nor “JavaScript was emitted” makes failed/unperformed compilation
  successful. Label synthetic fixture output as synthetic, not an actual tsc run.

## Carry qualifications forward

### Optional local capture during Execute/Lightweight

For an already-selected validation command during active Execute or Lightweight implementation, the parent may supply its artifact root, saved state path and approved source repo to the delegate for optional capture. Write a version-1 input JSON with `command: {bin, args}`, optional repo-relative `cwd`, and optional `timeout_ms`; use Write/Edit to keep command arguments literal. Then run:

```json
{"version":1,"command":{"bin":"npm","args":["run","typecheck"]},"timeout_ms":300000}
```

Use the already-selected project command in place of the example; capture does not select or require a typecheck.

```sh
node "<plugin-root>/scripts/command-evidence.mjs" run --root <artifact-root> --state <saved-state-path> --repo <approved-source-root> --input <command-input.json>
```

This executes the selected command once, using the existing runner, and returns a unique local record plus full stdout/stderr references. The record keeps the process exit/error/signal/timeout, before/after source snapshots and capture completeness. A wrapper exit is evidence about that wrapper, not proof of compiler startup or baseline inheritance. The capture CLI returns the child's nonzero exit (or 1 for signal/startup failure) while retaining the JSON result on stdout. A logging-only failure does not alter a passing child outcome; inspect `capture_complete`, `record_saved` and warnings separately. A setup rejection means no command ran. Never rerun a check merely to repair or re-render capture data.

Capture adds disk I/O and source-snapshot work; backpressure can slow a noisy command. The existing command timeout is not extended, and filesystem completion is not itself given a hard timeout. Disclose unavailable/incomplete capture instead of treating raw-output storage as a new workflow gate.

The CLI uses the runner's existing bounded progress events on stderr and keeps its final result JSON on stdout; no model polling or new heartbeat policy is added.

Retain the returned record/raw-output paths in the existing check report. These helper-written artifacts are permitted when the parent supplies this capture context; delegates still do not edit workflow state or hand-author observation records. Private raw logs/argv may contain sensitive data: keep them under the run's protected artifact directory, outside product delivery and share-safe feedback. Existing artifact Git protection still applies. Full output streams to disk; interrupted or failed capture is incomplete evidence. No checks, dependencies, baseline builds or installations are added by choosing capture.

Capture is optional. It does not register a new state feature, add fields to the verification ledger, certify current-tree coverage or change gate rules. A command outside this capture path is not automatically observed, and an empty capture record is not a pass.

`source_unchanged` compares only the captured before/after boundaries. Matching snapshots do not prove that source stayed constant throughout execution, and stored hashes are not a signature or an automatic tamper/freshness check after capture.

### Existing report and approval qualifications

When preparing a new delivery-aligned review target, the scope helper inventories local capture records for this saved run and returns `command_facts` with safe factual notes and private record references. Pass the complete target/inventory to the reviewer, who reads the record files to identify exact commands and assess diagnostics. `review-report.mjs write` independently adds the generated facts to the reviewer-supplied `validation_notes`; omitting a model note cannot drop a captured outcome. A failed supplemental command remains disclosed without becoming an additional passing gate. Earlier failures and later passes both remain historical observations; no baseline inference or automatic supersession occurs.

Final packaging verifies and binds the same captured record/log hashes, includes the generated qualifications and private record links, and returns them from `check`. Preserve every returned note in the exact approval prompt and completion summary. Existing delivery preparation carries those safe qualifications into its separately approved PR draft. Generated notes omit raw arguments, paths, error text and output; those remain private, not PR/feedback content. Records/logs are hashed with streaming reads, not rerun to regenerate a summary. Changed, added or removed bound captures follow the existing review/package consistency route and invalidate old approval as applicable.

Saved review targets/packages without command facts retain their old contract; do not retrofit or rewrite them. Explicit new preparation adopts captures present at that boundary and carries already-bound record identities from the same run's prior targets. A removed known record stays disclosed as an unknown outcome rather than disappearing. This does not add a separate durable capture registry, recover records deleted before their first binding, reconstruct uncaptured Bash output or guarantee the model presents all returned text in chat. Incomplete captures stay qualified, and existing report/approval preservation rules below remain necessary. Binding preserves captured evidence, not its interpretation or current-tree freshness.

If bound captures change during finalization, use the existing `refresh-review` route. Its inspection can return uncovered fact changes without certifying them, preserving execution/fix progress and the review cap. Reprepare and independently review the changed facts; do not rerun commands to repair reporting. Targets/packages containing command facts require compatible current helper paths. A downgrade must retain that reader or leave the package pending; never strip bindings or rewrite approvals to simulate legacy compatibility.

Use the existing implementation check report and review `validation_notes` for
the command/status/raw-output locators, starting-branch attribution, destination
provenance (including unknown), runtime-only test results and unchecked impact.
Retain these qualifications in review, exact-package approval, completion and
delivery. Resolving ticket-scoped findings or accepting Limited assurance does
not turn a failing branch build into a passing one. No new state fields or
verification schema are required.
