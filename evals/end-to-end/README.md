# Manual end-to-end release rehearsal

This test uses a new disposable repository and the maintainer's existing
Claude Code sign-in. It is deliberately not part of the per-PR smoke suite.

1. Seed the project, replacing `<plugin-root>` with this checkout's path:

   ```sh
   run_dir=$(mktemp -d)
   (cd "$run_dir" && bash <plugin-root>/evals/end-to-end/fixture.sh)
   ```

   The fixture exits unless its cwd is temporary and has no `.git`. Its
   baseline `node --test` run must pass before proceeding.

2. From `run_dir`, start `claude --plugin-dir <plugin-root>` and submit
   `/make-it-work:implement DEMO-101` followed by the complete contents of
   `TICKET.md`. Choose **Autonomous**. Review the saved spec, plan, code,
   regression result, PR review, and final context update. Pass requires
   `canProceed('admin') === true`, the original member/guest tests still
   passing, a completed state file, and no commit or push by the skill.

3. For the failure-and-resume rehearsal, seed a second disposable project.
   Choose **Guided** and pause at plan approval. Copy
   `forced-regression.test.js` into that project's `test/` directory, then
   approve the plan and let execution reach the regression gate. The copied
   test is deliberately unrelated to the ticket. Pass requires a visible
   failing gate, a clear related/unrelated classification, and no silent
   success claim. Stop the run, remove only the copied test from this
   disposable project, then invoke `/make-it-work:implement` to resume.
   Pass requires the saved state to be reconciled and the suite to pass.

4. Record both fixture paths, the final state files, the reviewed report,
   and the exact plugin commit in `docs/eval-release-checklist.md`'s release
   preparation copy. Do not include transcripts containing test-account data
   in the public repository.

For a clean installation check of that same committed version, run
`bash <plugin-root>/evals/end-to-end/clean-install.sh` separately. It creates
a local marketplace from `git archive HEAD` and installs it only inside a
disposable Claude configuration and project. It refuses a dirty checkout so
the installation cannot accidentally test an older commit.

For a live integration smoke, use an existing authorized test account and a
non-sensitive test ticket. From a disposable project, invoke
`/make-it-work:close-the-gaps <test-ticket-id>` and verify that the ticket was
read from the intended tracker, its source is identified, and no ticket was
created or updated. Then revoke or disconnect the test account only if that
is your team's normal cleanup procedure. Do not add credentials to CI or
commit the ticket content, tool transcript, or account details to this repo.
