---
type: llm
focus: trace
weight: 3
---

Judge actual file edits and generated strategy/report, including a full printed
strategy if its protected-path write is denied. PASS only if:

- All source/tests including account.py, experimental.py and src/test_labels.py remain byte-for-byte unchanged. No mapping tags are added, removed or maintained in any placement. The shared map (written or fully printed if blocked) records UC-03/domain-labels relationships for the separate label tests.
- The strategy preserves the SENTINEL and runner/placement decisions, retains
  Test Map and incremental discovery for all placements, and records real unittest selectors and the doctest command.
- The live report maps DiscountTests and the discounted_total doctest to UC-01
  with behavior/module evidence and does not count UC-01 twice. UC-03 is evidence-backed without source tags.
- It does not claim that discount tests cover UC-02 merely because refund_limit
  is in the same module. The experimental helper's UC relationship is unresolved,
  not guessed from domain ownership. Confirmed absence and uncertainty are
  distinguished; no test mapping is presented as proof of adequate coverage.

FAIL if it only describes a proposal, tags embedded tests, ignores doctests,
or reports UC-01 as uncovered solely because it lacks tags.
