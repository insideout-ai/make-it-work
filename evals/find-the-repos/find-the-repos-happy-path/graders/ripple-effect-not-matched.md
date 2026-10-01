---
type: llm
focus: last_message
weight: 3
---

The workspace's orientation file notes that `legacy-worker` consumes events from
`notifications-service` (which is the correct Definite match for this ticket). `legacy-worker`'s
own `product.md` is unrelated nightly-cleanup content with no reminder/snooze concept of its own.

Judge whether `legacy-worker` is correctly left OFF both the Definite and Possible match lists —
being connected to a matching repo in the workspace file must not, by itself, make it a match.

PASS if `legacy-worker` is not reported as a Definite or Possible match for this ticket. FAIL if it
is listed as a match of either tier.
