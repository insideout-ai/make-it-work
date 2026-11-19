import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runCommand, runRegression, regressionReport } from './regression.mjs';

const node = code => ({ bin: process.execPath, args: ['-e', code] });
const run = (cwd, code, extra = {}) => ({ repo: 'app', cwd, scope: 'full', command: node(code), ...extra });
async function fixture(t) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'gate-progress-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  return cwd;
}

test('quiet and noisy commands emit measured progress without inventing an idle failure', async t => {
  const cwd = await fixture(t);
  for (const code of ['setTimeout(()=>{},200)', 'console.log("private test log");setTimeout(()=>{},200)']) {
    const events = [];
    const result = await runRegression({ version: 1, mode: 'full', runs: [run(cwd, code, { timeout_ms: 5000 })] }, { progressIntervalMs: 30, onProgress: event => { events.push(event); } });
    assert.equal(result.overall, 'pass');
    assert.equal(events[0].event, 'started'); assert.equal(events.at(-1).event, 'finished');
    assert.ok(events.some(event => event.event === 'running'));
    for (const event of events) {
      assert.equal(event.type, 'regression-progress'); assert.equal(event.repo, 'app'); assert.equal(event.stage, 'suite');
      assert.equal(event.timeout_ms, 5000); assert.ok(event.elapsed_ms >= 0);
      assert.equal(event.output_tail, undefined, 'progress never copies raw suite output');
    }
    if (code.startsWith('console')) {
      assert.ok(events.some(event => event.event === 'running' && event.output_bytes > 0 && event.last_output_at));
    } else {
      assert.ok(events.every(event => event.last_output_at === null && event.output_bytes === 0));
    }
    const count = events.length;
    await new Promise(resolve => setTimeout(resolve, 70));
    assert.equal(events.length, count, 'heartbeat stops on completion');
  }
});

test('a timed-out suite retains previous results and partial output without a retry', async t => {
  const cwd = await fixture(t), marker = path.join(cwd, 'ran');
  const result = await runRegression({ version: 1, mode: 'tokens', runs: [
    run(cwd, `require('node:fs').appendFileSync(${JSON.stringify(marker)},'once');`),
    run(cwd, 'console.log("partial failure evidence");setInterval(()=>{},100)', { repo: 'other', timeout_ms: 1500 }),
  ] });
  assert.equal(result.overall, 'fail'); assert.equal(result.runs[0].result, 'pass');
  const timed = result.runs[1];
  assert.equal(timed.timed_out, true); assert.equal(timed.timeout_ms, 1500);
  assert.ok(timed.duration_ms >= 1500); assert.match(timed.output_tail, /partial failure evidence/);
  assert.match(regressionReport(result), /execution incomplete/);
  assert.equal(await readFile(marker, 'utf8'), 'once');
});

test('progress observer failure warns while preserving the actual failing test result', async t => {
  const cwd = await fixture(t);
  const result = await runRegression({ version: 1, mode: 'full', runs: [run(cwd, 'process.exit(2)')] }, {
    onProgress: () => { throw new Error('observer unavailable'); },
  });
  assert.equal(result.overall, 'fail');
  assert.equal(result.runs[0].exit_code, 2);
  assert.match(result.progress_warnings[0], /observer unavailable/);
  assert.match(regressionReport(result), /Progress warning/);
});

test('invalid later timeouts and progress configuration are rejected before any command', async t => {
  const cwd = await fixture(t), marker = path.join(cwd, 'must-not-run');
  const manifest = { version: 1, mode: 'full', runs: [run(cwd, `require('node:fs').writeFileSync(${JSON.stringify(marker)},'bad')`), run(cwd, '', { timeout_ms: 0 })] };
  await assert.rejects(runRegression(manifest), /Invalid test timeout/);
  await assert.rejects(readFile(marker), { code: 'ENOENT' });
  await assert.rejects(runCommand(node(''), cwd, { progressIntervalMs: 0 }), /progress interval/i);
});

test('CLI progress reaches stderr before a suite completes while stdout remains one JSON result', async t => {
  const cwd = await fixture(t), input = path.join(cwd, 'manifest.json');
  await writeFile(input, JSON.stringify({ version: 1, mode: 'full', runs: [run(cwd, 'setTimeout(()=>{},500)', { timeout_ms: 5000 })] }));
  const child = spawn(process.execPath, [new URL('./regression.mjs', import.meta.url).pathname, 'run', '--input', input, '--progress-interval-ms', '30'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  const firstProgress = new Promise(resolve => child.stderr.once('data', resolve));
  child.stderr.on('data', chunk => { stderr += chunk; });
  const closed = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  await Promise.race([firstProgress, closed]);
  assert.equal(stdout, '', 'progress is observable before the result is available');
  assert.equal(await closed, 0);
  assert.equal(JSON.parse(stdout).overall, 'pass');
  const events = stderr.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(events[0].event, 'started'); assert.equal(events.at(-1).event, 'finished');
  assert.ok(events.some(event => event.event === 'running'));
});

test('a broken CLI progress pipe retains passing results and exits successfully without rerunning', async t => {
  const cwd = await fixture(t), input = path.join(cwd, 'manifest.json'), marker = path.join(cwd, 'ran');
  await writeFile(input, JSON.stringify({ version: 1, mode: 'full', runs: [run(cwd, `require('node:fs').appendFileSync(${JSON.stringify(marker)},'once');setTimeout(()=>{},200)`)] }));
  const child = spawn(process.execPath, [new URL('./regression.mjs', import.meta.url).pathname, 'run', '--input', input], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = ''; child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.destroy();
  const exit = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  assert.equal(exit, 0); assert.equal(JSON.parse(stdout).overall, 'pass');
  assert.ok(JSON.parse(stdout).progress_warnings.length);
  assert.equal(await readFile(marker, 'utf8'), 'once');
});

test('prerequisite diagnostics and launch failures remain separate from suite results', async t => {
  const cwd = await fixture(t), events = [];
  const result = await runRegression({ version: 1, mode: 'full', runs: [run(cwd, 'process.exit(99)', {
    prerequisites: { services: [{ name: 'db', command: node('console.error("service unavailable");process.exit(3)') }] },
  })] }, { onProgress: event => { events.push(event); } });
  assert.equal(result.overall, null); assert.equal(result.runs.length, 0);
  assert.equal(result.not_run[0].prerequisite.exit_code, 3);
  assert.match(result.not_run[0].prerequisite.output_tail, /service unavailable/);
  assert.ok(events.every(event => event.stage === 'prerequisite' && event.service === 'db'));
  const missing = await runCommand({ bin: path.join(cwd, 'missing'), args: [] }, cwd, { onProgress: event => { events.push(event); } });
  assert.equal(missing.result, 'fail'); assert.equal(missing.timed_out, false); assert.match(missing.error, /ENOENT/);
  assert.equal(events.at(-1).event, 'finished');
});

test('terminal observer errors and rejected async observers preserve passing results', async t => {
  const cwd = await fixture(t);
  for (const onProgress of [event => { if (event.event === 'finished') throw new Error('terminal observer failed'); }, async () => { throw new Error('async observer failed'); }, () => { throw null; }]) {
    const result = await runRegression({ version: 1, mode: 'full', runs: [run(cwd, '')] }, { onProgress });
    assert.equal(result.overall, 'pass');
    assert.ok(result.progress_warnings.length);
    assert.equal(result.runs.length, 1);
  }
});

test('progress labels and retained output are bounded, and old timeout results remain readable', async t => {
  const cwd = await fixture(t), events = [];
  const code = 'console.log("z".repeat(20000));/*' + 'long command '.repeat(80) + '*/';
  const result = await runRegression({ version: 1, mode: 'full', runs: [run(cwd, code)] }, { onProgress: event => { events.push(event); } });
  assert.equal(result.runs[0].output_truncated, true); assert.equal(result.runs[0].output_tail.length, 16000);
  assert.ok(events.every(event => event.command.length <= 500 && event.command_truncated));
  assert.equal(result.runs[0].command.args[1], code, 'final argv is never shortened');
  const legacy = { mode: 'full', runs: [{ repo: 'app', scope: 'full', command: node(''), result: 'fail', timed_out: true }], not_run: [], unmapped: [], overall: 'fail' };
  const text = regressionReport(legacy);
  assert.match(text, /execution incomplete/); assert.doesNotMatch(text, /undefined/);
});

test('scoped selections with different timeout bounds are not silently merged', async t => {
  const cwd = await fixture(t);
  await writeFile(path.join(cwd, 'pass.test.mjs'), 'import test from "node:test"; test("pass",()=>{});');
  const selected = { repo: 'app', cwd, scope: 'scoped', adapter: 'node', selectors: ['pass.test.mjs'], command: { bin: process.execPath, args: ['--test'] }, timeout_ms: 5000 };
  const result = await runRegression({ version: 1, mode: 'tokens', runs: [selected, { ...selected, timeout_ms: 6000 }, selected] });
  assert.equal(result.overall, 'pass'); assert.deepEqual(result.runs.map(run => run.timeout_ms), [5000, 6000]);
});
