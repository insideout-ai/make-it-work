#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../no-tooling/fixture.sh"
mkdir -p .claude/skills/test-strategy
cp "$SCRIPT_DIR/strategy.md" .claude/skills/test-strategy/SKILL.md
git add .claude/skills/test-strategy/SKILL.md
git -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Existing strategy for report-only run'
