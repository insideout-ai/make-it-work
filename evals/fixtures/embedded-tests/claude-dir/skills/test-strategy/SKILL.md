---
name: test-strategy
description: Existing non-intrusive test strategy for the embedded-tests service.
---

# Test Strategy

## Repo ID

`embedded-tests`

## Test Locations

| Location | Repo | Layers | Test files | Full-suite command | Run from |
| --- | --- | --- | --- | --- | --- |
| . | embedded-tests | Unit, Documentation | src/test_*.py; embedded unittest and docstrings in src/*.py | make test | . |

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

## Test Map

Shared `.claude/testing/test-map.json` uses schema v1 and evidence-backed
relationships for all placements. Never edit source/tests for mapping.

## How to Scan

Follow make-it-work docs/test-map-contract.md and scripts/test-map.mjs. Reuse
unchanged relationships, refresh changed evidence, and preserve user decisions.
Discover separate src/test_*.py, embedded unittest classes in src/account.py and
src/experimental.py, and executable docstrings. Use python3 -m unittest -v
<selector> for unit tests and python3 -m doctest -v src/account.py for
documentation. Keep experimental helper-to-UC relationships unresolved without
behavior evidence. A missing map requires in-memory discovery, not source tags.

## Strategy Decisions

SENTINEL: Keep Python unittest and doctest; no third-party setup or refactoring.
