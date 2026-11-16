import { captureUsage } from '../../../scripts/usage.mjs';
import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import { readFile, writeFile } from '../../../scripts/lib/artifact-io.mjs';
import { lstat, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const receiptPath = statePath => artifactJoin(path.dirname(statePath), 'feedback-finalized.json');

export async function readFeedbackFinalization(statePath, binding) {
  try {
    const file = receiptPath(statePath);
    if (!(await lstat(file)).isFile()) return null;
    const receipt = JSON.parse(await readFile(file, 'utf8'));
    return receipt.version === 1 && receipt.runId === binding.runId && receipt.stateHash === binding.stateHash &&
      ['saved', 'unavailable'].includes(receipt.status) ? receipt : null;
  } catch { return null; }
}

// A local lifecycle receipt, separate from the implementation state/package.
// The guard validates runtime proof before writing it or accepting its writerId.
export async function finalizeFeedback(statePath, outcome, { refresh = true, now = () => new Date().toISOString() } = {}) {
  const existing = await readFeedbackFinalization(statePath, outcome);
  const unchanged = existing?.status === outcome.status && existing?.writerId === outcome.writerId && existing?.kind === outcome.kind &&
    JSON.stringify(existing?.readback) === JSON.stringify(outcome.readback);
  const file = receiptPath(statePath), temporary = `${file}.${randomUUID()}.tmp`;
  try {
    try { if (!(await lstat(file)).isFile()) throw new Error('Feedback finalization path must be a regular file.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const receipt = unchanged ? existing : { version: 1, ...outcome, finalizedAt: now() };
    if (!unchanged) {
      await captureUsage(path.dirname(statePath));
      await writeFile(temporary, JSON.stringify(receipt) + '\n', { flag: 'wx', mode: 0o600 });
      await rename(temporary, file);
    }
    // The caller has verified the outcome. Notes never serve as completion proof.
    const { checkpointAuditNote } = await import('./dashboard-checkpoint.mjs');
    const unavailable = outcome.status === 'unavailable';
    const reason = outcome.reason?.replace(/[\x00-\x1f\x7f]+/g, ' ').trim();
    try {
      await checkpointAuditNote(statePath, { kind: 'result',
        id: `feedback-${outcome.status}:${outcome.stateHash}`,
        text: unavailable ? `Session feedback unavailable${reason ? `: ${reason}` : ''}` : 'Session feedback saved',
        reference: unavailable ? 'feedback-finalized.json' : 'workflow-feedback.md',
      }, { refresh: false });
    } catch { /* Audit I/O failure cannot undo verified feedback or leave the spinner active. */ }
    if (refresh) {
      const { refreshFeedbackDashboard } = await import('./feedback-progress.mjs');
      await refreshFeedbackDashboard(statePath);
    }
    return receipt;
  } catch (error) {
    throw Object.assign(new Error(`Could not persist feedback finalization at ${file}: ${error.message}. Keep the workflow terminal and retry write-feedback.mjs finalize after resolving this I/O error.`), { code: 'FEEDBACK_FINALIZATION', cause: error });
  }
  finally { await unlink(temporary).catch(() => {}); }
}
