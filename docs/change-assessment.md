# Change assessment evidence contract

`/make-it-work:assess-change` uses `scripts/change-assessment.mjs`. Rubric `conservative-v1` is informational and adds no policy configuration, deployment actions or monitoring. [Radon bands](https://radon.readthedocs.io/en/stable/api.html#cyclomatic-complexity) are grouped 1–10 / 11–20 / 21+; cognitive measurements use the configured analyzer threshold, with exceedance High. Qualitative dimensions may raise measured ratings. Risk is at least resulting complexity, including inherited complexity.

Commands: `snapshot --scope FILE`; `write --root ROOT --ticket ID --scope FILE --input FILE`; `fail --root ROOT --ticket ID --scope FILE --reason TEXT`; `check --root ROOT --ticket ID`. Scope fields are `label`, optional `reference`, and `repos: [{path, base}]`. Paths are absolute repository roots; every affected repo is included. No analyzer dependencies are installed. The helper does not infer semantic evidence or certify that analyzer output is truthful; the skill must inspect the full diff, functions, callers/dependencies and analyzer output.

Evidence example (one entry for every repository, one coverage row per changed path):

```json
{
  "snapshot_id": "hash returned by snapshot",
  "rationale": "Deciding dimensions, file/symbol references, inherited versus introduced complexity and production impact",
  "limitations": [],
  "repos": [{
    "path": "/absolute/repo",
    "assessed": true,
    "full_scope": true,
    "coverage": [{"file": "src/example.py", "status": "assessed", "evidence": "src/example.py:20 calculate; full resulting function and merge-base comparison inspected"}],
    "dependencies": "Relevant unchanged caller/path:line and shared state evidence, or evidenced reason none apply",
    "verification": "Actual verification command/result or explicit unavailable evidence",
    "complexity_dimensions": [{"dimension": "understandability", "rating": "Low", "evidence": "file:symbol; straight-line local logic"}],
    "risk_dimensions": [{"dimension": "blast radius and rollback", "rating": "Low", "evidence": "file:symbol; compatible local behavior and rollback evidence"}],
    "measurements": "complete",
    "metrics": [{"file": "src/example.py", "symbol": "calculate", "kind": "cyclomatic", "value": 3, "before": 2, "command": "radon cc -j src/example.py", "evidence": "retained analyzer output path and result", "inheritance": "2 inherited; change adds one branch"}]
  }]
}
```

Every applicable changed function must have analyzer evidence to call measurements complete. Cognitive records use `kind: cognitive` and numeric configured `threshold`; retain configuration evidence. Use `measurements: missing`, an empty `metrics` array and `measurement_limitation` when applicable analyzers cannot measure all relevant functions; retain incomplete observations in qualitative evidence. Supported qualitative ratings remain visible. `measurements: inapplicable` requires `non_executable: true` and `non_executable_evidence`; confirmed non-executable changes get Low complexity, with risk independently assessed. Do not classify generated code, binary assets, migrations or configuration as non-executable merely by extension.

Unsupported files use coverage `status: unsupported` and a concrete reason in `evidence`; missing relevant dependencies use `full_scope: false`. Unassessable repos use `{path, assessed: false, reason}`. Unsupported scope makes affected repo and delivery ratings `null`, displayed as Unknown. No numeric/categorical Unknown is saved. Complete/partial/unavailable are independent of rating. Missing metrics alone make completeness partial, without erasing supported judgments. Reports include full dimensions, file/symbol evidence, metrics, verification, limitations, timestamp, rubric and exact snapshots. JSON and Markdown are generated together, and `check` detects drift.

New Implement runs carry `change_assessment_version: 1`; resume never adds it to old runs. After final sync and before building either mode's final package, the controller invokes the skill. Matching current reports are reused. Changed snapshots require reassessment. Missing/failed assessments are unavailable information and never change any existing completion verdict. Dashboard regeneration checks current snapshots, marks stale reports, and shows no stale ratings as current. Failed reassessment preserves linked stale history. The package captures the same current report data; normal package content binding remains intact. An explicit assessment of old or completed work uses a new identifier and leaves the package and approval untouched.

The dashboard has no assessment section or timeline stage. After a result or failure has been recorded, final approval and completion show two header badges on a second row below Autonomy, Ticket updates and Mode: **Code complexity: Low/Medium/High** and **Production risk: Low/Medium/High**. Tooltips retain completeness and the deciding rationale. Supported partial ratings remain visible; unavailable overall ratings and stale snapshots use one neutral **Assessment: Unavailable** or **Assessment: Stale** badge. Earlier phases show no assessment badges. Older template placeholders resolve to empty.

Saving a final assessment, or regenerating a final dashboard with saved evidence, records a result in the existing persisted audit log with ratings, completeness, rationale and a report link, or the failure reason. Stable checkpoint IDs deduplicate refreshes and resumes; a reassessment or newly stale result gets a new entry. Older result notes keep their saved bytes and timestamps; the dashboard can show their rationale from the exact matching current report without creating another entry or borrowing rationale from a later reassessment. Audit history can retain earlier ratings, while the header always reflects current evidence. Full evidence stays in the existing reports and final package; no workflow gates, approvals or legacy run behavior change.

Assessment runs inside Finalizing, between final context sync and package approval. Its tooltip names complexity/risk assessment and the existing activity checkpoint shows it while running. The Finalizing elapsed total already spans this assessment, approval and session feedback; activity/result audit notes do not create another phase or add time twice. Optional delivery remains outside that total.

## Naming and compatibility

The canonical command is `/make-it-work:assess-change`; `/make-it-work:assess-complexity` remains a deprecated command alias that forwards the same request once. New reports use `<identifier>-change-assessment.md` and `.json`, with `miw-` where required by artifact naming. Existing `<identifier>-complexity.md` and `.json` reports remain readable and keep their filenames on reassessment, including stale-history naming. Readers prefer the canonical report when present and only fall back to legacy JSON when canonical JSON is absent; invalid, stale, or unavailable canonical evidence never falls back to older ratings. Read/check does not migrate reports or rewrite existing package/approval artifacts. The rubric, report schema, workflow markers and end-of-flow informational behavior are unchanged.
