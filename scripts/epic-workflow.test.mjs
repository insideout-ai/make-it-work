import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { initEpicRun, updateEpicRun, inspectEpicRun, applyEpicEventFile } from './epic-workflow.mjs';
import { renderEpicDashboard } from './epic-dashboard.mjs';

const input = (autonomy = 'interactive') => ({ title: 'Order exports', goal: 'Reconcile purchases', autonomy, sources: [{ id: 'brief', reference: 'https://example.invalid/browse/APP-1', available: true, content: 'Customers export their own orders; add date selection later.' }] });
const epic = () => ({ version: 1, title: 'Order exports', mode: 'product', categories: [{ id: 3, assessed: true, ready: true, content: 'Customers reconcile purchases using an order export.' }, { id: 5, assessed: true, ready: true, content: 'Given a customer\nWhen they export\nThen only their orders appear.' }] });
const slice = (id, title, hard = [], recommended = []) => ({ id, title, summary: title, content: `Given a customer\nWhen they ${title}\nThen their own order data is available.`, hard, recommended, reasons: Object.fromEntries([...hard, ...recommended].map((id) => [id, 'Reuses export capability'])), parallel: { suitability: 'candidate', reason: 'Distinct outcomes; concurrency conditions need assessment before execution.' } });
const backlog = () => ({ version: 1, title: 'Order exports', goal: 'Reconcile purchases', approach: 'Functional', rationale: 'Smallest useful export first.', slices: [slice('S-1', 'Export orders'), slice('S-2', 'Select dates', ['S-1']), slice('S-3', 'Format amounts', ['S-1'])], parallel_groups: [['S-2', 'S-3']] });
async function fixture(t, autonomy) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'epic-workflow-')); t.after(() => rm(root, { recursive: true, force: true }));
  const created = await initEpicRun({ root, input: input(autonomy) });
  let count = 0;
  return { ...created, root, apply: (event) => updateEpicRun({ root, run: created.run, event: { id: `event-${++count}`, ...event } }), show: () => inspectEpicRun({ root, run: created.run }) };
}
async function prepare(f) {
  await f.apply({ type: 'intake' });
  const shaped = await f.apply({ type: 'epic', input: epic() });
  if (shaped.state.pending) await f.apply({ type: 'accept', pending_id: shaped.state.pending.id, reference: 'User accepted full epic in chat.' });
  return f.apply({ type: 'slices', input: backlog() });
}
test('interactive run waits on full epic, refuses premature slices, then saves a complete linked local set', async (t) => {
  const f = await fixture(t);
  await f.apply({ type: 'intake' });
  const shaped = await f.apply({ type: 'epic', input: epic() });
  assert.equal(shaped.state.status, 'Paused'); assert.equal(shaped.state.pending.kind, 'epic-review');
  await assert.rejects(f.apply({ type: 'slices', input: backlog() }), /pending input/);
  await assert.rejects(f.apply({ type: 'accept', pending_id: 'old', reference: 'chat' }), /matching/);
  await f.apply({ type: 'accept', pending_id: shaped.state.pending.id, reference: 'Approved in chat' });
  const result = await f.apply({ type: 'slices', input: backlog() });
  assert.equal(result.state.status, 'Complete'); assert.equal(result.state.slices.length, 3);
  assert.equal(result.state.slices[1].implementation.status, 'Not started');
  assert.match(result.chat_summary, /S-3/);
  for (const file of await readdir(f.directory)) if (file.endsWith('.md') || file.endsWith('.html')) {
    const text = await readFile(path.join(f.directory, file), 'utf8');
    const links = [...text.matchAll(/\]\(([^)]+\.md)\)|href="([^"#]+\.md)"/g)].map((m) => m[1] ?? decodeURIComponent(m[2]));
    for (const link of links) await readFile(path.join(f.directory, link));
  }
  assert.match(await readFile(path.join(f.directory, result.state.epic.path), 'utf8'), /APP-1/);
  assert.equal((await f.show()).problems.length, 0);
});
test('autopilot records automatic continuation without manufacturing approval and stays local', async (t) => {
  const f = await fixture(t, 'autopilot'); const result = await prepare(f);
  assert.equal(result.state.decisions[0].source, 'automatic'); assert.match(result.state.decisions[0].text, /not approved/);
  await assert.rejects(f.apply({ type: 'publication', text: 'Created ticket', reference: 'chat' }), /stays local/);
  assert.match(await readFile(path.join(f.directory, 'dashboard.html'), 'utf8'), /autopilot stays local/);
});
test('Jira-only inaccessible input pauses interactive runs and stops autopilot without an invented epic', async (t) => {
  for (const autonomy of ['interactive', 'autopilot']) {
    const f = await fixture(t, autonomy);
    const changed = await f.apply({ type: 'revise', scope: 'epic', reason: 'Ticket inaccessible', reference: 'Source lookup', sources: [{ id: 'jira', reference: 'APP-1', available: false, content: '' }] });
    // A revision during intake may not bypass the source-availability gate.
    assert.equal(changed.state.phase, 'intake');
    const result = await f.apply({ type: 'intake' });
    assert.equal(result.state.status, autonomy === 'interactive' ? 'Paused' : 'Stopped');
    assert.equal(result.state.epic, null);
  }
});
test('saved pending questions resume at the same stage and require actual answers', async (t) => {
  const f = await fixture(t); await f.apply({ type: 'intake' });
  const paused = await f.apply({ type: 'question', question: 'Which customer outcome matters?' });
  const reload = await f.show(); assert.deepEqual(reload.state.pending, paused.state.pending);
  await assert.rejects(f.apply({ type: 'answer', pending_id: paused.state.pending.id, answer: 'Export', reference: '' }), /reference/);
  const answered = await f.apply({ type: 'answer', pending_id: paused.state.pending.id, answer: 'Export', reference: 'User answer' });
  assert.equal(answered.state.phase, 'shape'); assert.equal(answered.state.status, 'In Progress');
});
test('autopilot cannot accidentally open an interactive wait', async (t) => {
  const f = await fixture(t, 'autopilot'); await assert.rejects(f.apply({ type: 'question', question: 'Approve?' }), /cannot wait/);
});
test('retrying the same event is idempotent and conflicting retries cannot replace history', async (t) => {
  const f = await fixture(t); const event = { id: 'intake-once', type: 'intake' };
  const first = await f.apply(event); const again = await f.apply(event);
  assert.deepEqual(first.state, again.state);
  await assert.rejects(f.apply({ ...event, text: 'different' }), /different content/);
});
test('invalid cycles or unsafe parallel groups fail before saving a backlog', async (t) => {
  const f = await fixture(t, 'autopilot'); await f.apply({ type: 'intake' }); await f.apply({ type: 'epic', input: epic() });
  const circular = backlog(); circular.slices[0].hard = ['S-2']; circular.slices[0].reasons = { 'S-2': 'Circular' };
  await assert.rejects(f.apply({ type: 'slices', input: circular }), /cycle/);
  const unsafe = backlog(); unsafe.parallel_groups = [['S-1', 'S-2']];
  await assert.rejects(f.apply({ type: 'slices', input: unsafe }), /hard prerequisite/);
  assert.equal((await readdir(f.directory)).filter((name) => name.startsWith('slices-')).length, 0);
});
test('material epic revision invalidates approval, preserves decisions, and retains prior artifacts', async (t) => {
  const f = await fixture(t); const result = await prepare(f); const old = result.state.epic;
  const revised = await f.apply({ type: 'revise', scope: 'epic', reason: 'Add refunds', reference: 'User changed scope' });
  assert.equal(revised.state.phase, 'shape'); assert.equal(revised.state.decisions.length, 2);
  const draft = epic(); draft.categories[0].content += ' Include refunds.';
  const next = await f.apply({ type: 'epic', input: draft });
  assert.equal(next.state.status, 'Paused'); assert.notEqual(next.state.epic.path, old.path);
  await readFile(path.join(f.directory, old.path));
});
test('slice-only changes preserve the epic, retain stable IDs, and protect unaffected requirements', async (t) => {
  const f = await fixture(t, 'autopilot'); const old = await prepare(f);
  const revised = await f.apply({ type: 'revise', scope: ['S-2'], reason: 'Date boundary clarified', reference: 'User clarification' });
  assert.deepEqual(revised.state.epic, old.state.epic); assert.deepEqual(revised.state.affected, ['S-2']);
  const wrong = backlog(); wrong.slices[2].content += ' Changed unrelated behavior.';
  await assert.rejects(f.apply({ type: 'slices', input: wrong }), /outside the revision scope/);
  const right = backlog(); right.slices[1].content += ' Date boundaries are inclusive.';
  const result = await f.apply({ type: 'slices', input: right }); assert.equal(result.state.slices[0].id, 'S-1');
});
test('affected prerequisites propagate to dependent slices', async (t) => {
  const f = await fixture(t, 'autopilot'); await prepare(f);
  const revised = await f.apply({ type: 'revise', scope: ['S-1'], reason: 'Export contract changes', reference: 'User clarification' });
  assert.deepEqual(revised.state.affected, ['S-1', 'S-2', 'S-3']);
});
test('unresolved requirements remain visible and do not become implementation-ready', async (t) => {
  const f = await fixture(t, 'autopilot'); await f.apply({ type: 'intake' });
  const draft = epic(); draft.categories[1].ready = false; draft.categories[1].open_items = ['Retention unknown'];
  await f.apply({ type: 'epic', input: draft }); const result = await f.apply({ type: 'slices', input: backlog() });
  assert.ok(result.state.slices.every((s) => s.preparation === 'Needs refinement'));
  assert.match(await readFile(path.join(f.directory, result.state.overview.path), 'utf8'), /Retention unknown/);
});
test('artifact changes are detected before approval or resumption and require reconciliation', async (t) => {
  const f = await fixture(t); await f.apply({ type: 'intake' }); const shaped = await f.apply({ type: 'epic', input: epic() });
  await writeFile(path.join(f.directory, shaped.state.epic.path), 'Changed outside the workflow');
  assert.equal((await f.show()).problems.length, 1);
  await assert.rejects(f.apply({ type: 'accept', pending_id: shaped.state.pending.id, reference: 'chat' }), /Changed artifact/);
  const revision = await f.apply({ type: 'revise', scope: 'epic', reason: 'Reconcile external edits', reference: 'User content change' });
  assert.equal(revision.state.phase, 'shape');
});
test('same-title runs stay separate and checkpoint symlinks cannot overwrite another file', async (t) => {
  const f = await fixture(t); const second = await initEpicRun({ root: f.root, input: input() }); assert.notEqual(second.run, f.run);
  const target = path.join(f.root, 'untouched'); await writeFile(target, 'Original');
  await rm(path.join(f.directory, 'dashboard.html')); await symlink(target, path.join(f.directory, 'dashboard.html'));
  await assert.rejects(f.apply({ type: 'intake' }), /symlink/); assert.equal(await readFile(target, 'utf8'), 'Original');
  await assert.rejects(inspectEpicRun({ root: f.root, run: '../escape' }), /Unsafe/);
});
test('dashboard escapes source text and uses local encoded artifact links without external scripts', async (t) => {
  const f = await fixture(t, 'autopilot'); const { state } = await prepare(f);
  state.title = '<script>alert(1)</script>'; state.sources[0].reference = 'javascript:alert(1)';
  const html = renderEpicDashboard(state);
  assert.doesNotMatch(html, /<script>alert|href="javascript:|<script[^>]+src=/);
  assert.match(html, /&lt;script&gt;/); assert.match(html, /aria-label="Workflow phases"/); assert.match(html, /Slicing summary/);
});
test('slice-only revisions cannot bypass an unaccepted epic', async (t) => {
  const f = await fixture(t); await f.apply({ type: 'intake' }); await f.apply({ type: 'epic', input: epic() });
  await assert.rejects(f.apply({ type: 'revise', scope: 'slices', reason: 'Try slicing', reference: 'User revision' }), /Accept the epic/);
  assert.equal((await f.show()).state.status, 'Paused');
});
test('stopping and resuming at review restores the actual pending review instead of skipping it', async (t) => {
  const f = await fixture(t); await f.apply({ type: 'intake' }); const draft = await f.apply({ type: 'epic', input: epic() });
  await f.apply({ type: 'stop', reason: 'Session interrupted' }); const resumed = await f.apply({ type: 'resume' });
  assert.equal(resumed.state.status, 'Paused'); assert.deepEqual(resumed.state.pending, draft.state.pending);
});
test('external epic changes cannot be hidden by regenerating only slices', async (t) => {
  const f = await fixture(t, 'autopilot'); await prepare(f);
  await f.apply({ type: 'revise', scope: ['S-2'], reason: 'Clarify dates', reference: 'User revision' });
  const { state } = await f.show(); await writeFile(path.join(f.directory, state.epic.path), 'Unexpected upstream edit');
  await assert.rejects(f.apply({ type: 'slices', input: backlog() }), /Changed artifact/);
});
test('unresolved slice prerequisites block their hard dependents without blocking independent slices', async (t) => {
  const f = await fixture(t, 'autopilot'); await f.apply({ type: 'intake' }); await f.apply({ type: 'epic', input: epic() });
  const input = backlog(); input.slices[0].open_items = ['Export authorization rule needs clarification']; input.slices.push(slice('S-4', 'Independent documentation'));
  const result = await f.apply({ type: 'slices', input });
  assert.deepEqual(result.state.slices.map((s) => s.preparation), ['Needs refinement', 'Needs refinement', 'Needs refinement', 'Prepared']);
  const saved = await readFile(path.join(f.directory, result.state.slices[0].artifact.path), 'utf8'); assert.match(saved, /Export authorization rule/);
});
test('multiline interview answers and the actual question choices survive checkpoint and resume', async (t) => {
  const f = await fixture(t); await f.apply({ type: 'intake' });
  const options = [{ label: 'Own orders', description: 'Export customer history.' }, { label: 'All orders', description: 'Administrative export.' }];
  const paused = await f.apply({ type: 'question', question: 'Who can export?\nChoose the intended actor.', options, multi_select: false });
  const reloaded = await f.show(); assert.deepEqual(reloaded.state.pending.options, options);
  const answer = 'Own orders\nKeep other customer records private.';
  const result = await f.apply({ type: 'answer', pending_id: paused.state.pending.id, answer, reference: 'User interview answer' });
  assert.equal(result.state.decisions.at(-1).text, answer);
});
test('a failed derived HTML write can recover by replaying its saved event without repeating progress or artifacts', async (t) => {
  const f = await fixture(t, 'autopilot'); await f.apply({ type: 'intake' });
  await rm(path.join(f.directory, 'dashboard.html')); await mkdir(path.join(f.directory, 'dashboard.html'));
  const event = { id: 'recover-draft', type: 'epic', input: epic() };
  await assert.rejects(f.apply(event), /Not a regular file/);
  const saved = await f.show(); assert.equal(saved.state.phase, 'slice');
  const files = await readdir(f.directory); const historyCount = saved.state.history.length;
  await rm(path.join(f.directory, 'dashboard.html'), { recursive: true });
  const retried = await f.apply(event);
  assert.equal(retried.state.history.length, historyCount);
  assert.deepEqual((await readdir(f.directory)).sort(), files.sort());
  assert.match(await readFile(path.join(f.directory, 'dashboard.html'), 'utf8'), /Current activity: Slice/);
});
test('open questions remain distinct from assumptions and an assessed no-parallel outcome is described accurately', async (t) => {
  const f = await fixture(t, 'autopilot'); await f.apply({ type: 'intake' }); await f.apply({ type: 'epic', input: epic() });
  const input = backlog(); input.open_items = ['Which timezone defines a date boundary?']; input.assumptions = ['CSV is downloaded directly.']; input.parallel_groups = [];
  const result = await f.apply({ type: 'slices', input });
  const overview = await readFile(path.join(f.directory, result.state.overview.path), 'utf8');
  assert.match(overview, /## Assumptions\n\n- CSV is downloaded directly\./);
  assert.match(overview, /## Open questions\n\n- Which timezone defines a date boundary\?/);
  assert.ok(overview.indexOf('## Open questions') > overview.indexOf('## Recommended implementation flow'));
  assert.doesNotMatch(overview.slice(overview.indexOf('## Assumptions'), overview.indexOf('## Open questions')), /Which timezone/);
  assert.match(overview, /No parallel groups proposed/);
  const html = await readFile(path.join(f.directory, 'dashboard.html'), 'utf8'); assert.doesNotMatch(html, /<h2>Slices<|No parallel groups assessed yet/);
});
test('the slicing summary retains preparation, dependencies, and parallel detail removed from HTML', async (t) => {
  const f = await fixture(t, 'autopilot'); const result = await prepare(f);
  const md = await readFile(path.join(f.directory, result.state.overview.path), 'utf8');
  for (const text of ['## Slice summary', '## Dependency map', '## Recommended implementation flow', '## Preparation and parallel suitability', '### Proposed parallel groups', 'Distinct outcomes; concurrency conditions need assessment before execution.', 'Prepared']) assert.ok(md.includes(text), text);
  const html = await readFile(path.join(f.directory, 'dashboard.html'), 'utf8');
  assert.doesNotMatch(html, /class="slice-table"|<h2>Dependencies/);
  assert.ok(html.includes(result.state.overview.path));
});
test('the audit preserves the interview question and actual answer together with user provenance', async (t) => {
  const f = await fixture(t); await f.apply({ type: 'intake' });
  const paused = await f.apply({ type: 'question', question: 'Which export outcome should come first?' });
  const result = await f.apply({ type: 'answer', pending_id: paused.state.pending.id, answer: 'Own-order CSV export', reference: 'User interview answer', scope: 'epic' });
  const html = await readFile(path.join(f.directory, 'dashboard.html'), 'utf8');
  assert.match(html, /Which export outcome should come first\?/); assert.match(html, /Decision:<\/strong> Own-order CSV export/);
  assert.match(html, /Source: user/); assert.equal(result.state.history.at(-1).id, result.state.decisions.at(-1).id);
});
test('fresh runs grow only with deliverables, not decisions or a duplicate journal', async (t) => {
  const f = await fixture(t, 'autopilot');
  assert.deepEqual((await readdir(f.directory)).sort(), ['dashboard.html', 'state.json']);
  await f.apply({ type: 'intake' });
  for (let i = 0; i < 5; i++) {
    const input = path.join(f.directory, '.event.json');
    await writeFile(input, JSON.stringify({ id: `choice-${i}`, type: 'decision', source: 'automatic', text: `Automatic choice ${i}` }));
    await applyEpicEventFile({ root: f.root, run: f.run, input });
    assert.deepEqual((await readdir(f.directory)).sort(), ['dashboard.html', 'state.json']);
  }
  await f.apply({ type: 'epic', input: epic() }); await f.apply({ type: 'slices', input: backlog() });
  assert.equal((await readdir(f.directory)).length, 4 + backlog().slices.length);
  assert.equal((await f.show()).state.decisions.length, 6);
});
test('invalid scratch events are retained unchanged, and unrelated custom input files are never consumed', async (t) => {
  const f = await fixture(t); const input = path.join(f.directory, '.event.json');
  const raw = JSON.stringify({ id: 'wrong-phase', type: 'epic', input: epic() }); await writeFile(input, raw);
  await assert.rejects(applyEpicEventFile({ root: f.root, run: f.run, input }), /during shaping/);
  assert.equal(await readFile(input, 'utf8'), raw);
  const custom = path.join(f.root, 'user-source.json'); await writeFile(custom, JSON.stringify({ id: 'custom-intake', type: 'intake' }));
  await applyEpicEventFile({ root: f.root, run: f.run, input: custom });
  assert.ok((await readFile(custom, 'utf8')).includes('custom-intake'));
});
test('failed dashboard checkpoints retain scratch input; an exact retry recovers without duplicate artifacts', async (t) => {
  const f = await fixture(t, 'autopilot'); await f.apply({ type: 'intake' });
  const input = path.join(f.directory, '.event.json');
  const raw = JSON.stringify({ id: 'save-draft-once', type: 'epic', input: epic() }); await writeFile(input, raw);
  await rm(path.join(f.directory, 'dashboard.html')); await mkdir(path.join(f.directory, 'dashboard.html'));
  await assert.rejects(applyEpicEventFile({ root: f.root, run: f.run, input }), /Not a regular file/);
  assert.equal(await readFile(input, 'utf8'), raw);
  const before = await f.show(); const count = (await readdir(f.directory)).filter((p) => p.endsWith('.md')).length;
  await rm(path.join(f.directory, 'dashboard.html'), { recursive: true });
  const result = await applyEpicEventFile({ root: f.root, run: f.run, input });
  assert.equal(result.state.history.length, before.state.history.length);
  assert.equal((await readdir(f.directory)).filter((p) => p.endsWith('.md')).length, count);
  await assert.rejects(readFile(input), { code: 'ENOENT' });
});
test('stage auto-resolution records retain exact audit payloads in state without standalone logs', async (t) => {
  const f = await fixture(t, 'autopilot'); await f.apply({ type: 'intake' });
  const resolution = { phase: 'Mode selection', site: 'choose-mode', kind: 'open_text', chosen: 'Product', rationale: 'The brief describes a user-facing feature.' };
  const result = await f.apply({ type: 'decision', source: 'automatic', text: 'Use Product mode', stage: 'shape-the-epic', auto_resolution: resolution });
  assert.deepEqual(result.state.decisions.at(-1).auto_resolution, resolution);
  assert.equal(result.state.decisions.at(-1).stage, 'shape-the-epic');
  assert.deepEqual((await readdir(f.directory)).sort(), ['dashboard.html', 'state.json']);
  await assert.rejects(f.apply({ type: 'decision', source: 'user', reference: 'chat', text: 'Wrong provenance', stage: 'shape-the-epic', auto_resolution: resolution }), /automatic decision/);
});
test('older runs with a decision export retain and update it while resuming', async (t) => {
  const f = await fixture(t); const file = path.join(f.directory, 'decisions.jsonl'); await writeFile(file, '');
  await f.apply({ type: 'intake' }); await f.apply({ type: 'decision', source: 'policy', text: 'Reuse project scope' });
  const entry = JSON.parse((await readFile(file, 'utf8')).trim()); assert.equal(entry.text, 'Reuse project scope');
  assert.equal((await f.show()).state.decisions.length, 1);
});
test('question choices stay in state history after their temporary input and pending wait are gone', async (t) => {
  const f = await fixture(t); await f.apply({ type: 'intake' });
  const options = [{ label: 'Basic CSV', description: 'Start small' }, { label: 'Filtered CSV', description: 'Add dates immediately' }];
  const paused = await f.apply({ type: 'question', question: 'Which export outcome first?', options, multi_select: false });
  const result = await f.apply({ type: 'answer', pending_id: paused.state.pending.id, answer: 'Basic CSV', reference: 'User answer' });
  assert.equal(result.state.pending, null);
  assert.deepEqual(result.state.history.find((h) => h.event === 'question').options, options);
  assert.equal(result.state.history.at(-1).pending_id, paused.state.pending.id);
});
