import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import { readFile } from '../../../scripts/lib/artifact-io.mjs';
import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { feedbackEligible, feedbackStateHash, feedbackTerminalRow } from './feedback-handoff.mjs';
import { readFeedbackFinalization } from './feedback-finalization.mjs';
import { currentReadback } from './feedback-readback.mjs';

async function artifact(file) {
  try {
    const info = await lstat(file);
    return info.isFile() ? { text: await readFile(file, 'utf8'), modified: info.mtimeMs } : null;
  } catch { return null; }
}

// Archive notes are informational only; standalone feedback has no workflow log.
export async function recordFeedbackArchive(statePath, summary, archive) {
  try {
    const { checkpointAuditNote } = await import('./dashboard-checkpoint.mjs');
    const { parseState } = await import('./render-status.mjs');
    const state = parseState(await readFile(statePath, 'utf8'), statePath);
    const terminal = feedbackTerminalRow(state.fields, state.audit);
    const previous = state.audit.findLast(row => row.number > (terminal?.number ?? 0) && row.note?.id.startsWith('feedback-archive-'));
    const saved = archive.status === 'saved';
    const reason = saved ? null : archive.reason ?? 'ARCHIVE_FAILED';
    const text = saved ? 'Local transcript ZIP saved (raw, potentially sensitive)' : `Local transcript ZIP unavailable (${reason}); feedback report remains saved`;
    const reference = saved ? path.basename(archive.archivePath) : 'workflow-feedback.md';
    const id = createHash('sha256').update(JSON.stringify([summary.stateHash, archive.status, reason, previous?.note.id ?? null])).digest('hex');
    // Repeated outcomes reuse their note; a later recovery after a new failure
    // gets a fresh entry even if an older successful snapshot was recorded.
    const same = previous?.outcome === `Result: ${text}; evidence: ${reference}`;
    await checkpointAuditNote(statePath, { kind: 'result', id: same ? previous.note.id : `feedback-archive-${archive.status}:${id}`,
      text, reference,
    }, { refresh: false });
    return { ...archive, auditRecorded: true };
  } catch {
    return { ...archive, auditRecorded: false, auditWarning: 'The transcript ZIP outcome could not be added to the audit log.' };
  }
}

// Presentation only. Runtime completion still requires the parent's actual
// source/dispatch evidence; a report on disk cannot waive that guard.
export async function readFeedbackProgress(statePath, state) {
  if (!feedbackEligible(state.fields)) return null;
  const runId = state.fields.start_time;
  const stateHash = feedbackStateHash(state.fields, state.audit);
  const directory = path.dirname(statePath);
  const [session, cumulative, failure] = await Promise.all([
    artifact(artifactJoin(directory, 'workflow-feedback.md')),
    artifact(artifactJoin(path.dirname(directory), 'implement-feedback.md')),
    artifact(artifactJoin(directory, 'feedback-unavailable.json')),
  ]);
  const current = value => {
    if (!value) return false;
    const start = value.text.indexOf(`<!-- run:${runId} -->`);
    const end = value.text.indexOf(`<!-- /run:${runId} -->`, start);
    const block = value.text.slice(start, end);
    return start >= 0 && end > start && block.includes(`<!-- feedback-state:${stateHash} -->`) && block.includes('\n### Session review\n');
  };
  const saved = current(session) && current(cumulative);
  const finalized = await readFeedbackFinalization(statePath, { runId, stateHash });
  if (finalized?.status === 'unavailable') return { status: 'unavailable', finalizedAt: finalized.finalizedAt, ...(finalized.reason ? { reason: finalized.reason } : {}) };
  try {
    const receipt = JSON.parse(failure?.text ?? 'null');
    if (receipt?.feedbackAttempt === 'unavailable' && receipt.runId === runId && receipt.stateHash === stateHash && receipt.reportSaved === false &&
        (!saved || failure.modified >= session.modified)) return { status: 'unavailable', ...(receipt.reason ? { reason: receipt.reason } : {}) };
  } catch { /* An invalid receipt cannot certify an unavailable outcome. */ }
  const readback = state.fields.feedback_evidence_version !== '1' || finalized?.kind === 'answered-delivery' ||
    currentReadback(finalized, session?.text ?? '', session?.modified);
  const shareReady = Boolean(saved && finalized?.status === 'saved' && currentReadback(finalized, session?.text ?? '', session?.modified));
  return { finalizedAt: finalized?.finalizedAt, status: saved && finalized?.status === 'saved' && readback ? 'saved' : 'collecting', reportSaved: saved, shareReady };
}

// Only refresh dashboards generated with the feedback lifecycle marker. Supplied source
// fixtures, missing HTML and old dashboards remain untouched. This is a writer
// lifecycle update, never part of the read-only HTML evidence inspection.
export async function refreshFeedbackDashboard(statePath) {
  const dashboard = artifactJoin(path.dirname(statePath), `${path.basename(statePath, '-state.md')}-status.html`);
  const existing = await artifact(dashboard);
  if (!existing?.text.includes('data-workflow-feedback-status=')) return {};
  try {
    const { generateDashboard } = await import('./render-status.mjs');
    await generateDashboard(statePath);
    return { dashboardUpdated: true };
  } catch {
    return { dashboardUpdated: false, dashboardWarning: 'Feedback outcome recorded, but the dashboard could not be refreshed.' };
  }
}

// Called only when collection actually begins, never by read-only evidence helpers.
export async function startFeedbackCollection(statePath) {
  const { parseState } = await import('./render-status.mjs');
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  if (!feedbackEligible(state.fields)) return;
  const binding = { runId: state.fields.start_time, stateHash: feedbackStateHash(state.fields, state.audit) };
  if (await readFeedbackFinalization(statePath, binding)) return;
  if (state.audit.some(row => row.note?.id === `feedback-start:${binding.stateHash}`)) return;
  const { checkpointAuditNote } = await import('./dashboard-checkpoint.mjs');
  await checkpointAuditNote(statePath, { kind: 'activity', id: `feedback-start:${binding.stateHash}`,
    text: 'Collecting session feedback' }, { refresh: false });
  await refreshFeedbackDashboard(statePath);
}
