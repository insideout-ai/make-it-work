#!/usr/bin/env node
// Durable test-preparation evidence. It never executes commands or edits a plan.
import path from 'node:path';
import { scenarios as plannedScenarios, coverageSummary, coverageMarkdown, validateCoverage } from '../../../scripts/lib/test-coverage.mjs';
export { plannedScenarios };
import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import { readdir, realpath } from 'node:fs/promises';
import { readFile } from '../../../scripts/lib/artifact-io.mjs';
import { args, atomicWrite, cli, digest, fail, jsonInput, section, table, within, withLock } from '../../../scripts/lib/artifacts.mjs';
import { planImpact } from '../../implement/scripts/repo-impact.mjs';
import { planHash, parseSteps } from '../../../scripts/lib/plan.mjs';

export const requiresPreparation = plan => /^\*\*Test preparation contract:\*\* 1\s*$/m.test(plan);
const text = (value, label) => {
  if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) fail(`${label} must be a nonempty single line.`);
};
export function validatePreparation(data, plan) {
  if (data?.version !== 1 || data.plan_hash !== planHash(plan)) fail('Test preparation belongs to a different plan revision. Run write-the-tests.');
  if (!['ready', 'not-applicable', 'blocked'].includes(data.status) || !Array.isArray(data.entries)) fail('Invalid preparation status/entries.');
  validateCoverage(plan);
  const impact = planImpact(plan);
  const steps = parseSteps(plan), scenarios = plannedScenarios(plan), seen = new Set();
  for (const entry of data.entries) {
    if (impact && (!impact.repos.some(r => r.repo === entry.repo && r.classification !== 'context'))) fail('Test preparation cannot include context-only or unapproved repositories.');
    text(entry.scenario, 'Scenario');
    const identity = JSON.stringify([entry.repo ?? '', entry.scenario]);
    if (seen.has(identity)) fail('Duplicate preparation scenario.');
    seen.add(identity);
    if (!steps.some(step => step.number === entry.step)) fail('Preparation references an unknown step.');
    const scenario = scenarios.find(row => row.Scenario === entry.scenario && (!row.Repo || row.Repo === entry.repo));
    if (scenario?.Purpose && !/^Manual$/i.test(scenario.Type) && entry.kind !== scenario.Purpose.toLowerCase()) fail('Preparation kind disagrees with planned purpose.');
    if (!scenario) fail(`Preparation references an unknown scenario: ${entry.scenario}`);
    if (!['progression', 'regression', 'manual'].includes(entry.kind) || !['pass', 'expected-red', 'not-run', 'exempt', 'accepted-failure', 'fail'].includes(entry.result)) fail('Invalid preparation kind/result.');
    text(entry.reason, 'Preparation reason');
    if (entry.result === 'accepted-failure') {
      text(entry.decision, 'Explicit baseline-failure decision');
      if (entry.kind !== 'regression') fail('Only a regression baseline can have an accepted failure.');
    }
    if (entry.result === 'expected-red' && entry.kind !== 'progression') fail('Only progression tests can have expected red.');
    if (entry.kind === 'manual') {
      if (!/^Manual$/i.test(scenario.Type) || entry.result !== 'exempt') fail('Manual preparation is exempt, never a verification pass.');
    } else {
      if (/^Manual$/i.test(scenario.Type) || entry.result === 'exempt') fail('Automated coverage cannot silently become manual/exempt.');
      for (const field of ['repo', 'file', 'cwd', 'command', 'evidence']) text(entry[field], `Preparation ${field}`);
      if (!path.isAbsolute(entry.cwd) || path.isAbsolute(entry.file)) fail('Use an absolute working directory and a repo-relative test file.');
      const step = steps[entry.step - 1];
      if (!Array.isArray(entry.additional_files ?? [])) fail('additional_files must be an array.');
      for (const file of [entry.file, ...(entry.additional_files ?? [])]) {
        text(file, 'Prepared file');
        if (path.isAbsolute(file) || !step.tests?.includes(`\`${file}\``)) fail('Prepared test file is not declared by its plan step.');
      }
    }
    if (entry.result === 'fail' && data.status !== 'blocked') fail('A failing preparation cannot be ready.');
  }
  if (data.status !== 'blocked') {
    for (const row of scenarios) if (!data.entries.some(entry => entry.scenario === row.Scenario && (!row.Repo || row.Repo === entry.repo))) fail(`Missing preparation for ${row.Scenario}.`);
    const automated = data.entries.some(entry => entry.kind !== 'manual');
    if ((data.status === 'not-applicable') === automated) fail('Not-applicable requires exclusively manual coverage.');
  }
  return data;
}

async function images(entries) {
  const files = new Map();
  for (const entry of entries.filter(entry => entry.kind !== 'manual')) {
    const root = await realpath(entry.cwd);
    for (const file of [entry.file, ...(entry.additional_files ?? [])]) {
      const absolute = await within(root, file);
      files.set(absolute, { cwd: root, file, sha256: digest(await readFile(absolute)) });
    }
  }
  return [...files.values()];
}
function stem(planPath) { return path.basename(artifactJoin(path.dirname(planPath), path.basename(planPath, '.md') + '-tests-0.json')).slice(0, -6); }
export async function latestPreparation(planPath) {
  const prefix = stem(planPath);
  const names = (await readdir(path.dirname(planPath))).filter(name => name.startsWith(prefix) && /^[1-9]\d*\.json$/.test(name.slice(prefix.length)));
  names.sort((a, b) => Number(b.slice(prefix.length, -5)) - Number(a.slice(prefix.length, -5)));
  return names.length ? path.join(path.dirname(planPath), names[0]) : null;
}
export async function checkPreparation(planPath, { file, required = false, checkFiles = true } = {}) {
  const plan = await readFile(planPath, 'utf8');
  if (!required && !requiresPreparation(plan)) return { required: false, reason: 'Legacy plan retains its existing test evidence.' };
  const latest = await latestPreparation(planPath);
  if (!latest || file && path.resolve(file) !== latest) fail('Current test preparation missing. Run write-the-tests before execute.');
  const data = validatePreparation(JSON.parse(await readFile(latest, 'utf8')), plan);
  if (data.status === 'blocked') fail('Test preparation is blocked. Resolve it with write-the-tests before execute.');
  if (!Array.isArray(data.files) || data.files.length !== new Set(data.entries.filter(entry => entry.kind !== 'manual').flatMap(entry => [entry.file, ...(entry.additional_files ?? [])].map(file => path.resolve(entry.cwd, file)))).size) fail('Missing prepared-file snapshots.');
  if (checkFiles) {
    const current = await images(data.entries);
    if (JSON.stringify(current) !== JSON.stringify(data.files)) fail('Prepared test files changed. Run write-the-tests to refresh evidence.');
  }
  await readFile(await within(path.dirname(planPath), data.report));
  return { required: true, ...data, file: latest, reportPath: path.join(path.dirname(planPath), data.report) };
}
export async function recordPreparation(planPath, input) {
  const plan = await readFile(planPath, 'utf8');
  const data = validatePreparation(input, plan);
  return withLock(planPath + '.tests', async () => {
    const previous = await latestPreparation(planPath);
    const number = previous ? Number(path.basename(previous).slice(stem(planPath).length, -5)) + 1 : 1;
    const base = stem(planPath) + number;
    const file = path.join(path.dirname(planPath), base + '.json'), report = base + '.md';
    const saved = { ...data, files: await images(data.entries), report };
    const lines = data.entries.map(entry => `- ${entry.scenario} (${entry.repo ?? 'manual'}, step ${entry.step}): ${entry.result} — ${entry.reason}${entry.command ? `\n  Command: ${entry.command}\n  Run from: ${entry.cwd}\n  Test: ${entry.file}\n  Evidence: ${entry.evidence}` : ''}`);
    await atomicWrite(path.join(path.dirname(planPath), report), `# Test Preparation\n\nPlan: ${path.basename(planPath)}\n\nPlan revision: ${data.plan_hash}\n\nPreparation outcome: ${data.status}\n\nExpected red is successful preparation, not a passing implementation. Unavailable checks remain unverified. Earlier numbered preparation reports are historical.\n\n${coverageMarkdown(coverageSummary(plan, data))}\n${lines.join('\n\n')}\n`);
    await atomicWrite(file, JSON.stringify(saved, null, 2) + '\n');
    return { file, report: path.join(path.dirname(planPath), report), status: data.status };
  });
}
cli(import.meta.url, async argv => {
  const o = args(argv, ['--plan', '--input', '--file', '--required', '--check-files']);
  if (!o.plan) fail('Usage: preparation.mjs check|record --plan PLAN [--input JSON] [--required 1]');
  if (o.command === 'record') return recordPreparation(path.resolve(o.plan), await jsonInput(o.input));
  if (o.command === 'check') return checkPreparation(path.resolve(o.plan), { file: o.file, required: o.required === '1', checkFiles: o['check-files'] !== '0' });
  fail('Unknown preparation command.');
});
