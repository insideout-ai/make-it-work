#!/usr/bin/env node
import { recordActivityTiming } from '../skills/implement/scripts/activity-timing.mjs';
import { spawn } from 'node:child_process';
import { readFile } from './lib/artifact-io.mjs';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, cli, digest, fail, jsonInput, requireText } from './lib/artifacts.mjs';
import { checkpointResult } from '../skills/implement/scripts/dashboard-checkpoint.mjs';
import { parseState } from '../skills/implement/scripts/render-status.mjs';
import { checkRepoImpact, validateImpactRuns } from '../skills/implement/scripts/repo-impact.mjs';
import { resolveRepository } from './repo-identity.mjs';
export { resolveRepository } from './repo-identity.mjs';

export function parseScope(tokens) {
  const remaining = tokens.filter((token) => token !== '--autopilot');
  if (!remaining.length) return { mode: 'unspecified', tokens: [] };
  if (remaining.length === 1 && /^(full|full-suite)$/i.test(remaining[0])) return { mode: 'full', tokens: [] };
  const parsed = remaining.map((token) => {
    const match = token.match(/^(?:full:([A-Za-z0-9][A-Za-z0-9._-]*)|([A-Za-z0-9][A-Za-z0-9._-]*):(UC-\d+|domain-[A-Za-z0-9][A-Za-z0-9._-]*))$/i);
    if (!match) fail(`Unrecognized scope token: ${token}`);
    return match[1] ? { repo: match[1], full: true } : { repo: match[2], token: match[3], full: false };
  });
  return { mode: 'tokens', tokens: parsed.filter((entry, i) => parsed.findIndex((other) => JSON.stringify(other) === JSON.stringify(entry)) === i) };
}
export function canonicalToken(repo, token, inventory) {
  const uc = token.match(/^UC-(\d+)$/i);
  const found = inventory.find((name) => uc ? new RegExp(`^uc-0*${Number(uc[1])}-`, 'i').test(name) : name === token);
  if (!found) return null;
  return `${repo}:${uc ? `UC-${found.match(/^uc-(\d+)-/i)[1]}` : found}`;
}
export function command(value) {
  if (!value || typeof value !== 'object') fail('Command must be structured argv.');
  requireText(value.bin, 'Command executable');
  if (!Array.isArray(value.args) || value.args.some((arg) => typeof arg !== 'string' || /\0/.test(arg))) fail('Command args must be strings.');
  return { bin: value.bin, args: [...value.args] };
}
export function scopedCommand(input, selectors, adapter) {
  const c = command(input);
  if (!Array.isArray(selectors) || !selectors.length || selectors.some((selector) => typeof selector !== 'string' || !selector || selector.startsWith('-') || /[\0\r\n]/.test(selector))) fail('Scoped run requires safe nonempty selectors.');
  const files = [...new Set(selectors)];
  const bin = path.basename(c.bin);
  if (adapter === 'npm' && ['npm', 'pnpm', 'yarn'].includes(bin)) {
    if (!['test', 'run', 'run-script'].includes(c.args[0])) fail('Unsupported package-manager test invocation.');
    if (c.args.includes('--') && c.args.at(-1) !== '--') fail('Ambiguous existing argument forwarding.');
    if (c.args.at(-1) !== '--') c.args.push('--');
  } else if (adapter === 'node' && ['node', 'nodejs'].includes(bin) && c.args.includes('--test')) {
    c.args.push('--');
  } else if (adapter === 'pytest' && (['pytest', 'pytest-3'].includes(bin) || (['python', 'python3'].includes(bin) && c.args[0] === '-m' && c.args[1] === 'pytest'))) {
    c.args.push('--');
  } else if (adapter === 'direct' && ['vitest', 'jest', 'mocha', 'playwright'].includes(bin)) {
    if (bin === 'playwright' && c.args[0] !== 'test') fail('Playwright scoped runs require test.');
    c.args.push('--');
  } else fail('Unsupported scoped runner/wrapper; provide a supported underlying runner or disclose a bounded enclosing run.');
  c.args.push(...files);
  return c;
}
function testTimeout(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 3600000) fail('Invalid test timeout.');
}
function progressOptions(onProgress, interval) {
  if (onProgress !== undefined && typeof onProgress !== 'function') fail('Progress observer must be a function.');
  if (!Number.isSafeInteger(interval) || interval < 10 || interval > 300000) fail('Invalid progress interval; use 10–300000 ms.');
}
export async function runCommand(input, cwd, { timeoutMs = 300000, env = process.env, onProgress, progressIntervalMs = 300000, progressContext = {}, onOutput } = {}) {
  const c = command(input);
  testTimeout(timeoutMs); progressOptions(onProgress, progressIntervalMs);
  if (onOutput !== undefined && typeof onOutput !== 'function') fail('Output observer must be a function.');
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString(), started = performance.now();
    const description = displayCommand(c);
    let lastOutput = null, lastOutputAt = null, outputBytes = 0, truncated = false, progressError = null;
    const timing = () => ({ started_at: startedAt, duration_ms: Math.floor(performance.now() - started), timeout_ms: timeoutMs,
      last_output_at: lastOutputAt, output_idle_ms: lastOutput === null ? null : Math.floor(performance.now() - lastOutput), output_bytes: outputBytes });
    const emit = (event, extra = {}) => {
      if (!onProgress || progressError) return;
      const measured = timing();
      try {
        const returned = onProgress({ ...progressContext, type: 'regression-progress', version: 1, event, cwd,
          command: description.length > 500 ? description.slice(0, 497) + '...' : description, command_truncated: description.length > 500,
          ...measured, elapsed_ms: measured.duration_ms, ...extra });
        if (returned && typeof returned.then === 'function') {
          Promise.resolve(returned).catch(() => {});
          throw new Error('Progress observer must be synchronous.');
        }
      } catch (error) { progressError = String(error?.message ?? error).slice(0, 1000); }
    };
    const grouped = process.platform !== 'win32';
    const child = spawn(c.bin, c.args, { cwd, env, detached: grouped, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '', timedOut = false, startError = null, outputError = null;
    const pendingOutput = new Set();
    const capture = (name, stream, chunk) => {
      lastOutput = performance.now(); lastOutputAt = new Date().toISOString(); outputBytes += chunk.length;
      const text = tail + chunk.toString('utf8'); truncated ||= text.length > 16000; tail = text.slice(-16000);
      if (onOutput && !outputError) {
        // Bound capture buffering to one write per stream. A failed observer is
        // advisory: keep draining the child and preserve its actual exit.
        stream.pause();
        const pending = Promise.resolve().then(() => onOutput(name, chunk))
          .catch(error => { outputError = String(error?.message ?? error) || 'Output observer failed.'; })
          .finally(() => { pendingOutput.delete(pending); stream.resume(); });
        pendingOutput.add(pending);
      }
    };
    child.stdout.on('data', chunk => capture('stdout', child.stdout, chunk));
    child.stderr.on('data', chunk => capture('stderr', child.stderr, chunk));
    emit('started');
    const heartbeat = onProgress ? setInterval(() => emit('running'), progressIntervalMs) : null;
    const timer = setTimeout(() => {
      timedOut = true;
      try { if (grouped && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); }
      catch (error) { if (error.code !== 'ESRCH') startError = error.message; }
    }, timeoutMs);
    child.on('error', (error) => { startError = error.message; });
    child.on('close', async (exitCode, signal) => {
      clearTimeout(timer); clearInterval(heartbeat);
      const result = exitCode === 0 && !timedOut && !startError ? 'pass' : 'fail';
      emit('finished', { result, exit_code: exitCode, signal, timed_out: timedOut, error: startError });
      const observed = { exit_code: exitCode, signal, timed_out: timedOut, error: startError,
        result, output_tail: tail, output_truncated: truncated, ...timing(), ...(progressError ? { progress_error: progressError } : {}) };
      await Promise.all(pendingOutput);
      resolve({ ...observed, ...(outputError ? { output_capture_error: outputError } : {}) });
    });
  });
}
function combineRuns(runs) {
  const result = [];
  for (const run of runs) {
    const key = JSON.stringify([run.repo, run.cwd, run.command, run.adapter, run.scope, run.prerequisites, run.timeout_ms ?? 300000]);
    const found = result.find((item) => item.key === key);
    if (found && run.scope === 'scoped') found.run.selectors = [...new Set([...found.run.selectors, ...run.selectors])];
    else if (!found) result.push({ key, run: structuredClone(run) });
  }
  return result.map((item) => item.run);
}
export async function runRegression(input, { env = process.env, statePath, auditId, onProgress, progressIntervalMs = 300000 } = {}) {
  progressOptions(onProgress, progressIntervalMs);
  const progressFailures = [];
  const observe = async (c, cwd, timeoutMs, progressContext) => {
    const observed = await runCommand(c, cwd, { env, timeoutMs, onProgress, progressIntervalMs, progressContext });
    if (observed.progress_error) progressFailures.push(observed.progress_error);
    return observed;
  };
  let workspaceContract = null, workflowState = null;
  if (statePath || auditId) {
    if (!statePath || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(auditId ?? '')) fail('Audited regression requires a state path and stable audit id.');
    const state = parseState(await readFile(statePath, 'utf8'), statePath);
    workflowState = state;
    if (!(state.fields.phase === 'execute' || ['lightweight', 'review'].includes(state.fields.phase) && state.fields.mode === 'lightweight' && state.fields.repo_impact_version === '1') || state.fields.status !== 'In Progress') fail('Audited regression requires active execution.');
    if (state.fields.workspace_version === '1') workspaceContract = JSON.parse(state.fields.workspace_contract);
  }
  if (input.version !== 1 || !['full', 'tokens'].includes(input.mode) || !Array.isArray(input.runs)) fail('Invalid regression manifest.');
  if (!Array.isArray(input.not_run ?? []) || !Array.isArray(input.unmapped ?? [])) fail('Not-run and unmapped scope must be arrays.');
  const impact = workflowState ? await checkRepoImpact(path.dirname(path.dirname(path.dirname(path.resolve(statePath)))), workflowState.fields) : null;
  const result = { version: 1, mode: input.mode, workspace: Boolean(input.workspace), full_requested: input.runs.some((run) => run.scope === 'full'), runs: [], not_run: structuredClone(input.not_run ?? []), unmapped: structuredClone(input.unmapped ?? []), overall: null };
  for (const run of input.runs) {
    requireText(run.repo, 'Run repo'); requireText(run.cwd, 'Run directory');
    if (workspaceContract) {
      const selected = workspaceContract.repos.find((repo) => repo.id === run.repo);
      const cwd = await realpath(run.cwd);
      if (!selected || (impact ? cwd !== selected.root : cwd !== selected.root && !cwd.startsWith(`${selected.root}${path.sep}`))) fail('Regression command is outside the approved repository scope.');
    }
    if (!['full', 'scoped'].includes(run.scope)) fail('Invalid run scope.');
    testTimeout(run.timeout_ms ?? 300000);
    const p = run.prerequisites ?? {};
    if (!Array.isArray(p.env ?? []) || !Array.isArray(p.services ?? []) || (p.env ?? []).some((name) => typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) fail('Malformed prerequisites.');
    for (const service of p.services ?? []) { requireText(service.name, 'Service name'); command(service.command); }
    if (run.command !== null) command(run.command);
    if (run.adapter === 'exact' && !impact) fail('Exact scoped commands require a validated repository impact assessment.');
    if (run.scope === 'scoped' && run.adapter !== 'exact') scopedCommand(run.command, run.selectors, run.adapter);
  }
  if (impact) validateImpactRuns(impact, input.runs);
  for (const run of combineRuns(input.runs)) {
    const skip = (reason, details = {}) => result.not_run.push({ ...(run.impact_check ? { impact_check: run.impact_check } : {}), repo: run.repo, location: run.location ?? run.cwd, reason, ...details });
    if (!run.command) {
      if (input.mode === 'full' && input.workspace) result.runs.push({ repo: run.repo, scope: 'full', command: null, result: 'fail', exit_code: null, reason: 'could not discover a full-suite test command for this repo' });
      else skip('no full-suite command found');
      continue;
    }
    const p = run.prerequisites ?? {};
    if (p.local !== undefined && p.local !== 'yes') { skip(p.local); continue; }
    if (!Array.isArray(p.env ?? []) || !Array.isArray(p.services ?? [])) fail('Malformed prerequisites.');
    const missing = (p.env ?? []).find((name) => !env[name]);
    if (missing) { skip(`env var ${missing} unset`); continue; }
    let cwd;
    try { cwd = await realpath(run.cwd); }
    catch (error) { skip(`run directory unavailable: ${error.code}`); continue; }
    let unavailable = false;
    for (const service of p.services ?? []) {
      requireText(service.name, 'Service name');
      const check = await observe(service.command, cwd, 10000, { repo: run.repo, stage: 'prerequisite', service: service.name });
      if (check.result !== 'pass') { skip(`${service.name} unavailable`, { prerequisite: { service: service.name, command: command(service.command), ...check } }); unavailable = true; break; }
    }
    if (unavailable) continue;
    const c = run.scope === 'scoped' && run.adapter !== 'exact' ? scopedCommand(run.command, run.selectors, run.adapter) : command(run.command);
    if (workflowState) await recordActivityTiming(statePath, workflowState, 'tests/verification');
    result.runs.push({ ...(run.impact_check ? { impact_check: run.impact_check } : {}), repo: run.repo, cwd, scope: run.scope, command: c,
      ...(await observe(c, cwd, run.timeout_ms ?? 300000, { repo: run.repo, stage: 'suite' })) });
  }
  result.overall = result.runs.some((run) => run.result === 'fail') ? 'fail' : result.runs.length ? 'pass' : null;
  if (impact && result.overall !== 'fail' && (result.not_run.length || result.runs.length !== impact.checks.filter(c => c.scope !== 'manual').length)) result.overall = null;
  if (progressFailures.length) result.progress_warnings = [...new Set(progressFailures)];
  if (statePath) {
    try {
      await checkpointResult(statePath, {
        id: `regression:${auditId}`,
        text: `Completion gate: ${result.overall?.toUpperCase() ?? 'NO RESULT'}. ${result.runs.length} run(s); ${result.not_run.length} not run; ${result.unmapped.length} unmapped.`,
        reference: `regression ${auditId}; manifest sha256:${digest(JSON.stringify(input))}; result sha256:${digest(JSON.stringify(result))}`,
      });
    } catch (error) {
      error.regressionResult = result;
      throw error;
    }
  }
  return result;
}
const displayCommand = (c) => c ? [c.bin, ...c.args].map((part) => /[\s'"$`]/.test(part) ? `'${part.replaceAll("'", "'\\''")}'` : part).join(' ') : 'None';
export function regressionReport(result) {
  const lines = [];
  if (result.mode === 'tokens') lines.push(`Workspace: ${result.runs.length} runs`, `Mode: ${result.full_requested ? 'Scoped + full' : 'Scoped'}`, '');
  else if (result.workspace) lines.push(`Workspace: ${result.runs.length + result.not_run.length} repos`, '');
  for (const run of result.runs) {
    if (result.mode === 'full') lines.push('Mode: Full suite', `Repo: ${run.repo}`);
    else lines.push(`Repo: ${run.repo}`, `Mode: ${run.scope === 'full' ? 'Full suite' : 'Scoped'}`);
    lines.push(`Suite(s) run: ${displayCommand(run.command)}`);
    if (result.mode === 'full') lines.push('Unmapped scope (not run): None');
    lines.push(`Gate result: ${run.result.toUpperCase()}${run.reason ? `  Reason: ${run.reason}` : ''}`);
    if (run.timed_out) lines.push(Number.isFinite(run.timeout_ms) && Number.isFinite(run.duration_ms)
      ? `Timeout: ${run.timeout_ms} ms limit reached after ${run.duration_ms} ms; execution incomplete.`
      : 'Timeout: configured limit reached; execution incomplete.');
    if (run.error) lines.push(`Execution error: ${run.error}`);
    if (run.output_truncated) lines.push('Output: retained tail only; earlier output omitted.');
    if (run.result === 'fail' && run.output_tail) lines.push(run.output_tail);
    lines.push('');
  }
  lines.push(`Not run: ${result.not_run.map((item) => `${item.repo} — ${item.reason}`).join('; ') || 'None'}`);
  if (result.mode === 'tokens') lines.push(`Unmapped scope (not run): ${result.unmapped.map((item) => `${item.token} — ${item.reason}`).join('; ') || 'None'}`);
  if (result.overall && (result.workspace || result.mode === 'tokens')) lines.push(`Overall gate result: ${result.overall.toUpperCase()}`);
  for (const warning of result.progress_warnings ?? []) lines.push(`Progress warning: ${warning}. Retain the observed test result; no rerun needed for progress reporting.`);
  return lines.join('\n');
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, argv[0] === 'resolve' ? ['--root', '--repo', '--workspace-root'] : ['--input', '--format', '--state', '--audit-id', '--progress-interval-ms']);
  if (o.command === 'resolve') {
    if (!o.root || !o.repo) fail('Usage: regression.mjs resolve --root ROOT --repo ID [--workspace-root ROOT]');
    return resolveRepository({ root: o.root, repo: o.repo, workspaceRoot: o['workspace-root'] });
  }
  if (o.command !== 'run') fail('Usage: regression.mjs run --input MANIFEST.json [--format text] [--state STATE --audit-id ID]');
  const input = await jsonInput(o.input);
  // A broken progress pipe must not crash the process or erase suite evidence.
  // Use buffered writes so a slow stderr reader never blocks execution timers.
  let progressSinkError = null;
  process.stderr.on('error', error => { progressSinkError = error; });
  let result;
  try { result = await runRegression(input, { statePath: o.state, auditId: o['audit-id'],
    progressIntervalMs: o['progress-interval-ms'] === undefined ? 300000 : Number(o['progress-interval-ms']),
    onProgress: event => {
      if (progressSinkError) throw progressSinkError;
      process.stderr.write(JSON.stringify(event) + '\n');
    } }); }
  catch (error) {
    // Keep observed test evidence available even when its audit/HTML needs repair.
    if (error.regressionResult) process.stdout.write(`${o.format === 'text' ? regressionReport(error.regressionResult) : JSON.stringify(error.regressionResult)}\n`);
    throw error;
  }
  if (progressSinkError) result.progress_warnings = [...new Set([...(result.progress_warnings ?? []), progressSinkError.message])];
  return o.format === 'text' ? regressionReport(result) : result;
});
