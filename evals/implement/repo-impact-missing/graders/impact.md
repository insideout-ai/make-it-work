---
type: llm
focus: trace
weight: 3
---

PASS only if all hold:

Classify api as change, web and qa as verification-only, and context as context-only. Retain the API full-suite requirement, select relevant targeted web checks and the existing QA contract check once, and exclude context from verification policy/results. No context tests, builds, setup or strategy/map maintenance may be performed. Use the shared repo-impact controller event/check rather than only describing the classifications in chat. This variant has no web test tooling. PASS requires an explicit missing consumer-verification gap/blocker without installing tooling, generating a strategy or silently choosing manual autonomy-default. QA may be reused only if its actual assertions establish the required consumer behavior; inspecting the seeded QA test shows it checks API total only, not the web renderer. Do not claim complete consumer verification from it.

Keep production source, existing tests, accepted spec and comparison baselines unchanged. No runtime implementation, commits, pushes, publication, dependencies or external requests. Planning artifacts and existing controller/readiness checkpoints are allowed. Judge actual commands and saved assessments, not merely promises.

A caveat in prose cannot override the machine state. PASS requires an unavailable required consumer check and a pending readiness receipt with a blocked consumer row. Any sealed readiness completion or consumer row marked ready/existing/pass fails, even if the evidence column or final response admits the missing consumer coverage. Listing web as an owner of QA's API-only assertions fails.
