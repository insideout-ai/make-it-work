#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp -R "$SCRIPT_DIR/fixture/." .
node -e 'const fs = require("node:fs"); const path = require("node:path"); const file = "make-it-work/MANUAL-1/MANUAL-1-plan.md"; fs.writeFileSync(file, fs.readFileSync(file, "utf8").replaceAll("REPO_ID", path.basename(process.cwd())));'
git init -q -b feature/manual-policy
git add -A
git -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Manual verification policy with no test tooling'
