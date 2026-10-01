---
type: llm
focus: { source: file, path: "make-it-work/TASK-100-review.md" }
weight: 4
---

This is a code-review report produced by the `review-the-pr` skill for a tiny
task-tracker project, reviewing branch `feature/TASK-100-clear-assignee-on-complete`
against `main`, given a PR link and requirements text (clear `assignedTo` on
completion) up front. The diff changes `src/tasks/completeTask.js` to clear a
task's `assignedTo` field on completion (as the requirements ask), but in doing
so it stops calling the shared `taskRepo.getTaskById` helper and instead reads
from the raw `taskRepo.tasks` array directly with `.find()` — which skips the
soft-delete filter (`deletedAt === null`) that `getTaskById` applies. This
means a soft-deleted task can now be "completed" via its id, which the
project's `.claude/rules/architecture.md` ("Architectural constraints") and
`.claude/skills/domain-tasks/SKILL.md` both explicitly forbid.

Judge whether the report satisfies ALL of the following:

1. It leads with a verdict line (`Approve`, `Approve with nits`, or `Request changes`) and a Critical/Major/Minor count.
2. It contains at least one finding marked **Critical** (or, failing that, Major) that correctly identifies the soft-delete-bypass regression described above — citing `src/tasks/completeTask.js` and naming the fact that it no longer goes through `getTaskById`/bypasses the soft-delete filter.
3. The finding cites the violated rule (the architecture.md constraint, the domain-tasks skill, and/or the uc-02-complete-task skill).
4. The PR link (`https://github.com/example-org/mini-task-tracker/pull/7`) appears somewhere in the report (Coverage line or header), since it was supplied up front and the skill is supposed to carry it into the output.
5. It has a Coverage line naming the diffed range, which skills were consulted, and a requirements source that reflects the user-provided requirements text (not "inferred from branch and commits").

PASS only if 1, 2, 3, and 5 hold (4 is a bonus check). Explain which (if any) are missing or wrong.
