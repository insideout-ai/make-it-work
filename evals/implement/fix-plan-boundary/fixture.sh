#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd -P)"
if [ -e .git ]; then
  echo 'REFUSING to seed an existing Git repository' >&2
  exit 1
fi
case "$(pwd -P)" in
  "$REPO_ROOT"|"$REPO_ROOT"/*) echo 'REFUSING to seed inside the plugin repository' >&2; exit 1 ;;
esac
node "$SCRIPT_DIR/fixture.mjs"
