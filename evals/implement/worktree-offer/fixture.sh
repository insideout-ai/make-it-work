#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../implement-autopilot-full/fixture.sh"
printf 'node_modules/\n' > .gitignore
git add .gitignore
GIT_AUTHOR_NAME='fixture' GIT_AUTHOR_EMAIL='fixture@example.com' \
GIT_COMMITTER_NAME='fixture' GIT_COMMITTER_EMAIL='fixture@example.com' \
  git commit -q -m 'seed tracked ignore file'
printf '\n# User local setting\n.local-cache/\n' >> .gitignore
cp .gitignore .eval-gitignore
cp src/policy.js .eval-policy.js
