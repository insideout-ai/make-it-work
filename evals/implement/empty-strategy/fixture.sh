#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../no-tooling/fixture.sh"
mkdir -p .claude/skills/test-strategy
cp "$SCRIPT_DIR/fixture/empty-strategy.md" .claude/skills/test-strategy/SKILL.md
node -e 'const fs = require("node:fs"); const path = require("node:path"); const file = ".claude/skills/test-strategy/SKILL.md"; fs.writeFileSync(file, fs.readFileSync(file, "utf8").replaceAll("REPO_ID", path.basename(process.cwd())));'
git add .claude/skills/test-strategy/SKILL.md
git -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Record empty generated strategy with a user note'
