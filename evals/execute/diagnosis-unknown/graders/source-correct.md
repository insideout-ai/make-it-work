---
type: llm
focus: { source: files, path: "src/*.js" }
weight: 2
---

PASS only if choose(['primary'], 'backup') returns ['primary'], choose([], 'backup') returns ['backup'], and choose(['a', 'b'], 'backup') returns ['a', 'b'] through the actual exported call path. Preserve the public API. Do not accept a change that merely hardcodes these examples.
