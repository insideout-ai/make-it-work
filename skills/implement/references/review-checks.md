# Required review context and assessments

New runs capture `review_checks_version: 1`. Keep existing runs on their saved
contract; do not backfill the marker or reopen an approved package.

During the existing `review-context` checkpoint, select minimum matching skills
from CLAUDE.md, affected behavior and the implementation report. Supply one
`review_requirements` record per approved root:

```json
{"repo":"<absolute-root>","reason":"Session details and calendar fallback change",
 "skills":[{"name":"domain-sessions","method":"Skill"},
           {"name":"domain-meetings","method":"Skill"},
           {"name":"uc-14-view-dashboard","method":"Skill"},
           {"name":"test-strategy","method":"Read"}]}
```

Use the repository-prescribed loading method. An empty list needs actual
non-applicability, not a waiver. The helper includes an existing test strategy,
binds selected skill contents and affected tests to the target, and preserves
counters. Forward the target's `review_requirements` to the existing reviewer.
Additional relevant context may be loaded. Current contents already loaded in
this review's context can be reused; another agent's loading claim is insufficient.

Pass `review_checks` to review-report.mjs, one record per required repo:

```json
{"repo":"<absolute-root>","skills":[{
 "name":"domain-sessions","method":"Skill","sha256":"<from-target>",
 "rules":[{"line":12,"rule":"Preserve session details on lookup failure",
   "observation":"Inspected the fallback and its actual assertion",
   "result":"satisfied"}]}],
 "test_map":{"status":"assessed","note":"Affected assertions and UC/domain relationships were assessed; the persistent baseline remains stale",
 "tests":[{"file":"src/session.test.js","result":"stale",
   "observation":"Assertion covers session-only fallback; saved baseline is stale"}]}}
```

Include every required skill, not just the example's first entry. Each needs its
loading method/hash and an applied rule with a real skill line, actual code/test
observation and result: `satisfied`, `finding` (with actual `finding_id`, e.g.
`#1`), or `limitation`. Listing loaded names alone is insufficient.

Use the read-only map helpers/in-memory reassessment for affected assertions and
relationships. No full rebuild or reading unrelated generated rows is required.
Map status is `assessed`, or `not-applicable` only without a current Test Map
strategy. Each affected test needs a `current`, `stale`, `unresolved` or `unmapped`
result and observation. Staleness may remain a limitation after assessment; it
does not waive assessment. A genuine blocker follows the existing blocked handoff.

The writer rejects incomplete checks before saving a completed review. Repair
missing evidence within this cycle; no new agent/phase/cycle is needed. Structural
coverage and hashes do not establish semantic truth. Route real findings normally
and preserve uncertainty and inherited-work qualifications.
