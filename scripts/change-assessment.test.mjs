import { artifactJoin, artifactOutputJoin } from './lib/artifact-path.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { assess, captureScope, saveAssessment, readAssessment, unavailable, assessmentSummary, assessmentMarkdown } from './change-assessment.mjs';

async function fixture(t) {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'assessment-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = artifactJoin(root, 'app'); await mkdir(repo);
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '-b', 'main'); git('config', 'user.email', 'test@example.test'); git('config', 'user.name', 'Test');
  await writeFile(artifactJoin(repo, 'code.py'), 'def run():\n    return 1\n'); git('add', '.'); git('commit', '-m', 'base'); git('switch', '-c', 'feature');
  await writeFile(artifactJoin(repo, 'code.py'), 'def run():\n    return 2\n');
  const scope = { label: 'DEMO', reference: 'explicit delivery', repos: [{ path: repo, base: 'main' }] };
  return { root, repo, scope, git, snapshot: await captureScope(scope) };
}
function evidence(snapshot, { complexity = 'Low', risk = 'Low', measurements = 'missing', value = 1 } = {}) {
  return { snapshot_id: snapshot.snapshot_id, rationale: 'code.py:run decides; local return update; no new coupling.', repos: snapshot.repos.map(s => ({ path: s.path, assessed: true, full_scope: true,
    coverage: (s.paths ?? []).map(file => ({ file, status: 'assessed', evidence: `${file}:run inspected` })), dependencies: 'Caller CLI only; inspected entry.py:main', verification: 'python test.py passed',
    complexity_dimensions: [{ dimension: 'state', rating: complexity, evidence: 'code.py:run resulting function' }], risk_dimensions: [{ dimension: 'impact', rating: risk, evidence: 'code.py:run impact checked' }],
    measurements, measurement_limitation: 'Analyzer unavailable; qualitative judgment only', metrics: measurements === 'complete' ? [{ file: 'code.py', symbol: 'run', kind: 'cyclomatic', value, before: value, command: 'radon cc', evidence: 'analyzer.txt:1', inheritance: 'All inherited; return value edit adds no complexity' }] : [] })) };
}

test('straightforward qualitative changes remain rated with missing analyzer measurements', async t => {
  const { snapshot } = await fixture(t);
  const result = assess(snapshot, evidence(snapshot));
  assert.equal(result.complexity, 'Low'); assert.equal(result.risk, 'Low'); assert.equal(result.completeness, 'partial');
});
test('missing analyzer measurements cannot contain hand-filled metric values', async t => {
  const { snapshot } = await fixture(t);
  const input = evidence(snapshot, { measurements: 'complete' });
  input.repos[0].measurements = 'missing';
  input.repos[0].metrics[0].command = 'manual count (analyzer not found)';
  assert.throws(() => assess(snapshot, input), /Missing measurements must leave metrics empty/);
  input.repos[0].metrics = [];
  const result = assess(snapshot, input);
  assert.equal(result.completeness, 'partial');
  assert.equal(result.complexity, 'Low');
});
for (const [value, expected] of [[1,'Low'],[10,'Low'],[11,'Medium'],[20,'Medium'],[21,'High']]) {
  test(`resulting cyclomatic complexity ${value} sets ${expected} minimum risk, including inherited complexity`, async t => {
    const { snapshot } = await fixture(t);
    const result = assess(snapshot, evidence(snapshot, { measurements: 'complete', value }));
    assert.equal(result.complexity, expected); assert.equal(result.risk, expected); assert.equal(result.completeness, 'complete');
    assert.match(result.repos[0].metrics[0].inheritance, /inherited/);
  });
}
test('tiny sensitive behavior raises risk independently of complexity', async t => {
  const { snapshot } = await fixture(t); const result = assess(snapshot, evidence(snapshot, { risk: 'High' }));
  assert.equal(result.complexity, 'Low'); assert.equal(result.risk, 'High');
});
test('cognitive complexity requires configured threshold and influences resulting rating', async t => {
  const { snapshot } = await fixture(t); const input = evidence(snapshot, { measurements: 'complete' });
  Object.assign(input.repos[0].metrics[0], { kind: 'cognitive', value: 16 });
  assert.throws(() => assess(snapshot, input), /threshold/);
  input.repos[0].metrics[0].threshold = 15; assert.equal(assess(snapshot,input).complexity, 'High');
});
test('confirmed non-executable scope has complete inapplicable metrics and independently High production risk', async t => {
  const { snapshot } = await fixture(t); const input = evidence(snapshot, { risk: 'High', measurements: 'inapplicable' });
  assert.throws(() => assess(snapshot,input), /non-executable/);
  Object.assign(input.repos[0], { non_executable: true, non_executable_evidence: 'Reviewed full prose-only diff' });
  const result = assess(snapshot,input); assert.equal(result.complexity,'Low'); assert.equal(result.risk,'High'); assert.equal(result.completeness,'complete');
});
test('inaccessible multi-repository scope preserves assessed portions without delivery ratings', async t => {
  const { scope, root } = await fixture(t); scope.repos.push({ path: artifactJoin(root,'missing'), base:'main' });
  const snap = await captureScope(scope); const result = assess(snap,evidence(snap));
  assert.equal(result.completeness,'partial'); assert.equal(result.complexity,null); assert.equal(result.risk,null); assert.equal(result.repos[0].complexity,'Low');
});
test('binary/generated unsupported files and incomplete dependency evidence never silently receive Low', async t => {
  const { snapshot } = await fixture(t);
  for (const type of ['binary', 'generated', 'dependencies']) {
    const input=evidence(snapshot);
    if(type==='dependencies') input.repos[0].full_scope=false;
    else Object.assign(input.repos[0].coverage[0],{status:'unsupported',evidence:`${type} content unsupported`});
    const report=assess(snapshot,input); assert.equal(report.complexity,null); assert.equal(report.risk,null); assert.equal(report.completeness,'partial');
  }
});
test('snapshots include committed, staged, unstaged and untracked changes; reports reuse and invalidate correctly', async t => {
  const { scope, snapshot, root, repo, git }=await fixture(t);
  await saveAssessment(root,'DEMO',assess(snapshot,evidence(snapshot)));
  const a=await readAssessment(root,'DEMO'); const b=await readAssessment(root,'DEMO'); assert.deepEqual(a,b);
  assert.equal((await readAssessment(root,'DEMO',snapshot.repos)).complexity,'Low');
  await writeFile(artifactJoin(repo,'new.bin'),Buffer.from([0,1,2])); git('add','code.py');
  const changed=await captureScope(scope); assert.notEqual(changed.snapshot_id,snapshot.snapshot_id); assert.ok(changed.repos[0].paths.includes('new.bin'));
  assert.throws(()=>assess(changed,evidence(snapshot)),/snapshot/);
  const stale=await readAssessment(root,'DEMO'); assert.equal(stale.stale,true); assert.equal(stale.complexity,null);
  await saveAssessment(root,'DEMO',unavailable(changed,'Analyzer crashed during reassessment'));
  const failed=await readAssessment(root,'DEMO'); assert.match(assessmentSummary(failed),/Assessment unavailable.*crashed/); assert.equal(failed.complexity,null);
  assert.match(await readFile(artifactJoin(root,'make-it-work/DEMO',failed.stale_history),'utf8'),/Stale history/);
});
test('report drift is unavailable; a missing report cannot produce a Low rating', async t => {
  const { root,snapshot }=await fixture(t);
  assert.equal((await readAssessment(root,'DEMO')).reason,'Not assessed yet');
  await saveAssessment(root,'DEMO',assess(snapshot,evidence(snapshot)));
  await writeFile(artifactJoin(root,'make-it-work/DEMO/DEMO-change-assessment.md'),'tampered');
  assert.match((await readAssessment(root,'DEMO')).reason,/disagree/);
});

test('new reports and stale history use change-assessment filenames', async t => {
  const { root, snapshot } = await fixture(t);
  const saved = await saveAssessment(root, 'DEMO', assess(snapshot, evidence(snapshot)));
  assert.match(saved.reports.json, /DEMO-change-assessment\.json$/);
  assert.match(saved.reports.markdown, /DEMO-change-assessment\.md$/);
  assert.match(await readFile(path.join(root, saved.reports.markdown), 'utf8'), new RegExp(saved.json_name.replaceAll('.', '\\.')));
  const failed = await saveAssessment(root, 'DEMO', unavailable(snapshot, 'Analysis failed'));
  assert.match(failed.stale_history, /DEMO-change-assessment-stale-/);
  assert.match(await readFile(path.join(root, path.dirname(failed.reports.json), failed.stale_history), 'utf8'), /Stale history/);
});

async function legacyReport(root, snapshot, prefixed) {
  const dir = path.join(root, 'make-it-work', 'DEMO');
  await mkdir(dir, { recursive: true });
  // Both established unprefixed workflows and newer miw-prefixed runs existed
  // before the skill rename; neither layout may be migrated just by reading.
  await writeFile(path.join(dir, prefixed ? 'miw-run.json' : 'state.json'), JSON.stringify(prefixed ? { artifact_naming_version: 1 } : {}));
  const json = artifactOutputJoin(dir, 'DEMO-complexity.json');
  const md = artifactOutputJoin(dir, 'DEMO-complexity.md');
  const report = { ...assess(snapshot, evidence(snapshot)), json_name: path.basename(json) };
  await writeFile(json, JSON.stringify(report, null, 2) + '\n');
  await writeFile(md, assessmentMarkdown(report));
  return { dir, json, md };
}

for (const prefixed of [false, true]) test(`legacy ${prefixed ? 'miw-prefixed' : 'unprefixed'} reports retain paths and history on resume`, async t => {
  const { root, snapshot, repo } = await fixture(t);
  const files = await legacyReport(root, snapshot, prefixed);
  const bytes = await Promise.all([readFile(files.json, 'utf8'), readFile(files.md, 'utf8')]);
  const report = await readAssessment(root, 'DEMO');
  assert.equal(report.complexity, 'Low');
  assert.equal(path.join(root, report.reports.json), files.json);
  assert.equal(path.join(root, report.reports.markdown), files.md);
  assert.deepEqual(await Promise.all([readFile(files.json, 'utf8'), readFile(files.md, 'utf8')]), bytes);
  await writeFile(path.join(repo, 'code.py'), 'def run():\n    return 3\n');
  assert.equal((await readAssessment(root, 'DEMO')).stale, true);
  const failed = await saveAssessment(root, 'DEMO', unavailable(snapshot, 'Reassessment failed'));
  assert.equal(path.join(root, failed.reports.json), files.json);
  assert.match(failed.stale_history, /DEMO-complexity-stale-/);
  const history = await readFile(path.join(files.dir, failed.stale_history), 'utf8');
  assert.match(history, /Stale history/);
  assert.match(history, /DEMO-complexity-stale-.*\.json/);
  const again = await saveAssessment(root, 'DEMO', unavailable(snapshot, 'Still unavailable'));
  assert.equal(again.stale_history, failed.stale_history);
});

test('a canonical report takes precedence over legacy ratings, even when failed, stale or malformed', async t => {
  const { root, snapshot, repo } = await fixture(t);
  const { dir } = await legacyReport(root, snapshot, false);
  const json = path.join(dir, 'DEMO-change-assessment.json');
  const md = path.join(dir, 'DEMO-change-assessment.md');
  const failed = { ...unavailable(snapshot, 'Canonical analysis failed'), json_name: path.basename(json) };
  await writeFile(json, JSON.stringify(failed)); await writeFile(md, assessmentMarkdown(failed));
  assert.equal((await readAssessment(root, 'DEMO')).reason, 'Canonical analysis failed');
  await saveAssessment(root, 'DEMO', assess(snapshot, evidence(snapshot)));
  await writeFile(path.join(repo, 'code.py'), 'def run():\n    return 3\n');
  assert.equal((await readAssessment(root, 'DEMO')).stale, true);
  await writeFile(json, '{broken');
  const broken = await readAssessment(root, 'DEMO');
  assert.equal(broken.completeness, 'unavailable'); assert.equal(broken.risk, null);
  await assert.rejects(saveAssessment(root, 'DEMO', failed), SyntaxError);
});

test('audit update failure preserves saved assessment evidence without changing workflow state', async t => {
  const { root, snapshot } = await fixture(t);
  const dir = artifactJoin(root, 'make-it-work/DEMO');
  await mkdir(dir, { recursive: true });
  const state = artifactJoin(dir, 'DEMO-state.md');
  const malformed = 'change_assessment_version: 1\nphase: final-approval\n';
  await writeFile(state, malformed);
  const saved = await saveAssessment(root, 'DEMO', assess(snapshot, evidence(snapshot)));
  assert.match(saved.audit_warning, /Assessment reports saved; audit\/dashboard update could not finish:/);
  assert.equal((await readAssessment(root, 'DEMO')).complexity, 'Low');
  assert.equal(await readFile(state, 'utf8'), malformed);
});

test('exact PR identity and head changes bind the report even when the net diff stays the same', async t => {
  const { scope, root, repo, git }=await fixture(t);
  scope.reference={url:'https://github.com/example/fixture/pull/42',head:git('rev-parse','HEAD').trim(),base:git('rev-parse','main').trim()};
  const snapshot=await captureScope(scope); const report=assess(snapshot,evidence(snapshot));
  assert.deepEqual(report.scope.reference,scope.reference);
  await saveAssessment(root,'PR-42',report);
  git('add','code.py'); git('commit','-m','change');
  const next=await captureScope(scope);
  assert.equal(next.repos[0].diff_sha256,snapshot.repos[0].diff_sha256);
  assert.notEqual(next.snapshot_id,snapshot.snapshot_id);
  assert.equal((await readAssessment(root,'PR-42')).stale,true);
});
