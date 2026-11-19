#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
mkdir -p .claude-plugin skills/implement skills/feedback-on-session docs baseline
printf '%s\n' '{"name":"make-it-work","version":"0.2"}' > .claude-plugin/plugin.json
printf '%s\n' '# Fixture workflow' 'Warn before continuing on a branch naming another ticket; honor an explicit user choice.' 'Give progress updates during long checks; preserve accepted limitations.' > skills/implement/SKILL.md
printf '%s\n' '# Maintainer fixture checkout' > skills/feedback-on-session/SKILL.md
cp -R "$SCRIPT_DIR/fixture/." .
cp skills/implement/SKILL.md baseline/implement.md
cp session.txt baseline/session.txt
