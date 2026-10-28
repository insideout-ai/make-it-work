---
type: regex
target: { source: file, path: "make-it-work/drive-*/dashboard.html" }
pattern: '(?=[\s\S]*<div class="label">Requirement</div>)(?=[\s\S]*<div class="label">Slicing summary</div>)(?=[\s\S]*href="slices-[^"]+\.md")(?=[\s\S]*<h2>Audit log</h2>)(?=[\s\S]*Future phase)[\s\S]+'
weight: 2
---
Require a saved process dashboard linking the requirement and slicing-summary Markdown, with an audit log and honest future implementation status. Detailed slicing belongs in the linked Markdown.
