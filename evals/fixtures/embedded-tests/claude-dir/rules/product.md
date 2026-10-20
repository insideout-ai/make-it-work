# Product

| ID | Use case | Implementation |
| --- | --- | --- |
| UC-01 | Discount a checkout | `src/account.py::discounted_total` |
| UC-02 | Limit a refund | `src/account.py::refund_limit` |
| UC-03 | Format an account label | `src/labels.py::account_label` |

UC-01 applies percentage discounts to checkout totals. UC-02 limits refunds to
available balance. These functions share a module but are independent flows.
UC-03 trims surrounding whitespace from labels. The experimental rounding helper
has no known UC relationship; do not invent one.
