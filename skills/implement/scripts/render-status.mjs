#!/usr/bin/env node
import { readUsage } from '../../../scripts/usage.mjs';
import { artifactReference } from '../../../scripts/lib/artifact-path.mjs';
import { artifactJoin, artifactResolve } from '../../../scripts/lib/artifact-path.mjs';
import { assessmentPhase, checkpointAssessment } from './assessment-audit.mjs';

import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from '../../../scripts/lib/artifact-io.mjs';
import { rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertRunState, runArtifact, runArtifactName } from './artifact-layout.mjs';
import { readDelivery } from './delivery-progress.mjs';
import { readPublicationPermission } from './ticket-publication.mjs';
import { parseDecisionCell } from './workflow-decisions.mjs';
import { parseNoteCell } from './audit-notes.mjs';
import { pendingInputs } from './pending-input.mjs';
import { renderWorkspacePanel } from './workspace-view.mjs';
import { readScope } from './workspace-scope.mjs';
import { WORKFLOW_STYLES, WORKFLOW_TIMESTAMPS, renderWorkflowHeader } from '../../../scripts/lib/workflow-dashboard.mjs';
import { generateArtifactPreviews } from '../../../scripts/lib/artifact-preview.mjs';
import { coverageSummary } from '../../../scripts/lib/test-coverage.mjs';
import { parseSteps, nextBatch, planHash } from '../../../scripts/lib/plan.mjs';
import { parseTestingSummary, testingSummaryNotes } from './testing-summary.mjs';
import { summarizeAcceptance, acceptanceMarkdown } from './acceptance-summary.mjs';
import { atomicWrite } from '../../../scripts/lib/artifacts.mjs';
import { FEEDBACK_EMAIL_URL, FEEDBACK_SHARING_REMINDER } from '../../../scripts/lib/feedback-sharing.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = artifactResolve(SCRIPT_DIR, '../assets/status-template.html');
const LOGO_PATH = artifactResolve(SCRIPT_DIR, '../assets/insideout-ai-logo-base64.txt');

const REQUIRED_FIELDS = [
  'ticket', 'status', 'phase', 'autonomy', 'start_time', 'execution_mode',
  'inline_pause_mode', 'spec', 'spec_hash', 'plan', 'plan_version', 'plan_hash',
  'execution', 'review', 'review_cycle', 'fix_cycle', 'fix_plan_round_steps',
  'fix_plan_dispatch', 'replans_used', 'gate', 'pause_reason', 'branch', 'base',
  'head', 'worktree_fingerprint', 'execute_report', 'context_updated',
  'current_activity', 'real_rows_from',
];

// Hours without a checkpoint before an In Progress dashboard says it may have stopped.
const STALE_AFTER_HOURS = 3;
const STATUS_VALUES = new Set(['In Progress', 'Paused', 'Stopped', 'Complete']);
const PHASE_VALUES = new Set([
  'context-check', 'close-the-gaps', 'spec-approval', 'plan', 'plan-approval',
  'write-tests', 'execute', 'review', 'fix-plan', 'final-sync', 'final-approval', 'complete',
  'lightweight',
]);
const RISK_VALUES = new Set(['none', 'low', 'medium', 'high']);
const MODE_VALUES = new Set(['none', 'lightweight', 'tdd']);
const MODE_SOURCE_VALUES = new Set(['none', 'assessed', 'user']);
const AUTONOMY_VALUES = new Set(['guided', 'autonomous', 'autopilot', 'pending']);
const EXECUTION_MODE_VALUES = new Set(['none', 'subagent-driven', 'inline']);
const INLINE_PAUSE_MODE_VALUES = new Set(['none', 'stop-after-each-step', 'run-straight-through']);
const EXECUTION_VALUES = new Set([
  'not-started', 'running', 'passed', 'verified-manually', 'guardrail', 'retry-limit', 'gate-failed',
  'gate-no-result', 'stopped',
]);
const REVIEW_VALUES = new Set(['not-started', 'clean', 'fix-required', 'replan-required', 'human-decision']);
const FIX_DISPATCH_VALUES = new Set(['none', 'sequential', 'parallel']);
const GATE_VALUES = new Set(['none', 'full-suite', 'scoped', 'scoped+full']);
const CANONICAL_PHASES = new Set([
  'context-check', 'close-the-gaps', 'plan', 'write-tests', 'execute', 'review', 'fix-plan',
  'final-sync', 'final-approval', 'complete',
]);
const BASELINE_PHASES = [
  'context-check', 'close-the-gaps', 'plan', 'execute', 'review', 'final-sync',
  'complete',
];

const PHASE_INFO = {
  'context-check': {
    label: 'Context Check',
    skill: '',
    tooltip: 'verifies the project already has the context (skills, rules) this pipeline needs before starting.',
  },
  'close-the-gaps': {
    label: 'Refinement',
    skill: 'close-the-gaps',
    tooltip: 'refines the request into a reviewed, gap-checked spec via Q&A, ending in a spec-approval checkpoint.',
  },
  plan: {
    label: 'Plan',
    skill: 'plan-the-work',
    tooltip: 'turns the approved spec into a concrete, testable implementation plan, ending in a plan-approval checkpoint.',
  },
  'write-tests': {
    label: 'Write Tests',
    skill: 'write-the-tests',
    tooltip: 'prepares approved coverage in a fresh worker, checking regression baselines and expected progression failures before implementation.',
  },
  execute: {
    label: 'Execute',
    skill: 'execute',
    tooltip: 'implements the plan step by step and verifies its prepared tests and acceptance evidence.',
  },
  review: {
    label: 'Review',
    skill: 'review-the-code',
    tooltip: 'an independent pass reviews the implemented change for correctness and quality.',
  },
  'fix-plan': {
    label: 'Fix',
    skill: 'plan-the-work',
    tooltip: 'turns review or gate findings into new plan steps to implement.',
  },
  'final-sync': {
    label: 'Final Sync',
    skill: '',
    tooltip: 'updates the project\'s skills/docs to reflect what was actually built.',
  },
  'final-approval': {
    label: 'Final Approval',
    skill: '',
    tooltip: 'shows the completed diff, validation evidence, and delivery drafts for final review.',
  },
  complete: {
    label: 'Complete',
    skill: '',
    tooltip: 'the run has finished successfully.',
  },
  lightweight: {
    label: 'Implement (Lightweight)',
    skill: '',
    tooltip: 'a fresh subagent implements the approved spec directly, without a plan, test-first (TDD) steps or a regression gate.',
  },
};
const LIGHTWEIGHT_FIX_INFO = {
  label: 'Fix (Lightweight)',
  skill: '',
  tooltip: 'a fresh subagent fixes the review findings directly, without a plan.',
};
const SKIPPED_TOOLTIP = 'Skipped (Lightweight) — this low-risk run implements from the spec without a plan, TDD or regression gate.';
const MODE_LABELS = { lightweight: 'Lightweight', tdd: 'TDD' };

const AUTONOMY_TOOLTIP =
  'guided: pauses for your approval after the spec, after the plan, and at every human decision along the way. autonomous: no approval gates, and replans automatically when the plan stops holding — still asks every genuine question. autopilot: resolves every documented safe default without prompting, creates a feature branch from the base branch, and stops with a recorded reason when required facts are missing or contradictory. Workspace repository and branch selections always require explicit user confirmation before branch changes, in every mode.';
const PENDING_AUTONOMY_TOOLTIP =
  'not yet chosen — Context Check and/or Choose Autonomy are still running.';

function fail(message) {
  throw new Error(message);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^## ${escaped}[ \\t]*\\r?\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  if (!match) fail(`Missing required section: ## ${heading}`);
  return match[1].trim();
}

function parseInteger(fields, name, { min = 0 } = {}) {
  if (!/^\d+$/.test(fields[name] ?? '')) fail(`Field "${name}" must be an integer.`);
  const value = Number(fields[name]);
  if (!Number.isSafeInteger(value) || value < min) {
    fail(`Field "${name}" must be an integer >= ${min}.`);
  }
  return value;
}

function parseList(value, heading) {
  if (value === 'None') return [];
  const lines = value.split('\n').filter((line) => line.trim() !== '');
  const items = lines.map((line) => {
    const match = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (!match) fail(`Section "${heading}" must contain "None" or a Markdown bullet list.`);
    return match[1];
  });
  if (items.length === 0) fail(`Section "${heading}" cannot be empty.`);
  return items;
}

function splitTableRow(line) {
  let body = line.trim();
  if (!body.startsWith('|') || !body.endsWith('|')) fail(`Malformed audit row: ${line}`);
  body = body.slice(1, -1);
  const cells = [];
  let cell = '';
  let escaped = false;
  for (const char of body) {
    if (escaped) {
      cell += char === '|' ? '|' : `\\${char}`;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  if (escaped) cell += '\\';
  cells.push(cell.trim());
  return cells;
}

function parseIsoTimestamp(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    fail(`${label} has an invalid ISO 8601 UTC timestamp: ${value}`);
  }
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch)) fail(`${label} has an invalid timestamp: ${value}`);
  const normalized = value.includes('.') ? value : value.replace('Z', '.000Z');
  if (new Date(epoch).toISOString() !== normalized) {
    fail(`${label} has an invalid calendar timestamp: ${value}`);
  }
  return epoch;
}

function parseAudit(value) {
  const lines = value.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) fail('Audit log must contain its header and separator rows.');
  const header = splitTableRow(lines[0]);
  if (header.join('|') !== '#|Time|From|To|Outcome / reason') {
    fail('Audit log header must be: # | Time | From | To | Outcome / reason');
  }
  const separator = splitTableRow(lines[1]);
  if (separator.length !== 5 || separator.some((cell) => !/^:?-{3,}:?$/.test(cell))) {
    fail('Audit log separator row is malformed.');
  }
  return lines.slice(2).map((line, index) => {
    const cells = splitTableRow(line);
    if (cells.length !== 5) fail(`Audit row ${index + 1} must contain exactly five columns.`);
    const number = Number(cells[0]);
    if (!Number.isSafeInteger(number) || number !== index + 1) {
      fail(`Audit row numbers must be consecutive from 1; found "${cells[0]}".`);
    }
    if (!cells[2] || !cells[3] || !cells[4]) fail(`Audit row ${number} has an empty From, To, or Outcome cell.`);
    return {
      number,
      time: cells[1],
      epoch: parseIsoTimestamp(cells[1], `Audit row ${number}`),
      from: cells[2],
      to: cells[3],
      outcome: cells[4],
      ...parseDecisionCell(cells[4]),
      ...parseNoteCell(cells[4]),
    };
  });
}

const ADAPTIVE_FIELDS = ['risk', 'mode', 'mode_source', 'risk_rationale', 'escalations', 'implementation_report'];

// Adaptive workflow fields are opt-in: present only on runs created with adaptive_version: 1.
function validateAdaptiveFields(fields) {
  if (fields.adaptive_version === undefined) {
    if (fields.phase === 'lightweight') fail('Phase lightweight requires adaptive_version: 1.');
    return;
  }
  if (fields.adaptive_version !== '1') fail(`Unsupported adaptive_version: ${fields.adaptive_version}`);
  for (const name of ADAPTIVE_FIELDS) {
    if (!Object.hasOwn(fields, name) || fields[name] === '') fail(`Missing required state field: ${name}`);
  }
  if (!RISK_VALUES.has(fields.risk)) fail(`Unsupported risk: ${fields.risk}`);
  if (!MODE_VALUES.has(fields.mode)) fail(`Unsupported mode: ${fields.mode}`);
  if (!MODE_SOURCE_VALUES.has(fields.mode_source)) fail(`Unsupported mode_source: ${fields.mode_source}`);
  if ((fields.mode === 'none') !== (fields.mode_source === 'none')) fail('Fields "mode" and "mode_source" must both be none or both be set.');
  const escalations = parseInteger(fields, 'escalations');
  if (escalations > 1) fail('Field "escalations" exceeds its limit of 1.');
  if (fields.phase === 'lightweight' && fields.mode !== 'lightweight') fail('Phase lightweight requires mode: lightweight.');
  if (fields.implementation_report !== 'none') runArtifactName(fields.implementation_report, fields.ticket, 'implementation_report');
}

export function parseState(markdown, statePath = '') {
  const block = markdown.match(/^# Workflow state[^\r\n]*\r?\n\s*```[^\r\n]*\r?\n([\s\S]*?)\r?\n```/m);
  if (!block) fail('Could not find the workflow state field block.');
  const fields = {};
  for (const line of block[1].split('\n')) {
    if (!line.trim()) continue;
    const match = line.match(/^([a-z][a-z0-9_]*):\s*(.*?)\s*$/);
    if (!match) fail(`Malformed state field line: ${line}`);
    if (Object.hasOwn(fields, match[1])) fail(`Duplicate state field: ${match[1]}`);
    fields[match[1]] = match[2];
  }
  for (const name of REQUIRED_FIELDS) {
    if (!Object.hasOwn(fields, name) || fields[name] === '') fail(`Missing required state field: ${name}`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(fields.ticket)) {
    fail('Field "ticket" contains characters that are unsafe for an artifact filename.');
  }
  if (statePath) {
    const expected = `${fields.ticket}-state.md`;
    if (path.basename(artifactResolve(statePath)) !== (fields.artifact_naming_version === '1' && !expected.startsWith('miw-') ? `miw-${expected}` : expected)) {
      fail(`State filename must match its ticket field: expected ${expected}.`);
    }
  }
  for (const field of ['artifact_naming_version', 'activity_timing_version', 'repo_impact_version']) if (fields[field] !== undefined && fields[field] !== '1') fail(`Unsupported ${field}.`);
  if (!STATUS_VALUES.has(fields.status)) fail(`Unsupported status: ${fields.status}`);
  if (fields.handoff_version !== undefined && fields.handoff_version !== '1') fail(`Unsupported handoff_version: ${fields.handoff_version}`);
  if (fields.review_scope_version !== undefined && fields.review_scope_version !== '1') fail('Unsupported review_scope_version.');
  if (fields.final_package_version !== undefined && fields.final_package_version !== '1') fail(`Unsupported final_package_version: ${fields.final_package_version}`);
  if (fields.acceptance_evidence_version !== undefined && (fields.acceptance_evidence_version !== '1' || fields.verification_version !== '1')) fail('Clause evidence requires acceptance_evidence_version: 1 and verification_version: 1.');
  if (fields.compaction_version !== undefined && fields.compaction_version !== '1') fail('Unsupported compaction_version.');
  if (fields.compaction_version === '1') {
    if (!['pending', 'offered', 'awaiting-continuation', 'declined', 'continued', 'skipped', 'cancelled'].includes(fields.compaction_checkpoint)) fail('Invalid compaction checkpoint.');
    if (typeof fields.compaction_recovery !== 'string' || !fields.compaction_recovery.trim()
        || ['offered', 'awaiting-continuation'].includes(fields.compaction_checkpoint) && fields.compaction_recovery === 'none') fail('Compaction checkpoint needs its recovery artifact.');
  }
  if (fields.test_coverage_version !== undefined && fields.test_coverage_version !== '1') fail('Unsupported test_coverage_version.');
  if (fields.test_writing_version !== undefined && fields.test_writing_version !== '1') fail('Unsupported test_writing_version.');
  if (fields.phase === 'write-tests' && fields.test_writing_version !== '1') fail('Write Tests requires test_writing_version: 1.');
  if (fields.test_writing_version === '1') {
    for (const name of ['test_preparation', 'test_preparation_report']) {
      if (!fields[name]) fail(`Missing ${name}.`);
      if (fields[name] !== 'none') runArtifactName(fields[name], fields.ticket, name);
    }
  }
  if (fields.testing_readiness_version !== undefined && fields.testing_readiness_version !== '1') fail('Unsupported testing_readiness_version.');
  if (fields.verification_version !== undefined && fields.verification_version !== '1') fail(`Unsupported verification_version: ${fields.verification_version}`);
  for (const name of ['review_checks_version', 'feedback_evidence_version']) if (fields[name] !== undefined && fields[name] !== '1') fail(`Unsupported ${name}: ${fields[name]}`);
  if (fields.plugin_version !== undefined && !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(fields.plugin_version)) {
    fail('Unsupported plugin_version.');
  }
  if (fields.phase === 'final-approval' && fields.final_package_version !== '1') fail('Final approval requires final_package_version: 1.');
  if (!PHASE_VALUES.has(fields.phase)) fail(`Unsupported phase: ${fields.phase}`);
  if (!AUTONOMY_VALUES.has(fields.autonomy)) fail(`Unsupported autonomy: ${fields.autonomy}`);
  if (fields.queued_autonomy !== undefined && fields.queued_autonomy !== 'none' && !['guided', 'autonomous', 'autopilot'].includes(fields.queued_autonomy)) fail(`Unsupported queued autonomy: ${fields.queued_autonomy}`);
  if (fields.status === 'Complete' && fields.queued_autonomy && fields.queued_autonomy !== 'none') fail('A completed run cannot retain queued autonomy.');
  if (!EXECUTION_MODE_VALUES.has(fields.execution_mode)) fail(`Unsupported execution_mode: ${fields.execution_mode}`);
  if (!INLINE_PAUSE_MODE_VALUES.has(fields.inline_pause_mode)) fail(`Unsupported inline_pause_mode: ${fields.inline_pause_mode}`);
  if (!EXECUTION_VALUES.has(fields.execution)) fail(`Unsupported execution: ${fields.execution}`);
  if (!REVIEW_VALUES.has(fields.review)) fail(`Unsupported review: ${fields.review}`);
  if (!FIX_DISPATCH_VALUES.has(fields.fix_plan_dispatch)) fail(`Unsupported fix_plan_dispatch: ${fields.fix_plan_dispatch}`);
  if (!GATE_VALUES.has(fields.gate)) fail(`Unsupported gate: ${fields.gate}`);
  validateAdaptiveFields(fields);
  if (fields.current_activity_updated_at !== undefined && fields.current_activity_updated_at !== 'none') {
    parseIsoTimestamp(fields.current_activity_updated_at, 'Field "current_activity_updated_at"');
  }

  parseTestingSummary(fields.testing_summary);
  const audit = parseAudit(section(markdown, 'Audit log'));
  const reviewCycle = parseInteger(fields, 'review_cycle');
  const fixCycle = parseInteger(fields, 'fix_cycle');
  const replansUsed = parseInteger(fields, 'replans_used');
  if (reviewCycle > 4) fail('Field "review_cycle" exceeds its limit of 4.');
  if (fixCycle > 3) fail('Field "fix_cycle" exceeds its limit of 3.');
  if (replansUsed > 2) fail('Field "replans_used" exceeds its limit of 2.');
  parseInteger(fields, 'plan_version', { min: 1 });
  const realRowsFrom = parseInteger(fields, 'real_rows_from', { min: 1 });
  if (realRowsFrom > audit.length + 1) {
    fail('Field "real_rows_from" cannot be more than one row beyond the audit log.');
  }
  if (audit.length === 0 && !(
    fields.status === 'Paused' &&
    fields.phase === 'close-the-gaps' &&
    fields.pause_reason === 'offline refinement pending'
  )) {
    fail('Only a pending offline-refinement state may have an empty audit log.');
  }
  for (let index = Math.max(realRowsFrom, 2) - 1; index < audit.length; index += 1) {
    if (audit[index].epoch < audit[index - 1].epoch) {
      fail(`Real audit timestamps must not move backwards (row ${audit[index].number}).`);
    }
  }

  let fixPlanRoundSteps = null;
  if (fields.fix_plan_round_steps !== 'none') {
    fixPlanRoundSteps = parseInteger(fields, 'fix_plan_round_steps', { min: 1 });
  }

  return {
    fields,
    pendingInputs: pendingInputs(fields),
    audit,
    knownRegressions: parseList(section(markdown, 'Known regressions'), 'Known regressions'),
    decidedFindings: parseList(section(markdown, 'Decided findings'), 'Decided findings'),
    reviewCycle,
    fixCycle,
    fixPlanRoundSteps,
    replansUsed,
    realRowsFrom,
  };
}

export function parsePlanStatus(markdown) {
  const executionStatus = section(markdown, 'Execution Status');
  const modeMatch = executionStatus.match(/^\*\*Mode:\*\*\s*([^\n.—]+?)(?:\s+—|\.|$)/m);
  const progressMatch = executionStatus.match(/^\*\*Progress:\*\*\s*Step\s+(\d+)\s+of\s+(\d+)\s+complete\.?\s*$/m);
  if (!modeMatch) fail('Plan Execution Status is missing a parseable Mode line.');
  if (!progressMatch) fail('Plan Execution Status is missing a numeric "Step N of M complete" line.');
  const complete = Number(progressMatch[1]);
  const total = Number(progressMatch[2]);
  if (complete > total) fail('Plan progress cannot have more completed steps than total steps.');
  return { mode: modeMatch[1].trim(), complete, total };
}

function newSlot(phase, activationRow = null) {
  return { phase, activationRow };
}

function isAdaptive(state) {
  return state.fields.adaptive_version === '1';
}

function slotInfo(slot, state = null) {
  if (slot.finalizing) return {
    label: slot.completed ? 'Complete' : 'Finalizing', skill: '',
    tooltip: state?.fields.change_assessment_version === '1'
      ? 'updates project documentation, assesses code complexity and production risk, prepares final review, and collects session feedback. Its elapsed time includes the assessment.'
      : 'updates project documentation and prepares the completed work for final review.',
  };
  return slot.lightweightFix ? LIGHTWEIGHT_FIX_INFO : PHASE_INFO[slot.phase];
}

export function buildTimeline(state) {
  const adaptive = isAdaptive(state);
  const lightweightTimeline = adaptive && (state.fields.mode === 'lightweight' || state.fields.escalations === '1');
  let phases = state.fields.final_package_version === '1'
    ? [...BASELINE_PHASES.slice(0, -1), 'final-approval', 'complete']
    : BASELINE_PHASES;
  if (state.fields.test_writing_version === '1') phases = phases.flatMap(phase => phase === 'execute' ? ['write-tests', phase] : [phase]);
  if (lightweightTimeline) phases = phases.flatMap((phase) => phase === 'review' ? ['lightweight', phase] : [phase]);
  const slots = phases.map((phase) => ({
    ...newSlot(phase),
    ...(lightweightTimeline && ['plan', 'write-tests', 'execute'].includes(phase) ? { skipped: true } : {}),
  }));
  const activatedPhases = new Set();
  let activeSlot = null;

  for (const row of state.audit) {
    if (row.note && row.from === row.to) continue;
    if (row.to === 'spec-approval' || row.to === 'plan-approval') continue;

    if (!CANONICAL_PHASES.has(row.to) && !(adaptive && row.to === 'lightweight')) continue;
    if (state.fields.test_writing_version !== '1' && activeSlot?.phase === 'fix-plan' && row.to === 'execute') continue;
    if (activeSlot?.phase === row.to) continue;

    // Adaptive runs never activate a skipped or already-passed baseline slot; such rows insert after the active slot.
    const escalation = adaptive && row.to === 'plan' && row.outcome.startsWith('Escalation:');
    const activeIndex = activeSlot ? slots.indexOf(activeSlot) : -1;
    let nextSlot;
    if (row.to !== 'fix-plan' && !escalation && !activatedPhases.has(row.to)) {
      nextSlot = slots.find((slot, index) => slot.phase === row.to && slot.activationRow === null &&
        (!adaptive || (!slot.skipped && index > activeIndex)));
      if (!nextSlot && !adaptive) fail(`Timeline could not find the baseline slot for ${row.to}.`);
    }
    if (nextSlot) {
      nextSlot.activationRow = row;
    } else {
      nextSlot = newSlot(row.to, row);
      const insertionIndex = activeSlot ? activeIndex + 1 : slots.length;
      slots.splice(insertionIndex, 0, nextSlot);
    }
    if (escalation) nextSlot.escalation = displayOutcome(row.outcome).slice('Escalation:'.length).trim();
    if (adaptive && row.to === 'lightweight' && ['review', 'final-approval'].includes(row.from)) nextSlot.lightweightFix = true;
    activatedPhases.add(row.to);
    activeSlot = nextSlot;
  }

  if (state.fields.test_writing_version === '1') {
    for (const slot of slots.filter(item => item.phase === 'write-tests')) slot.preparationExempt = state.audit.find(row => row.number > (slot.activationRow?.number ?? Infinity) && row.from === 'write-tests' && row.to !== 'write-tests')?.outcome.includes('not-applicable') ?? false;
  }
  return { slots, activeSlot };
}

// Project adjacent final phases without changing the workflow's canonical timeline.
export function groupFinalization(timeline) {
  const slots = [];
  let activeSlot = null;
  for (const slot of timeline.slots) {
    if (!['final-sync', 'final-approval', 'complete'].includes(slot.phase)) {
      slots.push(slot);
      if (slot === timeline.activeSlot) activeSlot = slot;
      continue;
    }
    let group = slots.at(-1);
    if (!group?.finalizing) {
      group = { ...slot, finalizing: true, completed: false };
      slots.push(group);
    }
    if (slot.activationRow) {
      group.activationRow ??= slot.activationRow;
      group.phase = slot.phase;
      if (slot.phase === 'complete') {
        group.completed = true;
        group.completionRow = slot.activationRow;
      }
    }
    if (slot === timeline.activeSlot) activeSlot = group;
  }
  return { slots, activeSlot };
}

export function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) fail('Cannot format a negative or invalid duration.');
  let seconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function validateArtifactPath(value, field, ticket) {
  if (value === 'none') return null;
  return runArtifactName(value, ticket, `Field "${field}"`);
}

function artifactLink(value, field, ticket) {
  const relative = validateArtifactPath(value, field, ticket);
  if (!relative) return '<span class="none">Not yet created</span>';
  return `<a href="${escapeHtml(relative)}" title="${escapeHtml(value)}">${escapeHtml(relative)}</a>`;
}

function renderListSection(title, items) {
  if (items.length === 0) return '';
  return `<h2>${escapeHtml(title)}</h2>\n<ul>\n${items.map((item) => `  <li>${escapeHtml(item)}</li>`).join('\n')}\n</ul>`;
}

function slotState(slot, activeSlot, status) {
  if (!slot.activationRow) return slot.skipped ? 'skipped' : 'not-reached';
  if (slot !== activeSlot) return 'passed';
  if (status === 'Complete') return 'passed';
  if (status === 'In Progress') return 'current spinning';
  if (status === 'Paused') return 'current';
  return 'failed';
}

const DELIVERY_LABELS = {
  'not-started': 'Optional', offered: 'Awaiting choice', 'awaiting-approval': 'Awaiting approval',
  running: 'Running', partial: 'Partially delivered', failed: 'Failed', delivered: 'Delivered',
  declined: 'Not requested', unknown: 'Status unavailable',
};
const DELIVERY_PENDING = new Set(['not-started', 'offered', 'awaiting-approval', 'running']);

function renderTimeline(state, timeline, planStatus, invalidTimestampFrom, delivery, feedback = null, now = null) {
  const { slots, activeSlot } = timeline;
  const collectingFeedback = state.fields.status === 'Complete' && feedback?.status === 'collecting';
  const activated = slots.filter((slot) => slot.activationRow);

  const steps = slots.map((slot, index) => {
    const finalizingFeedback = collectingFeedback && slot.finalizing && slot.completed;
    const info = { ...slotInfo(slot, state), ...(finalizingFeedback ? { label: 'Finalizing' } : {}) };
    const dotState = finalizingFeedback ? 'current spinning' : slotState(slot, activeSlot, state.fields.status);
    const isActive = slot === activeSlot;
    const passed = dotState === 'passed';
    const symbol = passed ? '✓' : dotState === 'failed' ? '✗' : '';
    const lineClass = passed || dotState.startsWith('current') ? ' line-green' : '';
    const label = escapeHtml(info.label) + (info.skill && info.skill !== 'execute' ? `<span class="phase-skill">(${escapeHtml(info.skill)})</span>` : '');
    const currentLabel = isActive && state.fields.status === 'In Progress' ? ' current-label' : '';
    const pieces = ['<div class="phase-step">'];
    if (index > 0) pieces.push(`  <div class="line${lineClass}"></div>`);
    const tooltip = dotState === 'skipped' ? SKIPPED_TOOLTIP
      : slot.escalation !== undefined ? `Escalated: ${slot.escalation} — ${info.tooltip}` : info.tooltip;
    pieces.push(`  <div class="phase-dot ${dotState}" title="${escapeHtml(`${slot.phase}: ${tooltip}`)}">${symbol}</div>`);
    pieces.push(`  <div class="phase-label${currentLabel}">${label}</div>`);

    let modeText = null;
    let modeDetails = null;
    if (isActive && slot.phase === 'write-tests') modeText = 'Preparing coverage · implementation has not advanced';
    if (slot.phase === 'write-tests' && slot.preparationExempt) modeText = 'Not applicable — manual verification';
    if (isActive && slot.phase === 'plan' && state.fields.phase === 'plan-approval') modeText = 'Awaiting plan approval';
    if (isActive && slot.phase === 'execute') {
      if (!planStatus) fail('An active Execute phase requires a readable plan Execution Status.');
      modeText = `Step ${planStatus.complete} of ${planStatus.total} complete`;
      modeDetails = `${planStatus.mode} · ${modeText}`;
      if (state.fields.status === 'In Progress' && planStatus.activeSteps?.length) {
        const ids = planStatus.activeSteps.map((step) => step.number);
        modeText = `${ids.length === 1 ? 'Step' : 'Steps'} ${ids.join(', ')} of ${planStatus.total}`;
        modeDetails = `${planStatus.mode} · Running ${ids.length === 1 ? 'step' : 'steps'} ${ids.join(', ')} of ${planStatus.total} · ${planStatus.complete} of ${planStatus.total} verified complete`;
      }
    } else if (isActive && slot.phase === 'fix-plan' && state.fixPlanRoundSteps !== null) {
      if (!planStatus) fail('An active Fix phase with sized steps requires a readable plan Execution Status.');
      const localComplete = planStatus.complete - (planStatus.total - state.fixPlanRoundSteps);
      if (localComplete < 0 || localComplete > state.fixPlanRoundSteps) {
        fail('Current fix-round progress is inconsistent with the plan and fix_plan_round_steps.');
      }
      modeText = `${planStatus.mode} · Step ${localComplete} of ${state.fixPlanRoundSteps} complete`;
    }
    if (isActive && slot.finalizing && !slot.completed) {
      const awaiting = state.pendingInputs?.some((input) => input.kind === 'approval' && input.phase === 'final-approval');
      modeText = slot.phase === 'final-sync' ? 'Updating project docs'
        : awaiting ? 'Awaiting final approval'
          : state.fields.change_assessment_version === '1' && state.fields.current_activity === 'Assessing code complexity and production risk'
            ? 'Assessing code complexity and production risk' : 'Preparing final review';
    }
    if (slot.finalizing && slot.completed && feedback) {
      modeText = feedback.status === 'collecting' ? 'Collecting session feedback'
        : feedback.status === 'saved' ? 'Session feedback saved' : 'Session feedback unavailable';
    }
    if (dotState === 'skipped') modeText = 'Skipped';
    else if (slot.escalation !== undefined && !modeText) modeText = 'Escalated to TDD';
    if (modeText) pieces.push(`  <div class="phase-mode"${modeDetails ? ` title="${escapeHtml(modeDetails)}"` : ''}>${escapeHtml(modeText)}</div>`);

    if ((passed || finalizingFeedback) && (slot.phase !== 'complete' || slot.finalizing)) {
      const activatedIndex = activated.indexOf(slot);
      const next = slot.completionRow ? { activationRow: slot.completionRow } : activated[activatedIndex + 1];
      if (next) {
        const duration = slot.activationRow.number < state.realRowsFrom || next.activationRow.number < state.realRowsFrom ||
          next.activationRow.number >= invalidTimestampFrom
          ? '—'
          : formatDuration((slot.finalizing && slot.completed ? feedbackEndpoint(feedback, now, next.activationRow.epoch) : next.activationRow.epoch) - slot.activationRow.epoch);
        const elapsed = slot.finalizing && slot.completed && feedback?.status === 'collecting' && now === null && duration !== '—'
          ? ` data-elapsed-start="${slot.activationRow.epoch}" data-elapsed-min-end="${next.activationRow.epoch}"` : '';
        pieces.push(`  <div class="phase-duration"${elapsed}>${duration}</div>`);
      }
    }

    if (isActive && !(slot.finalizing && slot.completed && state.fields.status === 'Complete')) {
      const slug = state.fields.status.toLowerCase().replaceAll(' ', '-');
      pieces.push(`  <div class="phase-status status-${slug}">${escapeHtml(state.fields.status)}</div>`);
    }
    pieces.push('</div>');
    return pieces.join('\n');
  });
  if (!collectingFeedback && state.fields.status === 'Complete' && state.fields.final_package_version === '1') {
    const status = delivery?.status ?? 'not-started';
    const dot = status === 'delivered' ? 'passed' : ['failed', 'partial', 'unknown'].includes(status) ? 'failed'
      : status === 'running' ? 'current spinning' : status === 'awaiting-approval' ? 'current' : 'optional';
    const symbol = status === 'delivered' ? '✓' : dot === 'failed' ? '✗' : '';
    const duration = delivery?.startedAt && delivery.completedAt
      ? `<div class="phase-duration">${formatDuration(Math.max(0, Date.parse(delivery.completedAt) - Date.parse(delivery.startedAt)))}</div>` : '';
    steps.push(`<div class="phase-step optional-step">\n  <div class="line"></div>\n  <div class="phase-dot ${dot}" title="Optional delivery: ${escapeHtml(DELIVERY_LABELS[status])}. Commits, pushes, and PRs require approval of the exact delivery plan.">${symbol}</div>\n  <div class="phase-label">Deliver</div>\n  <div class="phase-mode">${DELIVERY_LABELS[status]}</div>\n${duration}</div>`);
  }
  return steps.join('\n');
}

function renderCurrentActivity(state, timeline) {
  if (!timeline.activeSlot || state.fields.status !== 'In Progress') return '';
  const label = escapeHtml(slotInfo(timeline.activeSlot).label);
  const hasActivity = state.fields.current_activity !== 'none';
  const activity = hasActivity ? escapeHtml(state.fields.current_activity)
    : `${label} is in progress. No activity details have been reported yet.`;
  const updatedAt = state.fields.current_activity_updated_at;
  const timestamp = updatedAt && updatedAt !== 'none'
    ? `<time class="ts" datetime="${escapeHtml(updatedAt)}" data-ts="${escapeHtml(updatedAt)}">${escapeHtml(updatedAt)}</time>`
    : 'unavailable';
  // A lost delegate recorded after the latest activity replaces the running state.
  const lost = state.audit.findLast((row) => row.note?.kind === 'interruption' && row.to === state.fields.phase);
  const lastActivity = state.audit.findLast((row) => row.note?.kind === 'activity');
  if (lost && (!lastActivity || lost.number > lastActivity.number)) {
    return `<section class="current-activity interrupted" aria-label="Current activity">
  <strong>${label} interrupted</strong>
  <p class="phase-activity">${escapeHtml(lost.outcome)}</p>
  <p class="activity-updated">Recorded: <time class="ts" datetime="${escapeHtml(lost.time)}" data-ts="${escapeHtml(lost.time)}">${escapeHtml(lost.time)}</time></p>
</section>`;
  }
  // The page is a static snapshot; the browser decides whether it has gone quiet.
  const stale = hasActivity && updatedAt && updatedAt !== 'none'
    ? `\n  <p class="activity-stale" data-stale-since="${escapeHtml(updatedAt)}" data-stale-after-hours="${STALE_AFTER_HOURS}" hidden></p>` : '';
  return `<section class="current-activity" aria-label="Current activity">
  <strong>${label} in progress</strong>
  <p class="phase-activity">${activity}</p>
  ${hasActivity ? `<p class="activity-updated">Last updated: ${timestamp}</p>` : ''}${stale}
</section>`;
}

function feedbackEndpoint(feedback, now, fallback) {
  if (feedback?.status === 'collecting') return Math.max(fallback, now ?? fallback);
  const value = Date.parse(feedback?.finalizedAt);
  return Number.isFinite(value) && value >= fallback ? value : fallback;
}
function timingDetails(state, invalidTimestampFrom, feedback, now) {
  if (state.audit.length < 2 || state.realRowsFrom > state.audit.length || Number.isFinite(invalidTimestampFrom)) return null;
  const first = state.audit[state.realRowsFrom - 1];
  const last = state.fields.status === 'Complete'
    ? state.audit.findLast((row) => row.to === 'complete' && row.from !== row.to) ?? state.audit.at(-1)
    : state.audit.at(-1);
  if (last.number < first.number) return null;
  const end = state.fields.status === 'Complete' ? feedbackEndpoint(feedback, now, last.epoch) : last.epoch;
  const formatted = formatDuration(end - first.epoch);
  // Stable source bytes preserve feedback evidence; the existing page-load script hydrates live elapsed values.
  const live = state.fields.status === 'Complete' && feedback?.status === 'collecting' && now === null;
  const total = live ? `<span data-elapsed-start="${first.epoch}" data-elapsed-min-end="${last.epoch}">${formatted}</span>` : formatted;
  return { total, first, last, feedbackCollecting: feedback?.status === 'collecting', feedbackEndpoint: state.fields.status === 'Complete' && (feedback?.status === 'collecting' || Number.isFinite(Date.parse(feedback?.finalizedAt))), feedbackExcluded: state.fields.status === 'Complete' && feedback?.status !== 'collecting' && !Number.isFinite(Date.parse(feedback?.finalizedAt)) };
}

function displayOutcome(outcome) {
  // Controller retry metadata stays in the saved audit, outside the user-facing presentation.
  const clean = outcome.replace(/\s*\[workflow-event: [A-Za-z0-9][A-Za-z0-9._:-]*; sha256: [a-f0-9]{64}\]/g, '').trim();
  const decision = clean.match(/^Decision: ([\s\S]*?) — ([\s\S]*?); source: (user|autopilot|policy); via: (question|chat|flag|policy); scope: ([\s\S]*)$/);
  if (decision) {
    const [, topic, choice, source, , tail] = decision;
    // Scope may contain semicolons; only the serializer's optional field labels
    // delimit reference/reason. Reference remains authoritative in the state.
    const fields = tail.match(/^([\s\S]*?)(?:; reference: [\s\S]*?)?(?:; reason: ([\s\S]*))?$/);
    let title = `${topic} — ${choice}`;
    if (source === 'user' && topic === 'Delivery exact-plan approval' && choice === 'Deliver this exact plan') title = 'Delivery approved';
    if (source === 'user' && topic === 'Delivery preparation' && choice === 'Prepare delivery') title = 'Delivery preparation requested';
    const attribution = source === 'autopilot' ? ' (Autopilot default)' : source === 'policy' ? ' (Policy default)' : '';
    const text = [title + attribution, fields[1], fields[2]].filter(Boolean).join(' — ');
    return text.replace(/\bSHA-?256\s*[:=]?\s*[a-f0-9]{7,64}\b/gi, '').replace(/\s{2,}/g, ' ').trim();
  }
  // Controller input resolutions and queue decisions carry provenance without
  // the structured decision serializer's scope/reference fields.
  if (/^(Decision: |Input )/.test(clean)) {
    return clean.replace(/; source: (user|autopilot|policy|pm); via: (question|chat|flag|policy|slack)(?=$| Autonomy applied at phase boundary:)/g,
      (_match, source) => source === 'autopilot' ? ' (Autopilot default)' : source === 'policy' ? ' (Policy default)' : source === 'pm' ? ' (Product Manager reply)' : '');
  }
  return clean;
}

function renderReadinessResult(state, text) {
  const match = text.match(/^Result: Testing readiness completed before planning\. Baselines: (.+)\.; evidence: (.+); (.+); sha256:([a-f0-9]{64})$/);
  if (!match) return null;
  const [, baselines, receiptPath, reportPath] = match;
  let receipt, report;
  try {
    receipt = validateArtifactPath(receiptPath, 'readiness receipt', state.fields.ticket);
    report = validateArtifactPath(reportPath, 'readiness report', state.fields.ticket);
  } catch { return null; }
  const version = receipt?.match(/-readiness-v([1-9]\d*)\.json$/)?.[1];
  const names = (suffix) => [`${state.fields.ticket}-${suffix}`, `miw-${state.fields.ticket}-${suffix}`];
  if (!version || !names(`readiness-v${version}.json`).includes(receipt) ||
      !names(`testing-readiness${version === '1' ? '' : `-v${version}`}.md`).includes(report)) return null;
  const rows = baselines.split(', ').map(value => value.match(/^(.+)=(pass|fail|not-run|not-applicable)$/));
  if (rows.some(row => !row)) return null;
  const passed = rows.every(row => row[2] === 'pass');
  const limited = rows.some(row => ['fail', 'not-run'].includes(row[2]));
  const title = passed ? 'Testing readiness passed' : limited ? 'Testing readiness completed with baseline limitations' : 'Testing readiness completed';
  const summaries = rows.map(([, repo, baseline]) => {
    const name = escapeHtml(repo);
    return baseline === 'pass' ? `Baseline tests passed for ${name}.` :
      baseline === 'fail' ? `Baseline tests failed for ${name}.` :
      baseline === 'not-run' ? `Baseline tests were not run for ${name}.` :
      `Manual verification selected for ${name}; no automated baseline was run.`;
  });
  const summary = rows.length === 1 ? `<p>${summaries[0]}</p>` : `<ul>${summaries.map(value => `<li>${value}</li>`).join('')}</ul>`;
  return `<div class="readiness-result"><strong>${title}</strong>${summary}<p>${limited ? 'Review baseline limitations before planning.' : 'Ready to create the implementation plan.'} <a href="${escapeHtml(report)}">View readiness report</a></p><details><summary>Technical details</summary><p><a href="${escapeHtml(receipt)}">Open readiness record (JSON)</a></p><p>${escapeHtml(text)}</p></details></div>`;
}

function renderAuditOutcome(state, outcome, assessment = null, auditId = null, acceptance = null) {
  const text = displayOutcome(outcome);
  const verification = text.match(/^(Result: Verification ledger validated(?: for [A-Z_]+| \(partial check\))\. Gate: .+; acceptance: \d+\/\d+ verified\.); evidence: (.+); sha256:[a-f0-9]{64}$/);
  if (verification && acceptance?.report && verification[2] === acceptance.source) {
    return `${escapeHtml(verification[1].replace('Result: Verification ledger validated', 'Verification checked'))} · <a href="${escapeHtml(acceptance.report)}">View verification report</a>`;
  }
  const readiness = renderReadinessResult(state, text);
  if (readiness) return readiness;
  const preparation = text.match(/^Test preparation (ready|blocked|not-applicable)(?:: |; )(.+?)(\. Implementation remains unverified\.)?$/);
  if (preparation) {
    try {
      const report = validateArtifactPath(preparation[2], 'test_preparation_report', state.fields.ticket);
      if (report && /-plan-tests-[1-9]\d*\.md$/.test(report)) {
        return `Test preparation ${escapeHtml(preparation[1])} · <a href="${escapeHtml(report)}">View preparation report</a>${preparation[3] ?? ''}`;
      }
    } catch { /* Preserve unrecognized historical entries as plain text. */ }
  }
  if (text.startsWith('Result: Change assessment — ')) {
    const split = text.lastIndexOf('; evidence: ');
    const reference = text.slice(split + '; evidence: '.length);
    const files = ['change-assessment', 'complexity'].flatMap(suffix => ['md', 'json'].flatMap(extension => [`${state.fields.ticket}-${suffix}.${extension}`, `miw-${state.fields.ticket}-${suffix}.${extension}`]));
    if (split >= 0 && files.includes(reference)) {
      const label = text.slice(0, split);
      const rationale = assessment?.audit_id && auditId === assessment.audit_id && assessment.rationale &&
        label.startsWith('Result: Change assessment — Code complexity:') && !label.includes('; rationale:')
        ? `; rationale: ${assessment.rationale}` : '';
      return `${escapeHtml(label + rationale)} · <a href="${encodeURIComponent(reference)}">View assessment report</a>`;
    }
  }
  const breakdown = text.match(/^(Result: (?:Execute|Lightweight) time breakdown \(elapsed estimate\): .*); evidence: ((?:miw-)?time-breakdown-(?:execute|lightweight)-[1-9]\d*\.json)$/);
  if (breakdown) return `${escapeHtml(breakdown[1])} · <a href="${encodeURIComponent(breakdown[2])}">Timing details</a>`;
  const packageResult = text.match(/^Result: Final approval package built\.?; evidence: (.+); sha256:\s*[a-f0-9]{64}(?: \[audit-note: result; id: final-package:[a-f0-9]{64}\])?$/i);
  const filename = `${state.fields.ticket}-final-package.md`;
  const expectedPath = runArtifact(state.fields.ticket, filename, state.fields.artifact_naming_version);
  if (packageResult && packageResult[1] === expectedPath) {
    return `Final approval package built. <a href="${encodeURIComponent(filename)}" title="${escapeHtml(expectedPath)}">View package</a>`;
  }
  if (text === 'Result: Session feedback saved; evidence: workflow-feedback.md') {
    return 'Session feedback saved. <a href="workflow-feedback.md">Read feedback</a>';
  }
  // Evidence digests belong in the saved audit/artifacts, not ordinary progress
  // prose. Approval hashes are rendered separately in the pending-input panel.
  if (!text.startsWith('Result:')) return escapeHtml(text);
  const readable = text.replace(/(?:;\s*)?(?:(?:manifest|result)\s+)?\bSHA-?256\s*[:=]?\s*[a-f0-9]{7,64}\b/gi, '')
    .replace(/;\s*;/g, ';').replace(/;\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  return escapeHtml(readable);
}

function renderAuditRows(state, invalidTimestampFrom, assessment = null, acceptance = null) {
  return [...state.audit].reverse().map((row) => {
    let duration = '';
    if (row.number === state.realRowsFrom) {
      duration = ' <span class="step-duration" title="First row with a real captured timestamp — no real predecessor to measure from.">(first real timestamp)</span>';
    } else if (row.number >= invalidTimestampFrom) {
      duration = ' <span class="timestamp-warning">(duration unavailable)</span>';
    } else if (row.number > state.realRowsFrom) {
      const previous = state.audit[row.number - 2];
      duration = ` <span class="step-duration">(+${formatDuration(row.epoch - previous.epoch)})</span>`;
    }
    const warning = row.number === invalidTimestampFrom
      ? ' <span class="timestamp-warning">(timestamp later than state checkpoint)</span>' : '';
    const phases = row.from === row.to
      ? `<td colspan="2" title="Phase unchanged">${escapeHtml(PHASE_INFO[row.to]?.label ?? row.to)}</td>`
      : `<td>${escapeHtml(row.from)}</td><td>${escapeHtml(row.to)}</td>`;
    return `<tr><td>${row.number}</td><td class="ts" data-ts="${escapeHtml(row.time)}"></td>${phases}<td>${renderAuditOutcome(state, row.outcome, assessment, row.note?.id, acceptance)}${warning}${duration}</td></tr>`;
  }).join('\n');
}

function renderSessionTiming(state, timing, invalidTimestampFrom) {
  if (Number.isFinite(invalidTimestampFrom)) {
    return `<p class="session-timing">Timing unavailable: audit row ${invalidTimestampFrom} is later than the state file's checkpoint time. Durations from that row onward cannot be trusted.</p>`;
  }
  if (!timing) return '';
  const legacy = state.realRowsFrom > 1
    ? ` This is not the full session duration — everything before row ${state.realRowsFrom} happened before any real timestamp was captured.`
    : '';
  return `<p class="session-timing">Session timing: ${timing.feedbackEndpoint ? `from row ${state.realRowsFrom} through feedback ${timing.feedbackCollecting ? 'collection (in progress)' : 'finalization'} spans` : `rows ${state.realRowsFrom}→${timing.last.number} above span`} ${timing.total} of elapsed time (includes waits and pauses). Active processing time is not measured.${legacy}${timing.feedbackExcluded ? ' Feedback collection time is excluded because no reliable finalization timestamp is available.' : ''}</p>`;
}

function pendingReviewLink(state, record) {
  const binding = record.binding;
  if (!binding || binding.kind === 'handoff') return '';
  const reference = binding.kind === 'package'
    ? runArtifact(state.fields.ticket, `${state.fields.ticket}-final-package.md`, state.fields.artifact_naming_version)
    : binding.path;
  let filename;
  try { filename = validateArtifactPath(reference, 'pending approval', state.fields.ticket); }
  catch { return ''; }
  if (!filename || !filename.endsWith('.md')) return '';
  const label = binding.kind === 'package' ? 'Review final package'
    : record.phase === 'spec-approval' ? 'Review specification'
      : record.phase === 'plan-approval' ? 'Review plan' : 'Review document';
  return `<a class="pending-reference" href="${escapeHtml(filename)}">${label}</a>`;
}

function renderStatusBanner(state, timing, invalidTimestampFrom, delivery) {
  const pending = state.pendingInputs ?? pendingInputs(state.fields);
  if (pending.length) {
    const cards = pending.map((record) => {
      const title = record.blocking
        ? record.waiting_for === 'pm' ? 'Implementation is waiting for the Product Manager' : 'Implementation is waiting for your input'
        : record.waiting_for === 'pm' ? 'Product Manager input requested' : 'Your input is requested';
      const choicesFor = (choices) => choices.length ? `<ul>${choices.map((choice) => `<li>${escapeHtml(choice.label)}${choice.description ? ` — ${escapeHtml(choice.description)}` : ''}</li>`).join('')}</ul>` : '';
      const choices = record.questions ? record.questions.map((prompt) => `<div class="pending-subquestion"><p class="pending-question"><strong>${escapeHtml(prompt.id)}</strong> ${escapeHtml(prompt.question)}</p>${choicesFor(prompt.choices)}</div>`).join('') : choicesFor(record.choices);
      const reference = pendingReviewLink(state, record);
      const queued = record.blocking && state.fields.queued_autonomy && state.fields.queued_autonomy !== 'none'
        ? `<p class="pending-qualifier">${escapeHtml(state.fields.queued_autonomy)} starts with the next phase. This question still needs an answer under ${escapeHtml(state.fields.autonomy)}.</p>` : '';
      const action = record.kind === 'approval' && reference
        ? reference
        : `<details class="pending-details"><summary>View question</summary><p class="pending-question">${escapeHtml(record.question)}</p>${choices}${queued}${reference}</details>`;
      return `<section class="next-action pending-input" aria-label="Pending input" data-input-id="${escapeHtml(record.id)}"><strong class="pending-title">${title}</strong>${action}</section>`;
    }).join('\n');
    const withoutPending = { ...state, fields: { ...state.fields, pending_inputs: '[]' }, pendingInputs: [] };
    const banner = pending.some((record) => record.blocking) && state.fields.status === 'Paused' ? '' : renderStatusBanner(withoutPending, timing, invalidTimestampFrom, delivery);
    return `${banner}\n${cards}`;
  }
  if (state.fields.status === 'Paused' || state.fields.status === 'Stopped') {
    return `<p class="next-action"><strong>Waiting on you:</strong> ${escapeHtml(state.fields.pause_reason)}</p>`;
  }
  if (state.fields.status !== 'Complete') return '';
  const duration = Number.isFinite(invalidTimestampFrom)
    ? 'Elapsed unavailable — an audit timestamp is later than the state checkpoint.'
    : timing
    ? `Elapsed time (includes waits and pauses): ${timing.total}. Active processing time is not measured.${state.realRowsFrom > 1 ? ' (not the full session — see the Session timing note below).' : ''}`
    : 'Elapsed: unknown — no real start timestamp was captured for this run.';
  const deliveryText = {
    offered: 'Delivery decision pending. Changes remain local and uncommitted.',
    'awaiting-approval': 'Delivery awaits approval of its exact plan. Changes remain local and uncommitted.',
    running: 'Delivery is running; repository progress is shown below.',
    partial: 'Delivery stopped after partial progress; see the repository results below.',
    failed: 'Delivery failed; see the recorded error and repository progress below.',
    delivered: 'Changes committed and pushed; pull requests opened or updated.',
    declined: 'Delivery was not requested. Changes remain local and uncommitted.',
    unknown: 'Delivery status is unavailable; inspect the delivery records below.',
  }[delivery?.status] ?? 'Changes remain local and uncommitted.';
  const testing = testingSummaryNotes(parseTestingSummary(state.fields.testing_summary)).map(note => `<br><span class="testing-note"><strong>Testing:</strong> ${escapeHtml(note)}</span>`).join('');
  return `<p class="complete"><strong>Implementation complete.</strong> ${duration} ${deliveryText}${testing}<br><small>Delivery status reflects actions recorded by make-it-work. Commits, pushes and pull requests completed outside the plugin are not automatically reflected here.</small></p>`;
}

function renderDeliveryDetails(delivery, ticket) {
  if (!delivery || ['not-started', 'offered', 'declined'].includes(delivery.status)) return '';
  const link = (url, label) => url
    ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>` : escapeHtml(label);
  const rows = delivery.repos.map((repo) => `<tr><td>${escapeHtml(repo.name)}</td><td>${repo.commit ? link(repo.commitUrl, repo.commit.slice(0, 12)) : 'Not committed'}</td><td>${repo.pushed ? 'Pushed' : 'Not pushed'}</td><td>${repo.pr ? link(repo.pr, 'View pull request') : repo.prRecorded ? 'Created (link unavailable)' : 'Not created'}</td></tr>`).join('\n');
  return `<section class="delivery-details" aria-label="Delivery progress"><h2>Delivery — ${DELIVERY_LABELS[delivery.status]}</h2>
${delivery.activity ? `<p>${escapeHtml(delivery.activity)}</p>` : ''}
${delivery.error ? `<p class="next-action">${escapeHtml(delivery.error)}</p>` : ''}
${delivery.updatedAt ? `<p class="delivery-updated">Last updated: <span class="ts" data-ts="${escapeHtml(delivery.updatedAt)}"></span></p>` : ''}
${rows ? `<table><tr><th>Repository</th><th>Commit</th><th>Push</th><th>Pull request</th></tr>${rows}</table>` : ''}
<p class="delivery-records"><a href="${encodeURIComponent(ticket)}-delivery-plan.md">Delivery plan</a> · <a href="${encodeURIComponent(ticket)}-delivery-progress.json">Progress record</a></p></section>`;
}

function renderModePill(state) {
  if (!isAdaptive(state)) return '';
  const { mode, mode_source: source, risk, risk_rationale: rationale } = state.fields;
  if (mode === 'none') {
    return '<span class="pill mode-pill" title="The development approach and risk are assessed after Refinement.">Approach: Not yet assessed</span>';
  }
  const explanation = mode === 'tdd'
    ? 'Plans the work, prepares tests, then implements and verifies each step.'
    : 'Implements a low-risk change directly from the refined spec, with tests and independent review.';
  const tooltip = `${explanation}${source === 'user' ? ' Selected by you.' : ''}`;
  const approach = `<span class="pill mode-pill mode-${mode}" title="${escapeHtml(tooltip)}">Approach: ${escapeHtml(MODE_LABELS[mode])}</span>`;
  const riskBadge = risk === 'none' ? '' : `<span class="pill risk-pill" title="${escapeHtml(rationale === 'none' ? 'No risk rationale recorded.' : rationale)}">Initial risk: ${escapeHtml(risk[0].toUpperCase() + risk.slice(1))}</span>`;
  return approach + riskBadge;
}

function renderTddArtifactTile(state, field, label, note = '') {
  if (isAdaptive(state) && state.fields.mode === 'lightweight') return '';
  const link = artifactLink(state.fields[field], field, state.fields.ticket);
  return `  <div class="artifact-tile"><div class="label">${label}</div>${link}${note ? `<p class="artifact-note">${escapeHtml(note)}</p>` : ''}</div>`;
}

function renderImplementationTile(state) {
  if (!isAdaptive(state) || state.fields.implementation_report === 'none') return '';
  const link = artifactLink(state.fields.implementation_report, 'implementation_report', state.fields.ticket);
  return `\n  <div class="artifact-tile"><div class="label">Lightweight report</div>${link}</div>`;
}

function applyTemplate(template, replacements) {
  let output = template;
  for (const [name, value] of Object.entries(replacements)) {
    output = output.replaceAll(`{{${name}}}`, value);
  }
  const unresolved = output.match(/{{[A-Z_]+}}/g);
  if (unresolved) fail(`Dashboard template has unresolved placeholders: ${[...new Set(unresolved)].join(', ')}`);
  return output;
}

function renderPublicationBadge(permission) {
  const status = permission?.status ?? 'off';
  const label = { allowed: 'Allowed', off: 'Off', unknown: 'Unknown' }[status];
  let tooltip = 'No ticket writes are authorized for this run.';
  if (status === 'allowed') {
    const names = { description: 'description replacement', attachment: 'attachments', comment: 'comments' };
    tooltip = `Authorized for ${permission.target.issue} at ${permission.target.site}: ${permission.allowed.map((kind) => names[kind]).join(', ')}.`;
    if (permission.artifact_comments) tooltip += ' Artifact comments are allowed when uploads are unavailable.';
    tooltip += ' This shows permission, not whether an update succeeded.';
  } else if (status === 'unknown') {
    tooltip = 'Saved ticket-update permission could not be verified. No authorization is inferred.';
  }
  return `<span class="pill ticket-updates-pill ticket-updates-${status}" title="${escapeHtml(tooltip)}">Ticket updates: ${label}</span>`;
}

function acceptancePresentation(state, verification) {
  if (state.fields.verification_version !== '1' || !['final-approval', 'complete'].includes(state.fields.phase) || (isAdaptive(state) && state.fields.mode === 'lightweight')) return null;
  const summary = summarizeAcceptance(verification?.acceptance);
  return { summary,
    report: summary ? runArtifactName(runArtifact(state.fields.ticket, `${state.fields.ticket}-acceptance-v${state.fields.plan_version}.md`, state.fields.artifact_naming_version), state.fields.ticket) : null,
    source: runArtifact(state.fields.ticket, `${state.fields.ticket}-verification-v${state.fields.plan_version}.json`, state.fields.artifact_naming_version) };
}

function renderAcceptance(acceptance) {
  if (!acceptance) return '';
  const summary = acceptance.summary;
  return `<p class="acceptance-summary" aria-label="Acceptance verification"><strong>Acceptance checks:</strong> ${summary ? `${summary.verified} of ${summary.total} verified${summary.pending ? ` · ${summary.pending} pending` : ''} · <a href="${escapeHtml(acceptance.report)}">View verification report</a>` : 'Not recorded'}</p>`;
}

function renderAutonomyBadge(state) {
  const { autonomy, queued_autonomy: queued } = state.fields;
  const pending = queued && queued !== 'none';
  const title = pending ? 'The queued mode starts at the next phase boundary. The current phase and any open question keep their existing mode.'
    : autonomy === 'pending' ? PENDING_AUTONOMY_TOOLTIP : AUTONOMY_TOOLTIP;
  return `<span class="pill autonomy-pill" title="${escapeHtml(title)}">Control: ${escapeHtml(autonomy[0].toUpperCase() + autonomy.slice(1))}${pending ? ` · ${escapeHtml(queued)} queued` : ''}</span>`;
}

function renderFeedbackProgress(feedback) {
  if (feedback?.status !== 'collecting') return '';
  return '<section class="feedback-progress" data-workflow-feedback-status="collecting" role="status" aria-label="Session retrospective"><strong>Session retrospective: Collecting feedback</strong><p>Reviewing the session and collecting workflow feedback. The implementation result is unchanged. This page will refresh when the report is saved.</p></section>';
}

function renderFeedbackNote(feedback) {
  if (feedback?.status === 'unavailable') return `<p class="feedback-note" data-workflow-feedback-status="unavailable" role="status"><strong>Workflow feedback:</strong> Unavailable${feedback.reason ? ` — ${escapeHtml(feedback.reason)}` : ' — collection could not be completed'}. Implementation status is unchanged.</p>`;
  if (feedback?.status !== 'saved') return '';
  if (!feedback.shareReady) return '<p class="feedback-note" data-workflow-feedback-status="saved"><strong>Workflow feedback:</strong> Session feedback saved. Read the saved report before sharing.</p>';
  return `<p class="feedback-note" data-workflow-feedback-status="saved"><strong>Workflow feedback:</strong> <a href="workflow-feedback.md">Save this session’s feedback</a> · <a href="${escapeHtml(FEEDBACK_EMAIL_URL)}">Email feedback</a>. ${escapeHtml(FEEDBACK_SHARING_REMINDER)} Share only this session export. <code>make-it-work/implement-feedback.md</code> is the separate cumulative local history.</p>`;
}

function renderAssessmentBadges(state, report) {
  if (!assessmentPhase(state) || !report?.audit_id || !state.audit.some(row => row.note?.kind === 'result' && row.note.id === report.audit_id)) return '';
  const title = escapeHtml(`Completeness: ${report.completeness}. ${report.reason ?? report.rationale ?? 'Overall ratings unavailable for the assessed scope.'}`);
  const rated = report.completeness !== 'unavailable' && [report.complexity, report.risk].every(rating => ['Low', 'Medium', 'High'].includes(rating));
  if (report.stale || !rated) return `<span class="pill assessment-neutral" title="${title}">Assessment: ${report.stale ? 'Stale' : 'Unavailable'}</span>`;
  return [['Code complexity', report.complexity], ['Production risk', report.risk]].map(([label, rating]) => `<span class="pill assessment-${rating.toLowerCase()}" title="${title}">${label}: ${rating}</span>`).join('');
}

export function renderStatus({ state, template, logoBase64, planStatus = null, invalidTimestampFrom = Infinity, delivery = null, publication = null, scope = null, verification = null, feedback = null, assessment = null, usageSnapshot = null, now = null, artifactDirectory = null, preparation = null }) {
  const acceptance = acceptancePresentation(state, verification);
  const preparationNote = preparation?.status === 'unavailable' ? 'Preparation evidence unavailable'
    : preparation && preparation.plan_hash !== (preparation.current_plan_hash ?? state.fields.plan_hash)
      ? 'Superseded — refresh preparation for the current plan' : '';
  const coverage = planStatus?.coverage;
  const coverageHtml = coverage ? `<details class="test-coverage" style="grid-column: 1 / -1; padding: 16px; border: 1px solid #ddd; border-radius: 6px;"><summary>Test coverage — ${coverage.unavailable ? 'unavailable' : `${coverage.progression} progression / ${coverage.regression} regression scenarios`}</summary>${coverage.unavailable ? '' : coverage.scenarios.map(row => { const entry = !preparationNote && preparation?.entries?.find(e => e.scenario === row.scenario && (!row.repo || e.repo === row.repo)); return `<p>${escapeHtml(row.scenario)} · ${escapeHtml(row.purpose)}${row.protected ? ` · ${escapeHtml(row.protected)}` : ''} · ${escapeHtml(preparationNote || (entry ? `${entry.kind}: ${entry.result} — ${entry.reason}` : row.baseline))}</p>`; }).join('')}</details>` : '';
  const collectingFeedback = state.fields.status === 'Complete' && feedback?.status === 'collecting';
  const timeline = groupFinalization(buildTimeline(state));
  const needsPlan = timeline.activeSlot && ['execute', 'fix-plan'].includes(timeline.activeSlot.phase);
  if (needsPlan && !planStatus) fail('This timeline requires plan progress, but no plan was available.');

  const timing = timingDetails(state, invalidTimestampFrom, feedback, now);
  const reviewLink = state.fields.review === 'not-started'
    ? '<span class="none">Not yet created</span>'
    : artifactLink(runArtifact(state.fields.ticket, `${state.fields.ticket}-review.md`, state.fields.artifact_naming_version), 'review', state.fields.ticket);
  const replacements = {
    WORKFLOW_STYLES,
    WORKFLOW_TIMESTAMPS,
    WORKFLOW_HEADER: renderWorkflowHeader({
      workflow: 'Implementation Workflow', title: state.fields.ticket, logoBase64, pluginVersion: state.fields.plugin_version, usageSnapshot,
      badges: renderAutonomyBadge(state) +
        renderPublicationBadge(publication ?? { status: state.fields.ticket_publication && state.fields.ticket_publication !== 'none' ? 'unknown' : 'off' }) + renderModePill(state),
      assessmentBadges: renderAssessmentBadges(state, assessment),
    }),
    TICKET: escapeHtml(state.fields.ticket),
    AUTO_REFRESH: feedback?.status === 'collecting' || state.fields.status === 'In Progress' || state.pendingInputs?.length > 0 || (state.fields.status === 'Complete' && state.fields.final_package_version === '1' && DELIVERY_PENDING.has(delivery?.status ?? 'not-started'))
      ? '<meta http-equiv="refresh" content="15">' : '',
    LOGO_BASE64: logoBase64,
    AUTONOMY: escapeHtml(state.fields.autonomy),
    AUTONOMY_TOOLTIP: escapeHtml(state.fields.autonomy === 'pending' ? PENDING_AUTONOMY_TOOLTIP : AUTONOMY_TOOLTIP),
    MODE_PILL: renderModePill(state),
    TICKET_UPDATES_BADGE: renderPublicationBadge(publication ?? { status: state.fields.ticket_publication && state.fields.ticket_publication !== 'none' ? 'unknown' : 'off' }),
    PHASE_TIMELINE: renderTimeline(state, timeline, planStatus, invalidTimestampFrom, delivery, feedback, now),
    CURRENT_ACTIVITY: renderCurrentActivity(state, timeline),
    STATUS_BANNER: collectingFeedback
      ? renderStatusBanner(state, timing, invalidTimestampFrom, null).replace('<strong>Implementation complete.</strong>', '<strong>Finalizing session.</strong> Implementation checks and final approval are complete. Collecting workflow feedback before optional delivery.')
      : renderStatusBanner(state, timing, invalidTimestampFrom, delivery),
    FEEDBACK_PROGRESS: renderFeedbackProgress(feedback),
    // Older templates may still contain this placeholder. Details live in artifacts.
    ASSURANCE_SUMMARY: '',
    CHANGE_ASSESSMENT: '', // Compatibility with older templates; no standalone section.
    ACCEPTANCE_SUMMARY: renderAcceptance(acceptance),
    VERIFICATION_TILE: acceptance?.report ? `  <div class="artifact-tile"><div class="label">Acceptance checks</div><a href="${escapeHtml(acceptance.report)}">View verification report</a></div>` : '',
    DELIVERY_STATUS: collectingFeedback ? '' : renderDeliveryDetails(delivery, state.fields.ticket),
    WORKSPACE_PANEL: renderWorkspacePanel(state, scope, verification),
    SPEC_LINK: artifactLink(state.fields.spec, 'spec', state.fields.ticket),
    PREPARATION_TILE: state.fields.test_writing_version === '1' ? renderTddArtifactTile(state, 'test_preparation_report', 'Test Preparation', preparationNote) + coverageHtml : '',
    TEST_PREPARATION: '', // Compatibility with older templates; details live in artifacts.
    PLAN_TILE: renderTddArtifactTile(state, 'plan', 'Plan'),
    EXECUTE_TILE: renderTddArtifactTile(state, 'execute_report', 'Execute'),
    IMPLEMENTATION_TILE: renderImplementationTile(state),
    REVIEW_LINK: reviewLink,
    FINAL_LINK: state.fields.final_package_version === '1' && ['final-approval', 'complete'].includes(state.fields.phase)
      ? artifactLink(runArtifact(state.fields.ticket, `${state.fields.ticket}-final-package.md`, state.fields.artifact_naming_version), 'final_package', state.fields.ticket)
      : '<span class="none">Not yet created</span>',
    FEEDBACK_NOTE: state.fields.status === 'Complete' ? renderFeedbackNote(feedback) : '',
    AUDIT_ROWS: renderAuditRows(state, invalidTimestampFrom, assessment, acceptance),
    SESSION_TIMING: renderSessionTiming(state, timing, invalidTimestampFrom),
    KNOWN_REGRESSIONS: renderListSection('Unrelated test failures', state.knownRegressions),
    DECIDED_FINDINGS: renderListSection('Review decisions', state.decidedFindings),
  };
  let html = applyTemplate(template, replacements);
  if (state.fields.artifact_naming_version === '1') html = html.replace(/href="([^"#:]+)"/g, (match, href) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return match;
    if (!artifactDirectory) return `href="${artifactReference(href, 1)}"`;
    try {
      const resolved = artifactJoin(artifactDirectory, decodeURIComponent(href));
      return `href="${path.relative(artifactDirectory, resolved).split(path.sep).map(encodeURIComponent).join('/')}"`;
    } catch { return match; }
  });
  return html;
}

function resolvedPlanPath(statePath, planField, ticket) {
  const relative = validateArtifactPath(planField, 'plan', ticket);
  return relative ? artifactJoin(path.dirname(statePath), relative) : null;
}

export async function generateDashboard(statePath) {
  const absoluteStatePath = artifactResolve(statePath);
  const [stateMarkdown, initialStateInfo, template, logo] = await Promise.all([
    readFile(absoluteStatePath, 'utf8'),
    stat(absoluteStatePath),
    readFile(TEMPLATE_PATH, 'utf8'),
    readFile(LOGO_PATH, 'utf8'),
  ]);
  let state = parseState(stateMarkdown, absoluteStatePath);
  assertRunState(path.dirname(path.dirname(path.dirname(absoluteStatePath))), absoluteStatePath, state.fields.ticket);
  const assessment = await checkpointAssessment(absoluteStatePath, state);
  let stateInfo = initialStateInfo;
  if (assessment) {
    state = parseState(await readFile(absoluteStatePath, 'utf8'), absoluteStatePath);
    stateInfo = await stat(absoluteStatePath);
  }
  const invalidTimestampFrom = state.audit.find((row) => row.epoch > stateInfo.mtimeMs + 60_000)?.number ?? Infinity;
  const timeline = groupFinalization(buildTimeline(state));
  const needsPlan = timeline.activeSlot && ['execute', 'fix-plan'].includes(timeline.activeSlot.phase);
  let planStatus = null;
  if (needsPlan) {
    const planPath = resolvedPlanPath(absoluteStatePath, state.fields.plan, state.fields.ticket);
    if (!planPath) fail('Timeline requires plan progress, but the state plan field is none.');
    let planMarkdown;
    try {
      planMarkdown = await readFile(planPath, 'utf8');
    } catch (error) {
      fail(`Could not read the plan required for timeline progress: ${error.message}`);
    }
    planStatus = parsePlanStatus(planMarkdown);
    planStatus.coverage = coverageSummary(planMarkdown);
    if (state.fields.phase === 'execute') {
      let journal;
      try { journal = JSON.parse(await readFile(`${planPath}.execution.json`, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (journal) {
        if (journal.version !== 1) fail('Unsupported execution activity journal.');
        const active = journal.active_steps ?? [];
        if (!Array.isArray(active)) fail('Execution journal active steps must be an array.');
        if (!journal.stopped && active.length && state.fields.status === 'In Progress') {
          if (journal.plan_hash !== planHash(planMarkdown)) fail('Execution activity belongs to a changed plan; inspect step control before continuing.');
          const steps = parseSteps(planMarkdown), eligible = nextBatch(steps, planStatus.complete, active.length > 1);
          if (active.length > eligible.length || active.some((id, i) => id !== eligible[i])) fail('Execution journal active steps conflict with verified Progress.');
          planStatus.activeSteps = active.map((id) => ({ number: id, title: steps[id - 1].title }));
        }
      }
    }
  }
  const logoBase64 = logo.trim();
  if (!logoBase64 || !/^[A-Za-z0-9+/=]+$/.test(logoBase64)) fail('Logo asset is empty or invalid base64.');
  const delivery = state.fields.status === 'Complete' && state.fields.final_package_version === '1'
    ? await readDelivery(path.dirname(path.dirname(path.dirname(absoluteStatePath))), state.fields.ticket) : null;
  const publication = await readPublicationPermission(path.dirname(path.dirname(path.dirname(absoluteStatePath))), state.fields);
  const scope = state.fields.workspace_version === '1' ? await readScope(path.dirname(path.dirname(path.dirname(absoluteStatePath))), state.fields.ticket) : null;
  let verification = null;
  const finalVerification = state.fields.verification_version === '1' && ['final-approval', 'complete'].includes(state.fields.phase) && !(isAdaptive(state) && state.fields.mode === 'lightweight');
  if (scope || finalVerification) {
    const { readVerification, validateVerification } = await import('./verification.mjs');
    // Skipped manual checks require the accepted plan even during Execute/Review.
    // Keep plan read failures distinct from an absent, not-yet-created ledger.
    const planPath = resolvedPlanPath(absoluteStatePath, state.fields.plan, state.fields.ticket);
    const plan = planPath ? await readFile(planPath, 'utf8') : null;
    try {
      const ledger = await readVerification(path.dirname(path.dirname(path.dirname(absoluteStatePath))), runArtifact(state.fields.ticket, `${state.fields.ticket}-verification-v${state.fields.plan_version}.json`, state.fields.artifact_naming_version), { ticket: state.fields.ticket, planVersion: Number(state.fields.plan_version), plan });
      if (finalVerification) {
        if (plan === null) fail('Final verification requires the accepted plan.');
        validateVerification(ledger, { ticket: state.fields.ticket, planVersion: Number(state.fields.plan_version), plan, requireComplete: true, requireClauses: state.fields.acceptance_evidence_version === '1' });
      }
      verification = ledger;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const { readFeedbackProgress } = await import('./feedback-progress.mjs');
  const acceptance = acceptancePresentation(state, verification);
  if (acceptance?.report) {
    const report = artifactJoin(path.dirname(absoluteStatePath), acceptance.report);
    const markdown = acceptanceMarkdown(verification, runArtifactName(acceptance.source, state.fields.ticket));
    let previous = null;
    try { previous = await readFile(report, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous !== markdown) await atomicWrite(report, markdown);
  }
  const feedback = await readFeedbackProgress(absoluteStatePath, state);
  const outputPath = absoluteStatePath.replace(/-state\.md$/, '-status.html');
  let preparation = null;
  if (state.fields.test_writing_version === '1' && state.fields.test_preparation !== 'none') {
    try {
      preparation = JSON.parse(await readFile(artifactResolve(path.dirname(path.dirname(path.dirname(absoluteStatePath))), state.fields.test_preparation), 'utf8'));
      if (!preparation || !Array.isArray(preparation.entries)) throw new Error('Invalid preparation evidence.');
      const currentPlan = resolvedPlanPath(absoluteStatePath, state.fields.plan, state.fields.ticket);
      preparation.current_plan_hash = currentPlan ? planHash(await readFile(currentPlan, 'utf8')) : state.fields.plan_hash;
    }
    catch (error) { preparation = { plan_hash: 'unavailable', status: 'unavailable', entries: [{ scenario: 'Preparation evidence unavailable', result: 'not-run', reason: error.message }] }; }
  }
  if (!planStatus && state.fields.plan && state.fields.plan !== 'none') {
    try {
      const displayPlan = await readFile(resolvedPlanPath(absoluteStatePath, state.fields.plan, state.fields.ticket), 'utf8');
      planStatus = { coverage: coverageSummary(displayPlan) };
    } catch { planStatus = { coverage: { unavailable: true } }; }
  }
  const html = await generateArtifactPreviews(renderStatus({ preparation, assessment, state, template, logoBase64, planStatus, invalidTimestampFrom, delivery, publication, scope, verification, feedback, usageSnapshot: await readUsage(path.dirname(absoluteStatePath)), artifactDirectory: path.dirname(absoluteStatePath) }), { dashboardPath: outputPath });
  const temporaryPath = `${outputPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, html, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
  return outputPath;
}

function parseArgs(argv) {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) return { help: true };
  if (argv.length !== 2 || argv[0] !== '--state' || !argv[1]) {
    fail('Usage: node render-status.mjs --state make-it-work/<TICKET>/<TICKET>-state.md');
  }
  return { statePath: argv[1] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('Usage: node render-status.mjs --state make-it-work/<TICKET>/<TICKET>-state.md\n');
    return;
  }
  const outputPath = await generateDashboard(args.statePath);
  process.stdout.write(`${outputPath}\n`);
}

if (process.argv[1] && artifactResolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`render-status: ${error.message}\n`);
    process.exitCode = 1;
  });
}
