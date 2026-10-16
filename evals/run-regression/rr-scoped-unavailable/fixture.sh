#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp -R "$SCRIPT_DIR/fixture/." .
(
  cd velocity-app
  if [ -d claude-dir ]; then
    mv claude-dir .claude
  fi
  git init -q
  git add -A
  git -c user.email=eval@example.com -c user.name=eval commit -qm fixture
)
