#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  'execute', 'review', 'fix-plan', 'final-sync', 'complete',
]);
const AUTONOMY_VALUES = new Set(['guided', 'autonomous', 'pending']);
const EXECUTION_MODE_VALUES = new Set(['none', 'subagent-driven', 'inline']);
const INLINE_PAUSE_MODE_VALUES = new Set(['none', 'stop-after-each-step', 'run-straight-through']);
const EXECUTION_VALUES = new Set([
  'not-started', 'running', 'passed', 'guardrail', 'retry-limit', 'gate-failed',
  'gate-no-result', 'stopped',
]);
const REVIEW_VALUES = new Set(['not-started', 'clean', 'fix-required', 'replan-required', 'human-decision']);
const FIX_DISPATCH_VALUES = new Set(['none', 'sequential', 'parallel']);
const GATE_VALUES = new Set(['none', 'full-suite', 'scoped']);
const CANONICAL_PHASES = new Set([
  'context-check', 'close-the-gaps', 'plan', 'execute', 'review', 'fix-plan',
  'final-sync', 'complete',
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
  complete: {
    label: 'Complete',
    skill: '',
    tooltip: 'the run has finished successfully.',
  },
};

const AUTONOMY_TOOLTIP =
  'guided: pauses for your approval after the spec, after the plan, and at every human decision along the way. autonomous: no approval gates, and replans automatically when the plan stops holding — still asks every genuine question and still stops at loop limits and at completion.';
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

function parseIsoTimestamp(value, rowNumber) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    fail(`Audit row ${rowNumber} has an invalid ISO 8601 UTC timestamp: ${value}`);
  }
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch)) fail(`Audit row ${rowNumber} has an invalid timestamp: ${value}`);
  const normalized = value.includes('.') ? value : value.replace('Z', '.000Z');
  if (new Date(epoch).toISOString() !== normalized) {
    fail(`Audit row ${rowNumber} has an invalid calendar timestamp: ${value}`);
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
      epoch: parseIsoTimestamp(cells[1], number),
      from: cells[2],
      to: cells[3],
      outcome: cells[4],
    };
  });
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
  if (!PHASE_VALUES.has(fields.phase)) fail(`Unsupported phase: ${fields.phase}`);
  if (!AUTONOMY_VALUES.has(fields.autonomy)) fail(`Unsupported autonomy: ${fields.autonomy}`);
  if (!EXECUTION_MODE_VALUES.has(fields.execution_mode)) fail(`Unsupported execution_mode: ${fields.execution_mode}`);
  if (!INLINE_PAUSE_MODE_VALUES.has(fields.inline_pause_mode)) fail(`Unsupported inline_pause_mode: ${fields.inline_pause_mode}`);
  if (!EXECUTION_VALUES.has(fields.execution)) fail(`Unsupported execution: ${fields.execution}`);
  if (!REVIEW_VALUES.has(fields.review)) fail(`Unsupported review: ${fields.review}`);
  if (!FIX_DISPATCH_VALUES.has(fields.fix_plan_dispatch)) fail(`Unsupported fix_plan_dispatch: ${fields.fix_plan_dispatch}`);
  if (!GATE_VALUES.has(fields.gate)) fail(`Unsupported gate: ${fields.gate}`);

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
  return { phase, activationRow, approval: null, fixSteps: null };
}

export function buildTimeline(state) {
  const slots = BASELINE_PHASES.map((phase) => newSlot(phase));
  const activatedPhases = new Set();
  let activeSlot = null;

  for (const row of state.audit) {
    if (row.to === 'spec-approval' || row.to === 'plan-approval') continue;

    if ((row.from === 'spec-approval' || row.from === 'plan-approval') && row.from !== row.to && activeSlot) {
      activeSlot.approval = row.outcome;
    }

    if (!CANONICAL_PHASES.has(row.to)) continue;
    if (activeSlot?.phase === 'fix-plan' && row.to === 'execute') continue;
    if (activeSlot?.phase === row.to) {
      const fixMatch = row.outcome.match(/^Decision: Fix round \d+: added (\d+) steps? covering \d+ findings?$/);
      if (activeSlot.phase === 'fix-plan' && fixMatch) activeSlot.fixSteps = Number(fixMatch[1]);
      continue;
    }

    let nextSlot;
    if (row.to !== 'fix-plan' && !activatedPhases.has(row.to)) {
      nextSlot = slots.find((slot) => slot.phase === row.to && slot.activationRow === null);
      if (!nextSlot) fail(`Timeline could not find the baseline slot for ${row.to}.`);
      nextSlot.activationRow = row;
    } else {
      nextSlot = newSlot(row.to, row);
      const insertionIndex = activeSlot ? slots.indexOf(activeSlot) + 1 : slots.length;
      slots.splice(insertionIndex, 0, nextSlot);
    }
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

function validateArtifactPath(value, field) {
  if (value === 'none') return null;
  if (!value.startsWith('make-it-work/')) {
    fail(`Field "${field}" must be "none" or a make-it-work/ artifact path.`);
  }
  const relative = value.slice('make-it-work/'.length);
  if (!relative || relative !== path.posix.basename(relative) || relative.includes('..')) {
    fail(`Field "${field}" must point to a direct child of make-it-work/.`);
  }
  return relative;
}

function artifactLink(value, field) {
  const relative = validateArtifactPath(value, field);
  if (!relative) return '<span class="none">Not yet created</span>';
  return `<a href="${escapeHtml(relative)}">${escapeHtml(value)}</a>`;
}

function renderList(items) {
  if (items.length === 0) return '<p>None</p>';
  return `<ul>\n${items.map((item) => `  <li>${escapeHtml(item)}</li>`).join('\n')}\n</ul>`;
}

function slotState(slot, activeSlot, status) {
  if (!slot.activationRow) return 'not-reached';
  if (slot !== activeSlot) return 'passed';
  if (status === 'Complete') return 'passed';
  if (status === 'In Progress') return 'current spinning';
  if (status === 'Paused') return 'current';
  return 'failed';
}

function renderTimeline(state, timeline, planStatus) {
  const { slots, activeSlot } = timeline;
  const activated = slots.filter((slot) => slot.activationRow);

  return slots.map((slot, index) => {
    const info = PHASE_INFO[slot.phase];
    const dotState = slotState(slot, activeSlot, state.fields.status);
    const isActive = slot === activeSlot;
    const passed = dotState === 'passed';
    const symbol = passed ? '✓' : dotState === 'failed' ? '✗' : '';
    const lineClass = passed || dotState.startsWith('current') ? ' line-green' : '';
    const label = info.skill ? `${info.label} (${info.skill})` : info.label;
    const currentLabel = isActive && state.fields.status === 'In Progress' ? ' current-label' : '';
    const pieces = ['<div class="phase-step">'];
    if (index > 0) pieces.push(`  <div class="line${lineClass}"></div>`);
    pieces.push(`  <div class="phase-dot ${dotState}" title="${escapeHtml(`${slot.phase}: ${info.tooltip}`)}">${symbol}</div>`);
    pieces.push(`  <div class="phase-label${currentLabel}">${escapeHtml(label)}</div>`);

    let modeText = slot.approval;
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
    } else if (!isActive && passed && slot.phase === 'fix-plan' && slot.fixSteps !== null) {
      if (!planStatus) fail('A completed Fix phase requires a readable plan Execution Status.');
      modeText = `${planStatus.mode} · Step ${slot.fixSteps} of ${slot.fixSteps} complete`;
    }
    if (modeText) pieces.push(`  <div class="phase-mode">${escapeHtml(modeText)}</div>`);

    if (isActive && state.fields.status === 'In Progress' && state.fields.current_activity !== 'none') {
      pieces.push(`  <div class="phase-activity">${escapeHtml(state.fields.current_activity)}</div>`);
    }

    if (passed && slot.phase !== 'complete') {
      const activatedIndex = activated.indexOf(slot);
      const next = activated[activatedIndex + 1];
      if (next) {
        const duration = slot.activationRow.number < state.realRowsFrom || next.activationRow.number < state.realRowsFrom
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
  }).join('\n');
}

function timingDetails(state) {
  if (state.audit.length < 2 || state.realRowsFrom > state.audit.length) return null;
  const first = state.audit[state.realRowsFrom - 1];
  const last = state.audit.at(-1);
  return { total: formatDuration(last.epoch - first.epoch), first, last };
}

function renderAuditRows(state) {
  return [...state.audit].reverse().map((row) => {
    let duration = '';
    if (row.number === state.realRowsFrom) {
      duration = ' <span class="step-duration" title="First row with a real captured timestamp — no real predecessor to measure from.">(first real timestamp)</span>';
    } else if (row.number > state.realRowsFrom) {
      const previous = state.audit[row.number - 2];
      duration = ` <span class="step-duration">(+${formatDuration(row.epoch - previous.epoch)})</span>`;
    }
    return `<tr><td>${row.number}</td><td class="ts" data-ts="${escapeHtml(row.time)}"></td><td>${escapeHtml(row.from)}</td><td>${escapeHtml(row.to)}</td><td>${escapeHtml(row.outcome)}${duration}</td></tr>`;
  }).join('\n');
}

function renderSessionTiming(state, timing) {
  if (!timing) return '';
  const legacy = state.realRowsFrom > 1
    ? ` This is not the full session duration — everything before row ${state.realRowsFrom} happened before any real timestamp was captured.`
    : '';
  return `<p class="session-timing">Session timing: rows ${state.realRowsFrom}→${timing.last.number} above span ${timing.total} of real captured time.${legacy} Total session cost cannot be shown here either — no tool in this session surfaces token usage or $ cost back to the model (check /usage in your own client for that).</p>`;
}

function renderStatusBanner(state, timing) {
  if (state.fields.status === 'Paused' || state.fields.status === 'Stopped') {
    return `<p class="next-action"><strong>Waiting on you:</strong> ${escapeHtml(state.fields.pause_reason)}</p>`;
  }
  if (state.fields.status !== 'Complete') return '';
  const duration = timing
    ? `Real-timestamped portion of this run: ${timing.total}.${state.realRowsFrom > 1 ? ' (not the full session — see the Session timing note below).' : ''}`
    : 'Elapsed: unknown — no real start timestamp was captured for this run.';
  return `<p class="complete"><strong>Run complete.</strong> ${duration} Changes are uncommitted — review the working tree and commit when ready. This ticket's artifacts (spec/plan/execute/review/state/dashboard) are in <code>make-it-work/</code> and aren't committed — delete them yourself whenever you're done referencing this run. <code>make-it-work/implement-feedback.md</code> is cumulative and separate from those ticket artifacts; keep it if you plan to review or share the workflow feedback.</p>`;
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

export function renderStatus({ state, template, logoBase64, planStatus = null }) {
  const timeline = buildTimeline(state);
  const needsPlan = timeline.slots.some((slot) => slot.activationRow && (
    slot.phase === 'fix-plan' || (slot === timeline.activeSlot && slot.phase === 'execute')
  ));
  if (needsPlan && !planStatus) fail('This timeline requires plan progress, but no plan was available.');

  const timing = timingDetails(state);
  const reviewLink = state.fields.review === 'not-started'
    ? '<span class="none">Not yet created</span>'
    : artifactLink(`make-it-work/${state.fields.ticket}-review.md`, 'review');
  const replacements = {
    TICKET: escapeHtml(state.fields.ticket),
    LOGO_BASE64: logoBase64,
    AUTONOMY: escapeHtml(state.fields.autonomy),
    AUTONOMY_TOOLTIP: escapeHtml(state.fields.autonomy === 'pending' ? PENDING_AUTONOMY_TOOLTIP : AUTONOMY_TOOLTIP),
    PHASE_TIMELINE: renderTimeline(state, timeline, planStatus),
    STATUS_BANNER: renderStatusBanner(state, timing),
    SPEC_LINK: artifactLink(state.fields.spec, 'spec'),
    PLAN_LINK: artifactLink(state.fields.plan, 'plan'),
    EXECUTE_LINK: artifactLink(state.fields.execute_report, 'execute_report'),
    REVIEW_LINK: reviewLink,
    AUDIT_ROWS: renderAuditRows(state),
    SESSION_TIMING: renderSessionTiming(state, timing),
    REVIEW_CYCLE: String(state.reviewCycle),
    FIX_CYCLE: String(state.fixCycle),
    REPLANS_USED: String(state.replansUsed),
    KNOWN_REGRESSIONS: renderList(state.knownRegressions),
    DECIDED_FINDINGS: renderList(state.decidedFindings),
  };
  return applyTemplate(template, replacements);
}

function resolvedPlanPath(statePath, planField) {
  const relative = validateArtifactPath(planField, 'plan');
  return relative ? path.join(path.dirname(statePath), relative) : null;
}

export async function generateDashboard(statePath) {
  const absoluteStatePath = path.resolve(statePath);
  const [stateMarkdown, template, logo] = await Promise.all([
    readFile(absoluteStatePath, 'utf8'),
    readFile(TEMPLATE_PATH, 'utf8'),
    readFile(LOGO_PATH, 'utf8'),
  ]);
  const state = parseState(stateMarkdown, absoluteStatePath);
  const timeline = buildTimeline(state);
  const needsPlan = timeline.slots.some((slot) => slot.activationRow && (
    slot.phase === 'fix-plan' || (slot === timeline.activeSlot && slot.phase === 'execute')
  ));
  let planStatus = null;
  if (needsPlan) {
    const planPath = resolvedPlanPath(absoluteStatePath, state.fields.plan);
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
  const html = renderStatus({ state, template, logoBase64, planStatus });
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
    fail('Usage: node render-status.mjs --state make-it-work/<TICKET>-state.md');
  }
  return { statePath: argv[1] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('Usage: node render-status.mjs --state make-it-work/<TICKET>-state.md\n');
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
