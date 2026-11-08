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
test('readiness remains unchecked with unresolved content and confirmations require provenance', () => {
  const ready = input(); ready.categories[0].ready = true; assert.match(renderEpic(ready), /\[ \] Use Cases/);
  ready.categories[0].open_items = [];
  for (const unconfirmed of [true, ['Unknown dependency'], 'Unknown dependency']) {
    ready.categories[0].unconfirmed = unconfirmed;
    assert.match(renderEpic(ready), /\[ \] Use Cases/);
  }
  const proposed = input(); proposed.decisions[0].status = 'Confirmed'; assert.throws(() => renderEpic(proposed), /provenance/);
});
test('automatic decision rows derive their text, rationale and proposed status from the shared resolution', () => {
  const spec = input();
  spec.decisions.push({ topic: 'Retention proposal', status: 'Confirmed', decision: 'Wrong competing text',
    auto_resolution: { phase: 'Phase 2B', site: 'gap-check-retention', kind: 'open_text',
      chosen: '[autopilot best-guess] Keep drafts for one week.', rationale: 'Proposed for review.' } });
  const markdown = renderEpic(spec);
  assert.match(markdown, /Retention proposal \| \[autopilot best-guess\] Keep drafts for one week\. \| Proposed for review\. \| Proposed/);
  assert.doesNotMatch(markdown, /Wrong competing text/);
});
test('category headings remain nested under their section while fenced examples and input stay intact', () => {
  const spec = input();
  const content = '## Happy-path flows\n\n### UC-1\nGiven a saved draft.\n\n```md\n# Example\n## Keep literal\n```\n\n~~~\n## Also literal\n~~~';
  spec.categories[0].content = content;
  const markdown = renderEpic(spec);
  assert.match(markdown, /## Use Cases & Requirements\n\n### Happy-path flows\n\n#### UC-1\nGiven a saved draft\./);
  assert.ok(markdown.includes('```md\n# Example\n## Keep literal\n```'));
  assert.ok(markdown.includes('~~~\n## Also literal\n~~~'));
  assert.equal(spec.categories[0].content, content);
  spec.categories[0].content = '### Already nested\n\n#### Detail\nText.';
  assert.ok(renderEpic(spec).includes(spec.categories[0].content));
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
test('orchestrated requirements use short versioned names and preserve full titles and earlier drafts', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'epic-compact-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const spec = input(); spec.title = 'Premium customer coverage with a deliberately complete descriptive title';
  const first = await writeEpic(dir, spec, null, { compact: true });
  const old = await readFile(first.files[0], 'utf8');
  const second = await writeEpic(dir, spec, null, { compact: true });
  assert.equal(path.basename(first.files[0]), 'requirement.md'); assert.equal(path.basename(second.files[0]), 'requirement-v2.md');
  assert.ok(old.includes(spec.title)); assert.equal(await readFile(first.files[0], 'utf8'), old);
});

test('automatic markers require audit metadata while ordinary proposals and quoted evidence remain supported', () => {
  for (const decision of ['[autopilot best-guess] Reuse email infrastructure.', 'Product (Recommended) _(autopilot)_']) {
    const spec = input(); spec.decisions.push({ topic: 'Missing audit', decision, status: 'Proposed' });
    assert.throws(() => renderEpic(spec), /Missing audit.*requires auto_resolution/);
  }
  const spec = input(); spec.decisions.push({ topic: 'Human proposal', decision: 'Consider a digest later.', status: 'Proposed' });
  spec.decisions.push({ topic: 'Quoted history', decision: 'The old draft said "[autopilot best-guess]"; this is unresolved.', status: 'Open / Deferred' });
  assert.doesNotThrow(() => renderEpic(spec));
});

test('invalid automatic audit metadata prevents a new epic artifact without damaging a prior draft', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'epic-audit-validation-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const prior = await writeEpic(dir, input()); const body = await readFile(prior.files[0], 'utf8');
  const spec = input(); spec.decisions.push({ topic: 'Unlogged assumption', decision: '[autopilot best-guess] Existing email is reusable.', status: 'Proposed' });
  await assert.rejects(writeEpic(dir, spec), /requires auto_resolution/);
  assert.equal(await readFile(prior.files[0], 'utf8'), body);
  const { readdir } = await import('node:fs/promises');
  assert.equal((await readdir(dir)).length, 1);
});
