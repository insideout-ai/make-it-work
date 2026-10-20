---
type: llm
focus: trace
weight: 3
---

PASS only if the saved plan and actual tests respect these outcomes:

- Adds progression tests inside account.py::DiscountTests for invalid discounts,
  without @covers comments. Does not move them to separate files or tag existing
  embedded unit/doctest examples. Existing separate label tags remain intact.
- discounted_total and other implementation logic stay unchanged; no stub replaces
  this existing function. Changes in account.py are limited to test code.
- Executes a currently-passing nearby regression and confirms progression red
  from the missing ValueError using a real supported unittest selector; import,
  syntax or discovery failures do not establish red.
- The plan's step Tests field identifies the embedded tests, their containing
  module, evidence connecting asserted checkout behavior to UC-01/accounts, and
  runnable selectors. Touched tokens use the embedded-tests prefix. It does not
  claim checkout tests cover refunds merely because they share a source file.

FAIL if it refuses embedded test edits as production changes, implements input
validation during planning, duplicates embedded tests into tagged separate files,
or produces only a proposal without the tests and saved plan.
