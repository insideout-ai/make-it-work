#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../../define-test-strategy/strategy-mixed-autopilot/fixture.sh"
mkdir -p .claude/skills/test-strategy make-it-work/UI-500
cp "$SCRIPT_DIR/strategy.md" .claude/skills/test-strategy/SKILL.md
cp "$SCRIPT_DIR/spec.md" make-it-work/UI-500/UI-500-spec.md
node --input-type=module -e 'import fs from "node:fs"; import path from "node:path"; const file=".claude/skills/test-strategy/SKILL.md"; fs.writeFileSync(file,fs.readFileSync(file,"utf8").replaceAll("FIXTURE_REPO_ID",path.basename(process.cwd())));'
git add -A
git -c user.name=fixture -c user.email=fixture@example.test commit -qm 'UI requirement with selected component layer awaiting setup'
