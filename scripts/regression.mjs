#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { args, cli, fail, jsonInput, requireText } from './lib/artifacts.mjs';

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
function command(value) {
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
export async function runCommand(input, cwd, { timeoutMs = 300000, env = process.env } = {}) {
  const c = command(input);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 3600000) fail('Invalid test timeout.');
  return new Promise((resolve) => {
    const grouped = process.platform !== 'win32';
    const child = spawn(c.bin, c.args, { cwd, env, detached: grouped, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '', timedOut = false, startError = null;
    const capture = (chunk) => { tail = (tail + chunk.toString('utf8')).slice(-16000); };
    child.stdout.on('data', capture); child.stderr.on('data', capture);
    const timer = setTimeout(() => {
      timedOut = true;
      try { if (grouped && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); }
      catch (error) { if (error.code !== 'ESRCH') startError = error.message; }
    }, timeoutMs);
    child.on('error', (error) => { startError = error.message; });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      resolve({ exit_code: exitCode, signal, timed_out: timedOut, error: startError,
        result: exitCode === 0 && !timedOut && !startError ? 'pass' : 'fail', output_tail: tail });
    });
  });
}
function combineRuns(runs) {
  const result = [];
  for (const run of runs) {
    const key = JSON.stringify([run.repo, run.cwd, run.command, run.adapter, run.scope, run.prerequisites]);
    const found = result.find((item) => item.key === key);
    if (found && run.scope === 'scoped') found.run.selectors = [...new Set([...found.run.selectors, ...run.selectors])];
    else if (!found) result.push({ key, run: structuredClone(run) });
  }
  return result.map((item) => item.run);
}
export async function runRegression(input, { env = process.env } = {}) {
  if (input.version !== 1 || !['full', 'tokens'].includes(input.mode) || !Array.isArray(input.runs)) fail('Invalid regression manifest.');
  if (!Array.isArray(input.not_run ?? []) || !Array.isArray(input.unmapped ?? [])) fail('Not-run and unmapped scope must be arrays.');
  const result = { version: 1, mode: input.mode, workspace: Boolean(input.workspace), full_requested: input.runs.some((run) => run.scope === 'full'), runs: [], not_run: structuredClone(input.not_run ?? []), unmapped: structuredClone(input.unmapped ?? []), overall: null };
  for (const run of input.runs) {
    requireText(run.repo, 'Run repo'); requireText(run.cwd, 'Run directory');
    if (!['full', 'scoped'].includes(run.scope)) fail('Invalid run scope.');
    const p = run.prerequisites ?? {};
    if (!Array.isArray(p.env ?? []) || !Array.isArray(p.services ?? []) || (p.env ?? []).some((name) => typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) fail('Malformed prerequisites.');
    for (const service of p.services ?? []) { requireText(service.name, 'Service name'); command(service.command); }
    if (run.command !== null) command(run.command);
    if (run.scope === 'scoped') scopedCommand(run.command, run.selectors, run.adapter);
  }
  for (const run of combineRuns(input.runs)) {
    const skip = (reason) => result.not_run.push({ repo: run.repo, location: run.location ?? run.cwd, reason });
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
      const check = await runCommand(service.command, cwd, { env, timeoutMs: 10000 });
      if (check.result !== 'pass') { skip(`${service.name} unavailable`); unavailable = true; break; }
    }
    if (unavailable) continue;
    const c = run.scope === 'scoped' ? scopedCommand(run.command, run.selectors, run.adapter) : command(run.command);
    result.runs.push({ repo: run.repo, cwd, scope: run.scope, command: c,
      ...(await runCommand(c, cwd, { env, timeoutMs: run.timeout_ms ?? 300000 })) });
  }
  result.overall = result.runs.some((run) => run.result === 'fail') ? 'fail' : result.runs.length ? 'pass' : null;
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
    if (run.result === 'fail' && (run.output_tail || run.error)) lines.push(run.output_tail || run.error);
    lines.push('');
  }
  lines.push(`Not run: ${result.not_run.map((item) => `${item.repo} — ${item.reason}`).join('; ') || 'None'}`);
  if (result.mode === 'tokens') lines.push(`Unmapped scope (not run): ${result.unmapped.map((item) => `${item.token} — ${item.reason}`).join('; ') || 'None'}`);
  if (result.overall && (result.workspace || result.mode === 'tokens')) lines.push(`Overall gate result: ${result.overall.toUpperCase()}`);
  return lines.join('\n');
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--input', '--format']);
  if (o.command !== 'run') fail('Usage: regression.mjs run --input MANIFEST.json [--format text]');
  const result = await runRegression(await jsonInput(o.input));
  return o.format === 'text' ? regressionReport(result) : result;
});
