import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { captureCommand } from './command-evidence.mjs';
import { runCommand } from './regression.mjs';

const node = code => ({ bin: process.execPath, args: ['-e', code] });
const hash = value => createHash('sha256').update(value).digest('hex');
const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
async function fixture(t, phase = 'execute') {
  const base = await realpath(await mkdtemp(path.join(os.tmpdir(), 'command-capture-')));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = path.join(base, 'private'), repo = path.join(base, 'source');
  await mkdir(repo); await mkdir(path.join(root, 'make-it-work', 'DEMO'), { recursive: true });
  git(repo, 'init', '-q', '-b', 'feedback-test');
  await writeFile(path.join(repo, '.gitignore'), '/make-it-work/\n');
  await writeFile(path.join(repo, 'source.txt'), 'initial\n');
  git(repo, 'add', '.gitignore', 'source.txt');
  git(repo, '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Initial');
  const state = path.join(root, 'make-it-work', 'DEMO', 'DEMO-state.md');
  const adaptive = phase === 'lightweight' ? '\nadaptive_version: 1\nrisk: low\nmode: lightweight\nmode_source: assessed\nrisk_rationale: Isolated fixture\nescalations: 0\nimplementation_report: none' : '';
  const original = (await readFile('evals/implement/feedback-clean/fixture/fixture-artifacts/DEMO-state.md', 'utf8'))
    .replace('phase: final-sync', `phase: ${phase}${adaptive}\nworkspace_snapshot: ${JSON.stringify([{ root: repo, branch: 'feedback-test' }])}`);
  await writeFile(state, original);
  const capture = (command, extra = {}) => captureCommand({ root, state, repo, input: { version: 1, command, ...extra } });
  return { base, root, repo, state, original, capture };
}

test('full binary streams, dirty source identity and actual nonzero exit survive a misleading success footer', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.repo, 'source.txt'), 'uncommitted\n');
  const stdout = Buffer.from('שלום 🌍\n'.repeat(9000) + 'SUCCESS\n');
  const stderr = Buffer.from('diagnostic\n'.repeat(5000));
  const result = await f.capture(node(`const b=Buffer.from('שלום 🌍\\n'.repeat(9000)+'SUCCESS\\n');process.stdout.write(b.subarray(0,1));setImmediate(()=>{process.stdout.write(b.subarray(1));process.stderr.write('diagnostic\\n'.repeat(5000));process.exitCode=7;});`));
  assert.equal(result.process.exit_code, 7); assert.equal(result.process.result, 'fail');
  assert.equal(result.process.output_truncated, true);
  assert.equal(result.process.output_bytes, stdout.length + stderr.length);
  assert.equal(result.capture_complete, true); assert.equal(result.record_saved, true);
  assert.equal(result.source_unchanged, true); assert.equal(result.before.head, git(f.repo, 'rev-parse', 'HEAD'));
  assert.equal(result.baseline, 'unknown'); assert.equal(result.destination_provenance, 'unknown');
  for (const [name, expected] of Object.entries({ stdout, stderr })) {
    const stream = result.streams[name], file = path.join(f.root, stream.path);
    assert.deepEqual(await readFile(file), expected);
    assert.equal(stream.sha256, hash(expected)); assert.equal(stream.bytes, expected.length);
    assert.equal((await stat(file)).mode & 0o777, 0o600);
  }
  assert.equal((await stat(result.record)).mode & 0o777, 0o600);
  const saved = JSON.parse(await readFile(result.record, 'utf8'));
  assert.equal(saved.process.exit_code, 7);
  assert.equal(await readFile(f.state, 'utf8'), f.original, 'capture does not alter workflow state');
  const baseline = await f.capture(node(''));
  await writeFile(path.join(f.repo, 'source.txt'), 'different uncommitted bytes\n');
  const changed = await f.capture(node(''));
  assert.notEqual(changed.before.fingerprint, baseline.before.fingerprint);
  assert.equal(changed.before.head, baseline.before.head);
});

test('source mutation, timeout, executable startup failure and wrapper exit remain distinct', async t => {
  const f = await fixture(t, 'lightweight');
  const mutation = await f.capture(node('require("fs").writeFileSync("source.txt","changed by command");'));
  assert.equal(mutation.source_unchanged, false); assert.equal(mutation.process.result, 'pass');
  const timeout = await f.capture(node('process.stdout.write("partial");setTimeout(()=>{},10000);'), { timeout_ms: 2000 });
  assert.equal(timeout.process.timed_out, true); assert.equal(timeout.process.result, 'fail');
  assert.equal(timeout.capture_complete, true, 'complete output capture does not mean completed validation');
  const missing = await f.capture({ bin: path.join(f.repo, 'missing-command'), args: [] });
  assert.notEqual(missing.process.exit_code, 0); assert.match(missing.process.error, /ENOENT/);
  assert.equal(missing.process.result, 'fail'); assert.equal(missing.baseline, 'unknown');
  const wrapper = await f.capture(node('process.exitCode=127'));
  assert.equal(wrapper.process.exit_code, 127); assert.equal(wrapper.process.error, null);
  assert.equal(wrapper.status, 'finished');
});

test('output observer failure is advisory and cannot change the actual child result or cause a retry', async t => {
  const f = await fixture(t);
  for (const exit of [0, 3]) {
    let writes = 0;
    const result = await runCommand(node(`process.stdout.write('bytes');process.exitCode=${exit}`), f.repo, {
      onOutput: async () => { writes++; throw new Error(exit === 0 ? '' : 'simulated disk write failure'); },
    });
    assert.equal(result.exit_code, exit); assert.equal(result.result, exit === 0 ? 'pass' : 'fail');
    assert.match(result.output_capture_error, exit === 0 ? /Output observer failed/ : /disk write failure/); assert.equal(writes, 1);
  }
});

test('parallel captures have separate files and CLI preserves literal argv and a failing child exit', async t => {
  const f = await fixture(t);
  const results = await Promise.all([f.capture(node('console.log("one")')), f.capture(node('console.log("two")'))]);
  const files = results.flatMap(result => [result.record, ...Object.values(result.streams).map(stream => stream.path)]);
  assert.equal(new Set(files).size, 6);
  const literal = '`not a command` $(touch SHOULD-NOT-EXIST)';
  const input = path.join(f.base, 'input.json');
  await writeFile(input, JSON.stringify({ version: 1, command: { bin: process.execPath, args: ['-e', 'process.stdout.write(process.argv[1]);process.exitCode=4', literal] } }));
  const cli = spawnSync(process.execPath, [path.resolve('scripts/command-evidence.mjs'), 'run', '--root', f.root, '--state', f.state, '--repo', f.repo, '--input', input], { cwd: f.repo, encoding: 'utf8' });
  assert.equal(cli.status, 4, cli.stderr);
  const progress = cli.stderr.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(progress[0].event, 'started'); assert.equal(progress.at(-1).event, 'finished');
  const result = JSON.parse(cli.stdout);
  assert.equal(result.process.exit_code, 4); assert.equal(result.capture_complete, true);
  assert.equal(await readFile(path.join(f.root, result.streams.stdout.path), 'utf8'), literal);
  await assert.rejects(stat(path.join(f.repo, 'SHOULD-NOT-EXIST')), { code: 'ENOENT' });
});

test('invalid scope, phase, branch, symlink cwd and malformed input reject before execution', async t => {
  const f = await fixture(t);
  const marker = path.join(f.repo, 'ran');
  const input = { version: 1, command: node('require("fs").writeFileSync("ran","yes");') };
  await assert.rejects(captureCommand({ ...f, repo: f.base, input }), /repository scope/);
  await assert.rejects(f.capture(input.command, { cwd: '..' }), /escapes/);
  await symlink(f.base, path.join(f.repo, 'outside'));
  await assert.rejects(f.capture(input.command, { cwd: 'outside' }), /escapes/);
  await assert.rejects(f.capture(input.command, { timeout_ms: 0 }), /timeout/);
  await writeFile(f.state, f.original.replace('phase: execute', 'phase: review'));
  await assert.rejects(f.capture(input.command), /active Execute/);
  await writeFile(f.state, f.original.replace('branch: feedback-test', 'branch: other').replace('"branch":"feedback-test"', '"branch":"other"'));
  await assert.rejects(f.capture(input.command), /branch differs/);
  await assert.rejects(stat(marker), { code: 'ENOENT' });
});

test('a failed result save retains the observed process result without running the command again', async t => {
  const f = await fixture(t);
  const directory = path.dirname(f.state);
  const code = `const fs=require('fs'),path=require('path');const dir=${JSON.stringify(directory)};const file=fs.readdirSync(dir).find(n=>n.includes('command-capture')&&n.endsWith('.json'));if(JSON.parse(fs.readFileSync(path.join(dir,file))).status!=='started')throw new Error('missing start record');fs.unlinkSync(path.join(dir,file));fs.mkdirSync(path.join(dir,file));fs.appendFileSync('once.txt','once\\n');`;
  const result = await f.capture(node(code));
  assert.equal(result.process.exit_code, 0); assert.equal(result.process.result, 'pass');
  assert.equal(result.record_saved, false); assert.equal(result.capture_complete, false);
  assert.match(result.warnings.join(' '), /could not be finalized/);
  assert.equal(await readFile(path.join(f.repo, 'once.txt'), 'utf8'), 'once\n');
});

test('workspace captures retain saved repo IDs and reject an invalid managed worktree binding', async t => {
  const f = await fixture(t);
  const contract = { artifact_root: f.root, checkout: 'here', repos: [{ id: 'app', root: f.repo, branch: 'feedback-test' }] };
  const state = f.original.replace('phase: execute', `phase: execute\nworkspace_version: 1\nworkspace_contract: ${JSON.stringify(contract)}`);
  await writeFile(f.state, state);
  const result = await f.capture(node(''));
  assert.equal(result.repo.id, 'app'); assert.equal(result.repo.root, f.repo);
  await writeFile(f.state, state.replace('"checkout":"here"', '"checkout":"worktree"'));
  await assert.rejects(f.capture(node('require("fs").writeFileSync("should-not-run","bad")')), /binding changed/);
  await assert.rejects(stat(path.join(f.repo, 'should-not-run')), { code: 'ENOENT' });
});

test('same-root legacy and marked captures keep private logs out of source identity without changing saved state', async t => {
  const f = await fixture(t);
  const directory = path.join(f.repo, 'make-it-work', 'DEMO'); await mkdir(directory, { recursive: true });
  const state = path.join(directory, 'DEMO-state.md'); await writeFile(state, f.original);
  for (const marked of [false, true]) {
    if (marked) await writeFile(path.join(directory, 'miw-run.json'), '{"artifact_naming_version":1}');
    const result = await captureCommand({ root: f.repo, state, repo: f.repo, input: { version: 1, command: node('console.log("captured")') } });
    assert.equal(result.source_unchanged, true); assert.equal(result.capture_complete, true);
    assert.equal(path.basename(result.record).startsWith('miw-'), marked);
    assert.equal(git(f.repo, 'status', '--porcelain'), '');
    assert.equal(await readFile(state, 'utf8'), f.original);
  }
});

test('a replaced output path is incomplete capture and cannot overwrite the symlink target', async t => {
  const f = await fixture(t), directory = path.dirname(f.state);
  const code = `const fs=require('fs'),path=require('path');const dir=${JSON.stringify(directory)};const name=fs.readdirSync(dir).find(n=>n.includes('command-stdout')&&n.endsWith('.txt'));fs.unlinkSync(path.join(dir,name));fs.symlinkSync(${JSON.stringify(path.join(f.repo, 'source.txt'))},path.join(dir,name));process.stdout.write('actual process bytes');`;
  const result = await f.capture(node(code));
  assert.equal(result.process.exit_code, 0); assert.equal(result.capture_complete, false);
  assert.equal(result.streams.stdout.complete, false); assert.equal(result.streams.stdout.sha256, null);
  assert.match(result.warnings.join(' '), /path changed/);
  assert.equal(await readFile(path.join(f.repo, 'source.txt'), 'utf8'), 'initial\n');
});
