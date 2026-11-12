#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
source "$SCRIPT_DIR/../lightweight-run/fixture.sh"
rm -rf .claude CLAUDE.md
printf "%s\n" "# Policy app" "Member access is allowed; guests are denied. Run tests with node --test." > README.md
git add -A
git -c user.name=fixture -c user.email=fixture@example.test commit -qm "Set context variant"
