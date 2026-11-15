# Sessions app

## Skill Loading Gate

Read the matching domain and UC skills before source exploration or behavior changes.
Session display work uses `domain-sessions` and the UC for the affected surface.

## Project context

Architecture and product guidance live in `.claude/rules/`.
Testing commands and registered layers live in `.claude/skills/test-strategy/SKILL.md`.
After a feature change, reconcile the affected guidance with the final code.

## Disposable runtime boundaries

Keep temporary scripts, screenshots, logs and PID files under `.eval-tmp/` in
this repository. The local server chooses an available port and prints its URL.
Track any server process you start and stop only that exact PID. Never use
pkill, killall or signal processes belonging to another run or application.
The plugin source is read-only context for this task.
