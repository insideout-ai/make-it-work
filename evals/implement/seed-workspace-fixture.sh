#!/usr/bin/env bash
set -euo pipefail
WORKSPACE_FIXTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$WORKSPACE_FIXTURE_DIR/../assert-disposable-cwd.sh"
WORKSPACE_PLUGIN_ROOT="$(cd "$WORKSPACE_FIXTURE_DIR/../.." && pwd)"
WORKSPACE_VARIANT="${1:-approval}"
for repo in api web unrelated; do
  mkdir -p "$repo/src" "$repo/test"
  cp -R "$WORKSPACE_FIXTURE_DIR/fixture-base/.claude" "$repo/.claude"
  cp "$WORKSPACE_FIXTURE_DIR/fixture-base/CLAUDE.md" "$repo/CLAUDE.md"
  cp "$WORKSPACE_FIXTURE_DIR/fixture-base/src/policy.js" "$repo/src/policy.js"
  printf '%s\n' '{"private":true,"scripts":{"test":"node --test"}}' > "$repo/package.json"
  cat > "$repo/test/policy.test.js" <<'JS'
const assert = require('node:assert/strict');
const test = require('node:test');
const { canProceed } = require('../src/policy');
test('member allowed', () => assert.equal(canProceed('member'), true));
test('guest denied', () => assert.equal(canProceed('guest'), false));
JS
  if [ "$repo" = unrelated ]; then
    printf '%s\n' 'function formatLabel(value) { return String(value); }' 'module.exports = { formatLabel };' > "$repo/src/policy.js"
    printf '%s\n' "const assert = require('node:assert/strict');" "const { formatLabel } = require('../src/policy');" "assert.equal(formatLabel(42), '42');" > "$repo/test/policy.test.js"
    printf '%s\n' '# Product' 'Formats display labels. No access-control policy or role handling.' > "$repo/.claude/rules/product.md"
    printf '%s\n' '# Architecture' 'The label formatter is a pure function; no policy integrations.' > "$repo/.claude/rules/architecture.md"
    printf '%s\n' '---' 'name: domain-demo' 'description: Display label formatting.' '---' '# Domain: labels' 'Use formatLabel to render numeric display labels.' > "$repo/.claude/skills/domain-demo/SKILL.md"
  fi
  base=main
  if [ "$repo" = web ]; then base=develop; fi
  git -C "$repo" init -q -b "$base"
  git -C "$repo" add -A
  git -C "$repo" -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Baseline policy'
  git -C "$repo" update-ref "refs/remotes/origin/$base" HEAD
  git -C "$repo" symbolic-ref refs/remotes/origin/HEAD "refs/remotes/origin/$base"
done
if [ "$WORKSPACE_VARIANT" != approval ]; then
  WORKSPACE_SEED_SCRIPT="$(mktemp /tmp/miw-workspace-seed.XXXXXX.mjs)"
  trap 'rm -f "$WORKSPACE_SEED_SCRIPT"' EXIT
  cat > "$WORKSPACE_SEED_SCRIPT" <<'JS'
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const plugin = process.argv[2], variant = process.argv[3], root = process.cwd();
const { prepareScope, approveScope, runScope } = await import(path.join(plugin, 'skills/implement/scripts/workspace-scope.mjs'));
const { initializeWorkflow, applyWorkflow } = await import(path.join(plugin, 'skills/implement/scripts/workflow.mjs'));
const { readFile } = await import('node:fs/promises');
const { digest } = await import(path.join(plugin, 'scripts/lib/artifacts.mjs'));
const ticket = 'DEMO-201', directory = path.join(root, 'make-it-work', ticket);
await mkdir(directory, { recursive: true });
const report = `make-it-work/${ticket}/${ticket}-repos.md`;
const ids = variant === 'single-impact' ? ['api'] : ['api', 'web'];
await writeFile(path.join(root, report), `# Repo Shortlist — ${ticket}\nStatus: Confirmed\n\n## Definite Matches\n${ids.map(id => `- ${id}: src/policy.js:2 owns the requested role policy`).join('\n')}\n`);
const preview = await prepareScope(root, { ticket, report, repos: ids.map(id => ({ id, reason: 'src/policy.js:2 role policy' })) });
await approveScope(root, ticket, preview.hash, { source: 'user', via: 'chat' });
await runScope(root, ticket, preview.hash);
const initialized = await initializeWorkflow(root, { ticket, autonomy: 'autopilot', repos: ids.map(id => path.join(root, id)), branch_guard: 'Synthetic fixture user approved these exact repository/branch targets' });
await applyWorkflow({ root, statePath: initialized.state, input: { event: 'context-ready', id: 'seed-context', expected_hash: digest(await readFile(initialized.state, 'utf8')), repos: ids.map(id => path.join(root, id)) } });
JS
  node "$WORKSPACE_SEED_SCRIPT" "$WORKSPACE_PLUGIN_ROOT" "$WORKSPACE_VARIANT"
fi
