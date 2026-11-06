import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { checkpointLightweightFix, inspectLightweightFix } from './lightweight-fix.mjs';
import { parseState } from './render-status.mjs';
import { applyWorkflow } from './workflow.mjs';

const input = () => ({ findings: [{ id: '#1', failure: 'Nonempty choices gain the fallback.', evidence: 'DIAG-1-initial-failure.txt; src/selection.js:choose', cause: 'choose appends the fallback unconditionally.', next_change: 'Return selected choices when nonempty; otherwise use the fallback.', expected_result: 'Selected-choice assertions pass and the empty case remains green.' }] });
async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'lightweight-checkpoint-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  execFileSync('bash', [fileURLToPath(new URL('../../../evals/implement/diagnosis-lightweight/fixture.sh', import.meta.url))], { cwd: root, env, stdio: 'pipe' });
  const prefix = path.join(root, 'make-it-work/DIAG-1/DIAG-1');
  const statePath = `${prefix}-state.md`, report = `${prefix}-lightweight.md`;
  const inspect = () => inspectLightweightFix(root, statePath);
  const checkpoint = (value = input()) => checkpointLightweightFix(root, statePath, value);
  const notes = async () => parseState(await readFile(statePath, 'utf8')).audit.filter((row) => row.note?.id.startsWith('lightweight-diagnosis-'));
  return { root, statePath, prefix, report, inspect, checkpoint, notes };
}

test('checkpoint requires a real diagnosis and saves it before a resumable, duplicate-safe audit result', async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.inspect(), /Checkpoint the Lightweight fix diagnosis/);
  const original = await readFile(f.report, 'utf8');
  for (const field of Object.keys(input().findings[0])) {
    const value = input(); delete value.findings[0][field];
    await assert.rejects(f.checkpoint(value), /Diagnosis/);
  }
  assert.equal(await readFile(f.report, 'utf8'), original);
  const ready = await f.checkpoint();
  assert.equal(ready.round, 1); assert.equal(ready.report, 'make-it-work/DIAG-1/DIAG-1-lightweight.md');
  assert.match(ready.next_action, /fresh fix subagent/);
  assert.equal((await f.notes()).length, 1);
  await writeFile(f.report, (await readFile(f.report, 'utf8')) + '\n### Changes and checks\nPending execution.\n');
  assert.deepEqual(await f.checkpoint(), ready);
  assert.equal((await f.notes()).length, 1);
  assert.equal(parseState(await readFile(f.statePath, 'utf8')).fields.fix_cycle, '1');
  const changed = input(); changed.findings[0].cause = 'A different unsupported explanation.';
  await assert.rejects(f.checkpoint(changed), /different diagnosis/);
});

test('missing audit evidence blocks resume until the same checkpoint repairs it', async (t) => {
  const f = await fixture(t);
  await f.checkpoint();
  const original = await readFile(f.statePath, 'utf8');
  await writeFile(f.statePath, original.split('\n').filter((line) => !line.includes('id: lightweight-diagnosis-')).join('\n'));
  await assert.rejects(f.inspect(), /Recover.*audit/);
  await f.checkpoint();
  assert.equal((await f.notes()).length, 1);
  assert.equal((await readFile(f.report, 'utf8')).split('<!-- lightweight-fix-diagnosis:1 -->').length, 2);
});

test('a render failure retains both records and identical recovery adds neither a round nor an audit duplicate', async (t) => {
  const f = await fixture(t), html = `${f.prefix}-status.html`;
  await rm(html); await mkdir(html);
  await assert.rejects(f.checkpoint(), /regular file/);
  assert.equal((await f.notes()).length, 1);
  assert.match(await readFile(f.report, 'utf8'), /lightweight-fix-diagnosis:1/);
  await rm(html, { recursive: true });
  await f.checkpoint();
  assert.equal((await f.notes()).length, 1);
  assert.equal((await f.inspect()).round, 1);
});

test('spec, fix-source, round and report bindings prevent reuse of stale diagnoses', async (t) => {
  const f = await fixture(t);
  await f.checkpoint();
  for (const file of [`${f.prefix}-spec.md`, `${f.prefix}-review.md`]) {
    const original = await readFile(file, 'utf8');
    await writeFile(file, original + '\nChanged requirement or finding.\n');
    await assert.rejects(f.inspect(), /stale/);
    await writeFile(file, original);
  }
  await assert.rejects(inspectLightweightFix(f.root, f.statePath, 'another-report.md'), /retain the checkpointed/);
  const state = await readFile(f.statePath, 'utf8');
  await writeFile(f.statePath, state.replace('fix_cycle: 1', 'fix_cycle: 2'));
  await assert.rejects(f.inspect(), /Checkpoint the Lightweight fix diagnosis/);
  await writeFile(f.statePath, state.replace('phase: lightweight', 'phase: review'));
  await assert.rejects(f.checkpoint(), /fix round must be active/);
});

test('controller refuses a completed fix without the checkpoint and accepts it after evidence is saved', async (t) => {
  const f = await fixture(t);
  const handoff = 'make-it-work/DIAG-1/DIAG-1-handoffs/implement-1.json';
  await writeFile(path.join(f.root, handoff), JSON.stringify({ version: 1, ticket: 'DIAG-1', stage: 'implement', plan_version: 1, status: 'done', outcome: 'IMPLEMENTED', artifacts: { report: 'make-it-work/DIAG-1/DIAG-1-lightweight.md' }, data: { changed_paths: ['src/selection.js'], checks: [], discoveries: [], risk_signal: null } }));
  const apply = async () => applyWorkflow({ root: f.root, statePath: f.statePath, input: { event: 'handoff', id: 'fix-done', expected_hash: digest(await readFile(f.statePath, 'utf8')), repos: [f.root], handoff } });
  await assert.rejects(apply(), /Checkpoint the Lightweight fix diagnosis/);
  await f.checkpoint();
  const saved = await readFile(f.report, 'utf8');
  await writeFile(f.report, '# Report accidentally overwritten by executor\n');
  await assert.rejects(apply(), /Checkpoint the Lightweight fix diagnosis/);
  await writeFile(f.report, saved);
  const next = await apply();
  assert.equal(next.fields.phase, 'review');
  assert.equal(next.fields.fix_cycle, '1');
});

test('final feedback is an allowed fix source; unrelated report paths are rejected', async (t) => {
  const f = await fixture(t);
  await writeFile(`${f.prefix}-final-feedback.md`, '# Requested correction\nPreserve the accepted selection behavior.\n');
  await assert.rejects(f.checkpoint({ ...input(), source: 'package.json' }), /review or final feedback/);
  await f.checkpoint({ ...input(), source: 'make-it-work/DIAG-1/DIAG-1-final-feedback.md' });
  assert.equal((await f.inspect()).round, 1);
});
