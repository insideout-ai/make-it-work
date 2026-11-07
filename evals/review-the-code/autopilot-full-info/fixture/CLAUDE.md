# Mini Task Tracker

Tiny task-tracking tool: create tasks, complete them, and pull them back into the pool when they're done.

## CRITICAL — Skill Loading Gate (BLOCKING PREREQUISITE)

Before exploring, planning, or reading code for any task, identify and load the relevant skills:
1. **Domain skills** (`.claude/skills/domain-*`) — load any domain whose code you will touch.
2. **Use-case skills** (`.claude/skills/uc-*`) — only load one if you are modifying that specific user flow.
3. Invoke a skill with the `Skill` tool, e.g. `Skill({ skill: "domain-tasks" })`.
4. **Enforcement:** if you find yourself reading source files before calling `Skill`, stop immediately.

## Quick Reference

- Install: `npm install`
- Test: `npm test`

## Guidelines and Best Practices

- Keep functions small and pure; business rules live in `src/tasks/`, not in call sites.
- Single-task lookups must go through `taskRepo.getTaskById` — see `domain-tasks` for why.
- Run `npm test` before committing.

## Rules Files

- `.claude/rules/architecture.md` — service overview, tech stack, and the Functional Domains table.
- `.claude/rules/product.md` — use cases and domain concepts.

## Skills Reference

### Domain Skills

| Skill | Topic | Key code areas |
|---|---|---|
| domain-tasks | Task creation and completion | `src/tasks/` |

### Use Case Skills

| Skill | Topic | Load when... |
|---|---|---|
| uc-01-create-task | Creating a task | Changing task-creation validation or fields |
| uc-02-complete-task | Completing a task | Changing completion rules |

## After Any Feature Change — CRITICAL

Before every commit:
1. **Skill docs**: if the change fits an existing domain, update that domain's `.claude/skills/domain-*/SKILL.md`. If it's a genuinely new domain, create a new one and register it here, in `architecture.md`, and in the quick-lookup table below.
2. Update `product.md` for new/changed use cases, and `architecture.md` for new/changed domains.
3. **Quick-lookup table** (code area → skill to update):

   | Code area | Skill |
   |---|---|
   | `src/tasks/` | domain-tasks |
