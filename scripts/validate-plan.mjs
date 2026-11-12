#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { args, atomicWrite, cli, fail, section, table } from './lib/artifacts.mjs';
import { parseSteps } from './lib/plan.mjs';
import { inspectPlan } from '../skills/execute/scripts/plan-status.mjs';
import { traceability } from '../skills/implement/scripts/verification.mjs';
import { testingPolicy } from '../skills/implement/scripts/testing-policy.mjs';

const REQUIRED = ['What This Changes', 'Execution Status', 'Open Questions & Blockers', 'Decision Log', 'Goal', 'Requirement Summary', 'Approach', 'Affected Code', 'Domains/UCs Touched', 'Codebase Gaps', 'Verification Policy', 'Risks', 'Pre-flight', 'Steps', 'Test Plan', 'Definition of Done'];
const clean = (value) => value.replaceAll('`', '').trim();
const severity = (value) => ({ low: 0, med: 1, medium: 1, high: 2 })[value.toLowerCase()];
export function riskSummary(plan) {
  const body = section(plan, 'Risks');
  if (!body) fail('Missing Risks section.');
  if (/^None\b/.test(body)) return { before: 'Low', after: 'Low' };
  const rows = table(body, ['Risk', 'Severity', 'Mitigation', 'Residual severity']);
  const before = rows.map((row) => severity(row.Severity));
  const after = rows.map((row) => severity(row['Residual severity']));
  if ([...before, ...after].some((value) => value === undefined)) fail('Risk severity must be High, Med/Medium, or Low.');
  const labels = ['Low', 'Med', 'High'];
  return { before: labels[Math.max(0, ...before)], after: after.filter((value) => value === 1).length >= 3 ? 'High' : labels[Math.max(0, ...after)] };
}
export function normalizeRisk(plan) {
  const risk = riskSummary(plan);
  let count = 0;
  const output = plan.replace(/^(\*\*Overall risk \((before|after) mitigations\):\*\*)[^\n]*$/gm, (_line, prefix, which) => { count += 1; return `${prefix} ${risk[which]}`; });
  if (count !== 2) fail('Plan needs both Overall risk lines before normalization.');
  return output;
}
export function validatePlan(plan, { executionOnly = false } = {}) {
  const errors = [];
  const check = (run) => { try { return run(); } catch (error) { errors.push(error.message); return null; } };
  const steps = check(() => parseSteps(plan));
  const status = check(() => inspectPlan(plan));
  if (steps && status && status.total !== steps.length) errors.push('Progress total must equal the number of steps.');
  if (executionOnly) return { valid: errors.length === 0, errors, steps: steps?.length ?? 0 };
  for (const name of REQUIRED) if (!check(() => section(plan, name))) errors.push(`Required section is missing/empty: ${name}`);
  const unquoted = plan.replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, '').replace(/`[^`\n]+`/g, '');
  if (/\[INVESTIGATE:|\b(?:TBD|TODO)\b|\bfill in details\b|\bimplement later\b/i.test(unquoted)) errors.push('Plan contains unresolved placeholders.');
  const affected = check(() => section(plan, 'Affected Code')) ?? '';
  const declared = new Set([...affected.matchAll(/^\|\s*`?([^|`]+)`?\s*\|\s*(?:New|Modify|Delete)\s*\|/gm)].map((match) => clean(match[1])));
  if (!declared.size) errors.push('Affected Code has no file declarations.');
  for (const step of steps ?? []) {
    if (!step.verify) errors.push(`Step ${step.number} has no Verify check.`);
    for (const file of step.files) if (!declared.has(file)) errors.push(`Step ${step.number} file is absent from Affected Code: ${file}`);
  }
  const testPlan = check(() => section(plan, 'Test Plan'))?.split(/^\*\*AC traceability:\*\*/m)[0] ?? '';
  const withRepo = /^\|\s*Scenario\s*\|\s*Repo\s*\|/m.test(testPlan);
  const scenarios = check(() => table(testPlan, withRepo ? ['Scenario', 'Repo', 'Type', 'File / command'] : ['Scenario', 'Type', 'File / command']));
  if (scenarios) {
    const names = scenarios.map((row) => row.Scenario);
    if (!names.length || new Set(names).size !== names.length) errors.push('Test scenario names must be unique and nonempty.');
    for (const row of check(() => traceability(plan)) ?? []) if (!names.includes(row.scenario)) errors.push(`AC references an unknown test scenario: ${row.scenario}`);
  }
  for (const match of affected.matchAll(/^### `([^`]+)`\s*\(test scope only\)/gm)) {
    if (!(steps ?? []).some((step) => step.tests?.includes(`${match[1]}:`))) errors.push(`Test-scope repo has no step test reference: ${match[1]}`);
  }
  check(() => testingPolicy(plan));
  const risk = check(() => riskSummary(plan));
  if (risk) {
    for (const which of ['before', 'after']) {
      const declaredRisk = plan.match(new RegExp(`^\\*\\*Overall risk \\(${which} mitigations\\):\\*\\*\\s*(High|Med|Medium|Low)`, 'mi'))?.[1];
      if (!declaredRisk || severity(declaredRisk) !== severity(risk[which])) errors.push(`Overall risk (${which} mitigations) must be ${risk[which]}.`);
    }
    if (risk.after === 'High' && !/^### Phasing alternative\s*$/m.test(plan)) errors.push('High residual risk requires a Phasing alternative.');
  }
  return { valid: errors.length === 0, errors, steps: steps?.length ?? 0, risk };
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--plan']);
  if (!o.plan) fail('Usage: validate-plan.mjs check|steps|normalize-risk --plan PLAN');
  const plan = await readFile(o.plan, 'utf8');
  if (o.command === 'normalize-risk') { await atomicWrite(o.plan, normalizeRisk(plan)); return riskSummary(plan); }
  if (!['check', 'steps'].includes(o.command)) fail('Unknown plan command.');
  const result = validatePlan(plan, { executionOnly: o.command === 'steps' });
  if (!result.valid) process.exitCode = 1;
  return result;
});
