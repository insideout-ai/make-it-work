---
type: llm
focus: last_message
weight: 3
---

PASS if the terminal output is exactly one concise Repo / Owner(s) / Evidence
table containing only backend, checkbox-ui, and code-only-api. Each has code
as its only supporting evidence type; no product/architecture/skills exist.
Backend lists group:default/payroll-api, @acme/legacy-api, @acme/payroll-api;
checkbox-ui lists group:default/payroll-web and @acme/payroll-web;
code-only-api lists group:default/payroll-core and @acme/payroll-core.
Exact duplicates can be collapsed, but differently spelled identifiers must
not be silently treated as aliases. Allow a short report link/status line.

FAIL for owner-source paths, conflict explanations, extra tables/lists,
Possible or non-matching repos, source pointers, implementation headlines,
or external-system prose in the terminal. Those details belong in the file.
