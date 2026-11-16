import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { collectTestingSummary, parseTestingSummary, testingSummaryNotes } from './testing-summary.mjs';

async function fixture(t) {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'testing-summary-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dir = artifactJoin(root, 'make-it-work/DEMO'); await mkdir(dir, { recursive: true });
  const fields = { testing_summary: '[]', workspace_snapshot: JSON.stringify([{ root, id: 'app' }]), ticket: 'DEMO', plan_version: '1', mode: 'tdd', plan: 'make-it-work/DEMO/DEMO-plan.md', verification_version: '1', execution: 'verified-manually' };
  const save = async (mode = 'manual') => {
    const manual = mode === 'manual';
    fields.execution = manual ? 'verified-manually' : 'passed';
    const plan = `# Plan\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| app | ${mode} | ${manual ? 'autonomy-default' : 'configured'} | Readiness evidence |\n\n## Steps\n\n### Step 1 — Feature\n\n## Test Plan\n\n| Scenario | Repo | Type | File / command |\n| --- | --- | --- | --- |\n| Save | app | ${manual ? 'Manual' : 'Unit'} | Start app, save and observe persistence |\n\n**AC traceability:**\n\n| Acceptance criterion | Test scenario |\n| --- | --- |\n| AC1 | Save |\n`;
    const ledger = { version: 1, ticket: 'DEMO', plan_version: 1,
      steps: [{ number: 1, checks: [{ type: mode, subject: 'Save', command: manual ? null : 'node --test', result: 'pass', note: 'Observed persistence' }] }],
      gate: { mode: manual ? 'none' : 'full-suite', result: manual ? 'manual-accepted' : 'pass', note: 'Observed completion', ...(manual ? {} : { full_suites: [{ repo: 'app', command: 'node --test', result: 'pass', note: 'Executed suite' }] }) },
      acceptance: [{ criterion: 'AC1', scenario: 'Save', status: mode, step: 1, note: 'Observed saved record' }] };
    await writeFile(artifactJoin(root, fields.plan), plan);
    await writeFile(artifactJoin(dir, 'DEMO-verification-v1.json'), JSON.stringify(ledger));
    return ledger;
  };
  return { root, dir, fields, save };
}

test('legacy states are untouched; new summaries inventory only selected product repos missing strategies', async t => {
  const f = await fixture(t);
  assert.equal(await collectTestingSummary(f.root, {}), null);
  assert.deepEqual(await collectTestingSummary(f.root, f.fields), [{ repo: 'app', strategy: 'missing', verification: 'pending' }]);
  await mkdir(artifactJoin(f.root, '.claude/skills/test-strategy'), { recursive: true });
  await writeFile(artifactJoin(f.root, '.claude/skills/test-strategy/SKILL.md'), '# Strategy');
  assert.deepEqual(await collectTestingSummary(f.root, f.fields), []);
});

test('completion methods require actual validated evidence and distinguish Lightweight review', async t => {
  const f = await fixture(t);
  for (const mode of ['manual', 'automated']) {
    await f.save(mode);
    assert.equal((await collectTestingSummary(f.root, f.fields, { final: true }))[0].verification, mode);
  }
  const ledger = await f.save('manual'); ledger.steps[0].checks = [];
  await writeFile(artifactJoin(f.dir, 'DEMO-verification-v1.json'), JSON.stringify(ledger));
  await assert.rejects(collectTestingSummary(f.root, f.fields, { final: true }), /passing evidence|no verification checks/);
  f.fields.mode = 'lightweight';
  assert.equal((await collectTestingSummary(f.root, f.fields, { final: true }))[0].verification, 'independent-review');
});

test('summary groups repos by actual method, recommends once and rejects malformed/duplicate records', () => {
  const rows = [{ repo: 'api', strategy: 'missing', verification: 'automated' }, { repo: 'web', strategy: 'missing', verification: 'manual' }, { repo: 'admin', strategy: 'missing', verification: 'manual' }];
  const notes = testingSummaryNotes(rows);
  assert.match(notes[1], /web, admin; used manual verification/);
  assert.equal((notes.join(' ').match(/define-test-strategy/g) ?? []).length, 1);
  assert.deepEqual(parseTestingSummary(), []);
  assert.throws(() => parseTestingSummary(JSON.stringify([...rows, rows[0]])), /Invalid/);
  assert.throws(() => parseTestingSummary('[{"repo":"app","strategy":"missing","verification":"guessed"}]'), /Invalid/);
});

test('mixed workspace reports each repo from its own policy and observed checks', async t => {
  const f = await fixture(t); const ledger = await f.save('automated');
  const web = artifactJoin(f.root, 'web'); await mkdir(web);
  f.fields.workspace_version = '1';
  f.fields.workspace_contract = JSON.stringify({ repos: [{ root: f.root, id: 'app', role: 'product' }, { root: web, id: 'web', role: 'product' }, { root: artifactJoin(f.root, 'unselected-tests'), id: 'qa', role: 'test' }] });
  const planFile = artifactJoin(f.root, f.fields.plan);
  const plan = await readFile(planFile, 'utf8');
  await writeFile(planFile, plan.replace('| app | automated | configured | Readiness evidence |', '| app | automated | configured | Readiness evidence |\n| web | manual | user | Selected before planning |')
    .replace('| Save | app | Unit | Start app, save and observe persistence |', '| Save | app | Unit | Start app, save and observe persistence |\n| Open web | web | Manual | Open running app and observe screen |'));
  ledger.steps[0].checks.push({ type: 'manual', subject: 'Open web', command: null, result: 'pass', note: 'Observed screen in running app' });
  await writeFile(artifactJoin(f.dir, 'DEMO-verification-v1.json'), JSON.stringify(ledger));
  assert.deepEqual((await collectTestingSummary(f.root, f.fields, { final: true })).map(row => [row.repo, row.verification]), [['app', 'automated'], ['web', 'manual']]);
});
