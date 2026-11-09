#!/usr/bin/env node
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { args, atomicWrite, cli, digest, fail, jsonInput, requireText, withLock, within } from '../../../scripts/lib/artifacts.mjs';
import { parseState, generateDashboard } from './render-status.mjs';
import { decideNext, validateArtifacts } from './handoff.mjs';
import { approve as approveFinalPackage, checkFinalPackage } from './final-package.mjs';
import { contextInventory } from '../../../scripts/context-inventory.mjs';
import { checkTestingReadiness } from './testing-readiness.mjs';
import { testingPolicy } from './testing-policy.mjs';
import { createPendingInput, pendingAnswer, pendingInputs } from './pending-input.mjs';
import { resolveDecision } from '../../../scripts/autonomy-policy.mjs';
import { planHash } from '../../../scripts/lib/plan.mjs';
import { approvedScope, readScope } from './workspace-scope.mjs';
import { inspectLightweightFix } from './lightweight-fix.mjs';
export { planHash } from '../../../scripts/lib/plan.mjs';

import { snapshot } from '../../../scripts/lib/repo-state.mjs';
import { checkReviewScope } from './review-scope.mjs';
import { implementationBaseline } from './implementation-guard.mjs';
export { snapshot } from '../../../scripts/lib/repo-state.mjs';
function setFields(markdown, fields) {
  return markdown.replace(/(^# Workflow state[^\n]*\n\s*```[^\n]*\n)[\s\S]*?(\n```)/m,
    (_match, begin, end) => begin + Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n') + end);
}
function appendItems(markdown, heading, additions) {
  if (!additions?.length) return markdown;
  const regex = new RegExp(`(^## ${heading}\\s*\\n)([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm');
  return markdown.replace(regex, (_match, title, body) => {
    const rows = body.trim() === 'None' ? [] : body.trim().split('\n').filter(Boolean);
    return `${title}\n${[...new Set([...rows, ...additions.map((item) => `- ${requireText(item, heading)}`)])].join('\n')}\n\n`;
  });
}
function explicit(input) {
  if (input.source !== 'user' || !['question', 'chat'].includes(input.via)) fail('This event requires an explicit user decision.');
}
const adaptive = (f) => f.adaptive_version === '1';
const nextAutonomy = (f) => f.queued_autonomy && f.queued_autonomy !== 'none' ? f.queued_autonomy : f.autonomy;
// Adaptive runs leave spec acceptance for the phase their assessed mode selects.
function afterSpec(f) {
  if (!adaptive(f)) return 'plan';
  if (f.mode === 'none') fail('Risk assessment required before leaving spec acceptance.');
  return f.mode === 'lightweight' ? 'lightweight' : 'plan';
}
function startFix(f) {
  if (Number(f.fix_cycle) >= 3) fail('Fix round limit reached.');
  f.fix_cycle = String(Number(f.fix_cycle) + 1);
}
function reviewChangedScope(f) {
  f.phase = 'review'; f.review = 'not-started';
  if (Number(f.review_cycle) >= 4) {
    f.status = 'Stopped'; f.pause_reason = 'Review limit reached while aligning final delivery scope.';
    return f.pause_reason;
  }
  return 'Delivery scope changed after review; independently review the final delivery diff before packaging.';
}
function escalate(f, input, reason) {
  if (!adaptive(f) || f.mode !== 'lightweight' || f.escalations !== '0') fail('Escalation needs a Lightweight run with no prior escalation.');
  Object.assign(f, { phase: 'plan', mode: 'tdd', escalations: '1', review_cycle: '0', fix_cycle: '0', review: 'not-started',
    fix_plan_round_steps: 'none', fix_plan_dispatch: 'none' });
  if (input.risk !== undefined) {
    if (!['medium', 'high'].includes(input.risk)) fail('An escalated risk must be medium or high.');
    f.risk = input.risk;
  }
  if (input.rationale !== undefined) f.risk_rationale = oneLine(input.rationale, 'Risk rationale');
  const text = requireText(reason, 'Escalation reason');
  return text.startsWith('Escalation:') ? text : `Escalation: ${text}`;
}
function oneLine(value, label) {
  const text = requireText(value, label);
  if (/[\r\n]/.test(text)) fail(`${label} must be one line.`);
  return text;
}

export function transition(state, input, handoff = null, routeOptions = {}) {
  const before = state.fields;
  const f = { ...before };
  if (['Paused', 'Stopped'].includes(f.status) && !['scope-update', 'await-input', 'input-answered', 'autonomy', 'mode', 'resume', 'accept-workspace', 'stop', 'pause'].includes(input.event)) fail('Resume the saved run before transitioning it.');
  let reason = input.reason || input.event;
  let action;
  if (input.event === 'handoff') {
    if (before.status !== 'In Progress') fail('Resume the run before applying a handoff.');
    if (!handoff) fail('Handoff required.');
    if (input.choice !== undefined) explicit(input);
    action = decideNext(state, handoff, { ...routeOptions, choice: input.choice, ...(input.escalate ? { escalate: input.escalate } : {}) });
    if (action.action === 'triage') return { pending: action };
    if (action.action === 'ask') return { fields: f, reason: action.reason, pending: action };
    reason = action.reason;
    if (handoff.status === 'done') {
      if (handoff.stage === 'gaps' && handoff.outcome === 'SPEC_SAVED') f.spec = handoff.artifacts.spec;
      if (handoff.stage === 'plan') {
        f.plan = handoff.artifacts.plan;
        if (handoff.data.mode === 'amend' && action.operation !== 'replan') {
          const count = handoff.data.steps_added;
          f.fix_plan_round_steps = count ? String(count) : 'none';
          if (count) { if (Number(f.fix_cycle) >= 3) fail('Fix round limit reached.'); f.fix_cycle = String(Number(f.fix_cycle) + 1); }
        }
      }
      if (handoff.stage === 'execute') {
        f.execution = { PASSED: 'passed', VERIFIED_MANUALLY: 'verified-manually', GUARDRAIL: 'guardrail', RETRY_LIMIT: 'retry-limit', GATE_FAILED: 'gate-failed', GATE_NO_RESULT: 'gate-no-result', EXECUTE_STOPPED: 'stopped' }[handoff.outcome];
        f.gate = handoff.data.gate;
        f.execute_report = handoff.artifacts.report;
      }
      if (handoff.stage === 'implement') f.implementation_report = handoff.artifacts.report;
      if (handoff.stage === 'review') f.review = { CLEAN: 'clean', FIX_REQUIRED: 'fix-required', REPLAN_REQUIRED: 'replan-required', HUMAN_DECISION: 'human-decision' }[handoff.outcome];
      const updated = handoff.data.context_updated ?? [];
      const previous = f.context_updated === 'none' ? [] : f.context_updated.split(', ');
      if (updated.length) f.context_updated = [...new Set([...previous, ...updated])].join(', ');
    }
    if (action.operation === 'manual-walkthrough' && input.manual_evidence_complete !== true) fail('Manual walkthrough must be performed before advancing.');
    if (action.operation === 'replan') {
      if (Number(f.replans_used) >= 2) fail('Replan limit reached.');
      f.replans_used = String(Number(f.replans_used) + 1);
      f.plan_version = String(Number(f.plan_version) + 1);
      Object.assign(f, { review_cycle: '0', fix_cycle: '0', fix_plan_round_steps: 'none', fix_plan_dispatch: 'none', execution: 'not-started', review: 'not-started', execution_mode: 'none', inline_pause_mode: 'none' });
    }
    if (action.operation === 'fix') startFix(f);
    if (action.operation === 'escalate') reason = escalate(f, input, action.reason);
    if (action.action === 'phase') f.phase = action.phase;
    if (handoff.stage === 'gaps' && handoff.outcome === 'SPEC_SAVED' && f.spec_revision_pending === 'true' && action.action === 'phase') f.phase = 'spec-approval';
    if (action.action === 'stop') { f.status = 'Stopped'; f.pause_reason = reason; }
    if (action.action === 'pause') { f.status = 'Paused'; f.pause_reason = action.pause_reason; }
  } else if (input.event === 'context-ready') {
    if (f.phase !== 'context-check' || f.status !== 'In Progress') fail('Context check is not active.');
    f.phase = input.reuse_spec ? 'plan' : 'close-the-gaps';
    if (input.reuse_spec) {
      explicit(input);
      f.spec = requireText(input.spec, 'Accepted spec path');
      if (input.plan) f.plan = requireText(input.plan, 'Accepted plan path');
      if (adaptive(f) && input.plan && f.mode !== 'tdd') fail('A reused plan requires mode: tdd.');
      if (adaptive(f) && !input.plan) f.phase = nextAutonomy(f) === 'guided' ? (afterSpec(f), 'spec-approval') : afterSpec(f);
    }
  } else if (['approve', 'redo', 'skip-approval'].includes(input.event)) {
    if (!['spec-approval', 'plan-approval'].includes(f.phase)) fail('No spec/plan approval is pending.');
    if (input.event === 'skip-approval') { if (f.autonomy === 'guided' || f.spec_revision_pending === 'true') fail('Required spec/plan approval cannot be skipped.'); }
    else explicit(input);
    if (f.phase === 'spec-approval' && input.event === 'approve' && f.spec_revision_pending === 'true') f.spec_revision_pending = 'false';
    f.phase = input.event === 'redo' ? (f.phase === 'spec-approval' ? 'close-the-gaps' : 'plan') : (f.phase === 'spec-approval' ? afterSpec(f) : 'execute');
  } else if (input.event === 'sync-complete') {
    if (f.phase !== 'final-sync' || f.review !== 'clean') fail('Final sync requires a clean review.');
    if (input.context_updated !== undefined) {
      if (!Array.isArray(input.context_updated)) fail('context_updated must be an array of paths.');
      const updated = input.context_updated.map((file) => oneLine(file, 'Context path'));
      if (updated.some((file) => /, /.test(file))) fail('Context paths cannot contain the field separator ", ".');
      const previous = !f.context_updated || f.context_updated === 'none' ? [] : f.context_updated.split(', ');
      f.context_updated = [...new Set([...previous, ...updated])].join(', ') || 'none';
    }
    if (f.review_scope_version === '1' && typeof input.delivery_scope_changed !== 'boolean') fail('Final sync requires a delivery-scope coverage check.');
    if (f.review_scope_version === '1' && input.delivery_scope_changed) {
      reason = reviewChangedScope(f);
    } else {
      f.phase = f.final_package_version === '1' ? 'final-approval' : 'complete';
      if (f.phase === 'complete') f.status = 'Complete';
    }
  } else if (input.event === 'refresh-review') {
    if (f.review_scope_version !== '1' || !['final-sync', 'final-approval'].includes(f.phase) || f.status !== 'In Progress') fail('Refresh review requires an active finalization phase with delivery-scope checks.');
    if (input.delivery_scope_changed !== true) fail('Delivery scope is already reviewed; no review refresh is needed.');
    reason = reviewChangedScope(f);
  } else if (input.event === 'complete') {
    if (f.phase !== 'final-approval' || f.review !== 'clean') fail('Completion requires final approval and clean review.');
    f.phase = 'complete'; f.status = 'Complete';
  } else if (input.event === 'mode') {
    if (!adaptive(f)) fail('Run modes need adaptive_version: 1.');
    if (!['low', 'medium', 'high'].includes(input.risk)) fail('Invalid risk.');
    if (!['lightweight', 'tdd'].includes(input.mode)) fail('Invalid mode.');
    if (input.source === 'user') {
      if (!['question', 'chat', 'flag'].includes(input.via)) fail('This event requires an explicit user decision.');
    } else if (input.source !== 'assessed') fail('Mode source must be assessed or user.');
    if (input.source === 'assessed' && input.mode !== (input.risk === 'low' ? 'lightweight' : 'tdd')) fail('An assessed mode must follow its risk level.');
    if (f.mode === 'tdd' && input.mode === 'lightweight' && input.source !== 'user') fail('Only the user can downgrade a run to Lightweight.');
    const started = !['context-check', 'close-the-gaps', 'spec-approval'].includes(f.phase);
    if (f.mode === 'lightweight' && input.mode === 'tdd' && started) fail('Use escalate to move a started Lightweight run to TDD.');
    if (f.mode_source === 'user' && input.source === 'assessed' && f.mode !== 'none') {
      Object.assign(f, { risk: input.risk, risk_rationale: oneLine(input.rationale, 'Risk rationale') });
    } else {
      Object.assign(f, { risk: input.risk, mode: input.mode, mode_source: input.source, risk_rationale: oneLine(input.rationale, 'Risk rationale') });
    }
    reason = `Implementation mode: ${f.mode} (${f.risk} risk, ${f.mode_source}) — ${f.risk_rationale}`;
  } else if (input.event === 'escalate') {
    if (f.status !== 'In Progress') fail('Resume the run before escalating.');
    if (input.source === 'user') explicit(input);
    reason = escalate(f, input, input.reason);
  } else if (input.event === 'lightweight-fix') {
    if (!adaptive(f) || f.mode !== 'lightweight' || f.phase !== 'final-approval') fail('A Lightweight change request starts only from final approval.');
    explicit(input);
    requireText(input.reason, 'Requested changes');
    startFix(f);
    f.phase = 'lightweight';
  } else if (input.event === 'autonomy') {
    explicit(input);
    if (!['guided', 'autonomous', 'autopilot'].includes(input.mode)) fail('Invalid autonomy.');
    if (f.status === 'Complete') fail('A completed run has no remaining phase for an autonomy change.');
    const previous = f.queued_autonomy ?? 'none';
    f.queued_autonomy = input.mode === f.autonomy ? 'none' : input.mode;
    reason = f.queued_autonomy === 'none'
      ? `Decision: Autonomy ${previous === 'none' ? 'reaffirmed' : 'queue cancelled'}; current mode remains ${f.autonomy}`
      : `Decision: Autonomy queued ${f.queued_autonomy} after ${f.phase}; current mode remains ${f.autonomy}${previous !== 'none' && previous !== f.queued_autonomy ? `; replaces queued ${previous}` : ''}`;
    reason += `; source: user; via: ${input.via}`;
  } else if (input.event === 'resume') {
    if (f.status === 'Complete') fail('A completed run cannot be resumed.');
    if (pendingInputs(f).some((record) => record.blocking)) {
      if (f.status === 'Stopped' && input.blocker_resolved === true) {
        f.status = 'Paused';
        return { fields: f, reason: 'Saved stop resolved; the input still requires its explicit answer.' };
      }
      return { fields: f, unchanged: true, reason: 'The saved input is still pending.' };
    }
    if (f.phase === 'close-the-gaps' && f.spec_revision_pending === 'true' && ['Paused', 'Stopped'].includes(f.status)) explicit(input);
    if (['Paused', 'Stopped'].includes(f.status) && input.blocker_resolved !== true) fail('Resolve the saved blocker before resuming.');
    f.status = 'In Progress'; f.pause_reason = 'none';
  } else if (input.event === 'spec-conflict') {
    if (!['plan', 'plan-approval', 'fix-plan', 'execute', 'lightweight', 'review', 'final-sync', 'final-approval'].includes(f.phase) || f.status !== 'In Progress') fail('Spec conflicts require active dependent work.');
    if (pendingInputs(f).some((record) => record.blocking)) fail('Resolve the pending input before returning to refinement.');
    reason = `Spec conflict: ${oneLine(input.reason, 'Spec conflict evidence and decision')}`;
    const previousPlan = f.plan && f.plan !== 'none' ? f.plan : 'none';
    Object.assign(f, { phase: 'close-the-gaps', status: 'Paused', pause_reason: reason, spec_revision_pending: 'true',
      spec_previous_plan: previousPlan, plan: 'none', plan_hash: 'none', testing_readiness: 'none',
      plan_version: String(Number(f.plan_version) + (previousPlan === 'none' ? 0 : 1)),
      review: 'not-started', review_cycle: '0', fix_cycle: '0', fix_plan_round_steps: 'none', fix_plan_dispatch: 'none',
      execution: 'not-started', execute_report: 'none', gate: 'none', execution_mode: 'none', inline_pause_mode: 'none' });
  } else if (input.event === 'scope-update') {
    explicit(input);
    if (f.workspace_version !== '1' || f.status === 'Complete') fail('Scope changes require an active workspace run.');
    requireText(input.reason, 'Scope change reason');
    if (pendingInputs(f).some((record) => record.blocking)) fail('Resolve the pending input before changing scope.');
    f.scope_previous_plan = f.plan !== 'none' ? f.plan : f.scope_previous_plan ?? 'none';
    f.scope_change_reason = input.reason;
    Object.assign(f, { status: 'In Progress', pause_reason: 'none', phase: 'context-check', plan: 'none', plan_hash: 'none', testing_readiness: 'none',
      plan_version: String(Number(f.plan_version) + 1), review: 'not-started', review_cycle: '0', fix_cycle: '0',
      fix_plan_round_steps: 'none', fix_plan_dispatch: 'none', execution: 'not-started', execute_report: 'none', gate: 'none', context_updated: 'none' });
    if (adaptive(f)) Object.assign(f, { mode: 'tdd', mode_source: 'assessed', risk: 'medium', risk_rationale: 'Repository scope changed; reassess the retained spec before planning.' });
    reason = `Repository scope changed; revalidate context and retained spec, then replan. ${input.reason}`;
  } else if (input.event === 'accept-workspace') {
    explicit(input);
    requireText(input.reason, 'Accepted workspace reason');
    if (f.status === 'Complete') fail('A completed package cannot accept a changed workspace.');
  } else if (input.event === 'await-input') {
    if (f.status === 'Complete') fail('Completed-run delivery waits belong to the delivery journal.');
    if (f.status === 'Stopped') fail('Resolve the saved stop before requesting input.');
    requireText(input.pending?.id, 'Pending input id');
  } else if (input.event === 'input-answered') {
    // The caller already validated the saved request and response before clearing it.
  } else if (input.event === 'stop' || input.event === 'pause') {
    if (f.status === 'Complete') fail('A completed run stays complete.');
    requireText(input.reason, 'Stop reason');
    f.status = input.event === 'stop' ? 'Stopped' : 'Paused'; f.pause_reason = input.reason;
    if (input.event === 'stop') {
      const records = pendingInputs(before);
      const cancelled = records.filter((record) => record.blocking);
      if (cancelled.length) {
        f.pending_inputs = JSON.stringify(records.filter((record) => !record.blocking));
        reason += ` Pending input ${cancelled.map((record) => record.id).join(', ')} cancelled without an answer.`;
      }
    }
  } else fail(`Unsupported workflow event: ${input.event}`);
  if (before.status === 'Complete' && !['autonomy', 'input-answered'].includes(input.event)) fail('A completed run stays complete.');
  let autonomyNote;
  if (f.phase !== before.phase && f.queued_autonomy && f.queued_autonomy !== 'none') {
    if (f.status === 'Complete') {
      autonomyNote = `Queued autonomy ${f.queued_autonomy} not applied: no remaining phase; completed under ${f.autonomy}.`;
    } else {
      autonomyNote = `Autonomy applied at phase boundary: ${f.autonomy} to ${f.queued_autonomy} (queued user request).`;
      f.autonomy = f.queued_autonomy;
    }
    f.queued_autonomy = 'none';
  }
  if (f.phase === 'review' && before.phase !== 'review' && f.status === 'In Progress') {
    if (Number(f.review_cycle) >= 4) fail('Review limit reached.');
    f.review_cycle = String(Number(f.review_cycle) + 1);
  }
  if (f.phase === 'fix-plan' && before.phase !== 'fix-plan') Object.assign(f, { fix_plan_round_steps: 'none', fix_plan_dispatch: 'none' });
  if (f.phase !== before.phase || f.status !== before.status || f.status !== 'In Progress') {
    f.current_activity = 'none';
    if (Object.hasOwn(f, 'current_activity_updated_at')) f.current_activity_updated_at = 'none';
  }
  return { fields: f, reason, action, ...(autonomyNote ? { autonomyNote } : {}) };
}
async function refresh(statePath) {
  try { const info = await lstat(statePath.replace(/-state\.md$/, '-status.html')); if (!info.isFile()) fail('Dashboard must be a regular file.'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  return generateDashboard(statePath);
}
async function loadHandoff(root, state, input) {
  if (input.event !== 'handoff') return null;
  const file = await within(root, input.handoff);
  const handoff = await validateArtifacts(JSON.parse(await readFile(file, 'utf8')), root, { requireClauses: state.fields.acceptance_evidence_version === '1' });
  const directory = path.join(root, 'make-it-work', state.fields.ticket, `${state.fields.ticket}-handoffs`);
  const number = path.basename(file).match(new RegExp(`^${handoff.stage}-([1-9]\\d*)\\.json$`));
  if (!number || path.dirname(file) !== directory) fail('Invalid handoff location.');
  const numbers = (await readdir(directory)).map((name) => name.match(new RegExp(`^${handoff.stage}-([1-9]\\d*)\\.json$`))).filter(Boolean).map((match) => Number(match[1]));
  if (Number(number[1]) !== Math.max(...numbers)) fail('Handoff is stale.');
  return handoff;
}
const APPROVAL_CHOICES = [{ id: 'approve', label: 'Approve' }, { id: 'redo', label: 'Request changes' }, { id: 'stop', label: 'Stop' }];
async function bindingFor(root, ticket, relative, kind, strict) {
  if (typeof relative !== 'string' || !relative.startsWith(`make-it-work/${ticket}/`) || path.posix.normalize(relative) !== relative) fail('Pending input artifacts must belong to the ticket run.');
  const file = await within(root, relative);
  const runRoot = await realpath(path.join(root, 'make-it-work', ticket));
  if (!(await realpath(file)).startsWith(`${runRoot}${path.sep}`)) fail('Pending input artifact escapes the ticket run.');
  return { kind, path: relative, sha256: digest(await readFile(file)), strict };
}
async function checkBinding(root, statePath, record) {
  const binding = record.binding;
  if (!binding?.strict) return;
  const hash = binding.kind === 'package' ? (await checkFinalPackage(root, statePath)).sha256 : digest(await readFile(await within(root, binding.path)));
  if (hash !== binding.sha256) fail('Pending approval/input is stale; present a new request for the changed artifact.');
  if (binding.kind === 'handoff') await loadHandoff(root, parseState(await readFile(statePath, 'utf8'), statePath), { event: 'handoff', handoff: binding.path });
}
function remainingFields(fields, id) {
  const record = pendingInputs(fields).find((entry) => entry.id === id);
  if (!record) fail('This input is no longer pending; inspect the current request.');
  const next = { ...fields, pending_inputs: JSON.stringify(pendingInputs(fields).filter((entry) => entry.id !== id)) };
  if (record.blocking && fields.status === 'Paused') {
    Object.assign(next, { status: 'In Progress', pause_reason: 'none', current_activity: 'none' });
    if (Object.hasOwn(next, 'current_activity_updated_at')) next.current_activity_updated_at = 'none';
  }
  return { fields: next, record };
}
async function resolveInput(root, statePath, state, input) {
  const { fields, record } = remainingFields(state.fields, input.pending_id);
  let response;
  if (input.source === 'user') { explicit(input); response = pendingAnswer(record, input.answer); }
  else if (input.source === 'pm' && input.via === 'slack' && record.kind === 'slack' && record.waiting_for === 'pm') {
    requireText(input.reply_reference, 'Actual PM reply reference'); response = pendingAnswer(record, input.answer);
  } else if (['autopilot', 'policy'].includes(input.source) && input.via === 'policy' && record.policy) {
    const result = resolveDecision({ ...record.policy, mode: state.fields.autonomy });
    if (result.action !== 'chosen' || result.source !== input.source) fail('The current policy cannot answer this pending request.');
    response = pendingAnswer(record, result.choice_id);
  } else fail('Resolving input requires an explicit answer or the saved documented policy.');
  const nonPositiveApproval = record.kind === 'approval' && ['approval', 'final-approval'].includes(record.continuation?.event) && ['redo', 'stop'].includes(response.value);
  if (!nonPositiveApproval) await checkBinding(root, statePath, record);
  let nextInput = { ...input, event: 'input-answered' };
  let finalApproval = null;
  const continuation = record.continuation;
  if (record.blocking && state.fields.status === 'Stopped') fail('Resolve the saved correctness/limit stop before applying an answer.');
  if (continuation?.event === 'handoff') {
    nextInput = { ...input, ...continuation };
    if (input.source === 'user') nextInput.choice = response.value;
  } else if (continuation?.event === 'approval' || continuation?.event === 'final-approval') {
    if (input.source !== 'user') fail('Artifact approval requires an explicit user answer.');
    if (response.value === 'stop') {
      nextInput.event = 'stop'; nextInput.reason = 'Developer stopped at artifact approval.';
    }
    else if (continuation.event === 'approval') nextInput.event = response.value === 'approve' ? 'approve' : 'redo';
    else if (response.value === 'approve') {
      finalApproval = record.binding.sha256; nextInput.event = 'complete';
    }
  } else if (record.kind === 'step' && response.value === 'stop') {
    nextInput.event = 'stop'; nextInput.reason = 'Developer stopped after inline step verification.';
  }
  return { state: { ...state, fields }, input: nextInput, record, response, finalApproval, nonPositiveApproval };
}

function contextAction(fields) {
  return { next_action: { type: 'stage', phase: fields.phase,
    instruction: `Continue ${fields.phase} now using its documented stage skill. Context check does not authorize application edits. Do not implement directly or end the turn while work remains active.` } };
}

function reviewScopeAction(fields, event) {
  return ['sync-complete', 'refresh-review'].includes(event) && fields.phase === 'review' && fields.status === 'In Progress'
    ? { next_action: { type: 'stage', phase: 'review', instruction: 'Prepare the current full delivery scope with review-scope.mjs, then dispatch independent review. Do not build a final package until that scope is reviewed.' } } : {};
}

export async function applyWorkflow({ root, statePath, input, render = refresh }) {
  root = await realpath(root);
  statePath = await within(root, statePath);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(input.id ?? '')) fail('A stable event id is required.');
  if (input.event === 'input-answered') fail('Input answers must use resolve-input.');
  return withLock(statePath, async () => {
    const original = await readFile(statePath, 'utf8');
    const state = parseState(original, statePath);
    const eventHash = digest(JSON.stringify(input));
    const marker = `[workflow-event: ${input.id}; sha256: ${eventHash}]`;
    const prior = state.audit.find((row) => row.outcome.includes(`[workflow-event: ${input.id};`));
    if (prior) {
      if (!prior.outcome.includes(marker)) fail('Event id already records a different event.');
      return { replayed: true, ...(input.event === 'context-ready' ? contextAction(state.fields) : reviewScopeAction(state.fields, input.event)), fields: state.fields, pending: pendingInputs(state.fields), dashboard: await render(statePath) };
    }
    if (input.expected_hash !== digest(original)) fail('Workflow state changed; inspect and recompute the event.');
    let workingState = state, effective = input, resolution = null, replaced = null;
    if (input.event === 'resolve-input') {
      resolution = await resolveInput(root, statePath, state, input);
      workingState = resolution.state; effective = resolution.input;
    } else if (input.event === 'refresh-input') {
      const removed = remainingFields(state.fields, input.pending_id);
      if (input.pending?.id === input.pending_id) fail('A refreshed question needs a new pending ID.');
      let stale = false;
      if (removed.record.binding?.strict) {
        try { await checkBinding(root, statePath, removed.record); }
        catch { stale = true; }
      }
      if (!stale) explicit(input);
      replaced = removed.record;
      workingState = { ...state, fields: removed.fields };
      effective = { ...input, event: 'await-input' };
    } else if (['skip-approval', 'complete'].includes(input.event) && state.fields.autonomy !== 'guided') {
      const waiting = pendingInputs(state.fields).find((record) => record.blocking && record.kind === 'approval');
      if (waiting && (input.event === 'skip-approval' && state.fields.spec_revision_pending !== 'true' && waiting.continuation?.event === 'approval' || input.event === 'complete' && waiting.continuation?.event === 'final-approval')) {
        workingState = { ...state, fields: remainingFields(state.fields, waiting.id).fields };
      }
    }
    const lifecycle = ['await-input', 'resolve-input', 'refresh-input'].includes(input.event);
    const reposInput = input.repos ?? (lifecycle && state.fields.workspace_snapshot ? JSON.parse(state.fields.workspace_snapshot).map((repo) => repo.root) : null);
    if (input.event === 'resume' && !input.repos) fail('Resume requires repository fingerprint checks.');
    if (state.fields.workspace_snapshot && !reposInput && input.event !== 'autonomy') fail('Supply the checkpoint repository roots.');
    let workspaceContract = state.fields.workspace_version === '1' ? JSON.parse(state.fields.workspace_contract) : null;
    if (input.event === 'scope-update') workspaceContract = await approvedScope(root, state.fields.ticket, reposInput ?? []);
    if (workspaceContract && !['scope-update', 'stop', 'pause', 'autonomy'].includes(input.event)) {
      const scope = await readScope(root, state.fields.ticket);
      if (scope.hash !== workspaceContract.approval_hash || scope.status !== 'applied' || scope.approval?.hash !== scope.hash) fail('Repository selection is pending; approve, apply and register the scope update first.');
    }
    if (workspaceContract && reposInput) {
      const actual = (await Promise.all(reposInput.map((repo) => realpath(repo)))).sort();
      if (JSON.stringify(actual) !== JSON.stringify(workspaceContract.repos.map((repo) => repo.root).sort())) fail('Repository scope changed without explicit selection approval.');
      const current = await snapshot(actual);
      if (!['stop', 'pause', 'autonomy'].includes(input.event) && current.some((repo) => repo.branch !== workspaceContract.repos.find((entry) => entry.root === repo.root).branch)) fail('Branch differs from the approved repository selection.');
    }
    const handoff = await loadHandoff(root, workingState, effective);
    if (effective.event === 'sync-complete' && effective.context_updated !== undefined) {
      if (!Array.isArray(effective.context_updated)) fail('context_updated must be an array of paths.');
      const approvedRoots = await Promise.all((reposInput ?? [root]).map((repo) => realpath(repo)));
      for (const file of effective.context_updated) {
        oneLine(file, 'Context path');
        const resolved = await realpath(path.resolve(root, file));
        if (!approvedRoots.some((repo) => resolved.startsWith(`${repo}${path.sep}`)) || !(await lstat(resolved)).isFile()) fail('Context path must be a file in an approved repository.');
      }
    }
    if (state.fields.review_scope_version === '1') {
      if (handoff?.stage === 'review' && handoff.status === 'done' && handoff.outcome === 'CLEAN') await checkReviewScope(root, statePath);
      if (['sync-complete', 'refresh-review'].includes(effective.event)) effective = { ...effective, delivery_scope_changed: !(await checkReviewScope(root, statePath, { requireCurrent: false })).covered };
    }
    if (handoff?.stage === 'implement' && handoff.status === 'done' && state.fields.mode === 'lightweight' && Number(state.fields.fix_cycle) > 0) {
      await inspectLightweightFix(root, statePath, handoff.artifacts.report);
    }
    if (handoff?.stage === 'plan' && handoff.status === 'done' && Object.hasOwn(state.fields, 'testing_readiness')) {
      const policy = testingPolicy(await readFile(await within(root, handoff.artifacts.plan), 'utf8'), { required: true });
      await checkTestingReadiness(root, state, { plan: await readFile(await within(root, handoff.artifacts.plan), 'utf8') });
      if (workspaceContract && (workspaceContract.repos.filter((repo) => repo.role === 'product').some((repo) => !policy.some((row) => row.Repo === repo.id))
          || policy.some((row) => !workspaceContract.repos.some((repo) => repo.id === row.Repo)))) fail('Verification policy must cover approved product repos and cannot add unapproved repos.');
    }
    let previousReview = effective.previous_review ? JSON.parse(await readFile(await within(root, effective.previous_review), 'utf8')) : null;
    if (handoff?.stage === 'review' && handoff.review_cycle > 1) {
      const directory = path.join(root, 'make-it-work', state.fields.ticket, `${state.fields.ticket}-handoffs`);
      const candidates = [];
      for (const name of (await readdir(directory)).filter((name) => /^review-[1-9]\d*\.json$/.test(name))) {
        const candidate = JSON.parse(await readFile(await within(root, path.join(directory, name)), 'utf8'));
        if (candidate.plan_version === handoff.plan_version && candidate.review_cycle === handoff.review_cycle - 1 && candidate.status === 'done') candidates.push({ name, candidate });
      }
      candidates.sort((a, b) => Number(b.name.match(/-(\d+)\.json$/)[1]) - Number(a.name.match(/-(\d+)\.json$/)[1]));
      if (!candidates.length) fail('Previous review handoff is missing for this plan version.');
      previousReview = candidates[0].candidate;
    }
    if (input.event === 'context-ready') {
      for (const repo of workspaceContract?.repos ?? [{ root, id: path.basename(root) }]) {
        const context = await contextInventory(repo.root);
        if (!context.complete) fail(`Project context incomplete in ${repo.id}: ${context.missing_context.join(', ')}`);
      }
    }
    const next = transition(workingState, effective, handoff, { relatedFailures: effective.related_failures ?? null, previousReview });
    if (next.pending && !next.fields) return next; // Internal regression triage is work, not a question to the user.
    if (next.unchanged) return { fields: state.fields, pending: pendingInputs(state.fields), dashboard: await render(statePath) };
    const f = next.fields;
    if (f.testing_readiness_version === '1' && f.phase === 'execute' && state.fields.phase !== 'execute') await checkTestingReadiness(root, { ...state, fields: f }, { plan: await readFile(await within(root, f.plan), 'utf8') });
    if (input.event === 'scope-update') {
      f.workspace_contract = JSON.stringify(workspaceContract);
      f.branch = workspaceContract.repos[0].branch;
      f.base = workspaceContract.repos[0].base;
    }
    const preserveBaseline = input.event === 'autonomy'
      || resolution && (!resolution.record.blocking || resolution.nonPositiveApproval)
      || effective.event === 'await-input' && effective.pending?.blocking === false
      || lifecycle && state.fields.controller_version !== '1'
      || ['stop', 'pause'].includes(input.event) && pendingInputs(state.fields).some((record) => record.blocking);
    if (reposInput && !preserveBaseline) {
      const repos = await snapshot(reposInput);
      if (input.event === 'resume' || resolution?.record.blocking || workingState !== state && !resolution) {
        if (state.fields.workspace_snapshot && state.fields.workspace_snapshot !== JSON.stringify(repos)) fail('Workspace changed since checkpoint.');
        if (!state.fields.workspace_snapshot) fail('Legacy resume requires the existing fingerprint comparison; no snapshot backfill.');
      }
      f.workspace_snapshot = JSON.stringify(repos);
      f.head = repos[0].head;
      f.worktree_fingerprint = digest(JSON.stringify(repos));
    }
    for (const name of ['spec', 'plan']) if (!preserveBaseline && f[name] !== 'none') {
      const content = await readFile(await within(root, f[name]), 'utf8');
      const hash = name === 'plan' ? planHash(content) : digest(content);
      if (input.event === 'resume' && f[`${name}_hash`] !== hash) fail(`${name} changed since checkpoint.`);
      f[`${name}_hash`] = hash;
    }
    let request = effective.event === 'await-input' ? { ...effective.pending } : null;
    if (request?.kind === 'step' && !request.questions) request.choices ??= [{ id: 'continue', label: 'Continue' }, { id: 'stop', label: 'Stop' }];
    if (effective.event === 'await-input' && request.continuation && request.continuation.event !== 'resume-stage') fail('Approval and handoff continuations are controller-owned.');
    if (request?.binding) {
      const supplied = request.binding;
      const actual = supplied.kind === 'package' ? { kind: 'package', sha256: (await checkFinalPackage(root, statePath)).sha256, strict: true }
        : await bindingFor(root, f.ticket, supplied.path, supplied.kind, supplied.strict);
      if (supplied.sha256 && actual.sha256 !== supplied.sha256) fail('Shown artifact hash does not match the pending request.');
      request.binding = actual;
    }
    if (next.pending?.action === 'ask') {
      request = { id: `${input.id}:input`, kind: 'question', question: next.pending.questions?.join('\n') ?? next.pending.reason,
        choices: (next.pending.choices ?? []).map((id) => ({ id, label: id.replaceAll('-', ' ') })),
        continuation: handoff.status === 'needs_input' ? { event: 'resume-stage' } : { event: 'handoff', handoff: effective.handoff, ...(effective.related_failures === undefined ? {} : { related_failures: effective.related_failures }) },
        binding: await bindingFor(root, f.ticket, effective.handoff, 'handoff', true) };
    } else if (handoff?.outcome === 'QUESTIONS_SENT') {
      request = { id: `${input.id}:pm`, kind: 'slack', waiting_for: 'pm', question: 'Waiting for the Product Manager to answer the saved refinement questions.', choices: [], binding: await bindingFor(root, f.ticket, handoff.artifacts.questions, 'artifact', false) };
    } else if ((f.autonomy === 'guided' || f.spec_revision_pending === 'true' && f.phase === 'spec-approval') && ['spec-approval', 'plan-approval'].includes(f.phase) && f.phase !== state.fields.phase) {
      const artifact = f.phase === 'spec-approval' ? 'spec' : 'plan';
      request = { id: `${input.id}:approval`, kind: 'approval', question: `Approve the ${artifact === 'spec' ? 'refined specification' : 'implementation plan'}?`, choices: APPROVAL_CHOICES,
        continuation: { event: 'approval' }, binding: await bindingFor(root, f.ticket, f[artifact], 'artifact', false) };
    }
    if (request && request.kind === 'approval' && f.phase === 'final-approval') {
      const pkg = await checkFinalPackage(root, statePath);
      if (request.binding && request.binding.sha256 !== pkg.sha256) fail('Final approval must reference the current exact package.');
      request.binding = { kind: 'package', sha256: pkg.sha256, strict: true };
      request.continuation = { event: state.fields.controller_version === '1' ? 'final-approval' : 'resume-stage' };
    }
    if (request?.kind === 'approval' && ['spec-approval', 'plan-approval', 'final-approval'].includes(f.phase)) {
      request.choices ??= APPROVAL_CHOICES;
      if (JSON.stringify(request.choices.map((choice) => choice.id)) !== JSON.stringify(APPROVAL_CHOICES.map((choice) => choice.id))) fail('Artifact approval choices must be approve, redo and stop.');
      if (f.phase !== 'final-approval') {
        request.continuation = { event: state.fields.controller_version === '1' ? 'approval' : 'resume-stage' };
        request.binding ??= await bindingFor(root, f.ticket, f[f.phase === 'spec-approval' ? 'spec' : 'plan'], 'artifact', false);
      }
    }
    if (request) {
      const records = pendingInputs(f);
      if (records.some((record) => record.id === request.id || record.blocking && request.blocking !== false)) fail('An unresolved pending input cannot be replaced; inspect or resolve it first.');
      if (state.audit.some((row) => row.outcome.includes(`[pending-input: ${request.id}]`) || row.outcome.startsWith(`Input ${request.id} resolved:`))) fail('Pending input IDs cannot be reused for a later request.');
      const requiredSpecApproval = f.spec_revision_pending === 'true' && f.phase === 'spec-approval' && request.kind === 'approval';
      if (f.autonomy === 'autopilot' && request.blocking !== false && request.kind !== 'slack' && !requiredSpecApproval) fail('Autopilot cannot open an interactive wait; apply its documented default or hard stop.');
      const record = createPendingInput(request, f.phase, new Date().toISOString());
      f.pending_inputs = JSON.stringify([...records, record]);
      if (record.blocking) {
        Object.assign(f, { status: 'Paused', pause_reason: record.question.replaceAll('\n', ' '), current_activity: 'none' });
        if (Object.hasOwn(f, 'current_activity_updated_at')) f.current_activity_updated_at = 'none';
      }
    }
    if (resolution?.finalApproval) await approveFinalPackage(root, statePath, resolution.finalApproval);
    if (effective.event === 'complete') await checkFinalPackage(root, statePath, state.fields.autonomy === 'guided');
    let updated = setFields(original, f);
    if (handoff?.status === 'done') {
      const discoveries = [...(handoff.data.discoveries ?? []), ...(handoff.data.context_gaps ?? [])];
      updated = appendItems(updated, 'Context discoveries', discoveries);
    }
    const time = new Date().toISOString();
    const reason = resolution ? `Input ${resolution.record.id} resolved: ${resolution.response.label}; source: ${input.source}; via: ${input.via}`
      : request ? `${replaced ? `Input ${replaced.id} superseded. ` : ''}Awaiting ${request.waiting_for === 'pm' ? 'Product Manager' : 'user'} input: ${request.question} [pending-input: ${request.id}]`
      : next.reason;
    const transparent = input.event === 'autonomy' ? ` [decision-id: ${input.id}; resume: transparent]` : '';
    const outcome = `${reason}${next.autonomyNote ? ` ${next.autonomyNote}` : ''}`;
    const row = `| ${state.audit.length + 1} | ${time} | ${state.fields.phase} | ${f.phase} | ${String(outcome).replaceAll('|', '&#124;').replaceAll('\n', ' ')} ${marker}${transparent} |\n`;
    updated = updated.trimEnd() + '\n' + row;
    parseState(updated, statePath);
    await atomicWrite(statePath, updated);
    // Keep the event on render failure. Replaying its id refreshes without recounting.
    return { fields: f, pending: pendingInputs(f), ...(effective.event === 'context-ready' ? contextAction(f) : reviewScopeAction(f, effective.event)), ...(resolution ? { resolved: resolution.record.id, response: resolution.response.value, continuation: resolution.record.continuation?.event ?? 'resume-stage' } : {}), dashboard: await render(statePath), event: input.id };
  });
}
export async function initializeWorkflow(root, input) {
  root = await realpath(root);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(input.ticket ?? '')) fail('Unsafe ticket.');
  if (!['guided', 'autonomous', 'autopilot'].includes(input.autonomy)) fail('Choose autonomy first.');
  const repos = await snapshot(input.repos);
  const workspace = repos.length > 1 || repos[0].root !== root ? await approvedScope(root, input.ticket, input.repos) : null;
  if (!workspace && repos.some((repo) => repo.branch === input.base)) {
    if (input.proceed_on_base !== true) fail('Branch guard requires a feature branch.');
    explicit(input);
  }
  const template = await readFile(fileURLToPath(new URL('../SKILL.md', import.meta.url)), 'utf8');
  const block = template.match(/# Workflow state — <TICKET>\s*\n\s*```\s*\n([\s\S]*?)\n```/);
  if (!block) fail('Workflow template missing.');
  const fields = Object.fromEntries(block[1].split('\n').filter(Boolean).map((line) => {
    const match = line.replace(/\s+#.*$/, '').match(/^([a-z_]+):\s*(.*)$/);
    if (!match) fail('Invalid workflow template field.');
    return [match[1], match[2].trim()];
  }));
  const manifest = JSON.parse(await readFile(fileURLToPath(new URL('../../../.claude-plugin/plugin.json', import.meta.url)), 'utf8'));
  requireText(manifest.version, 'Plugin version');
  const time = new Date().toISOString();
  Object.assign(fields, { ticket: input.ticket, controller_version: '1', autonomy: input.autonomy, queued_autonomy: 'none',
    refinement_destination: input.refinement_destination ?? 'here', start_time: time, plugin_version: manifest.version,
    branch: repos[0].branch, base: workspace ? workspace.repos.find((repo) => repo.root === repos[0].root).base : requireText(input.base, 'Base branch'), head: repos[0].head,
    worktree_fingerprint: digest(JSON.stringify(repos)), workspace_snapshot: JSON.stringify(repos) });
  if (workspace) Object.assign(fields, { workspace_version: '1', workspace_contract: JSON.stringify(workspace) });
  if (!['here', 'slack-draft', 'slack-send'].includes(fields.refinement_destination)) fail('Invalid refinement destination.');
  if (input.offline_pending) {
    Object.assign(fields, { phase: 'close-the-gaps', status: 'Paused', pause_reason: 'offline refinement pending' });
    fields.pending_inputs = JSON.stringify([createPendingInput({ id: 'offline-refinement', kind: 'slack', waiting_for: 'pm', question: 'Waiting for answers to the saved refinement questions.' }, fields.phase, time)]);
  }
  const artifactRoot = path.join(root, 'make-it-work');
  await mkdir(artifactRoot, { recursive: true });
  if (!(await lstat(artifactRoot)).isDirectory()) fail('Artifact root must not be a symlink.');
  const directory = path.join(artifactRoot, input.ticket);
  await mkdir(directory, { recursive: true });
  if (!(await lstat(directory)).isDirectory()) fail('Run directory must not be a symlink.');
  const statePath = path.join(directory, `${input.ticket}-state.md`);
  const markdown = `# Workflow state — ${input.ticket}\n\n\`\`\`\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\`\`\`\n\n## Known regressions\n\nNone\n\n## Decided findings\n\nNone\n\n## Context discoveries\n\nNone\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | ${time} | start | ${fields.phase} | New ${input.autonomy} run; ${requireText(input.branch_guard, 'Branch guard outcome').replaceAll('|', '&#124;')} |\n`;
  parseState(markdown, statePath);
  await writeFile(statePath, markdown, { flag: 'wx' });
  const dashboard = await generateDashboard(statePath);
  const target = encodeURI(dashboard).replace(/[?#]/g, (character) => encodeURIComponent(character));
  return { state: statePath, dashboard,
    startup_message: `[Open implementation dashboard](<${target}>)`,
    implementation_baseline: await implementationBaseline(repos.map((repo) => repo.root)), fields };
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--root', '--state', '--input']);
  if (!o.root) fail('Usage: workflow.mjs init|inspect|apply --root ROOT [--state STATE] [--input EVENT.json]');
  if (o.command === 'init') {
    const initialized = await initializeWorkflow(o.root, await jsonInput(o.input));
    const offline = initialized.fields.pause_reason === 'offline refinement pending';
    return { startup_message: initialized.startup_message,
      next_action: {
        type: 'assistant_message',
        delivery_status: 'not_sent',
        text: initialized.startup_message,
        instruction: 'Your very next output must be an assistant chat text block containing text above. This command has NOT sent that chat message. Emit it now as a standalone assistant response, with no tool calls. Finish that response so the Stop hook can verify its runtime text. For a normal run it automatically continues Context check without a user reply; pending offline refinement keeps its documented answer wait. This is not a pause or approval gate. If only tool calls/results have occurred since init, the message is still unsent. A later claim that it was sent does not deliver it.',
      },
      continuation: offline ? 'wait_for_offline_answers' : 'continue_context_check_without_user_reply',
      state: initialized.state, dashboard: initialized.dashboard, implementation_baseline: initialized.implementation_baseline };
  }
  if (!o.state) fail('--state is required.');
  if (o.command === 'inspect') { const markdown = await readFile(await within(o.root, o.state), 'utf8'); return { ...parseState(markdown, o.state), state_hash: digest(markdown) }; }
  if (o.command === 'apply') return applyWorkflow({ root: o.root, statePath: o.state, input: await jsonInput(o.input) });
  fail('Unknown workflow command.');
});
