import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { workflowDefaults } from './workflow.mjs';

test('machine defaults preserve every annotated pre-refactor state value and each load is independent', async () => {
  const manual = await readFile(new URL('../references/orchestration/state-and-progress.md', import.meta.url), 'utf8');
  const block = manual.match(/# Workflow state — <TICKET>\s*\n\s*```\s*\n([\s\S]*?)\n```/)[1];
  const legacy = Object.fromEntries(block.split('\n').filter(Boolean).map(line => {
    const match = line.replace(/\s+#.*$/, '').match(/^([a-z_]+):\s*(.*)$/);
    return [match[1], match[2].trim()];
  }));
  const current = await workflowDefaults();
  const { compaction_version, compaction_checkpoint, compaction_recovery, ...unchanged } = current;
  assert.deepEqual(unchanged, legacy);
  assert.deepEqual({ compaction_version, compaction_checkpoint, compaction_recovery }, { compaction_version: '1', compaction_checkpoint: 'pending', compaction_recovery: 'none' });
  current.status = 'Complete';
  assert.equal((await workflowDefaults()).status, 'In Progress');
});

test('relocated instruction links resolve and the small entry does not embed the legacy state template', async () => {
  const base = fileURLToPath(new URL('..', import.meta.url));
  const entry = await readFile(artifactJoin(base, 'SKILL.md'), 'utf8');
  assert.doesNotMatch(entry, /# Workflow state — <TICKET>/);
  const inventory = JSON.parse(await readFile(artifactJoin(base, 'assets/orchestration-relocation.json'), 'utf8'));
  for (const relative of ['skills/implement/SKILL.md', ...inventory.sections.map(section => section.path)]) {
    const file = path.resolve(base, '../..', relative);
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(/\[[^\]\n]*\]\(([^\s)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || target.startsWith('<') || target.startsWith('/') || /^[a-z]+:/i.test(target)) continue;
      await access(path.resolve(path.dirname(file), target));
    }
  }
});
