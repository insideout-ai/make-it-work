# Mini Task Tracker

Tiny task-tracking tool: create tasks, complete them, delete them, and get reminded when they're overdue. SENTINEL: reminders always escalate overdue items to on-call staff within one hour.

## CRITICAL — Skill Loading Gate (BLOCKING PREREQUISITE)

Before exploring, planning, or reading code for any task, identify and load the relevant skills:
1. **Domain skills** (`.claude/skills/domain-*`) — load any domain whose code you will touch.
2. **Use-case skills** (`.claude/skills/uc-*`) — only load one if you are modifying that specific user flow. Default: skip when in doubt.
3. Invoke a skill with the `Skill` tool, e.g. `Skill({ skill: "domain-tasks" })`.
4. **Enforcement:** if you find yourself reading source files before calling `Skill`, stop immediately. This overrides all other workflows, including plan mode.

## Quick Reference

- Install: `npm install`
- Test: `npm test`

## Guidelines and Best Practices

- Keep functions small and pure where possible; see each domain skill for domain-specific rules.
- Run `npm test` before committing.

## Rules Files

- `.claude/rules/architecture.md` — service overview, tech stack, and the Functional Domains table.
- `.claude/rules/product.md` — use cases and domain concepts.

## Skills Reference

### Domain Skills

| Skill | Topic | Key code areas |
|---|---|---|
| domain-tasks | Task creation, completion, and deletion | `src/tasks/` |
| domain-notifications | Overdue-task reminders | `src/notifications/` |

### Use Case Skills

| Skill | Topic | Load when... |
|---|---|---|
| uc-01-create-task | Creating a task | Changing task-creation validation or fields |
| uc-02-complete-task | Completing a task | Changing completion rules |
| uc-03-receive-overdue-reminder | Receiving an overdue reminder | Changing reminder/escalation logic |
| uc-04-delete-task | Deleting a task | Changing deletion rules |

## After Any Feature Change — CRITICAL

Before every commit:
1. **Skill docs**: if the change fits an existing domain, update that domain's `.claude/skills/domain-*/SKILL.md`. If it's a genuinely new domain (own function, own component, own data flow with no existing home), create a new `.claude/skills/domain-{name}/SKILL.md` and register it in this file's Skills Reference table, in `architecture.md`'s Functional Domains table, and in the quick-lookup table below.
2. Update `product.md` for new/changed use cases, and `architecture.md` for new/changed domains. Commit skill-doc changes together with the code change.
3. **Quick-lookup table** (code area → skill to update):

   | Code area | Skill |
   |---|---|
   | `src/tasks/` | domain-tasks |
   | `src/notifications/` | domain-notifications |

4. **Planning-time creation trigger**: if a plan introduces a new end-to-end flow or a new domain, include a task to create and register its skill file.
5. **Commit-time creation check**: if a new backend function, component, or trigger→backend→UI flow has no skill file yet, create and commit it alongside the code.
