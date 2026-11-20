import { artifactJoin } from './lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { canonicalToken, parseScope, regressionReport, runRegression, scopedCommand } from './regression.mjs';
const node = (code) => ({ bin: process.execPath, args: ['-e', code] });
const run = (cwd, code, extra = {}) => ({ repo: 'app', cwd, scope: 'full', command: node(code), ...extra });
test('scope grammar strips flags, canonicalizes exact IDs and refuses UC prefix collisions', () => {
  assert.equal(parseScope(['--autopilot', 'full']).mode, 'full');
  assert.equal(parseScope(['app:UC-1', 'full:app']).tokens.length, 2);
  assert.throws(() => parseScope(['full', 'app:UC-1']), /Unrecognized/);
  assert.equal(canonicalToken('app', 'UC-1', ['uc-10-ten', 'uc-01-one']), 'app:UC-01');
  assert.equal(canonicalToken('app', 'UC-2', ['uc-20-twenty']), null);
});
test('supported wrappers forward selectors and unknown wrappers fail closed', () => {
  assert.deepEqual(scopedCommand({ bin: 'npm', args: ['test', '--'] }, ['test/a.js', 'test/a.js'], 'npm').args, ['test', '--', 'test/a.js']);
  assert.deepEqual(scopedCommand({ bin: 'python3', args: ['-m', 'pytest'] }, ['test/a.py'], 'pytest').args, ['-m', 'pytest', '--', 'test/a.py']);
  assert.throws(() => scopedCommand({ bin: 'make', args: ['test'] }, ['a.js'], 'npm'), /Unsupported/);
  assert.throws(() => scopedCommand({ bin: 'npm', args: ['test'] }, ['--all'], 'npm'), /safe/);
});
test('real commands determine aggregate pass/fail by exit codes, regardless of misleading output', async () => {
  const result = await runRegression({ version: 1, mode: 'tokens', runs: [run(os.tmpdir(), 'console.log("FAIL");'), run(os.tmpdir(), 'console.log("PASS");process.exit(2)', { repo: 'other' })] });
  assert.equal(result.runs[0].result, 'pass'); assert.equal(result.runs[1].exit_code, 2); assert.equal(result.overall, 'fail');
  assert.match(regressionReport(result), /Overall gate result: FAIL/);
});
test('unavailable prerequisites and missing commands produce no result, never a false pass', async () => {
  const result = await runRegression({ version: 1, mode: 'tokens', runs: [run(os.tmpdir(), 'process.exit(99)', { prerequisites: { env: ['MISSING'] } }), run(os.tmpdir(), '', { command: null })] }, { env: {} });
  assert.equal(result.overall, null); assert.equal(result.not_run.length, 2); assert.doesNotMatch(regressionReport(result), /Gate result:/);
  const workspace = await runRegression({ version: 1, mode: 'full', workspace: true, runs: [run(os.tmpdir(), '', { command: null }), run(os.tmpdir(), '')] });
  assert.equal(workspace.overall, 'fail'); assert.equal(workspace.runs.length, 2);
});
test('scoped node tests run selected files only and merge equivalent selections', async (t) => {
  const cwd = await mkdtemp(artifactJoin(os.tmpdir(), 'regression-runner-')); t.after(() => rm(cwd, { recursive: true, force: true }));
  await writeFile(artifactJoin(cwd, 'pass.test.mjs'), 'import test from "node:test";test("pass",()=>{});');
  await writeFile(artifactJoin(cwd, 'fail.test.mjs'), 'throw new Error("must not run");');
  const selected = { repo: 'app', cwd, command: { bin: process.execPath, args: ['--test'] }, scope: 'scoped', adapter: 'node', selectors: ['pass.test.mjs'] };
  const result = await runRegression({ version: 1, mode: 'tokens', runs: [selected, selected] });
  assert.equal(result.overall, 'pass'); assert.equal(result.runs.length, 1);
});
test('timeouts, launch failures and unavailable services remain distinct from a passing run', async () => {
  const timed = await runRegression({ version: 1, mode: 'full', runs: [run(os.tmpdir(), 'setTimeout(()=>{},1000)', { timeout_ms: 20 })] });
  assert.equal(timed.overall, 'fail'); assert.equal(timed.runs[0].timed_out, true);
  const unavailable = await runRegression({ version: 1, mode: 'full', runs: [run(os.tmpdir(), '', { prerequisites: { services: [{ name: 'db', command: node('process.exit(1)') }] } })] });
  assert.equal(unavailable.overall, null); assert.match(unavailable.not_run[0].reason, /db unavailable/);
});
test('unexecuted full requests retain the mixed report mode and malformed prerequisites fail before any run', async () => {
  const result = await runRegression({ version: 1, mode: 'tokens', runs: [run(os.tmpdir(), '', { command: null })] });
  assert.match(regressionReport(result), /Mode: Scoped \+ full/); assert.equal(result.overall, null);
  await assert.rejects(runRegression({ version: 1, mode: 'full', runs: [run(os.tmpdir(), '', { prerequisites: { env: 'not-an-array' } })] }), /Malformed prerequisites/);
});

test('documented prerequisite manifest executes and shell-string service checks are rejected', async t => {
  const cwd = await mkdtemp(artifactJoin(os.tmpdir(), 'regression-example-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const doc = await readFile(new URL('../docs/regression-runner.md', import.meta.url), 'utf8');
  const example = JSON.parse(doc.match(/<!-- workflow-findings: structured-prerequisite-example -->\s*```json\n([\s\S]*?)\n```/)[1]);
  example.runs[0].cwd = cwd; // Only substitute the documented absolute-root placeholder.
  const result = await runRegression(example);
  assert.equal(result.overall, 'pass'); assert.match(result.runs[0].output_tail, /suite passed/);
  example.runs[0].prerequisites.services[0].command = 'node -e "process.exit(0)"';
  await assert.rejects(runRegression(example), /Command must be structured argv/);
});

test('WF-021 reproduction: CLI buffers a noisy child until timeout; a quiet healthy run still passes', async t => {
  const cwd = await mkdtemp(artifactJoin(os.tmpdir(), 'regression-buffering-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const input = artifactJoin(cwd, 'manifest.json'), ready = artifactJoin(cwd, 'ready');
  const code = `console.log('child is producing output');require('node:fs').writeFileSync(${JSON.stringify(ready)},'ready');setInterval(()=>console.log('still running'),100);`;
  await writeFile(input, JSON.stringify({ version: 1, mode: 'full', runs: [run(cwd, code, { timeout_ms: 2000 })] }));
  const child = spawn(process.execPath, [new URL('./regression.mjs', import.meta.url).pathname, 'run', '--input', input], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const closed = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', code => resolve(code)); });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  let started = false;
  for (let n = 0; n < 400; n++) {
    try { await readFile(ready); started = true; break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.ok(started, `child never started: ${stderr}`);
  assert.equal(stdout, '', 'empty redirected CLI output can hide an actively printing child');
  await closed;
  const result = JSON.parse(stdout);
  assert.equal(result.overall, 'fail'); assert.equal(result.runs[0].timed_out, true);
  assert.match(result.runs[0].output_tail, /child is producing output/);
  const quiet = await runRegression({ version: 1, mode: 'full', runs: [run(cwd, 'setTimeout(()=>{},100)', { timeout_ms: 2000 })] });
  assert.equal(quiet.overall, 'pass'); assert.equal(quiet.runs[0].output_tail, '');
});
