#!/usr/bin/env node
import { artifactOutputJoin, artifactResolve } from './lib/artifact-path.mjs';
// Semantic evidence is supplied by assess-complexity; snapshot/rating policy is deterministic.
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from './lib/artifact-io.mjs';
import { rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotDeliveryRepo } from './lib/delivery-scope.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = message => { throw new Error(message); };
const levels = ['Low', 'Medium', 'High'];
const max = values => values.some(v => v == null) || !values.length ? null : levels[Math.max(...values.map(v => levels.indexOf(v)))];
const text = (value, label) => { if (typeof value !== 'string' || !value.trim()) fail(`${label} requires evidence.`); return value; };
export const RUBRIC = 'conservative-v1';
export async function captureScope(scope) {
  text(scope.label, 'Scope label');
  if (!Array.isArray(scope.repos) || !scope.repos.length) fail('Explicit repository and base scope required.');
  const repos = [];
  const seen = new Set();
  for (const item of scope.repos) {
    const root = artifactResolve(text(item.path, 'Repository'));
    if (seen.has(root)) fail('Duplicate assessment repository.');
    seen.add(root);
    text(item.base, 'Base');
    try {
      const { diff, ...snapshot } = await snapshotDeliveryRepo(root, item.base);
      repos.push(snapshot);
    } catch (error) { repos.push({ path: root, base: item.base, error: error.message }); }
  }
  repos.sort((a, b) => a.path.localeCompare(b.path));
  const snapshot = { label: scope.label, reference: scope.reference ?? null, repos };
  return { ...snapshot, snapshot_id: hash(snapshot) };
}
function dimensions(items, name) {
  if (!Array.isArray(items) || !items.length) fail(`${name} dimensions required.`);
  return items.map(item => {
    if (!levels.includes(item.rating)) fail(`Invalid ${name} rating.`);
    return { dimension: text(item.dimension, name), rating: item.rating, evidence: text(item.evidence, name) };
  });
}
export function assess(snapshot, input) {
  if (input.snapshot_id !== snapshot.snapshot_id) fail('Assessment evidence does not match the delivery snapshot.');
  if (!Array.isArray(input.repos) || input.repos.length !== snapshot.repos.length) fail('Evidence must account for every repository.');
  if (input.limitations !== undefined && (!Array.isArray(input.limitations) || input.limitations.some(item => typeof item !== 'string'))) fail('Limitations must be a list of evidence gaps.');
  const limitations = [...(input.limitations ?? [])];
  const repos = snapshot.repos.map(snap => {
    const matches = input.repos.filter(r => r.path === snap.path);
    if (matches.length !== 1) fail('Evidence must identify each repository exactly once.');
    const record = matches[0];
    if (snap.error || record.assessed === false) return { path: snap.path, complexity: null, risk: null, completeness: 'unavailable', reason: snap.error ?? text(record.reason, 'Unassessed scope') };
    const coverage = record.coverage;
    if (!Array.isArray(coverage) || coverage.length !== snap.paths.length || snap.paths.some(file => coverage.filter(c => c.file === file).length !== 1)) fail('Coverage must account for every changed path.');
    for (const item of coverage) {
      if (!['assessed', 'unsupported'].includes(item.status)) fail('Invalid coverage status.');
      text(item.evidence, 'File coverage');
    }
    text(record.dependencies, 'Relevant callers/dependencies');
    text(record.verification, 'Verification evidence');
    const complexity_dimensions = dimensions(record.complexity_dimensions, 'complexity');
    const risk_dimensions = dimensions(record.risk_dimensions, 'risk');
    if (!['complete', 'missing', 'inapplicable'].includes(record.measurements)) fail('Measurement availability required.');
    const metrics = record.metrics ?? [];
    if (record.measurements === 'missing' && metrics.length) fail('Missing measurements must leave metrics empty; retain manual or incomplete analysis as qualitative evidence and measurement_limitation, not analyzer values.');
    if (record.measurements === 'inapplicable' && record.non_executable !== true) fail('Inapplicable metrics require confirmed non-executable scope.');
    if (record.non_executable === true) text(record.non_executable_evidence, 'Non-executable confirmation');
    if (record.measurements === 'complete' && !metrics.length) fail('Complete measurements require analyzer results.');
    const metricRatings = [];
    for (const metric of metrics) {
      for (const key of ['file', 'symbol', 'command', 'evidence', 'inheritance']) text(metric[key], `Metric ${key}`);
      if (!snap.paths.includes(metric.file)) fail('Metrics must describe changed functions.');
      if (!['cyclomatic', 'cognitive'].includes(metric.kind) || !Number.isFinite(metric.value) || metric.value < 0) fail('Invalid analyzer measurement.');
      if (metric.kind === 'cognitive' && (!Number.isFinite(metric.threshold) || metric.threshold <= 0)) fail('Cognitive complexity requires the configured threshold.');
      metricRatings.push(metric.kind === 'cyclomatic' ? (metric.value <= 10 ? 'Low' : metric.value <= 20 ? 'Medium' : 'High') : metric.value > metric.threshold ? 'High' : 'Low');
    }
    if (record.measurements === 'missing') text(record.measurement_limitation, 'Missing measurements');
    const covered = record.full_scope === true && coverage.every(c => c.status === 'assessed');
    const complexity = covered ? record.non_executable === true ? 'Low' : max([...complexity_dimensions.map(d => d.rating), ...metricRatings]) : null;
    const risk = covered ? max([complexity, ...risk_dimensions.map(d => d.rating)]) : null;
    return { ...record, complexity_dimensions, risk_dimensions, metrics, complexity, risk,
      completeness: covered && record.measurements !== 'missing' ? 'complete' : 'partial' };
  });
  const usable = repos.some(r => r.completeness !== 'unavailable');
  return { version: 1, rubric_version: RUBRIC, timestamp: new Date().toISOString(), scope: snapshot,
    complexity: max(repos.map(r => r.complexity)), risk: max(repos.map(r => r.risk)),
    completeness: repos.every(r => r.completeness === 'complete') ? 'complete' : usable ? 'partial' : 'unavailable',
    rationale: text(input.rationale, 'Deciding rationale'), limitations, repos };
}
export function assessmentMarkdown(report) {
  return `# Change assessment — ${report.scope.label}\n\n${assessmentSummary(report)}\n\n${report.rationale}\n\nSnapshot: ${report.scope.snapshot_id}\n\nTimestamp: ${report.timestamp}; rubric: ${report.rubric_version}\n\n[JSON report](./${report.json_name})\n\n## Evidence and exact revisions\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`;
}
export function assessmentSummary(report) {
  if (report.completeness === 'unavailable') return `Assessment unavailable — ${report.reason ?? report.rationale}. Code complexity: Unknown · Production change risk: Unknown · unavailable`;
  return `Code complexity: ${report.complexity ?? 'Unknown'} · Production change risk: ${report.risk ?? 'Unknown'} · ${report.completeness}`;
}
function reportPaths(root, ticket) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ticket)) fail('Unsafe assessment identifier.');
  const dir = artifactOutputJoin(root, 'make-it-work', ticket);
  return { dir, json: artifactOutputJoin(dir, `${ticket}-complexity.json`), md: artifactOutputJoin(dir, `${ticket}-complexity.md`) };
}
async function atomic(file, content) {
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, content); await rename(tmp, file);
}
export async function saveAssessment(root, ticket, report) {
  const files = reportPaths(root, ticket);
  await mkdir(files.dir, { recursive: true });
  let previous;
  try { previous = JSON.parse(await readFile(files.json, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous && previous.completeness !== 'unavailable') {
    const history = `${ticket}-complexity-stale-${hash(previous).slice(0, 16)}`;
    await atomic(artifactOutputJoin(files.dir, `${history}.json`), JSON.stringify(previous, null, 2) + '\n');
    await atomic(artifactOutputJoin(files.dir, `${history}.md`), '# Stale history — not a current assessment\n\n' + assessmentMarkdown({ ...previous, json_name: path.basename(artifactOutputJoin(files.dir, `${history}.json`)) }));
    report.stale_history = path.basename(artifactOutputJoin(files.dir, `${history}.md`));
  } else if (previous?.stale_history) report.stale_history = previous.stale_history;
  report.json_name = path.basename(files.json);
  const markdown = assessmentMarkdown(report);
  await atomic(files.md, markdown);
  await atomic(files.json, JSON.stringify(report, null, 2) + '\n');
  const result = { ...report, reports: { json: path.relative(root, files.json), markdown: path.relative(root, files.md) } };
  // Only an assessment-enabled Implement run at its final boundary gets audit/UI
  // updates. Standalone and legacy assessments remain report-only.
  const statePath = artifactOutputJoin(files.dir, `${ticket}-state.md`);
  let stateMarkdown;
  try {
    stateMarkdown = await readFile(statePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return result;
    result.audit_warning = `Assessment reports saved; workflow state could not be read: ${error.message}`;
    return result;
  }
  try {
    if (/^change_assessment_version:\s*1\s*$/m.test(stateMarkdown)) {
      const { parseState, generateDashboard } = await import('../skills/implement/scripts/render-status.mjs');
      const { checkpointAssessment } = await import('../skills/implement/scripts/assessment-audit.mjs');
      if (await checkpointAssessment(statePath, parseState(stateMarkdown, statePath))) await generateDashboard(statePath);
    }
  } catch (error) {
    result.audit_warning = `Assessment reports saved; audit/dashboard update could not finish: ${error.message}`;
  }
  return result;
}
export async function readAssessment(root, ticket, snapshots = null) {
  try {
    const files = reportPaths(root, ticket);
    const report = JSON.parse(await readFile(files.json, 'utf8'));
    if (report.version !== 1 || report.rubric_version !== RUBRIC) fail('Unsupported assessment report.');
    const current = snapshots ? { ...report.scope, repos: snapshots.map(({ diff, diff_file, ...r }) => r).sort((a,b) => a.path.localeCompare(b.path)) } : await captureScope(report.scope);
    const id = snapshots ? hash({ label: current.label, reference: current.reference, repos: current.repos }) : current.snapshot_id;
    if (id !== report.scope.snapshot_id) return { completeness: 'unavailable', complexity: null, risk: null, stale: true, reason: 'Delivery snapshot changed; reassessment required.', stale_history: path.basename(files.md) };
    if (await readFile(files.md, 'utf8') !== assessmentMarkdown(report)) fail('Markdown and JSON reports disagree.');
    return { ...report, reports: { json: path.relative(root, files.json), markdown: path.relative(root, files.md) } };
  } catch (error) {
    return { completeness: 'unavailable', complexity: null, risk: null, reason: error.code === 'ENOENT' ? 'Not assessed yet' : error.message };
  }
}
export function unavailable(snapshot, reason) {
  return { version: 1, rubric_version: RUBRIC, timestamp: new Date().toISOString(), scope: snapshot,
    completeness: 'unavailable', complexity: null, risk: null, reason, rationale: reason, limitations: [reason], repos: [] };
}
async function main(args) {
  const command = args.shift(), options = {};
  while (args.length) {
    const key = args.shift();
    if (!['--scope', '--input', '--root', '--ticket', '--reason'].includes(key) || !args.length) fail('Invalid assessment option.');
    options[key.slice(2)] = args.shift();
  }
  if (!['snapshot', 'write', 'fail', 'check'].includes(command)) fail('Use snapshot|write|fail|check.');
  if (command === 'check') return readAssessment(options.root, options.ticket);
  const scope = JSON.parse(await readFile(options.scope, 'utf8'));
  const snapshot = await captureScope(scope);
  if (command === 'snapshot') return snapshot;
  const report = command === 'fail' ? unavailable(snapshot, text(options.reason, 'Failure reason')) : assess(snapshot, JSON.parse(await readFile(options.input, 'utf8')));
  return saveAssessment(options.root, options.ticket, report);
}
if (process.argv[1] && artifactResolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e.message); process.exitCode = 1; });
