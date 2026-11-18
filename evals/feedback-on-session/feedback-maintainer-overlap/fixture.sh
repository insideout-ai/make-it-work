#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
mkdir -p .claude-plugin skills/implement skills/feedback-on-session docs
printf '%s\n' '{"name":"make-it-work","version":"0.2"}' > .claude-plugin/plugin.json
printf '%s\n' '# Fixture workflow' 'Delegate reports must use absolute paths. The helper resolves relative paths against the run directory.' 'Preserve delegate-reported test qualifications in approval and delivery summaries.' > skills/implement/SKILL.md
printf '%s\n' '# Maintainer fixture checkout' > skills/feedback-on-session/SKILL.md
cp -R "$SCRIPT_DIR/fixture/." .
