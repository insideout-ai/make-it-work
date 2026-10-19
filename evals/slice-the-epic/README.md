# `slice-the-epic` behavior checks

Four cases cover the interactive choice and unattended backlog generation:

- **`slice-the-epic-well-specified-epic-autopilot`**: a coherent CSV-export epic. Offers candidate approaches, automatically picks the recommendation, and saves the full backlog and dependency map. Logs one approach decision, with no missing-fact guess.
- **`slice-the-epic-ambiguous-epic-autopilot`**: an unclear enterprise outcome. Flags a best-guess assumption, then selects an approach and generates a consistent backlog. Logs both decisions.
- **`slice-the-epic-negative-control`**: the same vague input without autopilot. Asks for exactly one missing fact and waits before offering approaches or writing stories.
- **`slice-the-epic-approach-selection`**: coherent input without a chosen approach. Offers 2–3 tailored choices with tradeoffs, example slice titles, and a recommendation, then waits. Preview titles are allowed; a completed backlog is not.

## Running

The two autopilot cases use the disposable headless path in `evals/suites.json`, since they now save both a backlog and a log. The interactive cases use the plugin eval harness and need no filesystem writes.

```sh
node evals/run-suite.mjs smoke --case=slice-the-epic-well-specified-epic-autopilot
node evals/run-suite.mjs full --case=slice-the-epic-ambiguous-epic-autopilot --case=slice-the-epic-negative-control --case=slice-the-epic-approach-selection
```

These commands use the existing Claude Code sign-in, incur model usage, and keep their reports under ignored `evals/results/`. Each headless case runs in a disposable directory; it does not write artifacts into the plugin checkout. Use `--dry-run` to inspect the selection without invoking a model. See the shared `evals/README.md` for budgets, authentication, and judge limitations.

## Evidence

The backlog graders inspect the full transcript, including Markdown content in Write calls, because the final chat message may only link the saved file. Check that the file includes all stories and their criteria, stable IDs, a Mermaid map plus relationship table, and a compatible implementation flow with parallel opportunities and an MVP boundary.

The log graders inspect the actual `make-it-work/slice-the-epic-autopilot-log.jsonl`. The well-specified case expects one `askUserQuestion` approach-selection entry. The ambiguous case also expects the `open_text` missing-fact entry. Both use the shared decision-log schema. The trace check accepts either the shared `decision-log.mjs write slice-the-epic` helper through Bash when permitted or the direct Write fallback. `allowed_tools: [Write]` does not guarantee that Bash is unavailable; an existing permission policy may already permit the helper.

The artifact write must precede the log flush. A denied backlog write must be reported honestly and the complete Markdown delivered in chat; a denied log write is non-fatal and must not be retried through another tool. A missing actual log still fails its file-focused grader, making the environment limitation visible rather than treating an attempted write as proof of a valid saved log.

The well-specified case checks best-guess use within the `no-clarifying-pause` rubric. A separate trace-wide absence regex produced a false failure on 2026-10-09 because the final summary correctly said that no assumptions were auto-resolved with `[autopilot best-guess]`; the marker appeared only inside that negated statement.

**Observed judge variance:** repeated false failures on valid backlogs led to splitting `backlog-produced` into focused graders: `approach-stated`, `backlog-with-gherkin`, `no-clarifying-pause` and `wrap-up-present`. Keep those focused checks; the separate `dependency-map-and-flow` grader covers the new artifact's relationship consistency.

## Coverage limits

These checks do not exercise every slicing technique, a user-selected custom combination, or a cyclic dependency proposal. Treat model-judge failures as investigation triggers: inspect the transcript and artifact before attributing a failure to the skill or grader.
