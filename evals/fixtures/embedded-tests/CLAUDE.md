# Embedded-tests service

Python service with no third-party dependencies. Read `.claude/rules/product.md`,
`.claude/rules/architecture.md` and `.claude/skills/test-strategy/SKILL.md`.

## Commands

- All tests: `make test`
- Embedded unit tests: `python3 -m unittest -v src.account.DiscountTests`
- Executable examples: `python3 -m doctest -v src/account.py`
- Separate label tests: `python3 -m unittest -v src.test_labels`

## Skills Reference

### Other Skills

| Skill | Topic | Load when... |
| --- | --- | --- |
| /test-strategy | Test placement and commands | Planning, writing, running, or reviewing tests |
