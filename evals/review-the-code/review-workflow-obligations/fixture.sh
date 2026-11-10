#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../autopilot-bare/fixture.sh"
cat > src/tasks/typeInfo.js <<'EOF'
/** @type {string} */
export const taskLabel = 42;
EOF
git add src/tasks/typeInfo.js
GIT_AUTHOR_NAME=fixture GIT_AUTHOR_EMAIL=fixture@example.invalid \
GIT_COMMITTER_NAME=fixture GIT_COMMITTER_EMAIL=fixture@example.invalid \
git commit -qm 'Add a task label with an introduced type diagnostic'
mkdir -p make-it-work/REVIEW-1
cp "$SCRIPT_DIR/fixture/implementation.md" make-it-work/REVIEW-1/implementation.md
