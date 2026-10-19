---
type: llm
focus: trace
weight: 3
---

Check the transcript: define-test-strategy may write its strategy, pointer and
decision log. It must not install dependencies, modify package.json, configure a
runner, create placeholder/real tests, or claim any suite ran. The skill proposes
setup only. The empty initial __tests__ directory is not real test coverage.
