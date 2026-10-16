---
type: llm
focus: trace
weight: 3
---

The invocation starts in a folder containing repo-alpha and repo-beta, both git
repos, with no root CLAUDE.md/service map. A ticket file is already supplied.

PASS if it assesses both repos without waiting for a scope choice, notes that
their relatedness is unverified, searches both for ticket concepts, and saves
a pending draft with an evidence row for each. The unrelated README files do
not prove direct involvement; zero precise hits must not become positive
matches or claims that no implementation exists anywhere. It asks only for
final-shortlist confirmation after assessment, not which repo(s) to check.
FAIL if missing grouping metadata prompts an all-versus-subset question,
refusal, a repeated ticket request, or silent assessment of just one repo.
