import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { renderEpic, writeEpic } from './epic.mjs';
const input = () => ({ version: 1, mode: 'product', title: 'Drafts', categories: [{ id: 5, assessed: true, applicable: true, ready: false, content: 'Given a draft\nWhen saved\nThen it persists.', open_items: ['Retention undecided'] }, { id: 3, assessed: true, applicable: true, ready: true, content: 'Save drafts. Prevent lost work.' }], decisions: [{ topic: 'Retention', decision: 'Undecided', status: 'Open / Deferred' }, { topic: 'Save', decision: 'Save drafts', rationale: '', status: 'Confirmed', source: 'user', reference: 'Interview answer' }] });
test('scope, fixed section order and consolidated open items derive from the actual selected categories', () => {
  const markdown = renderEpic(input());
  assert.ok(markdown.indexOf('## What & Why') < markdown.indexOf('## Use Cases & Requirements'));
  assert.match(markdown, /Draft — pending review/); assert.match(markdown, /\[ \] Use Cases/); assert.match(markdown, /\[x\] What & Why/);
  assert.equal(markdown.match(/Retention undecided/g).length, 2); assert.doesNotMatch(markdown, /^## Rollout Plan$/m);
  assert.ok(markdown.indexOf('| 1 | Save') < markdown.indexOf('| 2 | Retention'));
});
test('readiness and confirmed decisions cannot be manufactured from a proposal', () => {
  const ready = input(); ready.categories[0].ready = true; assert.throws(() => renderEpic(ready), /unresolved/);
  const proposed = input(); proposed.decisions[0].status = 'Confirmed'; assert.throws(() => renderEpic(proposed), /provenance/);
});
test('focused revisions preserve untouched sections and custom content from the existing epic', () => {
  const existing = '# Previous\n\n## Rollout Plan\n\nKeep user wording exactly.\n\n## Custom evidence\n\nKeep this table.\n';
  const result = renderEpic(input(), existing); assert.match(result, /## Rollout Plan\n\nKeep user wording exactly\./); assert.match(result, /## Custom evidence\n\nKeep this table\./);
});
test('successive drafts write distinct files without changing earlier artifacts', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'epic-write-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const first = await writeEpic(dir, input()); const original = await readFile(first.files[0], 'utf8');
  const second = await writeEpic(dir, input()); assert.notEqual(first.files[0], second.files[0]); assert.equal(await readFile(first.files[0], 'utf8'), original);
});
