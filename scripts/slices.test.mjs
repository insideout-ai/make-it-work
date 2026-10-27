import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { renderApproachPreview, renderSlices, sliceGraph, writeSlices } from './slices.mjs';
const approaches = () => ({ title: 'Save drafts', options: [
  { label: 'Workflow', fit: 'Deliver the create and resume journey in order.',
    tradeoff: 'Feedback on resuming comes after persistence.', examples: ['Create a draft', 'Resume a saved draft'], recommended: true },
  { label: 'Technical risk first', fit: 'Prove recovery before expanding editing.',
    tradeoff: 'Defers the full editing journey.', examples: ['Recover a draft after a crash', 'Edit and resave a draft'] },
] });
const data = () => ({ version: 1, title: 'Save drafts', goal: 'Users can save drafts.', slices: [
  { id: 'S-1', title: 'Create draft', summary: 'Save a draft', content: 'As a writer, I want to save.\n\nGiven a draft\nWhen saved\nThen it persists.', hard: [], recommended: [] },
  { id: 'S-2', title: 'Resume draft', summary: 'Continue a saved draft', content: 'As a writer, I want to resume.\n\nGiven a saved draft\nWhen opened\nThen its content appears.', hard: ['S-1'], recommended: [], reasons: { 'S-1': 'Supplies the persisted draft.' } },
  { id: 'S-3', title: 'Independent feedback', summary: 'Collect feedback', content: 'Technical objective: collect explicit feedback evidence.', hard: [], recommended: [] },
], mvp: ['S-2'] });
test('graph derives parallel waves and MVP prerequisite closure without treating recommendations as blockers', () => {
  const graph = sliceGraph(data()); assert.deepEqual(graph.feasible, [['S-1', 'S-3'], ['S-2']]); assert.deepEqual(graph.mvp_closure, ['S-1', 'S-2']);
});
test('rejects impossible dependency graphs, missing reasons and invalid implementation stages', () => {
  const cycle = data(); cycle.slices[0].hard = ['S-2']; cycle.slices[0].reasons = { 'S-2': 'Cycle' };
  assert.throws(() => sliceGraph(cycle), /cycle/);
  const missing = data(); missing.slices[1].hard = ['S-99']; assert.throws(() => sliceGraph(missing), /unknown/);
  const reason = data(); delete reason.slices[1].reasons; assert.throws(() => sliceGraph(reason), /Reason/);
  assert.throws(() => sliceGraph({ ...data(), stages: [['S-2', 'S-3'], ['S-1']] }), /earlier stage/);
});
test('summary, diagram, dependency table and per-slice links derive from the same edges', () => {
  const output = renderSlices(data(), 'slices-demo');
  assert.match(output.files['slices-demo.md'], /S1 --> S2/); assert.match(output.files['slices-demo.md'], /\| S-1 \| S-2 \| Hard prerequisite/);
  const second = output.files['slices-demo-S-2-resume-draft.md']; assert.match(second, /\[S-1\]\(slices-demo-S-1-create-draft.md\)/);
  assert.match(output.summary, /S-3/);
});
test('writing a second set uses one collision-free prefix and preserves every earlier file', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'slices-write-')); t.after(() => rm(root, { recursive: true, force: true }));
  const first = await writeSlices(root, data()); const bytes = await readFile(first.files[0], 'utf8');
  assert.equal(first.chat_summary, `${first.summary}\n\nRecommended starting slice: S-1.`);
  const second = await writeSlices(root, data()); assert.notEqual(first.prefix, second.prefix); assert.equal(second.files.length, 4);
  assert.equal(await readFile(first.files[0], 'utf8'), bytes);
  for (const file of second.files) assert.match(path.basename(file), new RegExp(`^${second.prefix}`));
});

test('approach preview includes every fit, tradeoff and example with one recommendation', () => {
  const input = approaches(), text = renderApproachPreview(input);
  assert.equal((text.match(/\(Recommended\)/g) ?? []).length, 1);
  for (const option of input.options) for (const value of [option.label, option.fit, option.tradeoff, ...option.examples]) assert.ok(text.includes(value));
  const third = approaches(); third.options.push({ ...third.options[1], label: 'Functional' });
  assert.doesNotThrow(() => renderApproachPreview(third));
});

test('approach preview rejects incomplete candidates and ambiguous recommendations', () => {
  for (const mutate of [
    (v) => { v.options.pop(); },
    (v) => { v.options.push(...v.options); },
    (v) => { delete v.options[0].fit; },
    (v) => { v.options[0].tradeoff = ''; },
    (v) => { v.options[0].examples = ['One title']; },
    (v) => { v.options[0].examples = ['Same title', 'Same title']; },
    (v) => { v.options[1].label = v.options[0].label; },
    (v) => { v.options[0].recommended = false; },
    (v) => { v.options[1].recommended = true; },
    (v) => { v.options[1].recommended = 'yes'; },
    (v) => { v.options[1].label = 'Risk (Recommended)'; },
  ]) {
    const input = approaches(); mutate(input);
    assert.throws(() => renderApproachPreview(input));
  }
});
