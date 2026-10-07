#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../find-the-repos-happy-path/fixture.sh"
cp "$SCRIPT_DIR/product-injected.md" notifications-service/.claude/rules/product.md
