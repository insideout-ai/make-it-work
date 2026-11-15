import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { testingPolicy } from './testing-policy.mjs';

const methods = new Set(['pending', 'automated', 'manual', 'mixed', 'independent-review', 'not-recorded']);
export function parseTestingSummary(value = '[]') {
  const rows = JSON.parse(value), seen = new Set();
  if (!Array.isArray(rows)) throw new Error('Testing summary must be an array.');
  for (const row of rows) {
    if (!row || typeof row.repo !== 'string' || !row.repo.trim() || /[\r\n]/.test(row.repo) || seen.has(row.repo) || row.strategy !== 'missing' || !methods.has(row.verification)) throw new Error('Invalid testing summary row.');
    seen.add(row.repo);
  }
  return rows;
}

export function testingSummaryNotes(rows) {
  const labels = { automated: 'used existing automated tests', manual: 'used manual verification', mixed: 'used automated tests and manual verification', 'independent-review': 'used independent review', 'not-recorded': 'verification method not recorded', pending: 'verification pending' };
  const groups = new Map();
  for (const row of rows) groups.set(row.verification, [...(groups.get(row.verification) ?? []), row.repo]);
  return [...groups].map(([method, repos], i) => `Strategy missing for ${repos.join(', ')}; ${labels[method]}.${i === groups.size - 1 ? ' Run /make-it-work:define-test-strategy separately.' : ''}`);
}

// New runs only. Actual selected roots are the same approved scope used by readiness.
export async function collectTestingSummary(root, fields, { final = false } = {}) {
  if (fields.testing_summary === undefined) return null;
  const scope = fields.workspace_version === '1' ? JSON.parse(fields.workspace_contract).repos : JSON.parse(fields.workspace_snapshot);
  let policy = [], ledger = null, plan = '';
  if (final && fields.mode !== 'lightweight' && fields.verification_version === '1' && fields.plan && fields.plan !== 'none') {
    plan = await readFile(path.resolve(root, fields.plan), 'utf8');
    policy = testingPolicy(plan) ?? [];
    const { readVerification } = await import('./verification.mjs');
    ledger = await readVerification(root, `make-it-work/${fields.ticket}/${fields.ticket}-verification-v${fields.plan_version}.json`, {
      ticket: fields.ticket, planVersion: Number(fields.plan_version), plan, requireComplete: true,
      requireClauses: fields.acceptance_evidence_version === '1',
      outcome: fields.execution === 'verified-manually' ? 'VERIFIED_MANUALLY' : fields.execution === 'passed' ? 'PASSED' : 'GATE_NO_RESULT',
    });
  }
  const rows = [];
  for (const repo of scope.filter(repo => !repo.role || repo.role === 'product')) {
    try { await readFile(path.join(repo.root, '.claude/skills/test-strategy/SKILL.md')); continue; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const id = repo.id ?? path.basename(repo.root);
    const selected = policy.find(row => row.Repo === id) ?? (scope.length === 1 ? policy[0] : null);
    let verification = final ? 'not-recorded' : 'pending';
    if (final && fields.mode === 'lightweight') verification = 'independent-review';
    else if (final && selected && ledger) {
      if (selected.Mode === 'manual' && ['manual-accepted', 'pass'].includes(ledger.gate.result)) verification = 'manual';
      else if (selected.Mode === 'automated' && ledger.gate.result === 'pass') {
        const manual = ledger.steps.some(step => step.checks.some(check => check.type === 'manual' && check.result === 'pass' && planRepo(check.subject, id)));
        verification = manual ? 'mixed' : 'automated';
      }
    }
    rows.push({ repo: id, strategy: 'missing', verification });
  }
  return rows.sort((a, b) => a.repo.localeCompare(b.repo));

  function planRepo(scenario, repo) {
    // Scenario subjects carry their repo through the plan's shared Test Plan.
    return policy.length === 1 || (plan.split(/^## Test Plan\s*$/m)[1] ?? '').split(/^## /m)[0].split('**AC traceability:**')[0].split('\n').filter(line => line.trim().startsWith('|')).some(line => {
      const cells = line.split('|').slice(1, -1).map(cell => cell.replaceAll('`', '').trim());
      return cells[0] === scenario && cells[1] === repo;
    });
  }
}
