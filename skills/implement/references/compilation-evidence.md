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

Use the existing implementation check report and review `validation_notes` for
the command/status/raw-output locators, starting-branch attribution, destination
provenance (including unknown), runtime-only test results and unchecked impact.
Retain these qualifications in review, exact-package approval, completion and
delivery. Resolving ticket-scoped findings or accepting Limited assurance does
not turn a failing branch build into a passing one. No new state fields or
verification schema are required.
