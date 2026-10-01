---
type: llm
focus: { source: file, path: "make-it-work/DEMO-300-plan-v2.md" }
weight: 3
---

This is the output of an unattended ("autopilot") run of a skill called `plan-the-work`, for
ticket DEMO-300, run a second time after a stale `make-it-work/DEMO-300-plan.md` already existed
from a prior run. Autopilot's designated policy for this collision is: never overwrite or abort,
always write to the next free `-v2` (or higher) suffix instead.

Judge whether ALL of the following hold:

1. This is a genuine, freshly-drafted plan for ticket DEMO-300 (cancelling an open task) — not a
   copy of the stale placeholder content ("stale placeholder step from a prior, now-outdated
   planning run" must NOT appear in this file).
2. It has a `## Steps` section with at least one concrete step naming `cancelTask`,
   `src/tasks/completeTask.js`, and the `"only open tasks can be cancelled"` error message from
   the spec.
3. `## Execution Status` is present with `Mode: Not yet chosen` and `Progress: Step 0 of N
   complete`.
4. The file does not contain "TBD", "TODO", or "implement later".

PASS only if all of 1-4 hold. List any that fail.
