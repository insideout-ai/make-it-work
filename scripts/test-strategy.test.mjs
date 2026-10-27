import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { strategyPointer, updateStrategyPointer, validateStrategy } from './test-strategy.mjs';
const strategy = `## Repo ID\n\n\`app\`\n\n## Layers\n\n| Layer | Status | Example command |\n| --- | --- | --- |\n| Unit | configured | npm test |\n| Component | planned | none |\n\n## Test Locations\n\n| Location | Repo | Layers | Test files | Full-suite command | Run from |\n| --- | --- | --- | --- | --- | --- |\n| . | app | Unit | test/*.js | npm test | . |\n\n## Where New Tests Go\n\n| Layer | Status | Repo | Directory | File naming |\n| --- | --- | --- | --- | --- |\n| Unit | configured | app | test | *.js |\n| Component | planned | app | TBD | TBD |\n\n## Coverage Decision Guidance\n\nUnit for isolated behavior. Component (setup required) for rendering.\n\n## Test Map\n\nUse shared map.\n`;
test('planned/configured consistency preserves selected future layers without activating commands', () => {
  assert.equal(validateStrategy(strategy, { selected_layers: [{ layer: 'Component', status: 'planned' }] }).valid, true);
  assert.match(validateStrategy(strategy.replace('Component | planned | none', 'Component | planned | npm test')).errors.join(' '), /runnable/);
  assert.match(validateStrategy(strategy.replace('| app | Unit |', '| app | Component |')).errors.join(' '), /unconfigured/);
  assert.equal(validateStrategy(strategy, { selected_layers: [{ layer: 'Contract', status: 'planned' }] }).valid, false);
});
test('existing legacy strategy rows without Status retain configured interpretation', async () => {
  const file = 'evals/fixtures/multi-repo-workspace/payments-api/claude-dir/skills/test-strategy/SKILL.md';
  assert.deepEqual(validateStrategy(await readFile(file, 'utf8')).errors, []);
});
test('pointer insertion is idempotent, removes duplicates and preserves unrelated content', () => {
  const original = '# Project\n\n## Skills Reference\n\n### Domains\n\nKeep domains.\n\n### Other Skills\n\n| Skill | Topic | Load when... |\n| --- | --- | --- |\n| /custom | Keep | Always |\n| /test-strategy | old | old |\n| /test-strategy | duplicate | duplicate |\n\n## Notes\n\nKeep notes.\n';
  const first = strategyPointer(original).markdown;
  assert.equal(first.match(/\| \/test-strategy \|/g).length, 1);
  assert.match(first, /\/custom \| Keep/); assert.match(first, /Keep notes/);
  assert.equal(strategyPointer(first).changed, false);
  assert.equal(strategyPointer('# No inventory').changed, false);
});
test('disk pointer requires both valid saved artifacts before touching CLAUDE.md', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'strategy-pointer-')); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, '.claude/skills/test-strategy'), { recursive: true }); await mkdir(path.join(root, '.claude/testing'), { recursive: true });
  const claude = '# Project\n\n## Skills Reference\n\nExisting table.\n'; await writeFile(path.join(root, 'CLAUDE.md'), claude);
  await writeFile(path.join(root, '.claude/skills/test-strategy/SKILL.md'), strategy);
  await assert.rejects(updateStrategyPointer(root), /ENOENT/); assert.equal(await readFile(path.join(root, 'CLAUDE.md'), 'utf8'), claude);
  await writeFile(path.join(root, '.claude/testing/test-map.json'), JSON.stringify({ schemaVersion: 1, productRepo: 'app', tokens: [], repos: [{ id: 'app', root: '.' }], locations: [{ id: 'local', repo: 'app', paths: ['.'], config: [], complete: true, assessedTokens: [] }], tests: [], mappings: [], decisions: [], snapshots: {}, discovery: {} }));
  assert.equal((await updateStrategyPointer(root)).changed, true); assert.equal((await updateStrategyPointer(root)).changed, false);
});
