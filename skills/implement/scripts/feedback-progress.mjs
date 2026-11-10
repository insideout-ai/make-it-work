import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { feedbackEligible, feedbackStateHash } from './feedback-handoff.mjs';
import { readFeedbackFinalization } from './feedback-finalization.mjs';

async function artifact(file) {
  try {
    const info = await lstat(file);
    return info.isFile() ? { text: await readFile(file, 'utf8'), modified: info.mtimeMs } : null;
  } catch { return null; }
}

// Presentation only. Runtime completion still requires the parent's actual
// source/dispatch evidence; a report on disk cannot waive that guard.
export async function readFeedbackProgress(statePath, state) {
  if (!feedbackEligible(state.fields)) return null;
  const runId = state.fields.start_time;
  const stateHash = feedbackStateHash(state.fields, state.audit);
  const directory = path.dirname(statePath);
  const [session, cumulative, failure] = await Promise.all([
    artifact(path.join(directory, 'workflow-feedback.md')),
    artifact(path.join(path.dirname(directory), 'implement-feedback.md')),
    artifact(path.join(directory, 'feedback-unavailable.json')),
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
  if (finalized?.status === 'unavailable') return { status: 'unavailable' };
  try {
    const receipt = JSON.parse(failure?.text ?? 'null');
    if (receipt?.feedbackAttempt === 'unavailable' && receipt.runId === runId && receipt.stateHash === stateHash && receipt.reportSaved === false &&
        (!saved || failure.modified >= session.modified)) return { status: 'unavailable' };
  } catch { /* An invalid receipt cannot certify an unavailable outcome. */ }
  return { status: saved && finalized?.status === 'saved' ? 'saved' : 'collecting', reportSaved: saved };
}

// Only refresh dashboards generated with the progress panel. Supplied source
// fixtures, missing HTML and old dashboards remain untouched. This is a writer
// lifecycle update, never part of the read-only HTML evidence inspection.
export async function refreshFeedbackDashboard(statePath) {
  const dashboard = path.join(path.dirname(statePath), `${path.basename(statePath, '-state.md')}-status.html`);
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
