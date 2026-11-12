import { parseSteps, planHash } from '../../../scripts/lib/plan.mjs';
import { inspectPlan } from '../../execute/scripts/plan-status.mjs';
import { testingPolicy } from './testing-policy.mjs';

export function manualScenarioNames(plan) {
  const body = plan.split(/^## Test Plan\s*$/m)[1]?.split(/^\*\*AC traceability:\*\*/m)[0] ?? '';
  const rows = body.split('\n').filter(line => line.trim().startsWith('|')).map(line => line.trim().split('|').slice(1, -1).map(cell => cell.trim()));
  const typeIndex = rows[0]?.indexOf('Type');
  return rows.slice(2).filter(row => row[typeIndex] === 'Manual').map(row => row[0]);
}

export function manualWaiver(plan, input, planVersion) {
  if (input.source !== 'user' || !['chat', 'question'].includes(input.via)) throw new Error('Waiving manual verification requires an explicit user decision.');
  if (typeof input.reason !== 'string' || !input.reason.trim() || /[\r\n]/.test(input.reason)) throw new Error('A one-line waiver reason is required.');
  const steps = parseSteps(plan), final = steps.at(-1), status = inspectPlan(plan);
  if (final.title !== 'Verify manual scenarios' || final.files.length || status.completed !== steps.length - 1) throw new Error('Only the final manual-verification step may be waived after all implementation steps complete.');
  const policy = testingPolicy(plan);
  if (policy && !policy.some(row => row.Mode === 'automated')) throw new Error('An all-manual policy cannot waive its verification gate.');
  const scenarios = manualScenarioNames(plan);
  if (!scenarios.length || !Array.isArray(input.scenarios) || new Set(input.scenarios).size !== input.scenarios.length ||
      JSON.stringify([...input.scenarios].sort()) !== JSON.stringify([...scenarios].sort())) throw new Error('The waiver must explicitly name every manual scenario in the final verification step.');
  return { id: input.id, source: 'user', via: input.via, reason: input.reason.trim(), plan_hash: planHash(plan), plan_version: planVersion, step: final.number, scenarios };
}
