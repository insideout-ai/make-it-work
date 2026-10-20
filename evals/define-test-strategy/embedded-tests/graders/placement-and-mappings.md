---
type: llm
focus: trace
weight: 3
---

Judge actual file edits and generated strategy/report, including a full printed
strategy if its protected-path write is denied. PASS only if:

- account.py and experimental.py receive no @covers additions or implementation
  changes. Separate src/test_labels.py receives repo-qualified UC-03 and
  domain-labels tags, despite being under src/.
- The strategy preserves the SENTINEL and runner/placement decisions, upgrades
  generated tag-only guidance to explicit separate-file and inferred embedded
  discovery, and records real unittest selectors and the doctest command.
- The live report maps DiscountTests and the discounted_total doctest to UC-01
  with behavior/module evidence, distinguishes inferred from explicit mappings,
  and does not count UC-01 twice. UC-03 is explicit.
- It does not claim that discount tests cover UC-02 merely because refund_limit
  is in the same module. The experimental helper's UC relationship is unresolved,
  not guessed from domain ownership. Confirmed absence and uncertainty are
  distinguished; no test mapping is presented as proof of adequate coverage.

FAIL if it only describes a proposal, tags embedded tests, ignores doctests,
or reports UC-01 as uncovered solely because it lacks tags.
