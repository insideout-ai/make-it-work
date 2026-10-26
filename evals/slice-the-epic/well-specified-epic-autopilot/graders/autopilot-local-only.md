---
type: llm
focus: trace
weight: 2
---

PASS if the autopilot run saves the overview and each slice file before flushing its decision log, never asks whether to create Jira tickets or for Jira mandatory values, and makes no Jira creation or other remote mutation calls. Reading a supplied source would be allowed. If any file write is explicitly denied, complete missing Markdown must be delivered in chat before the log attempt and unsaved files must be reported accurately. A tool call attempting a remote mutation fails even if it is denied. FAIL otherwise.
