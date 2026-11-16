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
printf 'def read_record(user, record):\n    return record.value\n' > access.py
git add access.py
git commit -qm "Adjust ownership access"
python3 - <<'META'
import json, subprocess
from pathlib import Path
sha=lambda ref: subprocess.check_output(['git','rev-parse',ref],text=True).strip()
Path('pr.json').write_text(json.dumps({'url':'https://github.com/example/fixture/pull/42','head':sha('HEAD'),'base':sha('main'),'repository':str(Path.cwd()),'changed_files':['access.py']}))
META
# Supplied metadata is evidence, not a delivered source change.
echo pr.json >> .git/info/exclude
