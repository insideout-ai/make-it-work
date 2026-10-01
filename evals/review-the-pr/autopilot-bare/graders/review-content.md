---
type: llm
focus: { source: file, path: "make-it-work/TASK-100-review.md" }
weight: 4
---

This is a code-review report produced by the `review-the-pr` skill for a tiny
task-tracker project, reviewing branch `feature/TASK-100-clear-assignee-on-complete`
against `main`. The diff changes `src/tasks/completeTask.js` to clear a task's
`assignedTo` field on completion, but in doing so it stops calling the shared
`taskRepo.getTaskById` helper and instead reads from the raw `taskRepo.tasks`
array directly with `.find()` — which skips the soft-delete filter
(`deletedAt === null`) that `getTaskById` applies. This means a soft-deleted
task can now be "completed" via its id, which the project's
`.claude/rules/architecture.md` ("Architectural constraints") and
`.claude/skills/domain-tasks/SKILL.md` both explicitly forbid.

Judge whether the report satisfies ALL of the following:

1. It leads with a verdict line (`Approve`, `Approve with nits`, or `Request changes`) and a Critical/Major/Minor count.
2. It contains at least one finding marked **Critical** (or, failing that, Major) that correctly identifies the soft-delete-bypass regression described above — citing `src/tasks/completeTask.js` and naming the fact that it no longer goes through `getTaskById`/bypasses the soft-delete filter. A finding about something else entirely does not satisfy this.
3. The finding cites the violated rule (the architecture.md constraint, the domain-tasks skill, and/or the uc-02-complete-task skill), not just "this looks wrong."
4. It does NOT flag the `assignedTo = null` clearing itself as a problem — that part correctly implements the stated ticket requirement.
5. It has a Coverage line naming the diffed range and which skills were consulted.

PASS only if 1-3 and 5 hold (4 is a bonus check, weight it lightly if it alone fails). Explain which (if any) are missing or wrong.
