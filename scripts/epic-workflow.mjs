#!/usr/bin/env node
import { lstat, mkdir, readFile, realpath, unlink } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { args, atomicWrite, cli, digest, fail, jsonInput, requireText, slug, withLock, within } from './lib/artifacts.mjs';
import { renderEpic, writeEpic } from './epic.mjs';
import { sliceGraph, writeSlices } from './slices.mjs';
import { renderEpicDashboard } from './epic-dashboard.mjs';
import { normalizeEntry } from './decision-log.mjs';

const prose = (value, name) => { if (typeof value !== 'string' || !value.trim() || value.includes('\0')) fail(`${name} must be nonempty text.`); return value; };
const phases = ['intake', 'shape', 'epic-review', 'slice', 'complete'];
const list = (value, name) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) fail(`${name} must be a text array.`);
  return value;
};
function sources(value) {
  if (!Array.isArray(value)) fail('sources must be an array.');
  const ids = new Set();
  return value.map((source) => {
    requireText(source.id, 'Source ID'); requireText(source.reference, 'Source reference');
    if (ids.has(source.id)) fail('Duplicate source ID.'); ids.add(source.id);
    if (typeof source.available !== 'boolean' || typeof source.content !== 'string') fail('Source needs available and content.');
    if (!source.available && source.content) fail('Unavailable sources cannot have invented content.');
    return { ...source, hash: digest(source.content) };
  });
}
function decision(state, event, text, source = 'user') {
  if (!['user', 'automatic', 'policy'].includes(source)) fail('Invalid decision provenance.');
  if (source === 'user') requireText(event.reference, 'User decision reference');
  const stageRecord = event.auto_resolution === undefined ? {} : (() => {
    if (source !== 'automatic' || !['shape-the-epic', 'slice-the-epic'].includes(event.stage)) fail('Stage auto resolutions require an automatic decision and known stage.');
    return { stage: event.stage, auto_resolution: normalizeEntry(event.auto_resolution, event.stage) };
  })();
  state.decisions.push({ ...stageRecord, id: event.id, at: new Date().toISOString(), phase: state.phase,
    scope: event.scope ?? 'epic', source, text, reference: event.reference ?? null });
}
function pending(state, question, returnPhase, kind = 'question') {
  prose(question, 'Pending question');
  state.status = 'Paused'; state.pending = { id: `${state.revision}:${state.history.length + 1}`, kind, question, return_phase: returnPhase };
}
function validateSliceExtras(input) {
  sliceGraph(input);
  for (const slice of input.slices) {
    list(slice.open_items ?? [], 'Slice open items');
    if (!['candidate', 'sequential', 'unassessed'].includes(slice.parallel?.suitability)) fail(`${slice.id} needs parallel suitability.`);
    requireText(slice.parallel.reason, 'Parallel suitability reason');
  }
  for (const group of input.parallel_groups ?? []) {
    list(group, 'Parallel group');
    if (group.length < 2 || new Set(group).size !== group.length) fail('Parallel groups need distinct members.');
    const byId = new Map(input.slices.map((slice) => [slice.id, slice]));
    function ancestors(id, found = new Set()) {
      for (const dep of byId.get(id).hard ?? []) if (!found.has(dep)) { found.add(dep); ancestors(dep, found); }
      return found;
    }
    for (const id of group) {
      if (!byId.has(id) || byId.get(id).parallel.suitability !== 'candidate') fail('Parallel groups may contain only assessed candidates.');
      if (group.some((other) => ancestors(id).has(other))) fail('Parallel group contains a hard prerequisite.');
    }
  }
}
export function evolve(previous, event) {
  const state = structuredClone(previous);
  requireText(event.id, 'Event ID');
  const prior = state.events.find((item) => item.id === event.id);
  const hash = digest(JSON.stringify(event));
  if (prior) {
    if (prior.hash !== hash) fail('Event ID reused with different content.');
    return state;
  }
  const active = () => { if (state.status !== 'In Progress') fail('Resolve the pending input or resume before continuing.'); };
  switch (event.type) {
    case 'intake':
      active(); if (state.phase !== 'intake') fail('Not in intake.');
      if (!state.sources.some((source) => source.available && source.content.trim())) {
        if (state.autonomy === 'autopilot') { state.status = 'Stopped'; state.stop_reason = 'No usable source requirement. Supply accessible content and resume.'; }
        else pending(state, 'Please supply the inaccessible ticket content or a usable requirement.', 'intake');
      } else state.phase = 'shape';
      break;
    case 'question':
      active();
      if (state.autonomy === 'autopilot') fail('Autopilot cannot wait for a question; use stage defaults or stop.');
      pending(state, event.question, state.phase);
      if (event.options !== undefined) {
        if (!Array.isArray(event.options) || !event.options.length) fail('Question options must be a nonempty array.');
        for (const option of event.options) prose(typeof option === 'string' ? option : option.label, 'Question option');
        state.pending.options = event.options;
      }
      if (event.multi_select !== undefined) { if (typeof event.multi_select !== 'boolean') fail('multi_select must be boolean.'); state.pending.multi_select = event.multi_select; }
      break;
    case 'answer': {
      if (state.status !== 'Paused' || state.pending?.id !== event.pending_id) fail('Answer does not match pending input.');
      if (state.pending.kind === 'epic-review') fail('Use accept or revise for epic review.');
      prose(event.answer, 'Answer'); decision(state, event, event.answer);
      state.phase = state.pending.return_phase; state.status = 'In Progress'; state.pending = null; break;
    }
    case 'decision':
      active(); prose(event.text, 'Decision text'); decision(state, event, event.text, event.source); break;
    case 'epic': {
      active(); if (state.phase !== 'shape') fail('Epic can only be saved during shaping.');
      renderEpic(event.input);
      state.epic_input = event.input;
      state.open_items = [...new Set([...(event.input.open_items ?? []), ...event.input.categories.flatMap((c) => c.open_items ?? [])])];
      if (event.input.categories.some((c) => c.applicable !== false && (!c.ready || c.unconfirmed)) && !state.open_items.length) state.open_items.push('Epic contains unresolved or unconfirmed requirements; inspect its readiness checklist.');
      state.epic = event.artifact; state.epic_accepted_hash = null; state.epic_stale = false; state.phase = 'epic-review';
      if (state.autonomy === 'autopilot') {
        decision(state, event, 'Continue to slicing under autopilot; epic was not approved by a user.', 'automatic'); state.phase = 'slice';
      } else pending(state, 'Review the complete saved epic. Accept it for slicing, request revisions, or pause.', 'slice', 'epic-review');
      break;
    }
    case 'accept':
      if (state.status !== 'Paused' || state.pending?.kind !== 'epic-review' || event.pending_id !== state.pending.id) fail('No matching epic review.');
      decision(state, event, 'Accepted the saved epic for slicing.'); state.epic_accepted_hash = state.epic.hash; state.phase = 'slice'; state.status = 'In Progress'; state.pending = null; break;
    case 'slices': {
      active(); if (state.phase !== 'slice' || !state.epic || (state.autonomy === 'interactive' && state.epic_accepted_hash !== state.epic.hash)) fail('Slices require an accepted epic or autopilot continuation.');
      validateSliceExtras(event.input);
      // A slice may be edited, but an existing ID must not silently change identity or disappear.
      if (state.slices.length && state.slices.some((old) => !event.input.slices.some((s) => s.id === old.id))) fail('Retain existing IDs; explicitly record removed slices through retire.');
      state.slices = event.input.slices.map((slice) => ({ ...slice, artifact: event.artifacts?.[slice.id],
        preparation: state.open_items.length || (event.input.open_items ?? []).length || (slice.open_items ?? []).length || (slice.external ?? []).length ? 'Needs refinement' : 'Prepared',
        implementation: { status: 'Not started', run: null, dashboard: null, results: [] } }));
      let blockedChanged = true;
      while (blockedChanged) {
        blockedChanged = false;
        for (const slice of state.slices) if (slice.preparation === 'Prepared' && (slice.hard ?? []).some((id) => state.slices.find((s) => s.id === id).preparation !== 'Prepared')) {
          slice.preparation = 'Needs refinement'; blockedChanged = true;
        }
      }
      state.slice_open_items = event.input.open_items ?? [];
      state.slices_input = event.input; state.graph = sliceGraph(event.input); state.overview = event.overview;
      state.parallel_groups = event.input.parallel_groups ?? [];
      state.phase = 'complete'; state.status = 'Complete'; state.pending = null;
      break;
    }
    case 'retire':
      active(); requireText(event.reason, 'Retirement reason');
      if (!state.slices.some((slice) => slice.id === event.slice_id)) fail('Unknown slice ID.');
      state.retired.push({ id: event.slice_id, reason: event.reason }); state.slices = state.slices.filter((s) => s.id !== event.slice_id);
      decision(state, event, `Retire ${event.slice_id}: ${event.reason}`); break;
    case 'revise': {
      requireText(event.reason, 'Revision reason');
      if (!['epic', 'slices'].includes(event.scope) && !Array.isArray(event.scope)) fail('Revision scope must be epic, slices, or slice IDs.');
      if (event.scope !== 'epic' && (!state.epic || (state.autonomy === 'interactive' && state.epic_accepted_hash !== state.epic.hash))) fail('Accept the epic before a slice-only revision.');
      if (Array.isArray(event.scope) && (!event.scope.length || event.scope.some((id) => !state.slices.some((s) => s.id === id)))) fail('Unknown affected slice.');
      if (event.sources) state.sources = sources(event.sources);
      state.revision += 1; state.status = 'In Progress'; state.pending = null; state.stop_reason = null;
      if (event.scope === 'epic') { state.epic_stale = true; state.epic_accepted_hash = null; }
      state.phase = !state.sources.some((s) => s.available && s.content.trim()) ? 'intake' : event.scope === 'epic' ? 'shape' : 'slice';
      const affected = new Set(Array.isArray(event.scope) ? event.scope : state.slices.map((s) => s.id));
      let grew = true;
      while (grew) { grew = false; for (const s of state.slices) if (!affected.has(s.id) && (s.hard ?? []).some((id) => affected.has(id))) { affected.add(s.id); grew = true; } }
      state.affected = [...affected];
      for (const slice of state.slices) if (affected.has(slice.id)) slice.preparation = 'Needs revision';
      decision(state, event, `Revisit ${JSON.stringify(event.scope)}: ${event.reason}`, event.source ?? 'user'); break;
    }
    case 'stop':
      requireText(event.reason, 'Stop reason'); state.suspended_pending = state.pending; state.status = 'Stopped'; state.stop_reason = event.reason; state.pending = null; break;
    case 'resume':
      if (state.status !== 'Stopped') fail('Only stopped runs need resume; paused runs need their pending answer.');
      state.pending = state.suspended_pending ?? null; state.suspended_pending = null; state.status = state.pending ? 'Paused' : 'In Progress'; state.stop_reason = null; break;
    case 'publication':
      if (state.status !== 'Complete') fail('Save the local deliverables before publication.');
      if (state.autonomy === 'autopilot') fail('Autopilot stays local.');
      requireText(event.text, 'Publication outcome'); decision(state, event, event.text, event.source ?? 'user');
      state.publication.push({ at: new Date().toISOString(), text: event.text, reference: event.reference }); break;
    default: fail(`Unknown event: ${event.type}`);
  }
  if (!phases.includes(state.phase)) fail('Invalid phase.');
  state.events.push({ id: event.id, hash });
  state.updated_at = new Date().toISOString();
  state.history.push({ id: event.id, at: state.updated_at, event: event.type, phase: state.phase, status: state.status, detail: event.reason ?? event.text ?? event.answer ?? event.question ?? '',
    ...(event.type === 'question' ? { options: event.options ?? [], multi_select: event.multi_select ?? false, pending_id: state.pending.id } : {}),
    ...(event.type === 'answer' ? { pending_id: event.pending_id } : {}) });
  return state;
}
async function directory(root, run) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(run)) fail('Unsafe run name.');
  const base = await realpath(root), parent = path.join(base, 'make-it-work');
  await mkdir(parent, { recursive: true });
  for (const dir of [parent, path.join(parent, run)]) {
    const stat = await lstat(dir); if (!stat.isDirectory() || stat.isSymbolicLink()) fail('Run folders must be real directories.');
  }
  return path.join(parent, run);
}
async function checkpoint(dir, state) {
  let legacyDecisions = false;
  try { legacyDecisions = (await lstat(path.join(dir, 'decisions.jsonl'))).isFile(); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const file of ['state.json', 'dashboard.html', 'decisions.jsonl']) {
    try { if ((await lstat(path.join(dir, file))).isSymbolicLink()) fail('Checkpoint target must not be a symlink.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  // State is authoritative. refresh repairs derived views after an interrupted render.
  await atomicWrite(path.join(dir, 'state.json'), JSON.stringify(state, null, 2) + '\n');
  // Existing runs retain their export; new runs keep the same decisions in state only.
  if (legacyDecisions) await atomicWrite(path.join(dir, 'decisions.jsonl'), state.decisions.map((entry) => JSON.stringify(entry)).join('\n') + (state.decisions.length ? '\n' : ''));
  await atomicWrite(path.join(dir, 'dashboard.html'), renderEpicDashboard(state));
}
export async function initEpicRun({ root, input }) {
  requireText(input.title, 'Title'); requireText(input.goal, 'Goal');
  if (!['interactive', 'autopilot'].includes(input.autonomy ?? 'interactive')) fail('Invalid autonomy.');
  const sourceList = sources(input.sources ?? []);
  const base = await realpath(root), parent = path.join(base, 'make-it-work');
  await mkdir(parent, { recursive: true });
  if ((await lstat(parent)).isSymbolicLink()) fail('make-it-work must not be a symlink.');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15).replace('T', '-');
  const prefix = `drive-${slug(input.title).slice(0, 65)}-${stamp}`;
  let run, dir;
  for (let suffix = 1; ; suffix++) {
    run = suffix === 1 ? prefix : `${prefix}-${suffix}`; dir = path.join(parent, run);
    try { await mkdir(dir); break; } catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  const state = { version: 1, run, title: input.title, goal: input.goal, autonomy: input.autonomy ?? 'interactive',
    phase: 'intake', status: 'In Progress', revision: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    sources: sourceList, epic: null, overview: null, slices: [], retired: [], affected: [], graph: null, parallel_groups: [],
    open_items: [], decisions: [], history: [], events: [], pending: null, stop_reason: null, publication: [] };
  await checkpoint(dir, state); return { run, directory: dir, state };
}
async function artifact(dir, filename) {
  const file = await within(dir, filename); const body = await readFile(file, 'utf8');
  return { path: path.basename(file), hash: digest(body) };
}
export async function inspectEpicRun({ root, run }) {
  const dir = await directory(root, run);
  const statePath = await within(dir, 'state.json');
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  if (state.version !== 1 || state.run !== run) fail('Unsupported or mismatched run state.');
  const problems = [];
  for (const item of [state.epic_stale ? null : state.epic, state.phase === 'complete' ? state.overview : null, ...state.slices.filter((s) => s.preparation !== 'Needs revision').map((s) => s.artifact)].filter(Boolean)) {
    try { if ((await artifact(dir, item.path)).hash !== item.hash) problems.push(`Changed artifact: ${item.path}`); }
    catch (error) { problems.push(`Unavailable artifact ${item.path}: ${error.message}`); }
  }
  return { directory: dir, state, problems };
}
export async function updateEpicRun({ root, run, event }) {
  const dir = await directory(root, run);
  return withLock(path.join(dir, 'state.json'), async () => {
    const { state, problems } = await inspectEpicRun({ root, run });
    if (problems.length && !['revise', 'stop'].includes(event.type)) fail(`${problems.join('; ')}. Reconcile through revise before continuing.`);
    const prior = state.events.find((item) => item.id === event.id);
    if (prior) { evolve(state, event); await checkpoint(dir, state); return { directory: dir, state }; }
    // Validate all semantics and the transition before creating deliverables.
    const proposed = evolve(state, event);
    const resolved = structuredClone(event);
    let summary = null;
    if (event.type === 'epic') {
      const input = { ...event.input, source: state.sources.map((s) => s.reference).join(', ') };
      const output = await writeEpic(dir, input);
      resolved.artifact = await artifact(dir, path.basename(output.files[0]));
      resolved.input = event.input;
    }
    if (event.type === 'slices') {
      if (state.retired.some((s) => event.input.slices.some((next) => next.id === s.id))) fail('Retired slice IDs must not be reused.');
      if (Array.isArray(state.affected) && state.affected.length && state.slices_input) {
        for (const old of state.slices_input.slices.filter((s) => !state.affected.includes(s.id) && !state.retired.some((r) => r.id === s.id))) {
          const next = event.input.slices.find((s) => s.id === old.id);
          if (!isDeepStrictEqual(next, old)) fail(`Unchanged slice ${old.id} was modified outside the revision scope.`);
        }
      }
      const input = { ...event.input, source: [state.epic.path, ...state.sources.map((s) => s.reference)].join(' | '),
        slices: event.input.slices.map((s) => ({ ...s, preparation: proposed.slices.find((slice) => slice.id === s.id).preparation, content: [s.content, ...(s.open_items?.length ? ['\n## Open items', ...s.open_items.map((text) => `- ${text}`)] : []), `\n## Parallel suitability\n\n${s.parallel.suitability}: ${s.parallel.reason}`].join('\n') })),
        assumptions: event.input.assumptions ?? [],
        open_items: [...new Set([...state.open_items, ...(event.input.open_items ?? []),
          ...event.input.slices.flatMap((s) => (s.open_items ?? []).map((text) => `${s.id}: ${text}`))])] };
      const output = await writeSlices(dir, input);
      resolved.overview = await artifact(dir, `${output.prefix}.md`);
      resolved.artifacts = {};
      for (const slice of event.input.slices) {
        const file = output.files.find((f) => path.basename(f).startsWith(`${output.prefix}-${slice.id}-`));
        resolved.artifacts[slice.id] = await artifact(dir, path.basename(file));
      }
      summary = output.chat_summary;
    }
    const next = evolve(state, resolved);
    // Idempotency binds the caller's event, not the controller's generated artifact paths.
    next.events.at(-1).hash = digest(JSON.stringify(event));
    await checkpoint(dir, next);
    return { directory: dir, state: next, ...(summary ? { chat_summary: summary } : {}) };
  });
}
// Only this controller-owned scratch filename is consumed. Source documents and
// legacy/custom input files are never removed implicitly.
export async function applyEpicEventFile({ root, run, input }) {
  const dir = await directory(root, run);
  const scratch = path.join(dir, '.event.json');
  const file = path.resolve(input);
  const owned = file === scratch;
  if (owned) await within(dir, '.event.json');
  const raw = await readFile(file, 'utf8');
  const result = await updateEpicRun({ root, run, event: JSON.parse(raw) });
  if (owned) {
    try {
      const info = await lstat(scratch);
      if (info.isFile() && !info.isSymbolicLink() && await readFile(scratch, 'utf8') === raw) await unlink(scratch);
    } catch (error) {
      if (error.code !== 'ENOENT') return { ...result, input_cleanup_warning: `Checkpoint saved; could not remove .event.json: ${error.message}` };
    }
  }
  return result;
}

cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--root', '--run', '--input']);
  const root = o.root ?? process.cwd();
  if (o.command === 'init') return initEpicRun({ root, input: await jsonInput(o.input) });
  if (o.command === 'show') return inspectEpicRun({ root, run: o.run });
  if (o.command === 'event') return applyEpicEventFile({ root, run: o.run, input: o.input });
  if (o.command === 'refresh') {
    const dir = await directory(root, o.run);
    return withLock(path.join(dir, 'state.json'), async () => {
      const result = await inspectEpicRun({ root, run: o.run });
      if (result.problems.length) fail(result.problems.join('; '));
      await checkpoint(dir, result.state); return result;
    });
  }
  fail('Usage: epic-workflow.mjs init|event|show|refresh --root PROJECT [--run RUN] [--input JSON]');
});
