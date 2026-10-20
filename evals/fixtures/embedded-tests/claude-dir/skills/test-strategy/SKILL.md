---
name: test-strategy
description: Existing tag-only strategy for the embedded-tests service.
---

# Test Strategy

## Repo ID

`embedded-tests`

## Test Locations

| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | embedded-tests | Unit, Documentation | src/test_*.py | make test | . |

## Layers

| Layer | Status | For | Not for | Location | Example command | Prerequisites |
| --- | --- | --- | --- | --- | --- | --- |
| Unit | configured | Isolated rules | External services | . | python3 -m unittest -v src.account.DiscountTests | Python 3 |
| Documentation | configured | Executable checkout examples | Full user journeys | . | python3 -m doctest -v src/account.py | Python 3 |

## Run Prerequisites

### .

- **Env vars:** None
- **Services:** None
- **Credentials:** None
- **How to start:** None
- **Local run:** yes

## Where New Tests Go

| Layer | Status | Repo | Directory | File naming |
| --- | --- | --- | --- | --- |
| Unit | configured | embedded-tests | src | Checkout tests embedded in account.py::DiscountTests; labels in test_labels.py |
| Documentation | configured | embedded-tests | src | Executable examples in account.py docstrings |

## Coverage Decision Guidance

Checkout rule changes use embedded unit tests. Executable examples are a separate
configured command; make test runs both. Label changes use separate unit tests.

## Tag Convention

Generated legacy guidance: add repo-qualified @covers comments above every test.

## How to Scan

Run once per token from the repo root:
`grep -rlIiE --exclude-dir=.git --exclude-dir=.claude '@covers([[:space:]].*)?[[:space:]]<repo>:<tag>([[:space:]]|$)' src`
Filter to src/test_*.py.

## Strategy Decisions

SENTINEL: Keep Python unittest and doctest; no third-party setup or refactoring.
