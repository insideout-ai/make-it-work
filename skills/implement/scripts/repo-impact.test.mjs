import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { assessRepoImpact, checkRepoImpact, validateImpactDefinition, validateImpactGate, validateImpactRuns, impactRegressionManifest, impactDefinition } from './repo-impact.mjs';
import { testingPolicy } from './testing-policy.mjs';
import { assessContextMaintenance, checkContextMaintenance } from './context-maintenance.mjs';
import { prepareScope, approveScope, runScope } from './workspace-scope.mjs';
import { initializeWorkflow, applyWorkflow } from './workflow.mjs';
import { parseState } from './render-status.mjs';
import { testingReadiness } from './testing-readiness.mjs';
import { authorizePlanningTests } from './planning-tests.mjs';
import { runRegression } from '../../../scripts/regression.mjs';

const ids = ['api', 'web', 'docs', 'qa'];
const roles = ['product', 'product', 'support', 'test'];
const definition = () => ({ version: 1, repos: ids.map((repo, i) => ({ repo, role: roles[i], classification: i === 0 ? 'change' : i === 2 ? 'context' : 'verify',
  planned_paths: i === 0 ? ['app.js'] : [], reason: i === 2 ? 'No dependency path from the changed API to this documentation tool.' : 'The accepted API contract affects this repository.',
  evidence: [{ repo, path: 'contract.json' }],
})), checks: [['api-full', ['api'], 'api', 'full'], ['web-contract', ['web'], 'web', 'scoped'], ['shared-qa', ['api', 'web'], 'qa', 'scoped']].map(([id, repos, run_repo, scope]) => ({
  id, repos, run_repo, scope, command: { bin: process.execPath, args: ['runner.cjs', scope] }, scenario: id,
  expected: 'Required behavior assertions pass.', prerequisites: 'Existing local Node runtime; no services.', source: 'configured', reason: 'Existing suite covers the affected contract.',
})) });
const policy = '| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| api | automated | configured | Existing runner |\n| web | automated | configured | Existing contract tests |';
const plan = d => `# Plan\n\n**Repository impact contract:** 1\n\n## Repository Impact\n\n\`\`\`json\n${JSON.stringify(d)}\n\`\`\`\n\n## Affected Code\n\n### \`api\`\n\n| File | Change | Summary |\n| --- | --- | --- |\n| \`app.js\` | Modify | Update API behavior |\n\n## Verification Policy\n\n${policy}\n`;
async function fixture(t, controller = false) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'repo-impact-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { stdio: 'pipe' });
  const repos = [];
  for (const [i, id] of ids.entries()) {
    const repo = path.join(root, id); await mkdir(repo); git(repo, 'init', '-qb', 'main');
    await writeFile(path.join(repo, 'app.js'), 'module.exports = 1;\n');
    await writeFile(path.join(repo, 'contract.json'), '{"version":1}\n');
    await writeFile(path.join(repo, 'runner.cjs'), 'require("node:fs").appendFileSync(process.env.IMPACT_LOG, require("node:path").basename(process.cwd()) + ":" + process.argv[2] + "\\n");\n');
    git(repo, 'add', '.'); git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'baseline');
    git(repo, 'switch', '-qc', 'DEMO');
    repos.push({ id, role: roles[i], root: repo, base: 'main', branch: 'DEMO', reason: 'Fixture contract evidence' });
  }
  let statePath, fields;
  const dir = path.join(root, 'make-it-work/DEMO'); await mkdir(dir, { recursive: true });
  if (controller) {
    const report = 'make-it-work/DEMO/DEMO-repos.md'; await writeFile(path.join(root, report), '# Approved fixture repositories\n');
    const scope = await prepareScope(root, { ticket: 'DEMO', report, repos: repos.map(r => ({ id: r.id, role: r.role, base: r.base, reason: r.reason, branch: 'DEMO' })) });
    await approveScope(root, 'DEMO', scope.hash, { source: 'user', via: 'chat' }); await runScope(root, 'DEMO', scope.hash);
    const initialized = await initializeWorkflow(root, { ticket: 'DEMO', autonomy: 'autopilot', repos: repos.map(r => r.root), branch_guard: 'Approved selection' });
    statePath = initialized.state; fields = initialized.fields;
  } else fields = { ticket: 'DEMO', start_time: 'fixture-run', plan_version: '1', workspace_version: '1', workspace_contract: JSON.stringify({ repos }), repo_impact_version: '1' };
  const specPath = artifactJoin(dir, 'DEMO-spec.md'); await writeFile(specPath, '# Accepted API behavior\n');
  Object.assign(fields, { spec: path.relative(root, specPath), spec_hash: digest('# Accepted API behavior\n'), repo_impact: 'none', repo_impact_hash: 'none', repo_impact_definition_hash: 'none' });
  const save = async (d = definition()) => {
    const assessed = await assessRepoImpact(root, fields, d), bytes = JSON.stringify(assessed);
    const file = artifactJoin(dir, 'DEMO-impact.json'); await writeFile(file, bytes);
    Object.assign(fields, { repo_impact: path.relative(root, file), repo_impact_hash: digest(bytes), repo_impact_definition_hash: digest(JSON.stringify(impactDefinition(assessed))) });
    return assessed;
  };
  const updateState = async phase => {
    let source = await readFile(statePath, 'utf8');
    for (const [key, value] of Object.entries(fields)) source = source.replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${value}`);
    if (phase) source = source.replace(/^phase:.*$/m, `phase: ${phase}`);
    await writeFile(statePath, source); fields = parseState(source, statePath).fields;
  };
  return { root, repos, dir, git, save, updateState, get fields() { return fields; }, statePath };
}

test('impact preserves normal gates for changes, scopes unchanged consumers and deduplicates QA', async t => {
  const f = await fixture(t), d = definition(); await f.save();
  assert.equal((await checkRepoImpact(f.root, f.fields, { plan: plan(d) })).repos.length, 4);
  assert.deepEqual(testingPolicy(plan(d)).map(r => r.Repo), ['api', 'web']);
  const manifest = impactRegressionManifest(d, f.fields);
  assert.deepEqual(manifest.runs.map(r => `${r.repo}:${r.scope}`), ['api:full', 'web:scoped', 'qa:scoped']);
  validateImpactRuns(d, manifest.runs);
  assert.throws(() => validateImpactRuns(d, manifest.runs.slice(0, 2)), /each required/);
  const broader = structuredClone(d); broader.checks = broader.checks.filter(c => c.id !== 'api-full');
  assert.throws(() => testingPolicy(plan(broader)), /full-suite gate/);
  const duplicate = structuredClone(d); duplicate.checks.push({ ...duplicate.checks[2], id: 'another-qa', command: { args: duplicate.checks[2].command.args, bin: duplicate.checks[2].command.bin } });
  assert.throws(() => validateImpactDefinition(duplicate), /Deduplicate/);
  const blocked = structuredClone(d); blocked.checks[1].scope = 'manual'; blocked.checks[1].command = null;
  assert.throws(() => validateImpactDefinition(blocked), /explicit user/);
});

test('actual/inherited/untracked changes and dependency drift cannot stay skipped', async t => {
  const f = await fixture(t); await f.save();
  const web = f.repos[1].root;
  await writeFile(path.join(web, 'new.js'), 'untracked');
  await assert.rejects(checkRepoImpact(f.root, f.fields), /impact drift/);
  await assert.rejects(f.save(), /actual changes/);
  await rm(path.join(web, 'new.js')); await writeFile(path.join(web, 'app.js'), 'changed');
  f.git(web, 'add', '.'); f.git(web, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'inherited change');
  await assert.rejects(f.save(), /actual changes/);
  const changed = definition(); changed.repos[1].classification = 'change';
  changed.checks[1].scope = 'full'; changed.checks[1].command.args = ['runner.cjs', 'full'];
  await f.save(changed);
  await writeFile(path.join(f.repos[0].root, 'app.js'), 'expected implementation edit');
  assert.ok(await checkRepoImpact(f.root, f.fields));
  await writeFile(path.join(f.repos[0].root, 'contract.json'), '{"version":2}');
  await assert.rejects(checkRepoImpact(f.root, f.fields), /dependency evidence changed/);
  await f.save(changed); // Parent reassessment rebinds facts without inventing a test pass.
  assert.ok(await checkRepoImpact(f.root, f.fields));
});

test('skipped map maintenance tolerates irrelevant broken maps without writing them', async t => {
  const f = await fixture(t), docs = f.repos[2].root;
  await mkdir(path.join(docs, '.claude/skills/test-strategy'), { recursive: true });
  const file = path.join(docs, '.claude/skills/test-strategy/SKILL.md'); await writeFile(file, '# Strategy\n\n## Test Map\n\nA stale unrelated map.\n');
  f.git(docs, 'add', '.'); f.git(docs, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'existing unrelated map'); f.git(docs, 'branch', '-f', 'main', 'HEAD');
  await f.save();
  const records = f.repos.map(r => ({ repo: r.root, status: 'not-applicable', affected_tests: [], reason: 'No mappings changed by the selected work.' }));
  const assessed = await assessContextMaintenance(f.root, f.repos.map(r => r.root), records, { fields: f.fields });
  assert.equal(assessed[2].impact_definition_hash, f.fields.repo_impact_definition_hash);
  const fields = { ...f.fields, review_context_version: '2', test_map_maintenance: JSON.stringify(assessed) };
  assert.equal((await checkContextMaintenance(f.root, fields)).length, 4);
  assert.equal(await readFile(file, 'utf8'), '# Strategy\n\n## Test Map\n\nA stale unrelated map.\n');
  await assert.rejects(assessContextMaintenance(f.root, f.repos.map(r => r.root), records), /advisory severity/);
});

test('scoped evidence cannot stand in for full suites or missing required checks', () => {
  const d = definition(), gate = { result: 'pass', checks: d.checks.map(c => ({ id: c.id, run_repo: c.run_repo, scope: c.scope, command: c.command, result: 'pass', note: 'Actual assertions passed.' })) };
  validateImpactGate(d, gate, { passing: true });
  assert.throws(() => validateImpactGate(d, { ...gate, checks: gate.checks.slice(1) }, { passing: true }), /every required/);
  const unavailable = structuredClone(gate); unavailable.checks[1].result = 'not-run';
  assert.throws(() => validateImpactGate(d, unavailable, { passing: true }), /did not pass/);
  assert.throws(() => validateImpactGate(d, { ...gate, full_suites: [{ repo: 'web', command: 'node runner.cjs scoped' }] }), /cannot claim a full-suite/);
});

test('controller seals impact, readiness excludes context repos and rejects setup in verify-only repos', async t => {
  const f = await fixture(t, true); await f.updateState('plan');
  const apply = async (assessment, id) => applyWorkflow({ root: f.root, statePath: f.statePath, input: { event: 'repo-impact', id, expected_hash: digest(await readFile(f.statePath, 'utf8')), repos: f.repos.map(r => r.root), assessment } });
  await assert.rejects(testingReadiness(f.statePath, 'begin'), /impact assessment is required/);
  const assessed = await apply(definition(), 'impact');
  assert.equal(assessed.fields.repo_impact_version, '1');
  assert.match(await readFile(assessed.dashboard, 'utf8'), /Not required \(context only\)/);
  const beforePreparation = await readFile(f.statePath, 'utf8');
  await writeFile(f.statePath, beforePreparation.replace('phase: plan', 'phase: write-tests'));
  await assert.rejects(authorizePlanningTests(f.statePath, { repo: f.repos[1].root, file: 'new.test.js', kind: 'test-file', step: 1, reason: 'Unexpected test edit' }), /reassessing this repository/);
  await writeFile(f.statePath, beforePreparation);
  const readiness = await testingReadiness(f.statePath, 'begin');
  const report = setup => `# Readiness\n\n## Verification Policy\n\n${policy}\n\n## Readiness results\n\n| Repo | Status | Setup | Baseline | Evidence |\n| --- | --- | --- | --- | --- |\n| api | ready | existing | not-run | Baseline not run during this fixture |\n| web | ready | ${setup} | pass | Existing check observed |\n`;
  await writeFile(path.join(f.root, readiness.report), report('established'));
  await assert.rejects(testingReadiness(f.statePath, 'complete'), /cannot establish/);
  await writeFile(path.join(f.root, readiness.report), report('existing'));
  await testingReadiness(f.statePath, 'complete');
  const current = parseState(await readFile(f.statePath, 'utf8'), f.statePath).fields;
  assert.ok(await checkRepoImpact(f.root, current));
  const changed = definition(); changed.repos[2].reason = 'Reassessed unaffected dependency with clearer evidence.';
  const again = await apply(changed, 'impact-updated');
  assert.notEqual(again.fields.repo_impact_definition_hash, assessed.fields.repo_impact_definition_hash);
  await assert.rejects(testingReadiness(f.statePath, 'check'), /pending or stale/);
});

test('real regression executes only assessed commands and never visits context repo', async t => {
  const f = await fixture(t, true); await f.updateState('plan');
  await applyWorkflow({ root: f.root, statePath: f.statePath, input: { event: 'repo-impact', id: 'impact', expected_hash: digest(await readFile(f.statePath, 'utf8')), repos: f.repos.map(r => r.root), assessment: definition() } });
  let state = await readFile(f.statePath, 'utf8'); state = state.replace('phase: plan', 'phase: execute'); await writeFile(f.statePath, state);
  const fields = parseState(state, f.statePath).fields, d = await checkRepoImpact(f.root, fields);
  const manifest = impactRegressionManifest(d, fields), log = path.join(f.root, 'commands.log');
  const result = await runRegression(manifest, { statePath: f.statePath, auditId: 'impact-regression', env: { ...process.env, IMPACT_LOG: log } });
  assert.equal(result.overall, 'pass');
  assert.equal(await readFile(log, 'utf8'), 'api:full\nweb:scoped\nqa:scoped\n');
  const forbidden = structuredClone(manifest); forbidden.runs[1].repo = 'docs'; forbidden.runs[1].cwd = f.repos[2].root;
  await assert.rejects(runRegression(forbidden, { statePath: f.statePath, auditId: 'forbidden' }), /differs from its assessed/);
  assert.equal(await readFile(log, 'utf8'), 'api:full\nweb:scoped\nqa:scoped\n');
  const unavailable = structuredClone(manifest); unavailable.runs[1].prerequisites = { env: ['MIW_MISSING_IMPACT_CHECK_TEST_VAR'] };
  const partial = await runRegression(unavailable, { statePath: f.statePath, auditId: 'unavailable', env: { ...process.env, IMPACT_LOG: log } });
  assert.equal(partial.overall, null);
  assert.equal(partial.not_run[0].impact_check, 'web-contract');
});


test('Lightweight required-check proof is bound to actual tree and never synthesized from classification', async t => {
  const f = await fixture(t); const assessed = await f.save();
  await assert.rejects(checkRepoImpact(f.root, f.fields, { requireChecks: true }), /has not been recorded/);
  assessed.verification = { mode: 'scoped+full', result: 'pass', checks: assessed.checks.map(c => ({ id: c.id, run_repo: c.run_repo, scope: c.scope, command: c.command, result: 'pass', note: 'Actual required check observed passing.' })) };
  const bytes = JSON.stringify(assessed); await writeFile(path.join(f.root, f.fields.repo_impact), bytes); f.fields.repo_impact_hash = digest(bytes);
  assert.ok(await checkRepoImpact(f.root, f.fields, { requireChecks: true }));
  await writeFile(path.join(f.repos[0].root, 'app.js'), 'New implementation after verification');
  await assert.rejects(checkRepoImpact(f.root, f.fields, { requireChecks: true }), /verification is stale/);
  assert.equal(await checkRepoImpact(f.root, {}), null);
});


test('missing consumer tooling is representable but cannot be sealed ready or replaced by partial QA', async t => {
  const f = await fixture(t), d = definition();
  const missing = d.checks.find(c => c.id === 'web-contract');
  Object.assign(missing, { availability: 'unavailable', blocker: 'No existing check exercises web rendering; QA asserts API total only.', command: null, source: 'project-policy' });
  await f.save(d);
  assert.ok(await checkRepoImpact(f.root, f.fields));
  assert.throws(() => testingPolicy(plan(d)), /Required verification unavailable/);
  assert.throws(() => impactRegressionManifest(d, f.fields), /Readiness remains pending/);
  assert.throws(() => validateImpactGate(d, { result: 'pass', checks: d.checks.map(c => ({ id: c.id, run_repo: c.run_repo, scope: c.scope, command: c.command, result: 'pass', note: 'Pretend passing observation.' })) }, { passing: true }), /Required verification unavailable/);
  const malformed = structuredClone(d); delete malformed.checks[1].blocker;
  assert.throws(() => validateImpactDefinition(malformed), /blocker/);
});

test('an unavailable consumer check blocks readiness completion even when a report claims QA passed', async t => {
  const f = await fixture(t, true); await f.updateState('plan');
  const d = definition(); Object.assign(d.checks[1], { availability: 'unavailable', blocker: 'Consumer runner missing; QA does not execute the renderer.', command: null, source: 'project-policy' });
  await applyWorkflow({ root: f.root, statePath: f.statePath, input: { event: 'repo-impact', id: 'missing-consumer', expected_hash: digest(await readFile(f.statePath, 'utf8')), repos: f.repos.map(r => r.root), assessment: d } });
  const begun = await testingReadiness(f.statePath, 'begin');
  await writeFile(path.join(f.root, begun.report), `# Readiness\n\n## Verification Policy\n\n${policy}\n\n## Readiness results\n\n| Repo | Status | Setup | Baseline | Evidence |\n| --- | --- | --- | --- | --- |\n| api | ready | existing | pass | API baseline passed |\n| web | ready | existing | pass | QA passed but consumer was not exercised |\n`);
  await assert.rejects(testingReadiness(f.statePath, 'complete'), /Required verification unavailable/);
  assert.equal(JSON.parse(await readFile(path.join(f.root, begun.receipt), 'utf8')).status, 'pending');
});
