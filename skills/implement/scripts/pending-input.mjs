import { fail } from '../../../scripts/lib/artifacts.mjs';

const KINDS = new Set(['question', 'approval', 'triage', 'step', 'slack', 'permission']);
const PHASES = new Set(['context-check', 'close-the-gaps', 'spec-approval', 'plan', 'plan-approval', 'execute', 'review', 'fix-plan', 'final-sync', 'final-approval', 'complete']);
function text(value, name) {
  if (typeof value !== 'string' || !value.trim() || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) fail(`Pending input ${name} must be nonempty text.`);
  return value;
}
function keys(value, allowed, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some((key) => !allowed.includes(key))) fail(`Invalid pending input ${name}.`);
}
function validateChoices(choices, multiSelect) {
  if (!Array.isArray(choices) || typeof multiSelect !== 'boolean') fail('Pending input choices must be an array with an explicit selection mode.');
  for (const choice of choices) {
    keys(choice, ['id', 'label', 'description'], 'choice');
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(choice.id ?? '')) fail('Pending input choice needs a stable ID.');
    text(choice.label, 'choice label');
    if (choice.description !== undefined) text(choice.description, 'choice description');
  }
  if (new Set(choices.map((c) => c.id)).size !== choices.length || new Set(choices.map((c) => c.label)).size !== choices.length) fail('Pending input choices must be unique.');
}
export function validatePendingInput(value) {
  keys(value, ['version', 'id', 'kind', 'phase', 'question', 'choices', 'questions', 'multi_select', 'blocking', 'waiting_for', 'requested_at', 'binding', 'continuation', 'policy'], 'record');
  if (value.version !== 1 || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value.id ?? '') || !KINDS.has(value.kind) || !PHASES.has(value.phase)) fail('Invalid pending input identity, kind or phase.');
  text(value.question, 'question');
  if (typeof value.blocking !== 'boolean' || typeof value.multi_select !== 'boolean' || !['user', 'pm'].includes(value.waiting_for)) fail('Invalid pending input blocking/recipient/selection mode.');
  validateChoices(value.choices, value.multi_select);
  if (value.questions) {
    if (!Array.isArray(value.questions) || !value.questions.length || value.choices.length || value.policy || value.continuation && value.continuation.event !== 'resume-stage') fail('Grouped questions require their own choices and a stage continuation.');
    for (const prompt of value.questions) {
      keys(prompt, ['id', 'question', 'choices', 'multi_select'], 'grouped question');
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(prompt.id ?? '')) fail('Grouped questions need stable IDs.');
      text(prompt.question, 'grouped question'); validateChoices(prompt.choices, prompt.multi_select ?? false);
    }
    if (new Set(value.questions.map((prompt) => prompt.id)).size !== value.questions.length) fail('Grouped question IDs must be unique.');
  }
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value.requested_at ?? '') || !Number.isFinite(Date.parse(value.requested_at))) fail('Pending input needs a captured UTC timestamp.');
  if (value.binding) {
    keys(value.binding, ['kind', 'path', 'sha256', 'strict'], 'binding');
    if (!['artifact', 'handoff', 'package'].includes(value.binding.kind) || !/^[a-f0-9]{64}$/.test(value.binding.sha256 ?? '') || typeof value.binding.strict !== 'boolean') fail('Invalid pending input artifact binding.');
    if (value.binding.kind !== 'package') text(value.binding.path, 'artifact path');
  }
  if (value.continuation) {
    keys(value.continuation, ['event', 'handoff', 'related_failures'], 'continuation');
    if (!['handoff', 'approval', 'final-approval', 'resume-stage'].includes(value.continuation.event)) fail('Invalid pending input continuation.');
    if (value.continuation.event === 'handoff') text(value.continuation.handoff, 'handoff continuation');
    if (value.continuation.related_failures !== undefined && (!Number.isSafeInteger(value.continuation.related_failures) || value.continuation.related_failures < 0)) fail('Invalid pending regression classification count.');
  }
  if (value.policy) {
    keys(value.policy, ['skill', 'site', 'phase', 'kind', 'options', 'multiSelect', 'question'], 'policy');
    const offered = (options) => options.map(({ id, label, description }) => ({ id, label, ...(description === undefined ? {} : { description }) }));
    if (!Array.isArray(value.policy.options) || JSON.stringify(offered(value.policy.options)) !== JSON.stringify(offered(value.choices)) || Boolean(value.policy.multiSelect) !== value.multi_select) fail('Pending policy must match the actual offered choices.');
  }
  if (JSON.stringify(value).length > 65536) fail('Pending input record is too large; retain a concise question.');
  return value;
}
export function createPendingInput(spec, phase, requestedAt) {
  keys(spec, ['id', 'kind', 'question', 'choices', 'questions', 'multi_select', 'blocking', 'waiting_for', 'binding', 'continuation', 'policy'], 'request');
  return validatePendingInput({ version: 1, ...spec, phase, choices: spec.choices ?? [], multi_select: spec.multi_select ?? false,
    blocking: spec.blocking ?? true, waiting_for: spec.waiting_for ?? 'user', requested_at: requestedAt });
}
export function pendingInputs(fields) {
  let records;
  try { records = fields.pending_inputs === undefined || fields.pending_inputs === 'none' ? [] : JSON.parse(fields.pending_inputs); }
  catch { fail('Malformed pending_inputs JSON.'); }
  if (!Array.isArray(records)) fail('pending_inputs must be an array.');
  records.forEach(validatePendingInput);
  if (new Set(records.map((record) => record.id)).size !== records.length || records.filter((record) => record.blocking).length > 1) fail('Pending IDs must be unique, with at most one blocking wait.');
  for (const record of records.filter((record) => record.blocking)) {
    if (!['Paused', 'Stopped'].includes(fields.status) || record.phase !== fields.phase || fields.current_activity !== 'none') fail('Blocking input requires its saved phase, paused/stopped status and no current activity.');
  }
  return records;
}
export function pendingAnswer(record, answer) {
  if (record.questions) {
    keys(answer, record.questions.map((prompt) => prompt.id), 'grouped answer');
    if (Object.keys(answer).length !== record.questions.length) fail('Every grouped question needs an explicit answer.');
    for (const prompt of record.questions) pendingAnswer({ ...prompt, multi_select: prompt.multi_select ?? false }, answer[prompt.id]);
    return { value: answer, label: `Responses received for ${record.questions.map((prompt) => prompt.id).join(', ')}` };
  }
  if (!record.choices.length) return { value: text(answer, 'answer'), label: 'Free-text response received' };
  const ids = Array.isArray(answer) ? answer : [answer];
  if (record.multi_select !== Array.isArray(answer) || !ids.length || new Set(ids).size !== ids.length || ids.some((id) => !record.choices.some((choice) => choice.id === id))) fail('Answer must select the offered pending-input choice IDs.');
  return { value: answer, label: ids.map((id) => record.choices.find((choice) => choice.id === id).label).join('; ') };
}
