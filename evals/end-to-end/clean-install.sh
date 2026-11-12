#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PLUGIN_ROOT"

if [ "$#" -gt 1 ]; then
  echo "Usage: clean-install.sh [exported-plugin-directory]" >&2
  exit 64
fi
EXPORTED_PLUGIN="${1:-}"
if [ -z "$EXPORTED_PLUGIN" ] && [ -n "$(git status --porcelain)" ]; then
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
if [ -n "$EXPORTED_PLUGIN" ]; then
  EXPORTED_PLUGIN="$(cd "$EXPORTED_PLUGIN" && pwd)"
  cp -R "$EXPORTED_PLUGIN/." "$PLUGIN_DIR/"
else
  git archive HEAD | tar -x -C "$PLUGIN_DIR"
fi
cp "$SCRIPT_DIR/local-marketplace.json" "$MARKETPLACE_DIR/.claude-plugin/marketplace.json"

export CLAUDE_CONFIG_DIR="$RUN_DIR/config"
export CLAUDE_CODE_PLUGIN_CACHE_DIR="$RUN_DIR/cache"
cd "$RUN_DIR/project"
claude plugin validate "$MARKETPLACE_DIR" --strict
claude plugin marketplace add "$MARKETPLACE_DIR" --scope local
claude plugin install make-it-work@make-it-work-release-check --scope local
claude plugin list --json > "$RUN_DIR/installed.json"
node --input-type=module - "$PLUGIN_DIR" "$RUN_DIR/installed.json" <<'NODE'
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const [source, inventoryFile] = process.argv.slice(2);
const inventory = JSON.parse(await readFile(inventoryFile, 'utf8'));
const plugins = Array.isArray(inventory) ? inventory : inventory.installed;
const plugin = plugins?.find((entry) => entry.id === 'make-it-work@make-it-work-release-check');
assert(plugin?.installPath, 'Installed plugin missing from inventory');
const expected = JSON.parse(await readFile(path.join(source, '.claude-plugin/plugin.json'), 'utf8'));
assert.equal(plugin.version, expected.version);
async function files(root, relative = '') {
  const result = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...await files(root, file));
    else if (entry.isFile()) result.push(file);
    else throw new Error(`Unexpected entry: ${file}`);
  }
  return result.sort();
}
const expectedFiles = await files(source), installedFiles = await files(plugin.installPath);
assert.deepEqual(installedFiles, expectedFiles, 'Installed file inventory changed');
for (const file of expectedFiles) {
  assert.deepEqual(await readFile(path.join(plugin.installPath, file)), await readFile(path.join(source, file)), `Installed bytes changed: ${file}`);
  assert.equal((await stat(path.join(plugin.installPath, file))).mode & 0o111, (await stat(path.join(source, file))).mode & 0o111, `Installed executable mode changed: ${file}`);
}
const skills = expectedFiles.filter((file) => /^skills\/[^/]+\/SKILL\.md$/.test(file));
assert(skills.length, 'No installed skills');
console.log(`Verified ${skills.length} skills and ${expectedFiles.length} files in installed copy ${plugin.installPath}`);
NODE
echo "Clean local install passed for $(git -C "$PLUGIN_ROOT" rev-parse HEAD)."
echo "Disposable evidence: $RUN_DIR"
