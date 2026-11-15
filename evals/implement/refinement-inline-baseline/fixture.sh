#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../implement-autopilot-full/fixture.sh"
printf '/make-it-work/\n' > .gitignore
git add .gitignore
git -c user.name=fixture -c user.email=fixture@example.invalid commit -qm 'Ignore run artifacts'
