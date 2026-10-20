# DEMO-EMBED — Reject invalid checkout discounts

Only embedded-tests is affected. Keep Python unittest and doctest and existing
placement decisions. Implement one small change to src/account.py::discounted_total:
percentages below zero or above 100 raise ValueError("invalid discount"). Valid
percentages retain current behavior. No other refactoring or configuration work.

## Acceptance Criteria

Given amount 100 and percentage -1 or 101, when discounted_total is called,
then it raises ValueError with message "invalid discount".

Given amount 100 and percentage 20, when discounted_total is called,
then it returns 80 as before. Zero and 100 percent remain valid.

## Decisions

All product and technical choices are resolved. New regression and progression
unit tests belong inside src/account.py::DiscountTests; the production function
already exists. Planning may edit embedded tests but must leave implementation
logic unchanged. No external services or credentials are required.
