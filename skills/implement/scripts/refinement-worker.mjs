#!/usr/bin/env node
// Parent-owned dispatch metadata, not runtime-agent or permission evidence.
import { readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { args, atomicWrite, cli, digest, fail, jsonInput, requireText, withLock, within } from '../../../scripts/lib/artifacts.mjs';
import { parseState } from './render-status.mjs';
import { implementationBaseline } from './implementation-guard.mjs';
import { validateArtifacts } from './handoff.mjs';
import { checkpointDashboard, checkpointDecision } from './dashboard-checkpoint.mjs';

const bindingKeys = ['ticket', 'start_time', 'phase', 'status', 'autonomy', 'queued_autonomy', 'refinement_destination', 'plan_version', 'review_cycle', 'fix_cycle', 'replans_used', 'spec', 'spec_hash', 'workspace_snapshot'];
const json = file => readFile(file, 'utf8').then(JSON.parse);
const signature = value => digest(JSON.stringify(value));
const exactKeys = (value, keys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail('Unknown or malformed worker input.');
};
function eligible(f) {
  return f.refinement_worker_version === '1' && f.controller_version === '1' && f.handoff_version === '1' &&
    f.phase === 'close-the-gaps' && f.status === 'In Progress' && f.autonomy === 'autopilot' &&
    (f.queued_autonomy === 'none' || !f.queued_autonomy) && f.refinement_destination === 'here' &&
    !f.workspace_version && f.spec === 'none';
}
function binding(state) {
  return { ...Object.fromEntries(bindingKeys.map(key => [key, state.fields[key] ?? null])),
    entry: state.audit.findLast(row => row.to === 'close-the-gaps' && row.from !== row.to)?.number ?? null };
}
async function handoffs(directory) {
  try { return (await readdir(path.join(directory, `${path.basename(directory)}-handoffs`))).flatMap(name => /^gaps-(\d+)\.json$/.test(name) ? [Number(name.match(/\d+/)[0])] : []); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
export async function refinementWorker(root, stateFile, command, input = {}) {
  root = await realpath(root);
  const statePath = await within(root, stateFile);
  const directory = path.dirname(statePath);
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  const f = state.fields;
  const file = path.join(directory, `${f.ticket}-refinement-worker.json`);
  if (command === 'inspect' && !f.refinement_worker_version) return { enabled: false, route: 'inline' };
  if (f.refinement_worker_version !== '1') fail('Unsupported or absent refinement-worker version; do not backfill saved runs.');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(f.ticket) || await realpath(directory) !== directory || directory !== path.join(root, 'make-it-work', f.ticket)) fail('Unexpected worker run directory.');
  const artifact = async relative => {
    const resolved = await within(directory, relative);
    return { path: path.relative(root, resolved), sha256: digest(await readFile(resolved)) };
  };
  const current = async saved => {
    if (!eligible(f) || signature(binding(state)) !== signature(saved.binding)) fail('Stale refinement worker; reconcile its runtime and preserve artifacts before continuing.');
    const baseline = await implementationBaseline([root]);
    if (signature(baseline) !== signature(saved.baseline)) fail('Repository branch, HEAD or application files changed during refinement.');
  };
  if (command === 'prepare') {
    exactKeys(input, ['task']);
    if (!eligible(f)) fail('Worker requires a new local single-repository Autopilot refinement with no accepted spec.');
    if (typeof input.task !== 'string' || !input.task.trim() || Buffer.byteLength(input.task) > 131072) fail('Supply the bounded original refinement task (at most 128 KiB).');
    let prior;
    try { prior = await json(await within(directory, path.basename(file))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (prior) {
      await current(prior);
      if (prior.task !== input.task || prior.status === 'cancelled') fail('Existing worker assignment differs or was cancelled; do not launch a duplicate.');
      return { enabled: true, assignment: file, id: prior.id, status: prior.status, agent_id: prior.agent_id, instruction: 'Reconcile the recorded runtime before any dispatch; metadata is not proof of a live agent.' };
    }
    const saved = { version: 1, id: randomUUID(), binding: binding(state), baseline: await implementationBaseline([root]),
      task: input.task, status: 'prepared', agent_id: null, requests: [], handoff_floor: Math.max(0, ...await handoffs(directory)) };
    await writeFile(file, JSON.stringify(saved, null, 2) + '\n', { flag: 'wx' });
    return { enabled: true, assignment: file, id: saved.id, status: saved.status };
  }
  const savedPath = await within(directory, path.basename(file));
  return withLock(savedPath, async () => {
    const saved = await json(savedPath);
    if (saved.version !== 1 || saved.binding?.ticket !== f.ticket || !Array.isArray(saved.requests)) fail('Invalid refinement-worker assignment.');
    const persist = () => atomicWrite(savedPath, JSON.stringify(saved, null, 2) + '\n');
    if (command === 'inspect') {
      return { enabled: true, eligible: eligible(f), stale: signature(binding(state)) !== signature(saved.binding), assignment: file,
        id: saved.id, status: saved.status, agent_id: saved.agent_id, requests: saved.requests.map(r => ({ id: r.id, reply: r.reply })), result: saved.result ?? null };
    }
    if (command === 'cancel') {
      exactKeys(input, ['reason']); requireText(input.reason, 'Cancellation reason');
      // Keep any returned receipt and artifact hashes as evidence during explicit recovery.
      if (saved.status === 'cancelled' && input.reason !== saved.reason) fail('Cancellation already recorded with a different reason.');
      saved.status = 'cancelled'; saved.reason = input.reason; await persist();
      return { status: saved.status, instruction: 'This records cancellation only; reconcile or stop the actual runtime agent separately before inline recovery.' };
    }
    await current(saved);
    if (saved.status === 'cancelled') fail('Worker assignment is cancelled.');
    if (command === 'revise') {
      exactKeys(input, ['reason']); requireText(input.reason, 'Revision reason');
      if (saved.status !== 'returned') fail('Only a returned result can be reopened before controller routing.');
      saved.history ??= [];
      saved.history.push({ result: saved.result, artifacts: saved.artifacts, context_artifacts: saved.context_artifacts, reason: input.reason });
      saved.handoff_floor = Math.max(saved.handoff_floor, Number(path.basename(saved.result.path).match(/gaps-(\d+)\.json$/)[1]));
      delete saved.result; delete saved.artifacts; delete saved.context_artifacts; saved.status = 'running';
      await persist(); return { status: saved.status, agent_id: saved.agent_id, instruction: 'Resume the same worker with this correction. Preserve the earlier handoff and emit a newer one; metadata is not runtime evidence.' };
    }
    if (command === 'attach') {
      exactKeys(input, ['agent_id']); requireText(input.agent_id, 'Runtime agent ID');
      if (saved.agent_id && saved.agent_id !== input.agent_id) fail('A different runtime agent is already attached; do not replace it blindly.');
      saved.agent_id = input.agent_id;
      if (saved.status === 'prepared') saved.status = 'running';
      await persist(); return { status: saved.status, agent_id: saved.agent_id };
    }
    if (command === 'service') {
      exactKeys(input, ['request']);
      if (saved.status !== 'running') fail('Only a running worker may request parent service.');
      const ref = await artifact(input.request);
      const request = await json(path.resolve(root, ref.path));
      exactKeys(request, ['version', 'assignment_id', 'id', 'kind', 'text', 'reason']);
      if (request.version !== 1 || request.assignment_id !== saved.id || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$/.test(request.id ?? '')) fail('Request belongs to a different assignment or has an unsafe ID.');
      if (!['activity', 'context-update'].includes(request.kind)) fail('Unsupported worker request; return a blocked/needs_input gaps handoff for parent routing.');
      requireText(request.text, 'Request text');
      const old = saved.requests.find(r => r.id === request.id);
      if (old) { if (old.sha256 !== ref.sha256) fail('Request ID reused with changed contents.'); return { reply: old.reply, replay: true }; }
      // These are informational parent checkpoints, never consent or permission.
      if (request.kind === 'activity') await checkpointDashboard(statePath, { activity: request.text });
      else {
        requireText(request.reason, 'Context-update reason');
        await checkpointDecision(statePath, { id: `refinement-worker:${saved.id}:${request.id}`, topic: 'Refinement context update',
          choice: request.text, reason: request.reason, source: 'autopilot', via: 'policy', scope: `${f.ticket} local refinement`, resume: 'in-phase' });
      }
      const reply = path.join(directory, `${f.ticket}-worker-reply-${request.id}.json`);
      // Exact request identity plus idempotent checkpoint APIs recover render/write interruptions.
      const body = { version: 1, assignment_id: saved.id, request_id: request.id, request_sha256: ref.sha256, status: 'recorded', kind: request.kind };
      await atomicWrite(reply, JSON.stringify(body) + '\n');
      saved.requests.push({ id: request.id, sha256: ref.sha256, reply }); await persist();
      return { reply, status: 'recorded' };
    }
    if (command === 'accept') {
      exactKeys(input, ['handoff']);
      const ref = await artifact(input.handoff);
      if (saved.status === 'returned') {
        if (saved.result.path !== ref.path || saved.result.sha256 !== ref.sha256) fail('Returned handoff changed or duplicate result differs.');
        for (const a of saved.artifacts) if ((await artifact(path.relative(directory, path.resolve(root, a.path)))).sha256 !== a.sha256) fail('Returned artifact changed.');
        for (const a of saved.context_artifacts ?? []) if (digest(await readFile(await within(root, a.path))) !== a.sha256) fail('Returned context changed.');
        return { ...saved.result, replay: true };
      }
      if (saved.status !== 'running') fail('Attach the actual worker runtime before accepting its result.');
      const match = /^gaps-(\d+)\.json$/.exec(path.basename(ref.path));
      const expectedDirectory = path.join(directory, `${f.ticket}-handoffs`);
      if (!match || path.dirname(path.resolve(root, ref.path)) !== expectedDirectory || Number(match[1]) <= saved.handoff_floor || Number(match[1]) !== Math.max(...await handoffs(directory))) fail('Require the newest gaps handoff created after dispatch.');
      const h = await validateArtifacts(await json(path.resolve(root, ref.path)), root);
      if (h.ticket !== f.ticket || h.stage !== 'gaps' || h.plan_version !== Number(f.plan_version)) fail('Handoff ticket, stage or plan version does not match assignment.');
      if (h.status === 'done' && h.outcome !== 'SPEC_SAVED') fail('The local worker cannot claim Slack delivery.');
      saved.context_artifacts = [];
      for (const a of h.data?.context_updated ?? []) {
        const file = await within(root, a);
        saved.context_artifacts.push({ path: path.relative(root, file), sha256: digest(await readFile(file)) });
      }
      saved.artifacts = [];
      for (const a of [...Object.values(h.artifacts ?? {}), ...(h.data?.context_updated ?? [])]) {
        // Artifact ownership remains subject to the stage's existing context-discovery rules.
        if (a.startsWith(`make-it-work/${f.ticket}/`)) saved.artifacts.push(await artifact(path.relative(directory, path.resolve(root, a))));
      }
      saved.status = 'returned'; saved.result = ref; await persist();
      return { ...ref, status: h.status, outcome: h.outcome ?? null, instruction: 'Parent must read the spec, assess risk and route this unchanged v1 handoff through the controller. This receipt does not complete or advance the workflow.' };
    }
    fail('Unknown refinement-worker command.');
  });
}
cli(import.meta.url, async argv => {
  const o = args(argv, ['--root', '--state', '--input']);
  if (!o.root || !o.state) fail('Usage: refinement-worker.mjs prepare|inspect|attach|service|accept|revise|cancel --root ROOT --state STATE [--input JSON]');
  return refinementWorker(o.root, o.state, o.command, o.input ? await jsonInput(o.input) : {});
});

/** Opt-in controller boundary only; cancelled work returns to the existing inline route. */
export async function checkRefinementWorkerHandoff(root, statePath, handoff) {
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  if (!state.fields.refinement_worker_version) return;
  if (state.fields.refinement_worker_version !== '1') fail('Unsupported refinement-worker version.');
  if (!eligible(state.fields)) return;
  const journal = await json(await within(path.dirname(statePath), `${state.fields.ticket}-refinement-worker.json`));
  if (journal.version !== 1 || journal.binding?.start_time !== state.fields.start_time || journal.binding?.ticket !== state.fields.ticket) fail('Worker receipt belongs to a different run.');
  if (journal.status === 'cancelled' && typeof journal.reason === 'string' && journal.reason.trim()) return;
  if (journal.status !== 'returned') fail('Accept the refinement worker result before controller routing.');
  await refinementWorker(root, statePath, 'accept', { handoff: path.resolve(root, handoff) });
}
