#!/usr/bin/env node
// Optional local observation only. This does not decide step/gate outcomes or
// propagate qualifications into an approved package.
import { constants } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, open, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { args, cli, fail, jsonInput } from './lib/artifacts.mjs';
import { snapshot } from './lib/repo-state.mjs';
import { checkSessionRepositories } from './lib/session-workspace.mjs';
import { allocateArtifactOutput } from './artifact-output.mjs';
import { command, runCommand } from './regression.mjs';
import { parseState } from '../skills/implement/scripts/render-status.mjs';
import { assertRunState } from '../skills/implement/scripts/artifact-layout.mjs';

async function saveRecord(file, value) {
  if (!(await lstat(file)).isFile()) fail('Capture record must remain a regular file.');
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await rename(temp, file);
  } finally { await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}

export async function captureCommand({ root, state: statePath, repo, input, onProgress }) {
  if (!input || input.version !== 1 || Object.keys(input).some(key => !['version', 'command', 'cwd', 'timeout_ms'].includes(key))) fail('Expected version-1 command capture input.');
  const argv = command(input.command);
  const timeoutMs = input.timeout_ms ?? 300000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 3600000) fail('Invalid command timeout.');
  root = await realpath(root); repo = await realpath(repo); statePath = await realpath(statePath);
  const state = parseState(await readFile(statePath, 'utf8'), statePath), f = state.fields;
  const directory = assertRunState(root, statePath, f.ticket);
  if (f.status !== 'In Progress' || !['execute', 'lightweight'].includes(f.phase)) fail('Command capture requires active Execute or Lightweight implementation.');
  if (!Number.isFinite(Date.parse(f.start_time))) fail('Command capture requires a saved run identity.');
  if (!/^[1-9]\d*$/.test(f.plan_version ?? '')) fail('Command capture requires a valid plan version.');
  const contract = f.workspace_version === '1' ? JSON.parse(f.workspace_contract) : null;
  const selected = contract ? contract.repos
    : f.workspace_snapshot ? JSON.parse(f.workspace_snapshot) : [{ root, branch: f.branch }];
  const approved = selected.find(item => item.root === repo);
  if (!approved) fail('Command repository is outside the saved repository scope.');
  if (contract) await checkSessionRepositories({ ...contract, repos: [approved] });
  if (input.cwd !== undefined && (typeof input.cwd !== 'string' || !input.cwd)) fail('Command cwd must be a nonempty path.');
  const cwd = await realpath(path.resolve(repo, input.cwd ?? '.'));
  if (cwd !== repo && !cwd.startsWith(repo + path.sep)) fail('Command cwd escapes its repository.');
  const allocation = { root, directory: path.relative(root, directory) };
  const record = await allocateArtifactOutput({ ...allocation, name: 'command-capture.json' });
  const streams = {}, warnings = [];
  let result, before;
  try {
    for (const name of ['stdout', 'stderr']) {
      const output = await allocateArtifactOutput({ ...allocation, name: `command-${name}.txt` });
      const handle = await open(output.file, constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW);
      streams[name] = { output, handle, hash: createHash('sha256'), bytes: 0 };
    }
    [before] = await snapshot([repo]);
    if (approved.branch && approved.branch !== before.branch) fail('Command repository branch differs from the saved selection.');
    const started = { version: 1, status: 'started', registered_at: new Date().toISOString(), run_id: f.start_time, ticket: f.ticket, plan_version: Number(f.plan_version),
      repo: { id: approved.id ?? null, root: repo }, cwd, command: argv, before,
      baseline: 'unknown', destination_provenance: 'unknown',
      streams: Object.fromEntries(Object.entries(streams).map(([name, stream]) => [name, { path: stream.output.relative, complete: false }])) };
    await saveRecord(record.file, started);
    result = await runCommand(argv, cwd, { timeoutMs, onProgress, onOutput: async (name, bytes) => {
      await streams[name].handle.writeFile(bytes);
      streams[name].hash.update(bytes);
      streams[name].bytes += bytes.length;
    } });
    if (result.output_capture_error) warnings.push(result.output_capture_error);
    let after = null;
    try { [after] = await snapshot([repo]); }
    catch (error) { warnings.push(`After-command snapshot unavailable: ${error.message}`); }
    const outputs = {};
    for (const [name, stream] of Object.entries(streams)) {
      const saved = await stream.handle.stat();
      let intact = saved.size === stream.bytes;
      if (!intact) warnings.push(`${name} output size differs from the captured byte count.`);
      try {
        const current = await lstat(stream.output.file);
        if (!current.isFile() || current.ino !== saved.ino || current.dev !== saved.dev) { intact = false; warnings.push(`${name} output path changed during capture.`); }
      } catch (error) { intact = false; warnings.push(`${name} output unavailable: ${error.message}`); }
      outputs[name] = { path: stream.output.relative, bytes: saved.size, sha256: result.output_capture_error || !intact ? null : stream.hash.digest('hex'), complete: !result.output_capture_error && intact };
      try { await stream.handle.close(); }
      catch (error) { outputs[name].complete = false; warnings.push(`${name} output close failed: ${error.message}`); }
      stream.closed = true;
    }
    const complete = warnings.length === 0;
    const finished = { ...started, status: 'finished', after,
      source_unchanged: after ? before.head === after.head && before.fingerprint === after.fingerprint : null,
      process: result, streams: outputs, capture_complete: complete, warnings };
    try { await saveRecord(record.file, finished); }
    catch (error) {
      finished.capture_complete = false; finished.warnings.push(`Result record could not be finalized: ${error.message}`);
      return { record: record.file, record_saved: false, ...finished };
    }
    return { record: record.file, record_saved: true, ...finished };
  } catch (error) {
    if (!result) throw error; // Preflight failed: the command was not run.
    return { record: record.file, record_saved: false, status: 'finished', process: result,
      capture_complete: false, warnings: [...warnings, `Capture finalization failed: ${error.message}`] };
  } finally {
    for (const stream of Object.values(streams)) if (!stream.closed) await stream.handle.close().catch(() => {});
  }
}

cli(import.meta.url, async argv => {
  const o = args(argv, ['--root', '--state', '--repo', '--input']);
  if (o.command !== 'run' || !o.root || !o.state || !o.repo) fail('Usage: command-evidence.mjs run --root ARTIFACT_ROOT --state STATE --repo APPROVED_REPO --input COMMAND.json');
  let progressError = null;
  process.stderr.on('error', error => { progressError = error; });
  const result = await captureCommand({ ...o, input: await jsonInput(o.input), onProgress: event => {
    if (progressError) throw progressError;
    process.stderr.write(JSON.stringify(event) + '\n');
  } });
  // Keep the full record on stdout even for a failed/not-started child.
  if (result.process.result !== 'pass') process.exitCode = Number.isInteger(result.process.exit_code) && result.process.exit_code > 0 && result.process.exit_code < 256 ? result.process.exit_code : 1;
  return result;
});
