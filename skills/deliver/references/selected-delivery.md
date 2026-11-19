# Optional selected delivery

Read when the user adjusts delivery scope. Default preparation still includes
all package paths. This route selects whole files for the new commit and may
omit entire repositories; it does not remove earlier branch commits.

1. Read the existing package's repository names and exact paths. Use the user's
   stated selection; clarify material ambiguity only if existing context cannot
   resolve it. Do not add a routine confirmation before preparing the preview.
   Record the actual scope adjustment in the existing workflow Audit log with
   `resume: transparent`, referencing the prior plan/hash when present. Keep
   earlier decisions. An adjustment is not a delivery approval or a decline.
2. Save a selection JSON in the run's artifact directory, retaining its existing
   `miw-` or legacy prefix. Supply the complete scope-accurate draft, preserving
   all qualifications; do not imply that omitted work will be delivered or that
   a reduced candidate passed tests that ran on the full tree. Example:

   ```json
   {
     "version": 1,
     "repos": [{ "name": "service", "paths": ["src/policy.js", "test/policy.test.js"] }],
     "draft": {
       "commit_message": "DEMO: Update policy handling",
       "pr_title": "DEMO: Update policy handling",
       "pr_description": "Deliver the policy change and its tests. Local notes remain uncommitted."
     }
   }
   ```

   Names are package repository names; paths are exact package file names, not
   globs/directories. Include both old and new paths when intending a complete
   rename; the preview represents them as delete/add. Leave a repository out of
   `repos` to omit it. Each selected repository needs actual new commit changes.
   Selecting a committed-only path cannot create another commit or exclude its
   existing history. Correct the selection or use a separately requested
   delivery approach; do not silently add files.
3. Run:

   ```sh
   node "<base>/../implement/scripts/deliver.mjs" prepare --root <artifact-root> --state <state-path> --selection <selection.json>
   ```

   This validates the current source package, derives candidate trees through
   temporary indexes, and returns a new preview and approval hash. It leaves the
   final package/approval and source files in place. Previewing does not stage
   into the real index or perform a commit, push or PR operation. Candidate diff
   files use the delivery plan's prefix and remain in the run directory.
4. Read each linked candidate diff, then show the entire preview. Explain the
   selected new-commit changes, retained local changes, omitted repositories,
   inherited commits, resulting branch diff and any paths outside the source
   package's net diff. A local reversion can hide an earlier committed edit from
   the source package: omitting that reversion can restore the edit in the PR.
   A push publishes reachable branch history even if a file is omitted from the
   new commit. To exclude that history, propose a separately approved clean
   branch/worktree operation; do not reset, rebase or cherry-pick automatically.
5. Preserve the helper's candidate assurance limitation in chat and PR text.
   Full-tree evidence remains full-tree evidence. Consider dependency omissions
   and cross-repository compatibility; actual known correctness failures follow
   existing rules. Missing candidate-specific evidence is advisory and adds no
   universal test rerun or new approval gate. Guided/Autonomous may use optional
   Continue / Adjust consultation for material uncertainty and reuse unchanged
   answers; Autopilot discloses assumptions within existing authorization.
6. Return to Deliver this exact plan / Adjust delivery scope / Stop. Deliver
   still needs explicit approval of the newly shown hash in every mode. Use the
   existing `run --hash` command and journal; never substitute raw Git commands.
   Adjustments or corrected input are supported before actions start, including
   after preparation/preflight failure with no repository receipts. Once a
   commit/push/PR is recorded, retain and resume that exact plan using existing
   retry authorization. Do not rewrite a partial journal to change scope.

Omitted changes remain in the checkout. Do not stash, reset, delete, copy dirty
files, rewrite the completed package or claim the repository is clean. Existing
access preflight, tree/hook checks, remote checks and partial recovery apply.
