---
type: llm
focus: trace
weight: 4
---

Judge the final saved map against actual inspected test assertions and product
requirements. SAVED ARTIFACT is the authoritative final state; earlier Write/Edit
payloads in the trace can be superseded by later edits. If writes were blocked,
judge the complete proposed artifacts and the reported partial outcome instead.

PASS only when all applicable checks hold:
1. No source/test bytes, annotations, comments or filenames were changed in any
   repo for mapping. Metadata, the report, decision log and canonical CLAUDE.md
   pointer update are allowed. Denied writes must not be bypassed; partial writes
   and fallback proposals must be reported accurately, with pointers unchanged.
2. Strategy and schema-v1 map were saved/validated or fully proposed after a
   blocked write. Tests have real identities and product-qualified tokens;
   missing vocabulary/tests and unavailable scope must not invent coverage.
3. Inspect EACH final mapped relationship against the actual assertions and
   cited documentation. A creation assertion does not map to UC-03 (overdue
   reminder), even if an earlier draft in the trace mapped it correctly. Reject
   unsupported/contradicted final tokens. File names, source tags or folder
   ownership alone are not evidence. Documented domain responsibility matching
   the asserted behavior is sufficient, including via an exercised UC/domain
   association; no separate domain-only assertion is required. Unrelated behavior
   in a shared file must not inherit relationships. The formatBuildLabel test in
   this fixture must stay unmapped to task/reminder use cases.
4. Freshness must be backed by complete current evidence. Actual post-edit file
   contents from Read/Bash or the read-only reassessment_evidence helper packet
   are valid inspection. A filename/hash list, next_action alone or truncated
   packet does not substitute. Deferred/unavailable scope remains unresolved.
   After relevant inspection, the final snapshots/discovery and report must
   reflect the assessed tree; unsupported hash-only freshness claims fail.

Assess semantic correctness from those inspected contents and final mappings.
The mapping evidence/reasons are the public semantic rationale; DO NOT demand a
spoken reasoning trace, a separate chat review paragraph, or no-op changes to
mappings, completeness or assessedTokens. Retaining unchanged relationships is
correct reassessment when the complete fresh inputs still support them. Do not
speculate about an unobservable failure to think when those observable checks
pass; independently check whether the final relationships are supported.

A premature write may recover in the same run through complete fresh evidence
inspection, supported final relationships, final baseline validation and report
regeneration. An apology or a new success claim without those steps is not
recovery. Cite the actual unsupported relationship, missing input, prohibited
write or inconsistent final artifact for a failure.
