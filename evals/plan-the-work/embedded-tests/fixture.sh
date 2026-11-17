#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../../fixtures/seed-embedded-tests.sh"
mkdir -p embedded-tests/make-it-work/DEMO-EMBED
cp "$SCRIPT_DIR/spec.md" embedded-tests/make-it-work/DEMO-EMBED/DEMO-EMBED-spec.md
# Workflow artifacts remain local and untracked, as required by the artifact guard.
printf '/make-it-work/\n' >> embedded-tests/.gitignore
git -C embedded-tests add .gitignore
git -C embedded-tests -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Keep workflow artifacts local'
