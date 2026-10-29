#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertRunState, runArtifact, runArtifactName } from './artifact-layout.mjs';
import { readDelivery } from './delivery-progress.mjs';
import { readPublicationPermission } from './ticket-publication.mjs';
import { parseDecisionCell } from './workflow-decisions.mjs';
import { pendingInputs } from './pending-input.mjs';
import { WORKFLOW_STYLES, WORKFLOW_TIMESTAMPS, renderWorkflowHeader } from '../../../scripts/lib/workflow-dashboard.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(SCRIPT_DIR, '../assets/status-template.html');
const LOGO_PATH = path.resolve(SCRIPT_DIR, '../assets/insideout-ai-logo-base64.txt');

const REQUIRED_FIELDS = [
  'ticket', 'status', 'phase', 'autonomy', 'start_time', 'execution_mode',
  'inline_pause_mode', 'spec', 'spec_hash', 'plan', 'plan_version', 'plan_hash',
  'execution', 'review', 'review_cycle', 'fix_cycle', 'fix_plan_round_steps',
  'fix_plan_dispatch', 'replans_used', 'gate', 'pause_reason', 'branch', 'base',
  'head', 'worktree_fingerprint', 'execute_report', 'context_updated',
  'current_activity', 'real_rows_from',
];

const STATUS_VALUES = new Set(['In Progress', 'Paused', 'Stopped', 'Complete']);
const PHASE_VALUES = new Set([
  'context-check', 'close-the-gaps', 'spec-approval', 'plan', 'plan-approval',
  'execute', 'review', 'fix-plan', 'final-sync', 'final-approval', 'complete',
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
  'context-check', 'close-the-gaps', 'plan', 'execute', 'review', 'fix-plan',
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
  execute: {
    label: 'Execute',
    skill: 'execute',
    tooltip: 'implements the plan step by step, writing and passing each step\'s tests.',
  },
  review: {
    label: 'Review',
    skill: 'review-the-pr',
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
  'guided: pauses for your approval after the spec, after the plan, and at every human decision along the way. autonomous: no approval gates, and replans automatically when the plan stops holding — still asks every genuine question. autopilot: resolves every documented safe default without prompting, creates a feature branch from the base branch, and stops with a recorded reason when required facts are missing or contradictory.';
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
    if (path.basename(statePath) !== expected) {
      fail(`State filename must match its ticket field: expected ${expected}.`);
    }
  }
  if (!STATUS_VALUES.has(fields.status)) fail(`Unsupported status: ${fields.status}`);
  if (fields.handoff_version !== undefined && fields.handoff_version !== '1') fail(`Unsupported handoff_version: ${fields.handoff_version}`);
  if (fields.final_package_version !== undefined && fields.final_package_version !== '1') fail(`Unsupported final_package_version: ${fields.final_package_version}`);
  if (fields.verification_version !== undefined && fields.verification_version !== '1') fail(`Unsupported verification_version: ${fields.verification_version}`);
  if (fields.plugin_version !== undefined && !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(fields.plugin_version)) {
    fail('Unsupported plugin_version.');
  }
  if (fields.phase === 'final-approval' && fields.final_package_version !== '1') fail('Final approval requires final_package_version: 1.');
  if (!PHASE_VALUES.has(fields.phase)) fail(`Unsupported phase: ${fields.phase}`);
  if (!AUTONOMY_VALUES.has(fields.autonomy)) fail(`Unsupported autonomy: ${fields.autonomy}`);
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

function slotInfo(slot) {
  return slot.lightweightFix ? LIGHTWEIGHT_FIX_INFO : PHASE_INFO[slot.phase];
}

export function buildTimeline(state) {
  const adaptive = isAdaptive(state);
  const lightweightTimeline = adaptive && (state.fields.mode === 'lightweight' || state.fields.escalations === '1');
  let phases = state.fields.final_package_version === '1'
    ? [...BASELINE_PHASES.slice(0, -1), 'final-approval', 'complete']
    : BASELINE_PHASES;
  if (lightweightTimeline) phases = phases.flatMap((phase) => phase === 'review' ? ['lightweight', phase] : [phase]);
  const slots = phases.map((phase) => ({
    ...newSlot(phase),
    ...(lightweightTimeline && (phase === 'plan' || phase === 'execute') ? { skipped: true } : {}),
  }));
  const activatedPhases = new Set();
  let activeSlot = null;

  for (const row of state.audit) {
    if (row.to === 'spec-approval' || row.to === 'plan-approval') continue;

    if (!CANONICAL_PHASES.has(row.to) && !(adaptive && row.to === 'lightweight')) continue;
    if (activeSlot?.phase === 'fix-plan' && row.to === 'execute') continue;
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

function renderTimeline(state, timeline, planStatus, invalidTimestampFrom, delivery) {
  const { slots, activeSlot } = timeline;
  const activated = slots.filter((slot) => slot.activationRow);

  const steps = slots.map((slot, index) => {
    const info = slotInfo(slot);
    const dotState = slotState(slot, activeSlot, state.fields.status);
    const isActive = slot === activeSlot;
    const passed = dotState === 'passed';
    const symbol = passed ? '✓' : dotState === 'failed' ? '✗' : '';
    const lineClass = passed || dotState.startsWith('current') ? ' line-green' : '';
    const label = escapeHtml(info.label) + (info.skill ? `<span class="phase-skill">(${escapeHtml(info.skill)})</span>` : '');
    const currentLabel = isActive && state.fields.status === 'In Progress' ? ' current-label' : '';
    const pieces = ['<div class="phase-step">'];
    if (index > 0) pieces.push(`  <div class="line${lineClass}"></div>`);
    const tooltip = dotState === 'skipped' ? SKIPPED_TOOLTIP
      : slot.escalation !== undefined ? `Escalated: ${slot.escalation} — ${info.tooltip}` : info.tooltip;
    pieces.push(`  <div class="phase-dot ${dotState}" title="${escapeHtml(`${slot.phase}: ${tooltip}`)}">${symbol}</div>`);
    pieces.push(`  <div class="phase-label${currentLabel}">${label}</div>`);

    let modeText = null;
    if (isActive && slot.phase === 'execute') {
      if (!planStatus) fail('An active Execute phase requires a readable plan Execution Status.');
      modeText = `${planStatus.mode} · Step ${planStatus.complete} of ${planStatus.total} complete`;
    } else if (isActive && slot.phase === 'fix-plan' && state.fixPlanRoundSteps !== null) {
      if (!planStatus) fail('An active Fix phase with sized steps requires a readable plan Execution Status.');
      const localComplete = planStatus.complete - (planStatus.total - state.fixPlanRoundSteps);
      if (localComplete < 0 || localComplete > state.fixPlanRoundSteps) {
        fail('Current fix-round progress is inconsistent with the plan and fix_plan_round_steps.');
      }
      modeText = `${planStatus.mode} · Step ${localComplete} of ${state.fixPlanRoundSteps} complete`;
    }
    if (dotState === 'skipped') modeText = 'Skipped';
    else if (slot.escalation !== undefined && !modeText) modeText = 'Escalated to TDD';
    if (modeText) pieces.push(`  <div class="phase-mode">${escapeHtml(modeText)}</div>`);

    if (passed && slot.phase !== 'complete') {
      const activatedIndex = activated.indexOf(slot);
      const next = activated[activatedIndex + 1];
      if (next) {
        const duration = slot.activationRow.number < state.realRowsFrom || next.activationRow.number < state.realRowsFrom ||
          next.activationRow.number >= invalidTimestampFrom
          ? '—'
          : formatDuration(next.activationRow.epoch - slot.activationRow.epoch);
        pieces.push(`  <div class="phase-duration">${duration}</div>`);
      }
    }

    if (isActive) {
      const slug = state.fields.status.toLowerCase().replaceAll(' ', '-');
      pieces.push(`  <div class="phase-status status-${slug}">${escapeHtml(state.fields.status)}</div>`);
    }
    pieces.push('</div>');
    return pieces.join('\n');
  });
  if (state.fields.status === 'Complete' && state.fields.final_package_version === '1') {
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
  return `<section class="current-activity" aria-label="Current activity">
  <strong>${label} in progress</strong>
  <p class="phase-activity">${activity}</p>
  ${hasActivity ? `<p class="activity-updated">Last updated: ${timestamp}</p>` : ''}
</section>`;
}

function timingDetails(state, invalidTimestampFrom) {
  if (state.audit.length < 2 || state.realRowsFrom > state.audit.length || Number.isFinite(invalidTimestampFrom)) return null;
  const first = state.audit[state.realRowsFrom - 1];
  const last = state.fields.status === 'Complete'
    ? state.audit.findLast((row) => row.to === 'complete' && row.from !== row.to) ?? state.audit.at(-1)
    : state.audit.at(-1);
  if (last.number < first.number) return null;
  return { total: formatDuration(last.epoch - first.epoch), first, last };
}

function displayOutcome(outcome) {
  // Controller retry metadata stays in the saved audit, outside the user-facing presentation.
  return outcome.replace(/\s*\[workflow-event: [A-Za-z0-9][A-Za-z0-9._:-]*; sha256: [a-f0-9]{64}\]/g, '').trim();
}

function renderAuditRows(state, invalidTimestampFrom) {
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
    return `<tr><td>${row.number}</td><td class="ts" data-ts="${escapeHtml(row.time)}"></td><td>${escapeHtml(row.from)}</td><td>${escapeHtml(row.to)}</td><td>${escapeHtml(displayOutcome(row.outcome))}${warning}${duration}</td></tr>`;
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
  return `<p class="session-timing">Session timing: rows ${state.realRowsFrom}→${timing.last.number} above span ${timing.total} of real captured time.${legacy} Total session cost cannot be shown here either — no tool in this session surfaces token usage or $ cost back to the model (check /usage in your own client for that).</p>`;
}

function renderStatusBanner(state, timing, invalidTimestampFrom, delivery) {
  const pending = state.pendingInputs ?? pendingInputs(state.fields);
  if (pending.length) {
    const cards = pending.map((record) => {
      const title = record.waiting_for === 'pm' ? 'Waiting for the Product Manager' : 'Waiting for your input';
      const qualifier = record.blocking ? state.fields.status === 'Stopped' ? 'Workflow stopped' : 'Workflow paused' : state.fields.status === 'Complete' ? 'Implementation remains complete' : 'Does not block the workflow';
      const choicesFor = (choices) => choices.length ? `<ul>${choices.map((choice) => `<li>${escapeHtml(choice.label)}${choice.description ? ` — ${escapeHtml(choice.description)}` : ''}</li>`).join('')}</ul>` : '';
      const choices = record.questions ? record.questions.map((prompt) => `<div class="pending-subquestion"><p class="pending-question"><strong>${escapeHtml(prompt.id)}</strong> ${escapeHtml(prompt.question)}</p>${choicesFor(prompt.choices)}</div>`).join('') : choicesFor(record.choices);
      const reference = record.binding ? `<p class="pending-reference">${record.binding.path ? escapeHtml(record.binding.path) + ' · ' : ''}SHA-256: <code>${escapeHtml(record.binding.sha256)}</code></p>` : '';
      return `<section class="next-action pending-input" aria-label="Pending input" data-input-id="${escapeHtml(record.id)}"><strong>${title}</strong><span class="pending-qualifier">${qualifier}</span><p class="pending-question">${escapeHtml(record.question)}</p>${choices}<p class="pending-since">Pending since <span class="ts" data-ts="${escapeHtml(record.requested_at)}">${escapeHtml(record.requested_at)}</span> · <span data-wait-since="${escapeHtml(record.requested_at)}">waiting</span></p>${reference}</section>`;
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
    ? `Real-timestamped portion of this run: ${timing.total}.${state.realRowsFrom > 1 ? ' (not the full session — see the Session timing note below).' : ''}`
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
  return `<p class="complete"><strong>Implementation complete.</strong> ${duration} ${deliveryText}</p>`;
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
    return '<span class="pill mode-pill" title="Risk and mode are assessed after Refinement.">Mode: Not yet assessed</span>';
  }
  const riskText = risk === 'none' ? '' : ` · ${risk[0].toUpperCase()}${risk.slice(1)} risk`;
  const text = `Mode: ${MODE_LABELS[mode]}${source === 'user' ? ' (user)' : ''}${riskText}`;
  const tooltip = rationale === 'none' ? 'No risk rationale recorded.' : rationale;
  return `<span class="pill mode-pill mode-${mode}" title="${escapeHtml(tooltip)}">${escapeHtml(text)}</span>`;
}

function renderTddArtifactTile(state, field, label) {
  if (isAdaptive(state) && state.fields.mode === 'lightweight') return '';
  const link = artifactLink(state.fields[field], field, state.fields.ticket);
  return `  <div class="artifact-tile"><div class="label">${label}</div>${link}</div>`;
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

export function renderStatus({ state, template, logoBase64, planStatus = null, invalidTimestampFrom = Infinity, delivery = null, publication = null }) {
  const timeline = buildTimeline(state);
  const needsPlan = timeline.activeSlot && ['execute', 'fix-plan'].includes(timeline.activeSlot.phase);
  if (needsPlan && !planStatus) fail('This timeline requires plan progress, but no plan was available.');

  const timing = timingDetails(state, invalidTimestampFrom);
  const reviewLink = state.fields.review === 'not-started'
    ? '<span class="none">Not yet created</span>'
    : artifactLink(runArtifact(state.fields.ticket, `${state.fields.ticket}-review.md`), 'review', state.fields.ticket);
  const replacements = {
    WORKFLOW_STYLES,
    WORKFLOW_TIMESTAMPS,
    WORKFLOW_HEADER: renderWorkflowHeader({
      workflow: 'Implementation Workflow', title: state.fields.ticket, logoBase64,
      badges: `<span class="pill autonomy-pill" title="${escapeHtml(state.fields.autonomy === 'pending' ? PENDING_AUTONOMY_TOOLTIP : AUTONOMY_TOOLTIP)}">Autonomy: ${escapeHtml(state.fields.autonomy)}</span>` +
        renderPublicationBadge(publication ?? { status: state.fields.ticket_publication && state.fields.ticket_publication !== 'none' ? 'unknown' : 'off' }) + renderModePill(state),
    }),
    TICKET: escapeHtml(state.fields.ticket),
    AUTO_REFRESH: state.fields.status === 'In Progress' || state.pendingInputs?.length > 0 || (state.fields.status === 'Complete' && state.fields.final_package_version === '1' && DELIVERY_PENDING.has(delivery?.status ?? 'not-started'))
      ? '<meta http-equiv="refresh" content="15">' : '',
    LOGO_BASE64: logoBase64,
    AUTONOMY: escapeHtml(state.fields.autonomy),
    AUTONOMY_TOOLTIP: escapeHtml(state.fields.autonomy === 'pending' ? PENDING_AUTONOMY_TOOLTIP : AUTONOMY_TOOLTIP),
    MODE_PILL: renderModePill(state),
    TICKET_UPDATES_BADGE: renderPublicationBadge(publication ?? { status: state.fields.ticket_publication && state.fields.ticket_publication !== 'none' ? 'unknown' : 'off' }),
    PHASE_TIMELINE: renderTimeline(state, timeline, planStatus, invalidTimestampFrom, delivery),
    CURRENT_ACTIVITY: renderCurrentActivity(state, timeline),
    STATUS_BANNER: renderStatusBanner(state, timing, invalidTimestampFrom, delivery),
    DELIVERY_STATUS: renderDeliveryDetails(delivery, state.fields.ticket),
    SPEC_LINK: artifactLink(state.fields.spec, 'spec', state.fields.ticket),
    PLAN_TILE: renderTddArtifactTile(state, 'plan', 'Plan'),
    EXECUTE_TILE: renderTddArtifactTile(state, 'execute_report', 'Execute'),
    IMPLEMENTATION_TILE: renderImplementationTile(state),
    REVIEW_LINK: reviewLink,
    FINAL_LINK: state.fields.final_package_version === '1' && ['final-approval', 'complete'].includes(state.fields.phase)
      ? artifactLink(runArtifact(state.fields.ticket, `${state.fields.ticket}-final-package.md`), 'final_package', state.fields.ticket)
      : '<span class="none">Not yet created</span>',
    FEEDBACK_NOTE: state.fields.status === 'Complete'
      ? '<p class="feedback-note"><strong>Workflow feedback:</strong> <code>make-it-work/implement-feedback.md</code> is separate from this ticket’s artifacts and accumulates across runs. Keep it if you want to review or share it.</p>'
      : '',
    AUDIT_ROWS: renderAuditRows(state, invalidTimestampFrom),
    SESSION_TIMING: renderSessionTiming(state, timing, invalidTimestampFrom),
    KNOWN_REGRESSIONS: renderListSection('Unrelated test failures', state.knownRegressions),
    DECIDED_FINDINGS: renderListSection('Review decisions', state.decidedFindings),
  };
  return applyTemplate(template, replacements);
}

function resolvedPlanPath(statePath, planField, ticket) {
  const relative = validateArtifactPath(planField, 'plan', ticket);
  return relative ? path.join(path.dirname(statePath), relative) : null;
}

export async function generateDashboard(statePath) {
  const absoluteStatePath = path.resolve(statePath);
  const [stateMarkdown, stateInfo, template, logo] = await Promise.all([
    readFile(absoluteStatePath, 'utf8'),
    stat(absoluteStatePath),
    readFile(TEMPLATE_PATH, 'utf8'),
    readFile(LOGO_PATH, 'utf8'),
  ]);
  const state = parseState(stateMarkdown, absoluteStatePath);
  assertRunState(path.dirname(path.dirname(path.dirname(absoluteStatePath))), absoluteStatePath, state.fields.ticket);
  const invalidTimestampFrom = state.audit.find((row) => row.epoch > stateInfo.mtimeMs + 60_000)?.number ?? Infinity;
  const timeline = buildTimeline(state);
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
  }
  const logoBase64 = logo.trim();
  if (!logoBase64 || !/^[A-Za-z0-9+/=]+$/.test(logoBase64)) fail('Logo asset is empty or invalid base64.');
  const delivery = state.fields.status === 'Complete' && state.fields.final_package_version === '1'
    ? await readDelivery(path.dirname(path.dirname(path.dirname(absoluteStatePath))), state.fields.ticket) : null;
  const publication = await readPublicationPermission(path.dirname(path.dirname(path.dirname(absoluteStatePath))), state.fields);
  const html = renderStatus({ state, template, logoBase64, planStatus, invalidTimestampFrom, delivery, publication });
  const outputPath = path.join(path.dirname(absoluteStatePath), `${state.fields.ticket}-status.html`);
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`render-status: ${error.message}\n`);
    process.exitCode = 1;
  });
}
