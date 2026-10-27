import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { executionControl, mutateExecution } from './step-control.mjs';
import { parseSteps, nextBatch } from '../../../scripts/lib/plan.mjs';
import { validateVerification } from '../../implement/scripts/verification.mjs';

const plan = (parallel = false) => `# Plan\n\n## Execution Status\n\n**Mode:** Inline — execute here.\n\n**Progress:** Step 0 of 2 complete.\n\n## Steps\n\n### Step 1 — First\n\n- **Files:** \`src/a.js\`\n- **Depends on:** none\n- **Can run in parallel with:** ${parallel ? '2' : 'none'}\n\n**Verify:** Check A.\n\n### Step 2 — Second\n\n- **Files:** \`src/b.js\`\n- **Depends on:** ${parallel ? 'none' : '1'}\n- **Can run in parallel with:** ${parallel ? '1' : 'none'}\n\n**Verify:** Check B.\n\n## Test Plan\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 | A works |\n| AC2 | B works |\n`;
const evidence = (number) => ({ number, checks: [{ type: 'automated', subject: number === 1 ? 'A works' : 'B works', command: 'node --test', result: 'pass', note: 'Actual check passed.' }] });
async function fixture(t, parallel = false) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'step-control-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'DEMO-plan.md'); await writeFile(file, plan(parallel));
  const options = { ledgerPath: path.join(root, 'DEMO-verification-v1.json'), ticket: 'DEMO', planVersion: 1 };
  return { file, options, run: (event) => executionControl(file, event, options) };
}
test('parses dependencies and conservatively batches only mutually marked disjoint steps', () => {
  assert.deepEqual(nextBatch(parseSteps(plan()), 0, true), [1]);
  assert.deepEqual(nextBatch(parseSteps(plan(true)), 0, true), [1, 2]);
  assert.deepEqual(nextBatch(parseSteps(plan(true).replace('src/b.js', 'src/a.js')), 0, true), [1]);
  assert.throws(() => parseSteps(plan().replace('**Depends on:** none', '**Depends on:** 2')), /later step/);
});
test('persists attempts across invocations and refuses a sixth attempt or later dispatch', async (t) => {
  const { run } = await fixture(t);
  for (let n = 1; n <= 5; n += 1) assert.equal((await run({ action: 'begin-attempt', id: `fix-${n}`, step: 1 })).attempts[1], n);
  assert.equal((await run({ action: 'begin-attempt', id: 'fix-5', step: 1 })).attempts[1], 5);
  await assert.rejects(run({ action: 'begin-attempt', id: 'fix-6', step: 1 }), /sixth/);
  await run({ action: 'stop', reason: 'retry-limit' });
  await assert.rejects(run({ action: 'begin-attempt', id: 'later', step: 2 }), /stopped/);
  assert.deepEqual((await run({ action: 'inspect' })).next, []);
});
test('evidence is persisted before Progress, resume validates it, and exact completion retries are idempotent', async (t) => {
  const { file, options, run } = await fixture(t);
  await assert.rejects(run({ action: 'complete', steps: [{ number: 1, checks: [] }] }), /passing evidence/);
  const event = { action: 'complete', steps: [evidence(1)] };
  await run(event);
  assert.match(await readFile(file, 'utf8'), /Step 1 of 2 complete/);
  assert.equal(JSON.parse(await readFile(options.ledgerPath)).acceptance[0].status, 'automated');
  assert.equal((await run(event)).replayed, true);
  assert.deepEqual((await run({ action: 'inspect' })).next, [2]);
  await writeFile(options.ledgerPath, JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, steps: [], gate: null, acceptance: [] }));
  await assert.rejects(run({ action: 'inspect' }), /no evidence/);
});
test('a failed batch leaves both Progress and evidence unchanged; successful batches advance together', async (t) => {
  const { file, options, run } = await fixture(t, true);
  const bad = evidence(2); bad.checks[0].result = 'fail';
  await assert.rejects(run({ action: 'complete', steps: [evidence(1), bad] }), /Every batch member/);
  assert.match(await readFile(file, 'utf8'), /Step 0 of 2 complete/);
  await assert.rejects(readFile(options.ledgerPath), /ENOENT/);
  assert.equal((await run({ action: 'complete', steps: [evidence(1), evidence(2)] })).completed, 2);
});
test('guardrails preempt retry counting and changes to a plan invalidate its journal', async (t) => {
  const { file, run } = await fixture(t);
  await run({ action: 'stop', reason: 'guardrail' });
  await assert.rejects(run({ action: 'complete', steps: [evidence(1)] }), /stopped/);
  await writeFile(file, plan().replace('Check A.', 'Different check.'));
  await assert.rejects(run({ action: 'inspect' }), /changed plan/);
});
test('attempts cannot skip sequential steps', () => {
  const journal = { version: 1, attempts: {}, stopped: null };
  assert.throws(() => mutateExecution(journal, { action: 'begin-attempt', id: 'skip', step: 2 }, parseSteps(plan(true)), 0), /eligible batch/);
});
test('append-only fix amendments preserve completed evidence while changed prior steps are rejected', async (t) => {
  const { file, options, run } = await fixture(t);
  await run({ action: 'complete', steps: [evidence(1)] });
  await run({ action: 'complete', steps: [evidence(2)] });
  const prior = JSON.parse(await readFile(options.ledgerPath, 'utf8'));
  prior.gate = { mode: 'full-suite', result: 'pass', note: 'Pre-amendment suite passed.' };
  await writeFile(options.ledgerPath, JSON.stringify(prior));
  let amended = (await readFile(file, 'utf8')).replace('of 2 complete', 'of 3 complete').replace('## Test Plan', '### Step 3 — Fix\n\n- **Files:** `src/c.js`\n- **Depends on:** 2\n- **Can run in parallel with:** none\n\n**Verify:** Fixed behavior.\n\n## Test Plan');
  await writeFile(file, amended);
  assert.deepEqual((await run({ action: 'inspect' })).next, [3]);
  assert.equal(JSON.parse(await readFile(options.ledgerPath, 'utf8')).gate, null);
  await run({ action: 'complete', steps: [evidence(3)] });
  const finished = JSON.parse(await readFile(options.ledgerPath, 'utf8'));
  assert.throws(() => validateVerification(finished, { ticket: 'DEMO', planVersion: 1, plan: amended, outcome: 'PASSED' }), /gate evidence/);
  amended = amended.replace('Check A.', 'Changed A.'); await writeFile(file, amended);
  await assert.rejects(run({ action: 'inspect' }), /changed plan/);
});
test('retrying completion after a failed dashboard render still requires rendering to recover', async (t) => {
  const { file, options, run } = await fixture(t);
  const event = { action: 'complete', steps: [evidence(1)] };
  await assert.rejects(executionControl(file, event, { ...options, dashboardState: `${file}.missing-state.md` }), /ENOENT/);
  assert.match(await readFile(file, 'utf8'), /Step 1 of 2 complete/);
  await assert.rejects(executionControl(file, event, { ...options, dashboardState: `${file}.missing-state.md` }), /ENOENT/);
  assert.equal((await run(event)).replayed, true);
});
test('explicit user guidance can resolve a stopped invocation while preserving its history', async (t) => {
  const { file, run } = await fixture(t);
  await run({ action: 'begin-attempt', id: 'first-fix', step: 1 });
  await run({ action: 'stop', reason: 'guardrail' });
  await assert.rejects(run({ action: 'resolve-stop', reason: 'Guessed default' }), /explicit user/);
  await writeFile(file, plan().replace('Check A.', 'Check clarified A.'));
  const resolved = await run({ action: 'resolve-stop', source: 'user', via: 'chat', reason: 'Confirmed expected behavior; retry this step.' });
  assert.equal(resolved.stopped, null); assert.equal(resolved.history.length, 1);
  assert.equal((await run({ action: 'begin-attempt', id: 'new-fix', step: 1 })).attempts[1], 1);
});
test('verification writes cannot target an unrelated source file', async (t) => {
  const { file, options } = await fixture(t);
  const source = path.join(path.dirname(file), 'source.js'); await writeFile(source, 'original source');
  await assert.rejects(executionControl(file, { action: 'complete', steps: [evidence(1)] }, { ...options, ledgerPath: source }), /ledger must match/);
  assert.equal(await readFile(source, 'utf8'), 'original source');
});
