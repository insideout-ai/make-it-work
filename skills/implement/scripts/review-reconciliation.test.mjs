import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { planHash } from '../../../scripts/lib/plan.mjs';
import { captureReviewRepos } from './review-baseline.mjs';
import { inspectReviewScope, reconcileReviewScope, prepareReviewScope, checkReviewScope, excludePreexisting } from './review-scope.mjs';
import { prepareScope, approveScope, runScope, approvedScope } from './workspace-scope.mjs';
import { writeReview } from '../../../scripts/review-report.mjs';

const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: 'pipe' }).trim();
async function fixture(t, { beforeCapture = async () => {}, workspace = false } = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'scope-reconcile-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = workspace ? path.join(root, 'api') : root;
  await mkdir(repo, { recursive: true });
  git(repo, 'init', '-qb', 'main'); git(repo, 'config', 'user.name', 'Test'); git(repo, 'config', 'user.email', 'test@example.invalid');
  await mkdir(path.join(repo, 'src'));
  await writeFile(path.join(repo, 'src/code.js'), 'baseline\n');
  await writeFile(path.join(repo, 'src/local.js'), 'baseline local\n');
  await writeFile(path.join(repo, '.gitignore'), 'make-it-work/\n');
  git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'Baseline'); git(repo, 'switch', '-qc', 'feature');
  await beforeCapture(repo);
  const dir = path.join(root, 'make-it-work/DEMO'); await mkdir(dir, { recursive: true });
  let contract;
  if (workspace) {
    await writeFile(path.join(dir, 'miw-run.json'), JSON.stringify({ artifact_naming_version: 1 }));
    git(root, 'clone', repo, 'support');
    const report = 'make-it-work/DEMO/DEMO-repos.md'; await writeFile(path.join(root, report), '# Selected API');
    const selection = await prepareScope(root, { ticket: 'DEMO', report, repos: [{ id: 'api', role: 'product', reason: 'Explicitly retain this starting point', base: 'main', target_branch: 'feature' }] });
    await approveScope(root, 'DEMO', selection.hash, { source: 'user', via: 'chat' }); await runScope(root, 'DEMO', selection.hash);
    contract = await approvedScope(root, 'DEMO', [repo]);
  }
  const plan = '# Plan\n\n## Affected Code\n\n### `app`\n\n| File | Change | Summary |\n| --- | --- | --- |\n| `src/code.js` | Modify | Ticket behavior |\n';
  await writeFile(path.join(dir, 'DEMO-plan.md'), plan); await writeFile(path.join(dir, 'DEMO-spec.md'), '# Accepted spec');
  const fields = { ticket: 'DEMO', handoff_version: '1', controller_version: '1', final_package_version: '1', review_scope_version: '1', review_reconciliation_version: '1', review_baseline_version: '1',
    phase: 'review', status: 'In Progress', autonomy: 'guided', start_time: '2026-11-19T10:00:00Z', execution_mode: 'inline', inline_pause_mode: 'run-straight-through',
    spec: 'make-it-work/DEMO/DEMO-spec.md', spec_hash: digest('# Accepted spec'), plan: 'make-it-work/DEMO/DEMO-plan.md', plan_hash: planHash(plan), plan_version: '1',
    execution: 'passed', review: 'not-started', review_cycle: '1', fix_cycle: '0', fix_plan_round_steps: 'none', fix_plan_dispatch: 'none', replans_used: '0', gate: 'full-suite', pause_reason: 'none',
    branch: 'feature', base: 'main', head: git(repo, 'rev-parse', 'HEAD'), worktree_fingerprint: 'fixture', execute_report: 'none', context_updated: 'none', current_activity: 'none', real_rows_from: '1',
    workspace_snapshot: JSON.stringify([{ root: repo, branch: 'feature' }]), ...(contract ? { artifact_naming_version: '1', workspace_version: '1', workspace_contract: JSON.stringify(contract) } : {}) };
  fields.review_baseline = JSON.stringify({ version: 1, ticket: fields.ticket, runId: fields.start_time, repos: await captureReviewRepos([repo]) });
  const state = path.join(dir, workspace ? 'miw-DEMO-state.md' : 'DEMO-state.md');
  const save = () => writeFile(state, '# Workflow state — DEMO\n\n```\n' + Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n') + '\n```\n\n## Known regressions\n\nNone\n\n## Decided findings\n\nNone\n\n## Context discoveries\n\nNone\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-11-19T10:01:00Z | execute | review | Execution passed |\n');
  await save();
  await writeFile(path.join(repo, 'src/code.js'), 'ticket change\n');
  return { root, repo, dir, state, fields, save };
}
const choice = report => ({ source: 'user', via: 'question', fingerprint: report.fingerprint,
  decisions: report.unresolved.map(id => ({ id, action: 'include', reason: 'User deliberately includes this complete scope', reference: 'Explicit scope question answer' })) });

test('ordinary planned changes and generated context freeze without an extra scope decision', async t => {
  const f = await fixture(t);
  await mkdir(path.join(f.repo, 'docs')); await writeFile(path.join(f.repo, 'docs/generated.md'), 'generated context');
  f.fields.context_updated = 'docs/generated.md'; await f.save();
  const before = git(f.repo, 'diff', '--binary', 'HEAD');
  const report = await inspectReviewScope(f.root, f.state);
  assert.equal(report.ready, true); assert.deepEqual(report.unresolved, []);
  assert.equal(git(f.repo, 'diff', '--binary', 'HEAD'), before);
  assert.equal((await prepareReviewScope(f.root, f.state)).ready, true);
});

test('pre-existing and mixed changes advise consultation without blocking the full review target', async t => {
  const f = await fixture(t, { beforeCapture: async repo => {
    await writeFile(path.join(repo, 'src/code.js'), 'pre-existing code edit\n');
    await writeFile(path.join(repo, 'src/local.js'), 'pre-existing local edit\n');
    await writeFile(path.join(repo, 'notes.md'), 'existing note');
  } });
  await writeFile(path.join(f.repo, 'notes.md'), 'note changed during the run');
  const preview = await prepareReviewScope(f.root, f.state);
  assert.equal(preview.ready, true); assert.ok(preview.review_target);
  const frozen = JSON.parse(await readFile(path.join(f.root, preview.review_target), 'utf8'));
  assert.ok(frozen.repos[0].paths.includes('src/local.js'));
  assert.equal(preview.reconciliation.consultation.recommended, true);
  assert.equal(preview.reconciliation.consultation.blocking, false);
  assert.deepEqual(preview.reconciliation.consultation.options, ['continue-with-full-scope', 'adjust-scope']);
  const report = preview.reconciliation;
  assert.deepEqual(new Set(report.candidates.map(item => item.kind)), new Set(['mixed-tracked', 'pre-existing-tracked', 'changed-starting-untracked']));
  assert.ok(report.candidates.every(item => item.facts === undefined), 'opaque image hashes stay out of model logs');
  await reconcileReviewScope(f.root, f.state, choice(report));
  assert.equal((await prepareReviewScope(f.root, f.state)).ready, true);
  f.fields.review_cycle = '2'; await f.save();
  const again = await inspectReviewScope(f.root, f.state);
  assert.equal(again.ready, true); assert.ok(again.candidates.every(item => item.resolution.source === 'explicit-include'));
  await writeFile(path.join(f.repo, 'src/code.js'), 'another change after inclusion');
  const drifted = await inspectReviewScope(f.root, f.state);
  assert.equal(drifted.unresolved.length, 1); assert.equal(drifted.candidates.find(item => !item.resolution).path, 'src/code.js');
});

test('scope inclusion rejects stale previews, policy defaults and invented/exclusion decisions without changing files', async t => {
  const f = await fixture(t); await writeFile(path.join(f.repo, 'unexpected.md'), 'unknown');
  const report = await inspectReviewScope(f.root, f.state), input = choice(report), before = git(f.repo, 'status', '--porcelain');
  await assert.rejects(reconcileReviewScope(f.root, f.state, { ...input, source: 'policy' }), /explicit user/);
  await assert.rejects(reconcileReviewScope(f.root, f.state, { ...input, fingerprint: 'stale' }), /preview changed/);
  await assert.rejects(reconcileReviewScope(f.root, f.state, { ...input, decisions: [{ ...input.decisions[0], id: 'invented' }] }), /Only listed/);
  await assert.rejects(reconcileReviewScope(f.root, f.state, { ...input, decisions: [{ ...input.decisions[0], action: 'exclude' }] }), /Only listed/);
  assert.equal(git(f.repo, 'status', '--porcelain'), before);
  await assert.rejects(readFile(path.join(f.dir, 'DEMO-scope-decisions.json')), { code: 'ENOENT' });
  await reconcileReviewScope(f.root, f.state, input);
  const journal = path.join(f.dir, 'DEMO-scope-decisions.json'), saved = JSON.parse(await readFile(journal, 'utf8'));
  await reconcileReviewScope(f.root, f.state, input); assert.deepEqual(JSON.parse(await readFile(journal, 'utf8')), saved, 'the same choice is retained without asking or appending twice');
  saved.runId = 'another run'; await writeFile(journal, JSON.stringify(saved));
  const unavailable = await inspectReviewScope(f.root, f.state);
  assert.equal(unavailable.ready, true); assert.equal(unavailable.available, false);
  assert.match(unavailable.warnings[0], /another run/);
  assert.ok((await prepareReviewScope(f.root, f.state)).review_target);
});

test('inherited commits remain advisory and reuse a specifically approved workspace starting point', async t => {
  for (const workspace of [false, true]) {
    const f = await fixture(t, { workspace, beforeCapture: async repo => {
      await writeFile(path.join(repo, 'src/inherited.js'), 'earlier branch work'); git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'Earlier branch work');
    } });
    const report = await inspectReviewScope(f.root, f.state);
    assert.equal(report.candidates.length, 1); assert.equal(report.candidates[0].kind, 'inherited-commit');
    assert.equal(report.ready, true);
    assert.equal(report.unresolved.length, workspace ? 0 : 1);
    if (workspace) {
      assert.equal(report.candidates[0].resolution.source, 'approved-start-point');
      await reconcileReviewScope(f.root, f.state, { source: 'user', via: 'chat', fingerprint: report.fingerprint,
        decisions: [{ id: report.candidates[0].id, action: 'revoke', reason: 'User changed the inherited-scope choice', reference: 'Later user answer' }] });
      const revoked = await inspectReviewScope(f.root, f.state);
      assert.equal(revoked.ready, true); assert.equal(revoked.unresolved.length, 1, 'revocation updates the advisory without blocking');
    }
    else {
      await reconcileReviewScope(f.root, f.state, choice(report));
      assert.equal((await inspectReviewScope(f.root, f.state)).ready, true);
    }
  }
});

test('default exclusion preserves inclusions and a later explicit exclusion needs no separate revocation', async t => {
  const f = await fixture(t, { beforeCapture: async repo => {
    await writeFile(path.join(repo, 'keep.md'), 'existing kept note'); await writeFile(path.join(repo, 'omit.md'), 'existing omitted note');
  } });
  const preview = await inspectReviewScope(f.root, f.state), kept = preview.candidates.find(item => item.path === 'keep.md');
  await reconcileReviewScope(f.root, f.state, { source: 'user', via: 'chat', fingerprint: preview.fingerprint,
    decisions: [{ id: kept.id, action: 'include', reason: 'User includes this note', reference: 'Earlier scope answer' }] });
  const excluded = await excludePreexisting(f.root, f.state);
  assert.deepEqual(excluded.repos[0].excluded, ['omit.md']);
  const current = await inspectReviewScope(f.root, f.state); assert.equal(current.ready, true);
  await writeFile(path.join(f.dir, 'DEMO-scope-decisions.json'), '{bad');
  const unknownChoices = await excludePreexisting(f.root, f.state);
  assert.deepEqual(unknownChoices.repos, []); assert.ok(unknownChoices.warnings.length);
  assert.deepEqual((await excludePreexisting(f.root, f.state, { paths: ['keep.md'] })).repos[0].excluded, ['keep.md']);
  assert.equal(await readFile(path.join(f.repo, 'keep.md'), 'utf8'), 'existing kept note');
});

test('unresolved scope and later receipt changes do not invalidate a full clean review', async t => {
  const f = await fixture(t); await writeFile(path.join(f.repo, 'unexpected.md'), 'deliberate extra work');
  const preview = await inspectReviewScope(f.root, f.state);
  assert.equal(preview.unresolved.length, 1);
  const target = await prepareReviewScope(f.root, f.state);
  const input = { version: 1, ticket: 'DEMO', branch: 'feature', commit: git(f.repo, 'rev-parse', 'HEAD'), working_tree: true,
    coverage: 'Synthetic full-scope review evidence', findings: [], repo_roots: { app: f.repo },
    review_target: target.review_target, review_target_sha256: target.sha256,
    review_scope: [{ repo: 'app', base: 'main', scope: 'branch', paths: target.repos[0].paths }], ui_verification: { status: 'not-applicable', note: 'Backend fixture' },
    implement: { handoff_version: 1, plan_version: 1, review_cycle: 1, review_scope_version: 1 } };
  await writeReview(f.root, input); assert.equal((await checkReviewScope(f.root, f.state)).covered, true);
  await reconcileReviewScope(f.root, f.state, choice(preview));
  const refreshed = await prepareReviewScope(f.root, f.state);
  assert.equal(refreshed.sha256, target.sha256, 'advisory-only preparation preserves the reviewed target bytes');
  assert.equal((await checkReviewScope(f.root, f.state)).covered, true);
  await rm(path.join(f.dir, 'DEMO-scope-decisions.json'));
  assert.equal((await checkReviewScope(f.root, f.state)).covered, true);
  await writeFile(path.join(f.dir, 'DEMO-scope-decisions.json'), '{bad');
  const original = f.fields.review_baseline;
  f.fields.review_baseline = '{bad'; await f.save();
  const checked = await checkReviewScope(f.root, f.state);
  assert.equal(checked.covered, true); assert.equal(checked.reconciliation.available, false);
  f.fields.review_baseline = original; await f.save();
  await writeFile(path.join(f.repo, 'src/code.js'), 'changed after review');
  await assert.rejects(checkReviewScope(f.root, f.state), /not fully reviewed/);
});

test('Lightweight report paths are relevance hints and never waive pre-existing tracked work', async t => {
  const f = await fixture(t, { beforeCapture: repo => writeFile(path.join(repo, 'src/local.js'), 'existing local edit') });
  f.fields.mode = 'lightweight'; f.fields.plan = 'none'; f.fields.plan_hash = 'none';
  f.fields.implementation_report = 'make-it-work/DEMO/DEMO-lightweight.md';
  await writeFile(path.join(f.dir, 'DEMO-lightweight.md'), '# Implementation report');
  f.fields.scope_implementation_paths = JSON.stringify({ spec_hash: f.fields.spec_hash, plan_version: '1', report: f.fields.implementation_report,
    report_sha256: digest('# Implementation report'), paths: ['src/code.js', 'src/local.js'] });
  await f.save();
  const report = await inspectReviewScope(f.root, f.state);
  assert.equal(report.candidates.length, 1); assert.equal(report.candidates[0].kind, 'pre-existing-tracked');
  assert.ok(report.files.find(item => item.path === 'src/code.js').expected);
});

test('old saved runs keep their target contract and plan edits cannot silently widen new scope', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.dir, 'DEMO-plan.md'), '# Changed plan');
  const stale = await inspectReviewScope(f.root, f.state);
  assert.equal(stale.ready, true); assert.equal(stale.available, false);
  assert.match(stale.warnings[0], /Accepted plan changed/);
  assert.deepEqual(stale.files, [], 'stale hints never imply expected paths');
  assert.ok((await prepareReviewScope(f.root, f.state)).review_target);
  delete f.fields.review_reconciliation_version; await f.save();
  const legacy = await inspectReviewScope(f.root, f.state);
  assert.equal(legacy.enabled, false); assert.equal(legacy.ready, true);
  const target = await prepareReviewScope(f.root, f.state);
  assert.ok(target.review_target); assert.equal(target.reconciliation, undefined);
});

test('replaced starting history is reported without silently changing the branch or granting inclusion', async t => {
  const f = await fixture(t, { beforeCapture: async repo => {
    await writeFile(path.join(repo, 'src/inherited.js'), 'earlier work'); git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'Earlier work');
  } });
  git(f.repo, 'reset', '--hard', 'main'); await writeFile(path.join(f.repo, 'src/code.js'), 'new ticket work');
  const head = git(f.repo, 'rev-parse', 'HEAD'), status = git(f.repo, 'status', '--porcelain');
  const report = await inspectReviewScope(f.root, f.state);
  assert.equal(report.ready, true); assert.ok(report.candidates.some(item => item.kind === 'history-diverged'));
  assert.equal(git(f.repo, 'rev-parse', 'HEAD'), head); assert.equal(git(f.repo, 'status', '--porcelain'), status);
});

test('starting-point approval does not accept older commits exposed by moving the base backwards', async t => {
  const f = await fixture(t, { workspace: true, beforeCapture: async repo => {
    git(repo, 'switch', 'main'); await writeFile(path.join(repo, 'src/base-later.js'), 'base advancement');
    git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'Advance base'); git(repo, 'switch', 'feature'); git(repo, 'merge', '--ff-only', 'main');
    await writeFile(path.join(repo, 'src/inherited.js'), 'accepted inherited work'); git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'Inherited work');
  } });
  const newlyExposed = git(f.repo, 'rev-parse', 'main'); git(f.repo, 'update-ref', 'refs/heads/main', 'main^');
  const report = await inspectReviewScope(f.root, f.state);
  assert.equal(report.unresolved.length, 1);
  assert.equal(report.candidates.find(item => !item.resolution).commit, newlyExposed);
});


test('non-Autopilot modes can consult while Autopilot proceeds with disclosed assumptions', async t => {
  const f = await fixture(t); await writeFile(path.join(f.repo, 'unexpected.md'), 'retained full scope');
  for (const autonomy of ['guided', 'autonomous', 'autopilot']) {
    f.fields.autonomy = autonomy; await f.save();
    const report = await inspectReviewScope(f.root, f.state);
    assert.equal(report.ready, true); assert.equal(report.unresolved.length, 1);
    assert.equal(report.consultation.recommended, autonomy !== 'autopilot');
    assert.equal(report.consultation.blocking, false);
    assert.match(report.assumption, /Retain the full delivery scope/);
    const target = await prepareReviewScope(f.root, f.state);
    assert.ok(target.repos[0].paths.includes('unexpected.md'));
    await assert.rejects(readFile(path.join(f.dir, 'DEMO-scope-decisions.json')), { code: 'ENOENT' });
  }
});

test('missing, corrupt and unsupported review metadata stay advisory without inventing provenance', async t => {
  const f = await fixture(t);
  const original = { ...f.fields };
  for (const change of [{ review_baseline: '{bad' }, { review_baseline: undefined }, { review_baseline_version: 'future' }, { review_reconciliation_version: 'future' }]) {
    Object.assign(f.fields, original, change);
    for (const [key, value] of Object.entries(f.fields)) if (value === undefined) delete f.fields[key];
    await f.save();
    const report = await inspectReviewScope(f.root, f.state);
    assert.equal(report.ready, true); assert.equal(report.available, false);
    assert.deepEqual(report.files, []); assert.ok(report.warnings.length);
    const target = await prepareReviewScope(f.root, f.state);
    assert.ok(target.review_target); assert.ok(target.repos[0].paths.includes('src/code.js'));
  }
});
