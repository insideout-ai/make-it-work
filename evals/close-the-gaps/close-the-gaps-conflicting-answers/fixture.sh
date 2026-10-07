#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../close-the-gaps-offline-injection/fixture.sh"
question_file='make-it-work/TASK-50-questions.md'
sed 's/^- \[ \] Paginate automatically \/ produce multiple files (Recommended)/- [x] Paginate automatically \/ produce multiple files (Recommended)/' "$question_file" > "$question_file.tmp"
mv "$question_file.tmp" "$question_file"
