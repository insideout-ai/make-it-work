---
type: regex
target: { source: file, path: "make-it-work/epic-*.md" }
pattern: '(?=^# [^\r\n]+)(?=[\s\S]*^## What & Why[ \t]*\r?\n(?:[ \t]*\r?\n)*(?!##(?:[ \t]|\r?$))\S)(?=[\s\S]*^## Definition of Done[ \t]*\r?\n(?:[ \t]*\r?\n)*(?!##(?:[ \t]|\r?$))\S)(?=[\s\S]*^## Problem & Value Proposition[ \t]*\r?\n(?:[ \t]*\r?\n)*(?!##(?:[ \t]|\r?$))\S)(?=[\s\S]*^## Target Users & Permissions[ \t]*\r?\n(?:[ \t]*\r?\n)*(?!##(?:[ \t]|\r?$))\S)(?=[\s\S]*^## KPIs & Success Metrics[ \t]*\r?\n(?:[ \t]*\r?\n)*(?!##(?:[ \t]|\r?$))\S)(?=[\s\S]*^## Use Cases & Requirements[ \t]*\r?\n(?:[ \t]*\r?\n)*(?!##(?:[ \t]|\r?$))\S)(?=[\s\S]*^## Rollout Plan[ \t]*\r?\n(?:[ \t]*\r?\n)*(?!##(?:[ \t]|\r?$))\S)(?=[\s\S]*^## Open Items & Out of Scope[ \t]*\r?\n[\s\S]*^### Open Items \(TBD\)[ \t]*\r?\n(?:[ \t]*\r?\n)*(?!##(?:[ \t]|\r?$))\S)(?=[\s\S]*^## Readiness checklist[ \t]*\r?\n(?:[ \t]*\r?\n)*(?!##(?:[ \t]|\r?$))\S)(?=[\s\S]*^## Decision log[ \t]*\r?\n(?:[ \t]*\r?\n)*(?!##(?:[ \t]|\r?$))\S)[\s\S]+'
flags: m
weight: 3
---

Inspect the single saved epic artifact, regardless of which permitted tool wrote it. Require a title and populated Product-mode sections, open items, readiness checklist and decision log. Missing, empty, ambiguous or structurally incomplete output fails. Semantic quality is checked by the other graders.
