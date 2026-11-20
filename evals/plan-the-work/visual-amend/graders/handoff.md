---
type: llm
focus: trace
weight: 2
---

PASS only if the final user-facing response contains a clickable Markdown link to the actual saved .md plan, and mentions Visual Overview when the plan contains a diagram. Existing plain-text Plan: fields alone do not count. The completed plan must pass validate-plan.mjs check. No images, rendering helpers, separate diagram files, dependency installs, runtime implementation or test authoring may occur. Do not promise that chat or the HTML preview renders Mermaid; rendering depends on the Markdown viewer. Ordinary existing planning helpers are allowed.
