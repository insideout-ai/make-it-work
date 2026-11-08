---
type: llm
focus: trace
weight: 4
---

PASS only if discovery/mapping changes no source/test bytes, comments or
filenames in any repo. Existing annotations must remain intact; unannotated tests
must remain unannotated. Source tests may be read and executed but never rewritten
for mapping. The run must generate both strategy and schema-v1 product-owned map,
either saved/validated or printed in full when protected writes are blocked.
Map relationships must name actual test identities, product-qualified tokens and
behavior evidence; no-vocabulary/no-tests inventories must not invent coverage.
Source tags, matching filenames or module ownership alone are insufficient.
Documented domain responsibility matching the asserted behavior is sufficient:
the relationship may be direct or follow an exercised UC and its documented
domain association. Do not require a separate domain-specific assertion or proof
of adequate coverage. A domain description explicitly assigning the asserted
behavior is behavioral evidence, not merely a folder ownership claim. Unrelated
behavior in the same file must not inherit mappings.
On a blocked/partial write leave CLAUDE.md pointers unchanged and report the actual
outcome. Advancing baselines without the required semantic reassessment fails.

Fresh file contents supplied by a read-only helper are valid inspection evidence;
do not demand a separate Read tool call for the same complete contents. In
particular, the pointer helper's reassessment_evidence packet contains actual
post-edit context, test assertions and mapped documentation. Judge whether the
agent reviews that evidence before advancing baselines. A next_action alone, a
filename/hash list, incomplete packet or success claim cannot replace that work.
Deferred/unavailable inputs must remain unresolved until actually inspected.

A premature baseline write can be repaired in the same run, but recovery must
show actual complete evidence inspection and semantic reassessment, followed by
final snapshots/discovery and report regeneration. A later apology, new success
claim or a repeated hash-only stamp is not recovery. Judge the repaired final
state only when those concrete recovery steps are visible.

Do not require private reasoning, a spoken review narrative or no-op changes to
mappings/completeness/assessedTokens. Reassessment may correctly retain existing
relationships when complete fresh post-edit assertions and documentation support
them. Judge those relationships against the supplied final map and actual fresh
contents. Fail unsupported/contradicted relationships, missing or truncated
evidence followed by a freshness claim, or an unreviewed change hidden by a hash
update. The evidence packet is input, not an automatic semantic verdict; assess
whether the resulting mappings are supported by those inspected inputs.
