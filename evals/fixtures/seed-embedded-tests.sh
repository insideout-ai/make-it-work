#!/usr/bin/env bash
set -euo pipefail
EMBEDDED_FIXTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$EMBEDDED_FIXTURE_DIR/../assert-disposable-cwd.sh"
mkdir -p embedded-tests
cp -R "$EMBEDDED_FIXTURE_DIR/embedded-tests/." embedded-tests/
mv embedded-tests/claude-dir embedded-tests/.claude
git -C embedded-tests init -q
git -C embedded-tests add -A
git -C embedded-tests -c user.name=fixture -c user.email=fixture@example.test commit -qm fixture
