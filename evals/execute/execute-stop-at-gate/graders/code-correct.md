---
type: llm
focus: { source: file, path: "src/greeting.js" }
weight: 3
---

This file should export exactly two functions: the original `greet(name)` (returning something like `` `Hello, ${name}!` ``, unchanged) and a new `greetFormally(name)` that returns the template string `` `Good day, ${name}.` `` — i.e. "Good day, " followed by the name followed by a period (not an exclamation mark). Both must be present in `module.exports`.

PASS only if both functions are present, `greet`'s original behavior is unchanged, and `greetFormally` returns exactly the documented formal greeting (period, not "!").
