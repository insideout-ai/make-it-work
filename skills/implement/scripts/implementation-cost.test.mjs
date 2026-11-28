import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { calculateImplementationCost, computeCost, readImplementationCost } from './implementation-cost.mjs';
import { parseState, generateDashboard, renderStatus } from './render-status.mjs';
import { feedbackStateHash } from './feedback-handoff.mjs';
import { finalizeFeedback, readFeedbackFinalization } from './feedback-finalization.mjs';
import { recordFeedbackArchive } from './feedback-progress.mjs';
import { createFeedbackArchive } from '../../../scripts/feedback-archive.mjs';
import { BUNDLED_PRICING } from '../../../scripts/lib/cost-pricing.mjs';

async function fixture(t, { finalized = true, archived = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'miw-cost-')); t.after(() => rm(root, { recursive: true, force: true }));
  const dir = path.join(root, 'make-it-work', 'DEMO'); await mkdir(dir, { recursive: true });
  const statePath = path.join(dir, 'DEMO-state.md');
  const source = await readFile(new URL('../../../evals/implement/feedback-idempotent/fixture/fixture-artifacts/DEMO-state.md', import.meta.url), 'utf8');
  await writeFile(statePath, source.replace('status: In Progress', 'status: Complete').replace('phase: final-sync', 'phase: complete') +
    '| 7 | 2026-01-03T10:06:00Z | final-sync | complete | Complete |\n');
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  const binding = { runId: state.fields.start_time, stateHash: feedbackStateHash(state.fields, state.audit) };
  if (finalized) await finalizeFeedback(statePath, { ...binding, status: 'saved', kind: 'legacy-minimal' }, { refresh: false });
  if (archived) {
    const reportPath = path.join(dir, 'workflow-feedback.md');
    await writeFile(reportPath, `<!-- run:${binding.runId} -->\n<!-- feedback-state:${binding.stateHash} -->\n`);
    const transcriptPath = path.join(root, 'session.jsonl');
    await writeFile(transcriptPath, [
      { type: 'user', timestamp: binding.runId, message: { content: '/make-it-work:implement DEMO' } },
      { type: 'assistant', timestamp: '2026-01-03T10:01:00Z', message: { id: 'msg-1', model: 'claude-sonnet-4-6', usage: { input_tokens: 1000, output_tokens: 100 } } },
    ].map(e => JSON.stringify(e)).join('\n'));
    const archive = await createFeedbackArchive({ root, reportPath, transcriptPath });
    await recordFeedbackArchive(statePath, binding, archive);
  }
  // Other artifacts remain byte-identical throughout cost accounting.
  await writeFile(path.join(dir, 'approved-package.json'), '{"approved":true}');
  return { root, dir, statePath, state, binding };
}
const offlineCompute = input => computeCost({ ...input, pricing: BUNDLED_PRICING });

function runCostCli(statePath, setting, preload = null) {
  const env = { ...process.env };
  delete env.MIW_ESTIMATE_COST;
  if (setting !== undefined) env.MIW_ESTIMATE_COST = setting;
  const cli = fileURLToPath(new URL('./implementation-cost.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [...(preload ? ['--import', preload] : []), cli, '--state', statePath], {
    env, encoding: 'utf8', timeout: 15000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

test('CLI defaults on, accepts the existing enabled setting, and handles missing state without exit 13', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'miw-cost-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const setting of [undefined, '1']) {
    assert.equal(runCostCli(path.join(root, 'absent-state.md'), setting).status, 'unavailable');
  }
});

test('CLI opt-out leaves a finalized run untouched; an enabled CLI saves missing-archive outcome', async t => {
  const f = await fixture(t, { archived: false });
  const before = await readFile(f.statePath, 'utf8');
  const files = (await readdir(f.dir)).sort();
  assert.deepEqual(runCostCli(f.statePath, '0'), { status: 'disabled' });
  assert.equal(await readFile(f.statePath, 'utf8'), before);
  assert.deepEqual((await readdir(f.dir)).sort(), files);
  const result = runCostCli(f.statePath);
  assert.equal(result.status, 'unavailable');
  assert.match(result.reason, /No current saved transcript archive/);
  assert.equal(JSON.parse(await readFile(result.resultPath, 'utf8')).status, 'unavailable');
});

test('fresh CLI calculates a real archive offline, renders the estimate, and reuses the saved outcome', async t => {
  const f = await fixture(t);
  await generateDashboard(f.statePath);
  const preload = path.join(f.root, 'offline-pricing.mjs');
  await writeFile(preload, "globalThis.fetch = async () => { throw new Error('Offline pricing fixture'); };\n");
  const before = parseState(await readFile(f.statePath, 'utf8'), f.statePath);
  const receipt = await readFeedbackFinalization(f.statePath, f.binding);
  const result = runCostCli(f.statePath, undefined, preload);
  assert.equal(result.status, 'partial');
  assert.ok(Math.abs(result.usd - 0.0045) < 1e-10);
  const snapshot = await readFile(result.resultPath, 'utf8');
  assert.equal(JSON.parse(snapshot).pricing.origin, 'bundled');
  const after = await readFile(f.statePath, 'utf8');
  assert.deepEqual(parseState(after, f.statePath).fields, before.fields);
  assert.deepEqual(await readFeedbackFinalization(f.statePath, f.binding), receipt);
  assert.equal(await readFile(path.join(f.dir, 'approved-package.json'), 'utf8'), '{"approved":true}');
  assert.match(await readFile(f.statePath.replace('-state.md', '-status.html'), 'utf8'), /Estimated implementation cost/);
  // Reuse must work even if the original archive can no longer be read.
  await rm(path.join(f.dir, 'miw-session-debug.zip'));
  assert.deepEqual(runCostCli(f.statePath, '1', preload), result);
  assert.equal(await readFile(result.resultPath, 'utf8'), snapshot);
  assert.equal(await readFile(f.statePath, 'utf8'), after);
  const optedOutHtml = spawnSync(process.execPath, [fileURLToPath(new URL('./render-status.mjs', import.meta.url)), '--state', f.statePath], {
    env: { ...process.env, MIW_ESTIMATE_COST: '0' }, encoding: 'utf8', timeout: 10000,
  });
  assert.ifError(optedOutHtml.error);
  assert.equal(optedOutHtml.status, 0, optedOutHtml.stderr);
  assert.match(await readFile(f.statePath.replace('-state.md', '-status.html'), 'utf8'), /Estimated implementation cost/);
});

test('importing the cost facade and renderer in fresh processes has no CLI output or calculation', () => {
  const cost = new URL('./implementation-cost.mjs', import.meta.url).href;
  const renderer = new URL('./render-status.mjs', import.meta.url).href;
  for (const imports of [[cost, renderer], [renderer, cost]]) {
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval',
      imports.map(url => `await import(${JSON.stringify(url)});`).join('\n')], {
      env: { ...process.env, MIW_ESTIMATE_COST: '1' }, encoding: 'utf8', timeout: 10000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
});

test('dashboard without a cost snapshot never promises a pending estimate or creates a cost file', async t => {
  for (const finalized of [false, true]) {
    const f = await fixture(t, { finalized, archived: false });
    const html = await readFile(await generateDashboard(f.statePath), 'utf8');
    assert.doesNotMatch(html, /Cost available after completion|Estimated implementation cost|Calculating cost/);
    assert.ok(!(await readdir(f.dir)).some(name => /implementation-cost/.test(name)));
  }
});

test('explicit disable is respected and cost accounting does not run before feedback finalization', async t => {
  const f = await fixture(t, { finalized: false }); let calls = 0;
  const before = await readFile(f.statePath, 'utf8');
  assert.equal((await calculateImplementationCost(f.statePath, { enabled: false })).status, 'disabled');
  assert.equal((await calculateImplementationCost(f.statePath, { enabled: true, compute: () => { calls++; } })).status, 'not-finalized');
  assert.equal(calls, 0); assert.equal(await readFile(f.statePath, 'utf8'), before);
});

test('real ZIP/worker path saves once, records audit, and preserves workflow fields, approval and feedback receipt', async t => {
  const f = await fixture(t);
  const before = parseState(await readFile(f.statePath, 'utf8'), f.statePath);
  const receipt = await readFeedbackFinalization(f.statePath, f.binding);
  const result = await calculateImplementationCost(f.statePath, { enabled: true, compute: offlineCompute });
  assert.equal(result.status, 'partial'); assert.ok(Math.abs(result.usd - 0.0045) < 1e-10); assert.ok(result.archiveSha256);
  const after = parseState(await readFile(f.statePath, 'utf8'), f.statePath);
  assert.deepEqual(after.fields, before.fields); assert.equal(feedbackStateHash(after.fields, after.audit), f.binding.stateHash);
  assert.equal(after.audit.filter(r => r.note?.id.startsWith('cost-start:')).length, 1);
  assert.equal(after.audit.filter(r => r.note?.id.startsWith('cost-result:')).length, 1);
  assert.deepEqual(await readFeedbackFinalization(f.statePath, f.binding), receipt);
  assert.equal(await readFile(path.join(f.dir, 'approved-package.json'), 'utf8'), '{"approved":true}');
  const saved = await readFile(f.statePath, 'utf8');
  const reused = await calculateImplementationCost(f.statePath, { enabled: true, compute: () => { throw new Error('Must not recalculate'); } });
  assert.deepEqual(reused, result); assert.equal(await readFile(f.statePath, 'utf8'), saved);
  const html = await readFile(await generateDashboard(f.statePath), 'utf8');
  assert.match(html, /Estimated implementation cost/); assert.match(html, /\(partial\)/);
});

test('missing archive, calculator failure and timeout settle without changing completion or feedback', async t => {
  for (const mode of ['missing', 'failure', 'timeout']) {
    const f = await fixture(t, { archived: mode !== 'missing' });
    const result = await calculateImplementationCost(f.statePath, { enabled: true,
      compute: mode === 'timeout' ? input => computeCost(input, 1) : () => { throw new Error('bad calculator'); } });
    assert.equal(result.status, 'unavailable'); assert.equal(result.usd, null);
    assert.equal(parseState(await readFile(f.statePath, 'utf8')).fields.status, 'Complete');
    assert.equal((await readFeedbackFinalization(f.statePath, f.binding)).status, 'saved');
    assert.equal((await readImplementationCost(f.statePath, f.state)).status, 'unavailable');
  }
});

test('stale interrupted calculation never leaves a permanent spinner or recalculates', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.dir, 'implementation-cost.json'), JSON.stringify({ version: 1, ...f.binding, status: 'calculating', startedAt: '2026-01-03T10:07:00Z' }));
  const result = await calculateImplementationCost(f.statePath, { enabled: true, compute: () => { throw new Error('must not recalculate'); } });
  assert.equal(result.status, 'unavailable'); assert.match(result.reason, /interrupted/);
});

test('corrupt cost details cannot break dashboard generation and stale results cannot bind to a new boundary', async t => {
  const f = await fixture(t);
  const file = path.join(f.dir, 'implementation-cost.json');
  const result = { version: 1, ...f.binding, status: 'partial', usd: 1, startedAt: new Date().toISOString(), models: { broken: { usd: 'bad' } } };
  await writeFile(file, JSON.stringify(result));
  assert.equal(await readImplementationCost(f.statePath, f.state), null);
  assert.ok(await generateDashboard(f.statePath));
  await writeFile(file, JSON.stringify({ ...result, models: {}, runId: 'different-run' }));
  assert.equal(await readImplementationCost(f.statePath, f.state), null);
});

test('delivery already offered is not reopened by enabling optional accounting later', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.dir, 'DEMO-delivery-progress.json'), JSON.stringify({ version: 1, ticket: 'DEMO', repos: {}, status: 'offered' }));
  const before = await readFile(f.statePath, 'utf8');
  const result = await calculateImplementationCost(f.statePath, { enabled: true, compute: () => { throw new Error('Must not run'); } });
  assert.equal(result.status, 'skipped'); assert.equal(await readFile(f.statePath, 'utf8'), before);
});

test('new prefixed runs save the cost artifact using their established naming convention', async t => {
  const f = await fixture(t, { finalized: false, archived: false });
  const prefixed = path.join(f.dir, 'miw-DEMO-state.md');
  await writeFile(path.join(f.dir, 'miw-run.json'), '{"artifact_naming_version":1}');
  await writeFile(prefixed, (await readFile(f.statePath, 'utf8')).replace('ticket: DEMO', 'ticket: DEMO\nartifact_naming_version: 1'));
  const state = parseState(await readFile(prefixed, 'utf8'), prefixed);
  const binding = { runId: state.fields.start_time, stateHash: feedbackStateHash(state.fields, state.audit) };
  await finalizeFeedback(prefixed, { ...binding, status: 'unavailable', reason: 'Fixture feedback unavailable' }, { refresh: false });
  const result = await calculateImplementationCost(prefixed, { enabled: true });
  assert.equal(result.status, 'unavailable');
  assert.equal(JSON.parse(await readFile(path.join(f.dir, 'miw-implementation-cost.json'), 'utf8')).status, 'unavailable');
});

test('eligible retry-limit stops retain stopped behavior when optional cost is unavailable', async t => {
  const f = await fixture(t, { finalized: false, archived: false });
  await writeFile(f.statePath, (await readFile(f.statePath, 'utf8')).replace('status: Complete', 'status: Stopped')
    .replace('phase: complete', 'phase: review').replace('pause_reason: none', 'pause_reason: review retry limit exhausted')
    .replace('| final-sync | complete | Complete |', '| final-sync | review | Review retry limit exhausted |'));
  const state = parseState(await readFile(f.statePath, 'utf8'), f.statePath);
  const binding = { runId: state.fields.start_time, stateHash: feedbackStateHash(state.fields, state.audit) };
  await finalizeFeedback(f.statePath, { ...binding, status: 'unavailable', reason: 'Fixture feedback unavailable' }, { refresh: false });
  const before = state.fields;
  assert.equal((await calculateImplementationCost(f.statePath, { enabled: true })).status, 'unavailable');
  assert.deepEqual(parseState(await readFile(f.statePath, 'utf8')).fields, before);
  assert.equal((await readFeedbackFinalization(f.statePath, binding)).status, 'unavailable');
});

test('rendering shows cost progress below Finalizing, retains feedback and settles cost in the green box', async t => {
  const f = await fixture(t);
  const template = '{{PHASE_TIMELINE}} {{STATUS_PANEL}} {{AUTO_REFRESH}} {{WORKFLOW_HEADER}} {{SESSION_TIMING}}';
  const base = { state: f.state, template, logoBase64: '', feedback: { status: 'saved', finalizedAt: '2026-01-03T10:07:00Z' },
    usageSnapshot: { estimated_cost_usd: 999 }, now: Date.parse('2026-01-03T10:08:00Z') };
  const pending = renderStatus({ ...base, cost: { status: 'calculating' } });
  assert.match(pending, /phase-mode[^>]*>Calculating cost…/); assert.match(pending, /current spinning/);
  assert.match(pending, /content="15"/); assert.doesNotMatch(pending, /Estimated session cost|999/);
  const settled = renderStatus({ ...base, cost: { status: 'partial', usd: 1.23, finishedAt: '2026-01-03T10:08:00Z', limitations: ['Missing child <data>'] } });
  assert.match(settled, /Estimated implementation cost<\/dt><dd>~\$1.23 \(partial\)/);
  assert.match(settled, /Missing child &lt;data&gt;/); assert.doesNotMatch(settled, /current spinning|Calculating cost/);
  assert.match(settled, /Elapsed time \(includes waits and pauses\): 8m\./);
});
