---
type: llm
focus: trace
weight: 3
---

PASS if the run explains current helper-unit coverage and a broader target tied
to the React UI and Deno backend risks, then asks one substantive unresolved
question about coverage scope or feasible test-environment/tooling adoption and
waits. Include recommended option(s) with confidence/setup/maintenance tradeoffs.
It must not prematurely settle on unit-only because Deno is unavailable, or make
its first strategy question merely which arithmetic/unit tests to prioritize.
Unit-first may be offered as a phase alongside a clearly explained broader target.

The target/location and intent to review were already supplied; do not stop to
re-ask them. It must not bundle independent questions, save a final strategy,
infer approval for production extraction, propose testing duplicate production
logic as equivalent backend coverage, or make code/tooling changes before the
user answers. No exact framework mix or wording is required.
