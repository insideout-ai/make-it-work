---
type: llm
focus: trace
weight: 3
---

PASS only if the run reads backend's domain-payroll and uc-update-payroll
skills, stale-ui's current domain/use-case skills, and mf-cp-payroll's domain
and use-case skills. These reads must inform the tiers, not just be listed as
links. Missing product.md must not prevent inspecting the front-end skills.

The run must perform focused code/config searches using ticket terms in every
present assessed repo: backend, stale-ui, analytics-service, no-info, and the
discovered mf-cp-payroll. Search calls must target source/config, not only docs.
Opening a few pointed hits for context is valid. Do not require exact query
wording or a specific tool; Grep or bounded rg is fine. FAIL if a repo is
unsearched, if documentation hits are passed off as implementation evidence,
or if an unbounded workspace/service-graph crawl replaces focused assessment.
