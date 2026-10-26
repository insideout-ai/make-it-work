# `slice-the-epic` behavior checks

Seven cases cover the interactive choice, local completion, unattended backlog generation, authorized source-comment preparation, and native dependency-link planning:

- **`slice-the-epic-well-specified-epic-autopilot`**: a coherent CSV-export epic. Offers candidate approaches, automatically picks the recommendation, and saves a linked overview plus a complete file per slice. Checks dependency consistency, skips Jira creation without questions, and logs one approach decision after all files, with no missing-fact guess.
- **`slice-the-epic-ambiguous-epic-autopilot`**: an unclear enterprise outcome. Flags a best-guess assumption, then selects an approach and generates a consistent overview and individual slice files. Skips Jira and logs both decisions after delivery.
- **`slice-the-epic-negative-control`**: the same vague input without autopilot. Asks for exactly one missing fact and waits before offering approaches or writing stories.
- **`slice-the-epic-approach-selection`**: coherent input without a chosen approach. Offers 2–3 tailored choices with tradeoffs, example slice titles, and a recommendation, then waits. Preview titles are allowed; a completed backlog is not.
- **`slice-the-epic-interactive-files-only`**: an already chosen functional approach, a supplied source Epic, declined child creation, and no usable Jira integration. Saves the linked overview and individual slice files without another selection round, preserves address ownership and historical-order behavior, and skips Jira creation and source commenting. A source URL alone supplies no comment permission.
- **`slice-the-epic-jira-summary-comment-preparation`**: an approved creation-under-source handoff with one confirmed child, one failed slice, and one pending slice. Reads a saved overview and prepares its entire content as the comment, converting Mermaid into a readable plain-text dependency list while retaining the diagram locally. Preserves all other sections, dependency distinctions, ticket/link outcomes, and the older creation-only authorization boundary. Reports commenting as unperformed; no live tracker calls are allowed.
- **`slice-the-epic-jira-native-link-plan`**: explicit link authorization with a four-edge DAG, a duplicate note, an existing blocker, a generic relates-to link, a missing endpoint, and recommended-only sequencing. Checks correct blocker direction, multiple prerequisites, deduplication, existing-link reuse, pending classification, and accurate counts in a local plan. No remote mutations are allowed.

## Running

The two autopilot cases, the interactive local-completion case, comment preparation, and native-link planning use the disposable headless path in `evals/suites.json`, since they save files. The two interactive question cases use the plugin eval harness and need no filesystem writes.

```sh
node evals/run-suite.mjs smoke --case=slice-the-epic-well-specified-epic-autopilot
node evals/run-suite.mjs full --case=slice-the-epic-ambiguous-epic-autopilot --case=slice-the-epic-negative-control --case=slice-the-epic-approach-selection
node evals/run-suite.mjs full --case=slice-the-epic-interactive-files-only
node evals/run-suite.mjs full --case=slice-the-epic-jira-summary-comment-preparation
node evals/run-suite.mjs full --case=slice-the-epic-jira-native-link-plan
```

These commands use the existing Claude Code sign-in, incur model usage, and keep their reports under ignored `evals/results/`. Each headless case runs in a disposable directory; it does not write artifacts into the plugin checkout. Use `--dry-run` to inspect the selection without invoking a model. See the shared `evals/README.md` for budgets, authentication, and judge limitations.

## Evidence

The backlog graders inspect the full transcript, including Markdown content in tool calls, because the completion response summarizes the slices rather than repeating full stories. Check that the overview links a separate complete file per slice, links resolve to actual filenames, and each slice links back and contains its story/objective, criteria/evidence, and prerequisites. The overview's Mermaid map, relationship table, and implementation flow must agree with those individual files, including parallel opportunities and an MVP boundary.

The generation cases also require a slice summary table both in the saved overview and directly in the completion response. Every slice, including independent ones, must have a row with its stable ID, concise outcome/title, hard prerequisites, optional recommended predecessors, and implementation stage. The saved and terminal tables must agree with the individual files and delivery plan. Links or a relationship-only table cannot replace this output; missing dependencies must be explicit, and recommendations must not become hard blockers.

The log graders inspect the actual `make-it-work/slice-the-epic-autopilot-log.jsonl`. The well-specified case expects one `askUserQuestion` approach-selection entry. The ambiguous case also expects the `open_text` missing-fact entry. Both use the shared decision-log schema. The trace check accepts either the shared `decision-log.mjs write slice-the-epic` helper through Bash when permitted or the direct Write fallback. `allowed_tools: [Write]` does not guarantee that Bash is unavailable; an existing permission policy may already permit the helper.

All overview and slice writes must precede the log flush. Denied deliverable writes must be reported honestly, distinguishing saved from unsaved files and delivering missing Markdown in chat before the log attempt; a denied log write is non-fatal and must not be retried through another tool. A missing actual log still fails its file-focused grader, making the environment limitation visible rather than treating an attempted write as proof of a valid saved log.

The well-specified case checks best-guess use within the `no-clarifying-pause` rubric. A separate trace-wide absence regex produced a false failure on 2026-10-09 because the final summary correctly said that no assumptions were auto-resolved with `[autopilot best-guess]`; the marker appeared only inside that negated statement.

**Observed judge variance:** repeated false failures on valid backlogs led to splitting `backlog-produced` into focused graders: `approach-stated`, `backlog-with-gherkin`, `no-clarifying-pause` and `wrap-up-present`. Keep those focused checks; the separate `dependency-map-and-flow` grader covers the new artifact's relationship consistency.

## Coverage limits

These checks do not exercise every slicing technique, a user-selected custom combination, filename collisions, or a cyclic dependency proposal. They do not test live Jira ticket/link/comment creation, organization-specific mandatory fields, Epic parenting, comment updates, remote direction read-back, size limits, or partial-failure/retry reconciliation. Local link planning does not prove the connector parameter mapping created a correctly directed live relationship. Comment preparation checks the full overview and plain-text diagram, not an actual posted comment. Live behavior requires a disposable Jira project or a connector fixture; never use production tickets to validate it. Review the conditional Jira reference against those scenarios without claiming a live integration test. Treat model-judge failures as investigation triggers: inspect the transcript and artifacts before attributing a failure to the skill or grader.
