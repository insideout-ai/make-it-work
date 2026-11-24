import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { assessRepoImpact, checkRepoImpact, validateImpactDefinition, validateImpactGate, validateImpactRuns, impactRegressionManifest, impactDefinition, isImpactPathExtension } from './repo-impact.mjs';
import { planHash, parseSteps } from '../../../scripts/lib/plan.mjs';
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
  const impact = await checkRepoImpact(f.root, parseState(await readFile(f.statePath, 'utf8')).fields);
  assert.equal(impact.repos.find(repo => repo.repo === 'docs').classification, 'context');
  assert.ok(impact.checks.every(check => check.run_repo !== 'docs' && !check.repos.includes('docs')));
  const beforePreparation = await readFile(f.statePath, 'utf8');
  await writeFile(f.statePath, beforePreparation.replace('phase: plan', 'phase: write-tests').replace('compaction_checkpoint: pending', 'compaction_checkpoint: declined'));
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


const amendmentPlan = (d, count = 2) => plan(d) + `
## Execution Status

**Mode:** Subagent-Driven
**Progress:** Step 2 of ${count} complete

## Steps

${Array.from({ length: count }, (_, i) => `### Step ${i + 1} — ${i < 2 ? 'Completed work' : 'Local fix'}

**Files:** \`app.js\`
**Depends on:** ${i ? `Step ${i}` : 'none'}
**Can run in parallel with:** none
**Verify:** Existing assertion passes.
**Tests:** api: \`test/app.test.js\`
`).join('\n')}`;

async function updateFixture(f) {
  await f.updateState('plan');
  const d = definition(); d.repos[0].planned_paths.push('contract.json');
  const state = async () => parseState(await readFile(f.statePath, 'utf8'), f.statePath);
  const apply = async (id, extra) => applyWorkflow({ root: f.root, statePath: f.statePath, input: {
    event: 'repo-impact', id, expected_hash: digest(await readFile(f.statePath, 'utf8')), repos: f.repos.map(r => r.root), assessment: d, ...extra,
  } });
  await apply('saved-old-impact');
  const policyReport = `# Readiness\n\n## Verification Policy\n\n${policy}\n\n## Readiness results\n\n| Repo | Status | Setup | Baseline | Evidence |\n| --- | --- | --- | --- | --- |\n| api | ready | existing | pass | Original scoped baseline observed |\n| web | ready | existing | pass | Original consumer baseline observed |\n`;
  const readiness = await testingReadiness(f.statePath, 'begin'); await writeFile(path.join(f.root, readiness.report), policyReport); await testingReadiness(f.statePath, 'complete');
  const filename = artifactJoin(f.dir, 'DEMO-plan.md'), initial = amendmentPlan(d);
  await writeFile(filename, initial);
  const seed = async changes => {
    let bytes = await readFile(f.statePath, 'utf8');
    for (const [key, value] of Object.entries(changes)) bytes = bytes.replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${value}`);
    await writeFile(f.statePath, bytes);
  };
  await seed({ phase: 'fix-plan', plan: path.relative(f.root, filename), plan_hash: planHash(initial), execution_mode: 'subagent-driven', execution: 'passed', plugin_version: '5.17.0' });
  await writeFile(`${filename}.execution.json`, JSON.stringify({ version: 1, plan_hash: planHash(initial), step_hashes: parseSteps(initial).map(step => digest(JSON.stringify(step))), attempts: {}, receipts: [], stopped: null }));
  return { d, filename, initial, state, seed, apply, policyReport };
}

test('path extension never treats changed checks, evidence, rationale or removed paths as a local amendment', () => {
  const d = definition(), added = structuredClone(d); added.repos[0].planned_paths.push('extra.js');
  assert.equal(isImpactPathExtension(d, added), true);
  for (const change of [x => x.repos[0].planned_paths.splice(0, 1), x => x.checks[0].command.args.push('changed'), x => x.repos[0].reason = 'Different dependency', x => x.repos[0].evidence[0].path = 'elsewhere.json', x => x.repos[2].classification = 'verify']) {
    const modified = structuredClone(added); change(modified); assert.equal(isImpactPathExtension(d, modified), false);
  }
});

test('saved version-1 run retains progress/mode on explicit path amendment and refreshes readiness without rerunning baselines', async t => {
  const f = await fixture(t, true), u = await updateFixture(f);
  const added = structuredClone(u.d); added.repos[0].planned_paths.push('extra.js'); await writeFile(u.filename, amendmentPlan(added, 3));
  const before = (await u.state()).fields;
  const amended = amendmentPlan(added, 3);
  await writeFile(u.filename, amended.replace('Step 1 — Completed work', 'Step 1 — Rewritten completed work'));
  await assert.rejects(u.apply('reject-rewrite', { assessment: added, update: 'amend-paths' }), /unchanged completed steps/);
  await writeFile(u.filename, amended);
  // A real amendment can follow a planned edit to evidence, without restoring it.
  await writeFile(path.join(f.repos[0].root, 'contract.json'), '{"version":2}');
  const result = await u.apply('local-paths', { assessment: added, update: 'amend-paths' });
  assert.ok(await checkRepoImpact(f.root, result.fields));
  assert.equal(await readFile(path.join(f.repos[0].root, 'contract.json'), 'utf8'), '{"version":2}');
  for (const key of ['phase', 'plan_version', 'execution', 'execution_mode', 'replans_used', 'fix_cycle', 'review_cycle']) assert.equal(result.fields[key], before[key], key);
  assert.match(await readFile(u.filename, 'utf8'), /Step 2 of 3 complete/);
  await assert.rejects(testingReadiness(f.statePath, 'check'), /pending or stale/);
  await testingReadiness(f.statePath, 'begin'); await testingReadiness(f.statePath, 'complete');
  assert.equal((await testingReadiness(f.statePath, 'check')).ready, true);
  assert.equal(await readFile(path.join(f.root, result.fields.testing_readiness), 'utf8'), u.policyReport);
  // Exact retries preserve progress; a changed required command must not use this route.
  const altered = structuredClone(added); altered.checks[0].command.args.push('other');
  const stateBefore = await readFile(f.statePath, 'utf8');
  await assert.rejects(u.apply('reject-check-change', { assessment: altered, update: 'amend-paths' }), /more than permitted/);
  assert.equal(await readFile(f.statePath, 'utf8'), stateBefore);
  const normal = await u.apply('normal-check-change', { assessment: altered });
  assert.equal(normal.fields.phase, 'plan'); assert.equal(normal.fields.plan_version, '2');
});

test('evidence refresh is explicit, at a durable boundary, and limited to already planned evidence', async t => {
  const f = await fixture(t, true), u = await updateFixture(f); await u.seed({ phase: 'execute' });
  await writeFile(path.join(f.repos[0].root, 'contract.json'), '{"version":2}');
  await assert.rejects(checkRepoImpact(f.root, (await u.state()).fields), /dependency evidence changed/);
  await assert.rejects(u.apply('legacy-refresh'), /active planning/);
  const journal = JSON.parse(await readFile(`${u.filename}.execution.json`, 'utf8'));
  await writeFile(`${u.filename}.execution.json`, JSON.stringify({ ...journal, active_steps: [2] }));
  await assert.rejects(u.apply('active-refresh', { update: 'refresh-evidence' }), /durable completion/);
  await writeFile(`${u.filename}.execution.json`, JSON.stringify(journal));
  const result = await u.apply('durable-refresh', { update: 'refresh-evidence' });
  assert.equal(result.fields.phase, 'execute'); assert.equal(result.fields.plan_version, '1');
  assert.ok(await checkRepoImpact(f.root, result.fields));
  assert.equal((await testingReadiness(f.statePath, 'check')).ready, true);
  await assert.rejects(u.apply('forged-proof', { update: 'refresh-evidence', verification: {} }), /cannot carry verification/);
  // Unplanned evidence is never legitimized merely by repeating the definition.
  const other = await fixture(t, true), v = await updateFixture(other);
  v.d.repos[0].planned_paths = ['app.js']; await v.apply('narrow-paths'); await writeFile(v.filename, amendmentPlan(v.d)); await v.seed({ phase: 'fix-plan', plan: path.relative(other.root, v.filename), plan_hash: planHash(amendmentPlan(v.d)) });
  await writeFile(path.join(other.repos[0].root, 'contract.json'), '{"version":2}');
  await assert.rejects(v.apply('unplanned-refresh', { update: 'refresh-evidence' }), /not an existing planned edit/);
});

test('correctness-stop recovery survives stale impact while successful Execute still requires freshness', async t => {
  const f = await fixture(t, true), u = await updateFixture(f); await u.seed({ phase: 'execute' });
  const handoffs = path.join(f.dir, 'DEMO-handoffs'); await mkdir(handoffs);
  const report = artifactJoin(f.dir, 'DEMO-execute.md'); await writeFile(report, 'Execute outcome: GUARDRAIL\nDiscoveries: none\n');
  const h = { version: 1, ticket: 'DEMO', plan_version: 1, stage: 'execute', status: 'done', outcome: 'GUARDRAIL', artifacts: { report: path.relative(f.root, report) }, data: { gate: 'full-suite', discoveries: [], failing_tests: [] } };
  const file = artifactJoin(handoffs, 'execute-1.json'); await writeFile(file, JSON.stringify(h));
  await writeFile(path.join(f.repos[0].root, 'contract.json'), '{"version":2}');
  await writeFile(report, 'Execute outcome: PASSED\nDiscoveries: none\n');
  await writeFile(file, JSON.stringify({ ...h, outcome: 'PASSED' }));
  await assert.rejects(applyWorkflow({ root: f.root, statePath: f.statePath, input: { event: 'handoff', id: 'stale-success', expected_hash: digest(await readFile(f.statePath, 'utf8')), repos: f.repos.map(r => r.root), handoff: path.relative(f.root, file) } }), /dependency evidence changed/);
  const ledger = artifactJoin(f.dir, 'DEMO-verification-v1.json');
  await writeFile(ledger, JSON.stringify({ version: 1, ticket: 'DEMO', plan_version: 1, steps: [], gate: null, acceptance: [] }));
  h.artifacts.verification = path.relative(f.root, ledger);
  await writeFile(report, 'Execute outcome: GUARDRAIL\nDiscoveries: none\n'); await writeFile(file, JSON.stringify(h));
  await u.seed({ autonomy: 'guided' });
  await assert.rejects(applyWorkflow({ root: f.root, statePath: f.statePath, input: { event: 'handoff', id: 'stale-edit-resume', choice: 'edit-and-resume', source: 'user', via: 'chat', expected_hash: digest(await readFile(f.statePath, 'utf8')), repos: f.repos.map(r => r.root), handoff: path.relative(f.root, file) } }), /dependency evidence changed/);
  await u.seed({ autonomy: 'autonomous' });
  const result = await applyWorkflow({ root: f.root, statePath: f.statePath, input: { event: 'handoff', id: 'guardrail-replan', expected_hash: digest(await readFile(f.statePath, 'utf8')), repos: f.repos.map(r => r.root), handoff: path.relative(f.root, file) } });
  assert.equal(result.fields.phase, 'plan'); assert.equal(result.fields.plan_version, '2');
  assert.equal(result.fields.execution, 'not-started');
  assert.equal(await readFile(path.join(f.repos[0].root, 'contract.json'), 'utf8'), '{"version":2}');
});
