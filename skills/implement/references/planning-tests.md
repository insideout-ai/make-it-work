# Test edits during Plan

`plan-the-work` writes progression/regression tests while production implementation
remains deferred to Execute. A fresh Implement startup baseline now records
per-path changes so its guard can exempt exact, preauthorized test edits in Plan
and Plan approval without rebasing the rest of the worktree.

Legacy saved states without controller startup-baseline metadata skip this new checkpoint and retain their prior planning path.

After a run has entered Execute or Lightweight, its startup edit guard is already released. Replans, escalations and fix planning then skip this checkpoint; a defensive helper call returns `required: false` without writing a receipt.

Markdown and files under `docs/` or `.claude/` are already outside the startup implementation baseline; retain their existing documentation/metadata write path without this checkpoint.

The parent passes its exact state path and the resolved Implement skill directory
to planning. For checkpoint-enabled runs, complete and check testing readiness first. A pending/stale readiness proof blocks authorization, including a reused test-file authorization. Then, before the first edit to each test file:

1. Save the draft plan at its normal ticket/version path. Its numbered step must
   declare the exact repo-relative test path in backticks in `**Tests:**`. The rest
   of the plan may still be under construction. Name the repo/command as usual.
2. Create the parent test directory if needed, then write a local input artifact
   under the run directory. For a dedicated test file:

   ```json
   {
     "repo": "/absolute/approved/repo",
     "file": "test/policy.test.js",
     "kind": "test-file",
     "step": 1,
     "reason": "Assert administrators are allowed; preserve guest denial"
   }
   ```

3. Run `node "<implement-base>/scripts/planning-tests.mjs" authorize --state "<exact-state-path>" --input "<input-json-path>"` as its own Bash call. Only after success, write or extend the declared tests and run the normal baseline/red checks. Register each file before editing it, including tests shared by several steps. Repeating an existing authorization preserves its original pre-edit image; it never rebases already changed content.

Whole-file scope accepts dedicated test conventions (test/spec directories,
`test_*.py`, `*.test.*`, `*.spec.*`, `*Test*` and `test.*`), or a separate-test identity already registered in an approved product repo’s valid test map. Register an unconventional new test path in that map before the checkpoint. It is exact-file scope,
not a blanket directory exemption. Production files with embedded tests use
`kind: "embedded"` plus inclusive, 1-based `start_line` and `end_line` identifying
the existing test block. The helper preserves the exact prefix/suffix bytes outside
that region. Keep the registered bounds unchanged while editing; insertions inside
the region can change its length. The region must contain test code and leave
protected source outside it. Do not widen it to include production logic. A new
standalone test file can also cover behavior in a mixed source/test file.

Authorization is bound to the ticket, run start, accepted spec hash, plan version,
approved repo and exact draft step declaration. The helper only writes
`<TICKET>-planning-tests.json`, never source, state, Progress or HTML. Embedded
receipts contain local source prefix/suffix bytes; they remain local working data
and are not automatically published or added to the delivery package. The guard
checks the saved pre-edit image against the startup baseline: writing tests first
and registering them afterward cannot forgive an early edit. Removing the plan's
original test declaration or changing the spec/version invalidates the exception.
Symlinks, deletions, unrelated paths and new commits remain guarded. Existing local
edits are preserved; no helper resets or discards work.

The exception removes only the premature-edit violation. Plan still has to finish,
and ordinary active-stage holds, approval gates and independent review remain.
It does not change background-wait policy or testing-readiness sequencing. It does
not grant production stub/implementation edits; a placeholder in production source
remains subject to the existing guard and recovery rules. Older initializer
results without per-path baseline evidence retain their previous guard behavior.

A path or region declaration is not semantic proof of test-only changes. Planning
must inspect the selected region, and independent review must inspect the complete
delivery diff, including tests, for production changes or weakened assertions.
If a checkpoint fails, correct its inputs before editing. If edits already exist,
preserve them and continue the documented recovery through authorized execution
and independent review; never rewrite a baseline/receipt to hide the violation.
