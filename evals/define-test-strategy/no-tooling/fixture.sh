#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../fresh-autopilot/fixture.sh"
node -e 'const fs = require("node:fs"); const p = JSON.parse(fs.readFileSync("package.json", "utf8")); delete p.scripts.test; fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");'
git add package.json
git -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Remove configured test tooling'
