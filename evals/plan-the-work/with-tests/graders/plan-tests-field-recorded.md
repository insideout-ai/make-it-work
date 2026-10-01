---
type: llm
focus: { source: file, path: "make-it-work/DEMO-400-plan.md" }
weight: 3
---

Judge whether the step that implements the whitespace-title validation has a `**Tests:**` field
that names: the file `src/tasks/createTask.test.js`, the exact test command (`npm test` or
`node --test`), and a confirmed state of "progression red — <reason>" (this is a Modify row —
`createTask` already exists and runs — so no stub signature should have been written, and the red
state should come from the new assertion failing against the current implementation, not from a
broken import or stub). PASS only if the `**Tests:**` field is present, names the real file and
command, and the confirmed state is phrased as progression-red for the right reason. Quote the
field and explain any failure.
