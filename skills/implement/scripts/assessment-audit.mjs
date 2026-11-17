import { createHash } from 'node:crypto';
import { readFile } from '../../../scripts/lib/artifact-io.mjs';
import { assessmentPaths, readAssessment } from '../../../scripts/change-assessment.mjs';
import path from 'node:path';
import { assertRunState } from './artifact-layout.mjs';

export const assessmentPhase = state => state.fields.change_assessment_version === '1' &&
  ['final-approval', 'complete'].includes(state.fields.phase);

// Informational only. Reports/package evidence and workflow fields are unchanged.
export async function checkpointAssessment(statePath, state) {
  if (!assessmentPhase(state)) return null;
  const directory = path.dirname(statePath), root = path.dirname(path.dirname(directory));
  assertRunState(root, statePath, state.fields.ticket);
  const { json } = await assessmentPaths(root, state.fields.ticket);
  let raw, readFailure;
  try { raw = await readFile(json, 'utf8'); }
  catch (error) {
    if (error.code === 'ENOENT' && !state.audit.some(row => row.note?.id.startsWith('change-assessment:'))) return null;
    readFailure = error.code === 'ENOENT' ? 'Recorded assessment evidence is missing.' : error.message;
    raw = `unreadable: ${error.code}: ${readFailure}`;
  }
  const report = readFailure ? { completeness: 'unavailable', complexity: null, risk: null, reason: readFailure }
    : await readAssessment(root, state.fields.ticket);
  if (report.reason === 'Not assessed yet') report.reason = 'Recorded assessment evidence is missing or unreadable.';
  const id = `change-assessment:${createHash('sha256').update(JSON.stringify({ raw, stale: report.stale === true, failure: report.completeness === 'unavailable' ? report.reason : null })).digest('hex')}`;
  const ratings = ['Low', 'Medium', 'High'];
  const rated = !report.stale && report.completeness !== 'unavailable' && ratings.includes(report.complexity) && ratings.includes(report.risk);
  const label = report.stale ? 'stale' : rated ? `Code complexity: ${report.complexity}; Production risk: ${report.risk}` : 'unavailable';
  const reason = rated ? '' : `; reason: ${report.reason ?? report.rationale ?? 'Overall ratings unavailable for the assessed scope.'}`;
  const text = `Change assessment — ${label}; completeness: ${report.completeness}${reason}`.replace(/[\x00-\x1f\x7f]/g, ' ');
  const reference = path.basename(report.reports?.markdown ?? json);
  const { checkpointAuditNote } = await import('./dashboard-checkpoint.mjs');
  await checkpointAuditNote(statePath, { kind: 'result', id, text, reference }, { refresh: false });
  return { ...report, audit_id: id };
}
