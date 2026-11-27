# Generated artifacts, dashboard usage and timing

## Filenames and compatibility

New Implement and Drive-the-epic runs have `miw-run.json` with `artifact_naming_version: 1`. Every generated file in those runs, including nested handoffs, assessment snapshots, receipts and temporary files, starts with `miw-`. Directories keep their existing names. For example: `make-it-work/DEMO/miw-DEMO-state.md`, `miw-DEMO-status.html`, `DEMO-handoffs/miw-review-1.json`, and epic `miw-state.json` / `miw-dashboard.html`.

Before a skill manually writes prose/JSON (rather than using an existing deterministic writer), resolve the path first:

```sh
node /absolute/plugin/path/scripts/artifact-output.mjs resolve --root /absolute/project/path --directory make-it-work/DEMO --name DEMO-plan.md
```

The resolver performs Git protection, preserves an established legacy path, and returns the actual `file`, repository-relative `relative`, and basename `name`. Use those values for Write/Edit, stored references, and links. It does not write or overwrite the artifact itself. Non-Git workspaces return a notice in `gitProtection` to surface in the handoff. Existing collision/overwrite approval rules still apply.

Always use paths returned by helpers and preserve actual saved references. Do not reconstruct names from documentation examples. Older examples denote logical artifact roles; shared artifact path/IO helpers resolve those names to the marked run's actual filenames. An existing unmarked run retains its original naming, including artifacts created on later resumes. Existing standalone artifacts retain their paths; new standalone outputs under `make-it-work/` get the prefix. User-supplied input files are not renamed. Never create a marker in an existing run or rename its history.

Before writing artifacts, shared IO checks the containing Git worktree, rejects staged/tracked artifacts, adds the artifact directory's anchored rule to `.gitignore` when needed, and verifies effective exclusion. Preserve that `.gitignore` edit for ordinary review. Fix reported tracked paths deliberately; the plugin never unstages, deletes or rewrites history automatically. Delivery also checks outgoing commits, including artifacts removed by later commits. `.gitignore` cannot prevent manual force-adds or external pushes. Non-Git workspaces can keep local artifacts.

## Readable artifact previews

Implementation and epic dashboards open existing local Markdown artifacts in a
formatted reader page in a new tab. Each preview includes **Back to dashboard**
and **Open original** links. Headings, tables, lists, and code blocks render
offline, including when the dashboard is opened directly through `file://`.

Dashboard generation refreshes these derived `<original>.md.preview.html` files
alongside the source documents; the original contents and state references stay
unchanged. Existing dashboards gain previews on their next regeneration. Missing
artifacts and other file types retain their original links. Raw HTML is displayed
as text, executable links are disabled, and remote images are not loaded.

## Implementation dashboard layout

Implementation dashboards contain six sections in order: title and badges, workflow circles, one status box, repositories, artifacts, and audit log. Activity, pending input and feedback progress stay inside the status box. Repository delivery outcomes stay with locations and branches; feedback and delivery records stay in Artifacts. Detailed timing and qualifications stay in the audit section or linked reports. Epic dashboards retain their existing layout.

The completed status box contains concise Changed, Time, Delivery, Testing and Feedback lines, plus Attention when needed. Completion chat mirrors these facts after the latest dashboard refresh. Test counts describe distinct current-plan scenarios using final recorded evidence, not individual test cases or rerun totals. Missing evidence stays unknown; suite outcomes and preparation baselines do not establish scenario results. Acceptance counts use the existing validated distinct-criterion summary. Recorded waiting comes from retained activity intervals, deduplicated and clipped to workflow timing; it is explicitly partial coverage, and unavailable when timing records are missing or unreadable.

## Version and optional usage

Both dashboards show the plugin version captured at run creation; legacy attribution remains Unknown. Upgrades do not relabel an existing run. Context usage and estimated session cost are shown independently only when available; missing values are omitted. A capture timestamp appears only when at least one usage value is shown.

Claude Code's optional status-line integration supplies context percentage/capacity and estimated session cost. No token pricing table, network request or transcript collection is needed. Cost covers the Claude session, potentially including work outside this workflow; it is not a subscription charge or a per-ticket bill.

Configure a status-line command to pass its stdin JSON to:

```sh
node /absolute/plugin/path/scripts/usage.mjs collect --root /absolute/project/path
```

Use a stable installed plugin path. The command prints a small terminal status line and saves only metrics and session/workspace identity locally under `make-it-work/miw-usage-cache/`. Do not replace an existing status line automatically. To preserve an existing command, its wrapper can read stdin once, send the same JSON to the collector with `--quiet true`, then send it to the existing command; collector failure must not prevent the existing command from running. No settings change is performed by the plugin.

List collected sessions and explicitly bind a run directory:

```sh
node /absolute/plugin/path/scripts/usage.mjs list --root /absolute/project/path
node /absolute/plugin/path/scripts/usage.mjs bind --root /absolute/project/path --run /absolute/project/path/make-it-work/DEMO --session SESSION_ID
```

Never guess among sessions. Rebind when resuming in a different Claude session. Binding takes effect at the next main workflow stage boundary or resume. Usage snapshots update only at those boundaries and session finalization, not on every response or dashboard refresh. Keep the capture timestamp visible alongside available usage values. Missing/invalid telemetry is omitted from the dashboard and never blocks workflow progress. Unsupported hosts do not collect it.

## Finalization timing

Finalizing includes final context sync, final approval and feedback collection. Overall session duration ends at the same verified feedback saved/unavailable receipt. The page-load script updates elapsed figures on the existing dashboard reload cadence while collection is active; source HTML stays stable for feedback inspection and no timer is added. both values freeze at the receipt timestamp, excluding optional delivery. Implementation completion fields remain unchanged. Legacy records without a reliable feedback endpoint disclose that feedback time is excluded.

## Post-coding time breakdown

New Implement runs opt into `activity_timing_version: 1`. Before each meaningful Lightweight or Execute work chunk, use the ordinary activity checkpoint with an explicit category:

```sh
node /absolute/plugin/path/skills/implement/scripts/dashboard-checkpoint.mjs activity --state /absolute/project/path/make-it-work/DEMO/miw-DEMO-state.md --activity "Running the scoped verification checks" --category "tests/verification"
```

Categories are `investigation/setup`, `coding`, `tests/verification`, `waiting for input`, and `unclassified`. The exact narrated sentence remains the activity text. Categorize the upcoming work, not the preceding work; never infer a category from prose. Coding denotes a declared implementation chunk, including any step-local checks embedded by the delegate. Separate verification chunks and audited regression commands use tests/verification. Single-step starts record coding deterministically; mixed parallel batches remain unclassified unless the parent has a reliable category boundary. Only the parent updates the activity category. Record tests/verification before invoking a nested regression. Use coding for edits and investigation/setup for diagnosis or tool setup. Retry work stays in its actual category.

Explicit Paused intervals count as waiting; resumed or interrupted work remains unclassified until freshly categorized. After an unclean interruption, mark the unsupported interval unclassified rather than assuming the previous activity kept running. Do not sum parallel agent durations or claim typing/reasoning time.

On each successful Lightweight/Execute handoff to Review, the controller writes one Result line listing category totals and a supporting interval JSON artifact. Later fix passes get separate entries. It uses host timestamps and stable phase-entry IDs so replay does not duplicate a result. Zero categories are omitted; unknown time is disclosed rather than invented. This informational result changes no readiness gate, approval, status or retry counter.

Evaluation file targets resolve the same saved naming formats; wildcard evidence preserves actual filenames, checks marker-backed logical aliases, and still rejects ambiguity and symlink escapes. Exact prefix assertions are covered separately by literal on-disk inventory tests.
