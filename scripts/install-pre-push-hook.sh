#!/usr/bin/env bash
# Install the versioned hook without replacing another local hooks setup.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$repo_root"

current_path="$(git config --local --get core.hooksPath || true)"
if [ -n "$current_path" ] && [ "$current_path" != ".githooks" ]; then
  echo "Existing core.hooksPath is $current_path; refusing to replace it." >&2
  echo "Chain .githooks/pre-push from your existing pre-push hook instead." >&2
  exit 1
fi

if [ -z "$current_path" ] && [ -e "$(git rev-parse --git-path hooks/pre-push)" ]; then
  echo "An existing pre-push hook is installed; refusing to replace it." >&2
  echo "Chain .githooks/pre-push from that hook instead." >&2
  exit 1
fi

git config --local core.hooksPath .githooks
echo "Installed local pre-push smoke hook for $repo_root."
