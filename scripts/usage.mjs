#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, mkdir, readdir, realpath, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cli } from './lib/artifacts.mjs';
import { artifactJoin } from './lib/artifact-path.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const optionalNumber = (value, maximum = Infinity) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximum ? value : null;
const cache = root => path.join(root, 'make-it-work', 'miw-usage-cache');
export function usageReading(input, now = new Date().toISOString()) {
  if (typeof input.session_id !== 'string' || !input.session_id.trim()) throw new Error('Usage requires a session_id.');
  return { version: 1, session_id: input.session_id, captured_at: now,
    context_percent: optionalNumber(input.context_window?.used_percentage, 100),
    context_capacity: optionalNumber(input.context_window?.context_window_size),
    estimated_cost_usd: optionalNumber(input.cost?.total_cost_usd) };
}
export async function collectUsage(root, input) {
  root = await realpath(root);
  const workspace = input.workspace?.project_dir ?? input.cwd;
  if (!workspace || await realpath(workspace) !== root) throw new Error('Usage workspace does not match collector root.');
  const reading = { ...usageReading(input), workspace: root };
  const directory = cache(root); await mkdir(directory, { recursive: true });
  await atomicWrite(path.join(directory, `miw-${hash(reading.session_id)}.json`), JSON.stringify(reading));
  return reading;
}
export async function bindUsage(root, run, sessionId) {
  root = await realpath(root); run = await realpath(run);
  if (!run.startsWith(path.join(root, 'make-it-work') + path.sep)) throw new Error('Usage run must be inside this workspace artifact directory.');
  const names = ['miw-state.json', 'state.json', `${path.basename(run)}-state.md`, `miw-${path.basename(run)}-state.md`];
  const states = await Promise.all([...new Set(names)].map(async name => { try { return (await stat(path.join(run, name))).isFile(); } catch { return false; } }));
  if (states.filter(Boolean).length !== 1) throw new Error('Usage binding requires exactly one supported run state.');
  const reading = JSON.parse(await readFile(path.join(cache(root), `miw-${hash(sessionId)}.json`), 'utf8'));
  if (reading.session_id !== sessionId || reading.workspace !== root) throw new Error('Usage session does not match workspace.');
  await unlink(artifactJoin(run, 'usage-snapshot.json')).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await atomicWrite(artifactJoin(run, 'usage-binding.json'), JSON.stringify({ version: 1, root, session_id: sessionId }));
  return { run, session_id: sessionId };
}
export async function captureUsage(run) {
  try {
    const binding = JSON.parse(await readFile(artifactJoin(run, 'usage-binding.json'), 'utf8'));
    const value = JSON.parse(await readFile(path.join(cache(binding.root), `miw-${hash(binding.session_id)}.json`), 'utf8'));
    if (value.workspace !== binding.root || value.session_id !== binding.session_id) throw new Error('Mismatched usage session.');
    const checked = usageReading({ session_id: value.session_id, context_window: { used_percentage: value.context_percent, context_window_size: value.context_capacity }, cost: { total_cost_usd: value.estimated_cost_usd } }, value.captured_at);
    await atomicWrite(artifactJoin(run, 'usage-snapshot.json'), JSON.stringify(checked)); return checked;
  } catch { return null; } // Telemetry is optional and cannot block workflow progress.
}
export async function readUsage(run) {
  try {
    const value = JSON.parse(await readFile(artifactJoin(run, 'usage-snapshot.json'), 'utf8'));
    const binding = JSON.parse(await readFile(artifactJoin(run, 'usage-binding.json'), 'utf8'));
    if (value.version !== 1 || value.session_id !== binding.session_id || !Number.isFinite(Date.parse(value.captured_at))) return null;
    return usageReading({ session_id: value.session_id, context_window: { used_percentage: value.context_percent, context_window_size: value.context_capacity }, cost: { total_cost_usd: value.estimated_cost_usd } }, value.captured_at);
  } catch { return null; }
}
cli(import.meta.url, async argv => {
  const o = args(argv, ['--root', '--run', '--session', '--quiet']);
  if (!o.root) throw new Error('--root is required.');
  if (o.command === 'collect') {
    let input = ''; for await (const part of process.stdin) input += part;
    const value = await collectUsage(o.root, JSON.parse(input));
    if (o.quiet === 'true') return;
    return `Context: ${value.context_percent ?? 'Unavailable'}% | Session cost: ${value.estimated_cost_usd === null ? 'Unavailable' : '~$' + value.estimated_cost_usd.toFixed(2)}`;
  }
  if (o.command === 'bind' && o.run && o.session) return bindUsage(o.root, o.run, o.session);
  if (o.command === 'list') {
    let files; try { files = await readdir(cache(o.root)); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    return Promise.all(files.filter(name => /^miw-[a-f0-9]{64}\.json$/.test(name)).map(async name => JSON.parse(await readFile(path.join(cache(o.root), name), 'utf8'))));
  }
  throw new Error('Usage: usage.mjs collect|list|bind --root ROOT [--run RUN_DIR --session SESSION] [--quiet true]');
});
