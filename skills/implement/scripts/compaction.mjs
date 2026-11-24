// A manual, once-per-run preparation boundary. Never claims to invoke /compact.
import path from 'node:path';
import { readFile } from '../../../scripts/lib/artifact-io.mjs';
import { atomicWrite, digest, fail, within } from '../../../scripts/lib/artifacts.mjs';
import { resolveArtifactOutput } from '../../../scripts/artifact-output.mjs';
import { pendingInputs } from './pending-input.mjs';
import { planHash } from '../../../scripts/lib/plan.mjs';

export const compactionRequired = f => f.compaction_version === '1' && f.phase === 'write-tests'
  && !['declined', 'continued', 'skipped', 'cancelled'].includes(f.compaction_checkpoint);

function question(id, question, choices, recovery) {
  return { id, kind: 'compaction', question, choices, continuation: { event: 'resume-stage' },
    binding: { kind: 'artifact', path: recovery, strict: true } };
}

export async function prepareCompaction(root, statePath, f, input) {
  if (f.autonomy === 'autopilot') { f.compaction_checkpoint = 'skipped'; return null; }
  const notes = input.notes ?? '';
  if (typeof notes !== 'string' || notes.length > 4000) fail('Compaction notes must be at most 4,000 characters; reference longer decisions in saved artifacts.');
  const output = await resolveArtifactOutput({ root, directory: path.relative(root, path.dirname(statePath)), name: `${f.ticket}-compaction.json` });
  const recovery = { version: 1, runId: f.start_time, ticket: f.ticket, state: statePath,
    next: 'write-tests', plan_version: f.plan_version, spec: f.spec, spec_hash: f.spec_hash,
    plan: f.plan, plan_hash: f.plan_hash, workspace_snapshot: f.workspace_snapshot,
    autonomy: f.autonomy, queued_autonomy: f.queued_autonomy, testing_readiness: f.testing_readiness,
    ticket_publication: f.ticket_publication, notes,
    instruction: 'Read the authoritative state first. Validate repository and accepted artifact revisions, reload standing rules, applicable project guidance and Write Tests integration. Preserve approvals, permissions, readiness decisions and queued autonomy; never accept drift automatically. No tests or implementation have been verified by this checkpoint.' };
  await atomicWrite(output.file, JSON.stringify(recovery, null, 2) + '\n');
  f.compaction_recovery = output.relative;
  f.compaction_checkpoint = 'offered';
  return question(`${input.id}:compact`, 'Planning is complete and saved. Compact before implementation?',
    [{ id: 'compact', label: 'Compact first (Recommended)' }, { id: 'continue', label: 'Continue' }], output.relative);
}

export async function checkCompactionRecovery(root, statePath, f) {
  const saved = JSON.parse(await readFile(await within(root, f.compaction_recovery), 'utf8'));
  if (saved.version !== 1 || saved.runId !== f.start_time || saved.state !== statePath || saved.ticket !== f.ticket
      || saved.plan_version !== f.plan_version || saved.workspace_snapshot !== f.workspace_snapshot) fail('Compaction recovery does not match this run; follow existing resume/revalidation rules.');
  for (const name of ['spec', 'plan']) {
    const content = await readFile(await within(root, f[name]), 'utf8');
    const hash = name === 'plan' ? planHash(content) : digest(content);
    if (saved[name] !== f[name] || saved[`${name}_hash`] !== f[`${name}_hash`] || hash !== saved[`${name}_hash`]) fail(`${name} changed since compaction checkpoint; revalidate before continuation.`);
  }
  if (saved.testing_readiness !== f.testing_readiness) fail('Readiness changed since compaction checkpoint.');
  return saved;
}

export function resolveCompaction(f, answer, id) {
  if (f.phase !== 'write-tests' || f.compaction_version !== '1') fail('Compaction continuation is not active.');
  if (f.compaction_checkpoint === 'offered') {
    if (answer === 'continue') { f.compaction_checkpoint = 'declined'; return null; }
    if (answer !== 'compact') fail('Choose compact or continue.');
    f.compaction_checkpoint = 'awaiting-continuation';
    return question(`${id}:continue`, 'Progress is saved. Run the displayed /compact command, then say continue to resume at Write Tests.',
      [{ id: 'continue', label: 'Continue' }], f.compaction_recovery);
  }
  if (f.compaction_checkpoint !== 'awaiting-continuation' || answer !== 'continue') fail('No compaction continuation is pending.');
  f.compaction_checkpoint = 'continued'; // User continuation, not proof of compaction.
  return null;
}

export function compactionAction(f, statePath) {
  if (!compactionRequired(f) || pendingInputs(f).some(record => record.blocking && record.kind !== 'compaction')) return {};
  const recovery = f.compaction_recovery && f.compaction_recovery !== 'none'
    ? path.resolve(path.dirname(statePath), path.basename(f.compaction_recovery)) : null;
  return { next_action: { type: 'compaction', checkpoint: f.compaction_checkpoint,
    ...(recovery ? { recovery, compact_command: `/compact Preserve the current Implement run: state ${JSON.stringify(statePath)}; recovery ${JSON.stringify(recovery)}. Next phase: Write Tests. Preserve decisions, permissions and accepted artifact references; reload their authoritative files on continuation.`,
      resume_invocation: `/make-it-work:implement ${f.ticket}` } : {}),
    instruction: f.compaction_checkpoint === 'pending'
      ? 'Finish applicable accepted-plan publication, then apply compaction-checkpoint with concise notes for decisions not already saved. Do not authorize or dispatch Write Tests yet.'
      : f.compaction_checkpoint === 'offered' ? 'Present the saved compaction question and wait for the user.'
        : 'Display compact_command and the resume invocation. Wait for the user to say continue; do not infer that compaction occurred.' } };
}

// Uses native launch/inventory evidence reconciled by the existing hook runtime.
export function compactionHold(input, fields, { agents = [], tasks = [] } = {}) {
  if (!compactionRequired(fields)) return null;
  if (input.tool_name === 'Agent') return 'Complete the saved compaction checkpoint before dispatching test preparation.';
  if (input.tool_name === 'Bash' && /\bcompaction-checkpoint\b/.test(input.tool_input?.command ?? '') && (agents.length || tasks.length)) return 'Wait for all prior workers and background tasks before saving the compaction checkpoint. Refresh the native agent/task inventory to reconcile stale launch evidence.';
  return null;
}
