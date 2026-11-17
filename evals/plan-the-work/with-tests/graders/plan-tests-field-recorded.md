---
type: regex
target: { source: file, path: "make-it-work/DEMO-400/DEMO-400-plan.md" }
pattern: '\*\*Tests:\*\*(?=(?:(?!\n(?:#{1,6} |(?:- )?\*\*)).)*src/tasks/createTask\.test\.js)(?=(?:(?!\n(?:#{1,6} |(?:- )?\*\*)).)*(?:npm test|node --test))(?=(?:(?!\n(?:#{1,6} |(?:- )?\*\*)).)*(?:expected|assert|should))(?=(?:(?!\n(?:#{1,6} |(?:- )?\*\*)).)*(?:whitespace|trim))'
flags: s
weight: 3
---

The planned Tests field names the intended file, supported command and concrete expected whitespace/trim behavior, without claiming observed preparation results.
