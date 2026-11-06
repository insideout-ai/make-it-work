#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../autopilot-full-info/fixture.sh"
mkdir -p make-it-work/TASK-100
python3 - <<'SEED'
from pathlib import Path
p = Path('src/tasks/completeTask.js')
s = p.read_text().replace("const { tasks } = require('./taskRepo');", "const { getTaskById } = require('./taskRepo');").replace('tasks.find((t) => t.id === id)', 'getTaskById(id)')
p.write_text(s)
SEED
cat > make-it-work/TASK-100/original-ticket.md <<'TICKET'
# Original ticket
Completing a task marks it done. Retain its assignee for reporting.
TICKET
cat > make-it-work/TASK-100/TASK-100-spec.md <<'SPEC'
# Accepted refined spec — TASK-100
AC1: Completing an active task clears assignedTo to null.
AC2: Soft-deleted tasks must remain inaccessible.
## Decision Log
User explicitly approved replacing the original retention behavior with clearing assignedTo. This refined spec is accepted and supersedes the original ticket's retention statement.
SPEC
cat > make-it-work/TASK-100/TASK-100-plan.md <<'PLAN'
# Implementation plan — TASK-100
## Steps
Mark the task done, clear assignedTo to null, and preserve getTaskById and its soft-delete filter.
PLAN
