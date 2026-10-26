---
type: llm
focus: trace
weight: 1
---

PASS if the run reads the existing epic, prepares the requested description without another interview or permission question, leaves the source epic and its run audit file unchanged, makes no remote mutation calls, and clearly reports that the Jira update was only prepared locally and has not been performed. It must not claim that Jira was updated or read back. FAIL otherwise.
