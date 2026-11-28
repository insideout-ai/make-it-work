import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { open, rename, unlink, lstat } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import { readFile, writeFile } from '../../../scripts/lib/artifact-io.mjs';
import { artifactJoin, artifactResolve } from '../../../scripts/lib/artifact-path.mjs';
import { feedbackEligible, feedbackStateHash } from './feedback-handoff.mjs';
import { readFeedbackFinalization } from './feedback-finalization.mjs';

const snapshotPath = statePath => artifactJoin(path.dirname(statePath), 'implementation-cost.json');
export const costEnabled = () => process.env.MIW_ESTIMATE_COST !== '0';

export async function readImplementationCost(statePath, state) {
  try {
    const file = snapshotPath(statePath);
    if (!(await lstat(file)).isFile()) return null;
    const result = JSON.parse(await readFile(file, 'utf8'));
    if (result.version !== 1 || result.runId !== state.fields.start_time || result.stateHash !== feedbackStateHash(state.fields, state.audit) ||
        !['calculating', 'partial', 'unavailable'].includes(result.status) || !Number.isFinite(Date.parse(result.startedAt))) return null;
    if (result.status === 'partial' && (!Number.isFinite(result.usd) || result.usd < 0)) return null;
    if (result.limitations !== undefined && (!Array.isArray(result.limitations) || result.limitations.some(s => typeof s !== 'string'))) return null;
    if (result.pricing !== undefined && (!result.pricing || typeof result.pricing.source !== 'string' || typeof result.pricing.verifiedAt !== 'string')) return null;
    if (result.models !== undefined && (!result.models || typeof result.models !== 'object' || Array.isArray(result.models) ||
        Object.values(result.models).some(row => !row || !Number.isFinite(row.usd) || row.usd < 0 || !Number.isSafeInteger(row.requests) || row.requests < 0 ||
          !row.tokens || !row.rates || ['input', 'output', 'write5m', 'write1h', 'read'].some(key =>
            !Number.isSafeInteger(row.tokens[key]) || row.tokens[key] < 0 || !Number.isFinite(row.rates[key]) || row.rates[key] < 0)))) return null;
    // A killed command must not leave a permanent Finalizing spinner.
    if (result.status === 'calculating' && (Date.now() < Date.parse(result.startedAt) || Date.now() - Date.parse(result.startedAt) >= 10000)) return { ...result, status: 'unavailable', reason: 'Cost calculation was interrupted or timed out.' };
    return result;
  } catch { return null; }
}

async function save(file, value) {
  try { if (!(await lstat(file)).isFile()) throw new Error('Cost result must be a regular file'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temporary = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); await rename(temporary, file); }
  finally { await unlink(temporary).catch(() => {}); }
}

export function computeCost(input, timeout = 8000) {
  return new Promise(resolve => {
    const worker = new Worker(new URL('../../../scripts/lib/cost-worker.mjs', import.meta.url), { workerData: input, resourceLimits: { maxOldGenerationSizeMb: 512 } });
    let done = false;
    const finish = result => { if (done) return; done = true; clearTimeout(timer); void worker.terminate(); resolve(result); };
    const timer = setTimeout(() => finish({ status: 'unavailable', usd: null, reason: 'Cost calculation timed out.' }), timeout);
    worker.once('message', finish);
    worker.once('error', () => finish({ status: 'unavailable', usd: null, reason: 'Cost calculator failed.' }));
    worker.once('exit', () => finish({ status: 'unavailable', usd: null, reason: 'Cost calculator exited without a result.' }));
  });
}

// Called explicitly after feedback finalization, never from a workflow gate,
// feedback hook, renderer, or archive writer. No transcript discovery or rewrite.
export async function calculateImplementationCost(statePath, { enabled = costEnabled(), compute = computeCost } = {}) {
  if (!enabled) return { status: 'disabled' };
  statePath = artifactResolve(statePath);
  let lock;
  const lockPath = `${snapshotPath(statePath)}.lock`;
  try {
    const { parseState } = await import('./render-status.mjs');
    const { checkpointAuditNote } = await import('./dashboard-checkpoint.mjs');
    const { refreshFeedbackDashboard } = await import('./feedback-progress.mjs');
    const state = parseState(await readFile(statePath, 'utf8'), statePath);
    if (!feedbackEligible(state.fields)) return { status: 'not-eligible' };
    const binding = { runId: state.fields.start_time, stateHash: feedbackStateHash(state.fields, state.audit) };
    if (!await readFeedbackFinalization(statePath, binding)) return { status: 'not-finalized' };
    const existing = await readImplementationCost(statePath, state);
    // Interrupted attempts also settle without reading a different/newer archive.
    const file = snapshotPath(statePath);
    if (existing && existing.status !== 'calculating') {
      await save(file, existing);
      await recordResult(existing);
      await refreshFeedbackDashboard(statePath);
      return existing;
    }
    if (existing) return existing;
    const { readDelivery } = await import('./delivery-progress.mjs');
    const delivery = await readDelivery(path.dirname(path.dirname(path.dirname(statePath))), state.fields.ticket);
    if (delivery.status !== 'not-started') return { status: 'skipped', reason: 'Delivery has already been offered or started; finalization is not reopened.' };
    lock = await open(lockPath, 'wx', 0o600);
    const initial = { version: 1, ...binding, status: 'calculating', startedAt: new Date().toISOString() };
    await save(file, initial);
    try {
      await checkpointAuditNote(statePath, { kind: 'activity', id: `cost-start:${binding.stateHash}`, text: 'Calculating implementation cost' }, { refresh: false });
    } catch { /* Optional audit recording must not prevent calculation from settling. */ }
    await refreshFeedbackDashboard(statePath);
    const archiveNote = state.audit.findLast(row => row.note?.id.startsWith('feedback-archive-'));
    const archiveName = archiveNote?.outcome.match(/; evidence: (miw-session-debug\.zip)$/)?.[1];
    let estimate;
    try {
      estimate = archiveName && archiveNote.note.id.startsWith('feedback-archive-saved:')
        ? await compute({ ...binding, ticket: state.fields.ticket, archivePath: path.join(path.dirname(statePath), archiveName) }, Math.max(1, 8500 - (Date.now() - Date.parse(initial.startedAt))))
        : { status: 'unavailable', usd: null, reason: 'No current saved transcript archive is available.' };
    } catch { estimate = { status: 'unavailable', usd: null, reason: 'Cost calculator failed.' }; }
    const result = { ...estimate, ...binding, version: 1, startedAt: initial.startedAt, finishedAt: new Date().toISOString() };
    await save(file, result);
    await recordResult(result);
    await refreshFeedbackDashboard(statePath);
    return result;

    async function recordResult(result) {
      try {
        await checkpointAuditNote(statePath, { kind: 'result', id: `cost-result:${binding.stateHash}`,
          text: result.status === 'partial' ? `Estimated implementation cost: ~$${result.usd.toFixed(2)} (partial)` : `Implementation cost unavailable: ${result.reason}`,
          reference: path.basename(file) }, { refresh: false });
      } catch { /* Informational audit I/O never changes completion or delivery. */ }
    }
  } catch {
    return { status: 'unavailable', usd: null, reason: 'Optional cost accounting could not be completed; implementation status is unchanged.' };
  } finally { if (lock) { await lock.close().catch(() => {}); await unlink(lockPath).catch(() => {}); } }
}
