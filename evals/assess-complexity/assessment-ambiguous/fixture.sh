#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
git init -q -b main
git config user.name Fixture
git config user.email fixture@example.test
printf 'make-it-work/\n' > .gitignore
cat > access.py <<'SOURCE'
def read_record(user, record):
    if record.owner != user.id:
        raise PermissionError()
    return record.value
SOURCE
git add .
git commit -qm base
git switch -qc feature
