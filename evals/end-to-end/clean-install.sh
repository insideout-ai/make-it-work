#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PLUGIN_ROOT"

if [ -n "$(git status --porcelain)" ]; then
  echo "clean-install: commit all changes first; this check installs git archive HEAD" >&2
  exit 1
fi
if ! command -v claude >/dev/null || ! command -v git >/dev/null; then
  echo "clean-install: claude and git must be on PATH" >&2
  exit 1
fi

RUN_DIR="$(mktemp -d)"
MARKETPLACE_DIR="$RUN_DIR/marketplace"
PLUGIN_DIR="$MARKETPLACE_DIR/plugins/make-it-work"
mkdir -p "$PLUGIN_DIR" "$MARKETPLACE_DIR/.claude-plugin" "$RUN_DIR/project" "$RUN_DIR/config" "$RUN_DIR/cache"
git archive HEAD | tar -x -C "$PLUGIN_DIR"
cp "$SCRIPT_DIR/local-marketplace.json" "$MARKETPLACE_DIR/.claude-plugin/marketplace.json"

export CLAUDE_CONFIG_DIR="$RUN_DIR/config"
export CLAUDE_CODE_PLUGIN_CACHE_DIR="$RUN_DIR/cache"
cd "$RUN_DIR/project"
claude plugin validate "$MARKETPLACE_DIR" --strict
claude plugin marketplace add "$MARKETPLACE_DIR" --scope local
claude plugin install make-it-work@make-it-work-release-check --scope local
claude plugin list

installed_skill_count="$(find "$PLUGIN_DIR/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
if [ "$installed_skill_count" -ne 11 ]; then
  echo "clean-install: expected 11 packaged skills, found $installed_skill_count" >&2
  exit 1
fi
echo "Clean local install passed for $(git -C "$PLUGIN_ROOT" rev-parse HEAD)."
echo "Disposable evidence: $RUN_DIR"
