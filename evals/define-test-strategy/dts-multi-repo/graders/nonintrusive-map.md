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
