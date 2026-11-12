import { readFileSync } from 'node:fs';
import { escapeHtml as escape, renderWorkflowHeader, WORKFLOW_STYLES, WORKFLOW_TIMESTAMPS } from './lib/workflow-dashboard.mjs';

const logo = readFileSync(new URL('../skills/implement/assets/insideout-ai-logo-base64.txt', import.meta.url), 'utf8').trim();
const localLink = (artifact, label) => artifact
  ? `<a href="${escape(encodeURIComponent(artifact.path))}">${escape(label)}</a>`
  : `<span class="none">${escape(label)} pending</span>`;
const bullets = (items, empty) => items.length
  ? `<ul>${items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>`
  : `<p class="muted">${escape(empty)}</p>`;
const timestamp = (value) => `<span class="ts" data-ts="${escape(value)}">${escape(value)}</span>`;
const PHASES = [
  ['intake', 'Intake', ''], ['shape', 'Shape', 'shape-the-epic'], ['epic-review', 'Epic review', ''],
  ['slice', 'Slice', 'slice-the-epic'], ['complete', 'Prepared', ''],
];
const phaseLabel = (phase) => PHASES.find(([id]) => id === phase)?.[1] ?? phase;
const NEXT = {
  intake: 'Read the supplied sources.', shape: 'Continue the shaping interview or generate the epic.',
  'epic-review': 'Review the saved epic.', slice: 'Choose an approach and prepare the slices.',
  complete: 'Review the slices and start a separate implement run when ready.',
};
const EPIC_STYLES = `
  body { line-height: 1.45; }
  h3 { font-size: 0.95rem; margin: 1rem 0 0.4rem; }
  a { color: #096bae; text-underline-offset: 0.15em; }
  a:focus-visible, [tabindex]:focus-visible { outline: 2px solid #096bae; outline-offset: 3px; }
  .muted, small { color: #596773; }
  small { display: block; font-size: 0.75rem; }
  .phase-timeline { list-style: none; padding-left: 0; }
  .phase-dot.paused { border-color: #e65100; box-shadow: 0 0 0 4px rgba(230,81,0,0.12); }
  .table-scroll { width: 100%; overflow-x: auto; }
  .artifact-grid { grid-template-columns: repeat(2, minmax(0,1fr)); max-width: 720px; }
  .artifact-tile .label { text-transform: none; letter-spacing: normal; }
  .audit-table td { overflow-wrap: anywhere; }
  .audit-table { min-width: 700px; }
  .audit-table td { vertical-align: top; }
  .audit-table .ts { white-space: nowrap; }
  .audit-table th:nth-child(3), .audit-table td:nth-child(3),
  .audit-table th:nth-child(4), .audit-table td:nth-child(4) {
    white-space: nowrap; overflow-wrap: normal; word-break: normal; min-width: 5rem;
  }
  .audit-decision { margin: 0.35rem 0; white-space: pre-wrap; }
  .future-phase { margin: 1rem 0; color: #596773; font-size: 0.85rem; }
  .complete, .next-action, .current-activity { padding: 0.6rem 0.8rem; margin: 0.6rem 0; font-size: 0.9rem; line-height: 1.4; }
  .status-options { display: flex; flex-wrap: wrap; gap: 0.2rem 1rem; list-style: none; padding: 0; margin: 0.25rem 0; }
  .current-activity .phase-activity { font-size: inherit; }
  .current-activity .activity-updated { margin: 0.2rem 0 0; }
  footer { margin: 1rem 0; font-size: 0.75rem; color: #888; overflow-wrap: anywhere; }
  @media (max-width: 540px) {
    .artifact-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
  }
  @media print { .table-scroll { overflow: visible; } .phase-dot.current.spinning::after { animation: none; } }
`;

function renderTimeline(state) {
  const current = PHASES.findIndex(([phase]) => phase === state.phase);
  return PHASES.map(([phase, label, skill], i) => {
    const active = i === current && state.status !== 'Complete';
    const passed = i < current || state.status === 'Complete';
    const automatic = phase === 'epic-review' && state.autonomy === 'autopilot';
    const status = automatic ? passed ? 'Automatic continuation' : 'Automatic after shaping'
      : active ? state.status : passed ? 'Complete' : 'Pending';
    const dotClass = passed ? 'passed' : active ? state.status === 'Stopped' ? 'failed'
      : state.status === 'Paused' ? 'current paused' : 'current spinning' : '';
    const statusClass = active ? `status-${state.status.toLowerCase().replaceAll(' ', '-')}` : passed ? 'status-complete' : '';
    return `<li class="phase-step"${active ? ' aria-current="step"' : ''}>
      <span class="line${passed ? ' line-green' : ''}" aria-hidden="true"></span>
      <span class="phase-dot ${dotClass}" aria-hidden="true">${passed ? '✓' : active && state.status === 'Stopped' ? '!' : i + 1}</span>
      <span class="phase-label${active ? ' current-label' : ''}">${label}${skill ? `<span class="phase-skill">${skill}</span>` : ''}</span>
      <span class="phase-status ${statusClass}">${escape(status)}</span>
    </li>`;
  }).join('\n');
}
function renderBanner(state, next) {
  if (state.status === 'Complete') {
    const unresolved = state.slices.filter((s) => s.preparation !== 'Prepared').length;
    return `<div class="complete" role="status"><strong>Preparation complete.</strong>
      ${state.slices.length} slices saved.${unresolved ? ` ${unresolved} need refinement before implementation.` : ''} Implementation has not started.</div>`;
  }
  if (state.pending || state.status === 'Paused' || state.status === 'Stopped') {
    const options = state.pending?.options?.map((o) => typeof o === 'string' ? o : `${o.label}${o.description ? `: ${o.description}` : ''}`) ?? [];
    return `<div class="next-action" role="status"><strong>${state.status === 'Stopped' ? 'Action needed — stopped:' : 'Waiting for you:'}</strong>
      <span class="pending-question">${escape(next)}</span>
      ${options.length ? `<ul class="status-options" aria-label="Available choices">${options.map((o) => `<li>${escape(o)}</li>`).join('')}</ul>` : ''}
      <small>Reply in the orchestration conversation.</small></div>`;
  }
  return `<div class="current-activity" role="status"><strong>Current activity: ${escape(phaseLabel(state.phase))}.</strong>
    <span class="phase-activity">${escape(next)}</span><small class="activity-updated">Saved ${timestamp(state.updated_at)}</small></div>`;
}

function renderAudit(state) {
  const consumed = new Set();
  const decisions = state.decisions ?? [];
  const entries = state.history.map((h, i) => {
    const eventId = h.id ?? state.events?.[i]?.id;
    const matching = eventId ? decisions.filter((d) => d.id === eventId) : [];
    matching.forEach((d) => consumed.add(d));
    return { at: h.at, from: state.history[i - 1]?.phase ?? 'intake', to: h.phase,
      outcome: `${h.event}: ${h.status}${h.detail && !matching.some((d) => d.text === h.detail) ? ` — ${h.detail}` : ''}`, decisions: matching };
  });
  // Legacy decisions without an event link retain their own captured time and provenance.
  for (const d of decisions) if (!consumed.has(d)) entries.push({ at: d.at, from: d.phase, to: d.phase, outcome: 'Decision recorded', decisions: [d] });
  entries.sort((a, b) => {
    const first = Date.parse(a.at), second = Date.parse(b.at);
    return Number.isFinite(first) && Number.isFinite(second) ? first - second : 0;
  });
  if (!entries.length) return '<p class="muted">No transitions or decisions recorded yet.</p>';
  entries.reverse();
  return `<div class="table-scroll" tabindex="0" aria-label="Process history"><table class="audit-table">
    <thead><tr><th>#</th><th>Time</th><th>From</th><th>To</th><th>Outcome / reason</th></tr></thead><tbody>
    ${entries.map((e, i) => `<tr><td>${entries.length - i}</td><td>${e.at ? timestamp(e.at) : 'Not captured'}</td>
      <td>${escape(phaseLabel(e.from))}</td><td>${escape(phaseLabel(e.to))}</td><td>${escape(e.outcome)}
      ${e.decisions.map((d) => `<div class="audit-decision"><strong>Decision:</strong> ${escape(d.text)}<small>Source: ${escape(d.source)} · Scope: ${escape(Array.isArray(d.scope) ? d.scope.join(', ') : d.scope ?? 'epic')}${d.reference ? ` · Reference: ${escape(d.reference)}` : ''}</small></div>`).join('')}
      </td></tr>`).join('')}
    </tbody></table></div>`;
}

export function renderEpicDashboard(state) {
  const next = state.pending?.question ?? state.stop_reason ?? NEXT[state.phase];
  const refresh = ['In Progress', 'Paused'].includes(state.status);
  const badges = `<span class="pill autonomy-pill" title="${state.autonomy === 'autopilot' ? 'Unattended shaping and slicing; all outputs stay local.' : 'Interactive shaping, complete-epic review, and slicing.'}">Autonomy: ${escape(state.autonomy)}</span>`;
  const artifacts = [
    ['Requirement', localLink(state.epic, state.epic_stale ? 'Requirement (needs revision)' : 'Requirement')],
    ['Slicing summary', localLink(state.overview, state.phase === 'complete' ? 'Slicing summary' : state.overview ? 'Earlier slicing summary' : 'Slicing summary')],
  ].map(([label, content]) => `<div class="artifact-tile"><div class="label">${label}</div>${content}</div>`).join('\n');
  const blockers = [...state.open_items, ...(state.slice_open_items ?? []), ...state.slices.flatMap((s) => [
    ...(s.open_items ?? []).map((x) => `${s.id}: ${x}`), ...(s.external ?? []).map((x) => `${s.id} prerequisite: ${x}`),
  ]), ...(state.stop_reason ? [state.stop_reason] : [])];
  const audit = renderAudit(state);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${refresh ? '<meta http-equiv="refresh" content="15">' : ''}
<title>${escape(state.title)} — drive-the-epic status</title>
<style>${WORKFLOW_STYLES}\n${EPIC_STYLES}</style></head><body>
${renderWorkflowHeader({ workflow: 'Epic Workflow', title: state.title, logoBase64: logo, badges })}
<main><ol class="phase-timeline" tabindex="0" aria-label="Workflow phases">${renderTimeline(state)}</ol>
<p class="timeline-scroll-hint">Scroll the timeline to see later steps.</p>
${renderBanner(state, next)}
<h2>Artifacts</h2><div class="artifact-grid">${artifacts}</div>
<h2>Audit log</h2>${audit}
<p class="session-timing">Started ${timestamp(state.created_at)}. Last saved ${timestamp(state.updated_at)}.</p>
<section><h2>Open items and blockers</h2>${blockers.length ? `<p>${new Set(blockers).size} open items or prerequisites. See the requirement and slicing summary for details.</p>` : '<p class="muted">None recorded.</p>'}</section>
<h2>Jira publication</h2>${bullets(state.publication.map((p) => p.text), state.autonomy === 'autopilot' ? 'Skipped: autopilot stays local.' : 'No publication recorded. Local deliverables remain available.')}
<p class="future-phase"><strong>Future phase:</strong> Coordinate separate implement runs for each slice. This preparation workflow has not started implementation.</p>
</main><footer>Saved locally in ${escape(state.run)}. ${refresh ? 'Refreshes every 15 seconds while active or waiting.' : 'Automatic refresh is off.'} Decisions remain in the orchestration conversation.</footer>
${WORKFLOW_TIMESTAMPS}
</body></html>\n`;
}
