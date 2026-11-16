import { artifactJoin } from '../../../scripts/lib/artifact-path.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { implementationBaseline, prematureImplementation } from './implementation-guard.mjs';

async function fixture(t) {
  const root = await mkdtemp(artifactJoin(os.tmpdir(), 'implementation-guard-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git('init', '-q', '-b', 'feature');
  await writeFile(artifactJoin(root, 'app.js'), 'original');
  git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Baseline');
  // Existing local edits must not be mistaken for this run's work.
  await writeFile(artifactJoin(root, 'app.js'), 'existing dirty edit');
  return { root, git, initialized: { implementation_baseline: await implementationBaseline([root]) } };
}
const state = (phase = 'context-check', audit = []) => ({ fields: { phase }, audit });

test('baseline preserves pre-existing edits and ignores workflow/documentation artifacts', async (t) => {
  const { root, initialized } = await fixture(t);
  assert.equal(await prematureImplementation(initialized, state()), null);
  for (const directory of ['make-it-work/DEMO', '.claude/rules', 'docs']) {
    await mkdir(artifactJoin(root, directory), { recursive: true });
    await writeFile(artifactJoin(root, directory, 'artifact.json'), '{}');
  }
  await writeFile(artifactJoin(root, 'README.md'), '# Spec notes');
  assert.equal(await prematureImplementation(initialized, state('plan')), null);
});

test('tracked, staged, deleted and untracked application changes remain visible across checkpoint rewrites', async (t) => {
  const { root, git, initialized } = await fixture(t);
  await writeFile(artifactJoin(root, 'app.js'), 'premature edit');
  assert.match(await prematureImplementation(initialized, state('close-the-gaps')), /Application files changed/);
  git('add', 'app.js');
  assert.match(await prematureImplementation(initialized, state('spec-approval')), /Application files changed/);
  await rm(artifactJoin(root, 'app.js'));
  assert.match(await prematureImplementation(initialized, state('plan-approval')), /Application files changed/);
  await writeFile(artifactJoin(root, 'app.js'), 'existing dirty edit');
  git('reset', '-q', 'HEAD', '--', 'app.js');
  await writeFile(artifactJoin(root, 'new-test.js'), 'new assertion');
  assert.match(await prematureImplementation(initialized, state()), /Application files changed/);
});

test('implementation authorization releases the baseline for review, fixes and replans', async (t) => {
  const { root, initialized } = await fixture(t);
  await writeFile(artifactJoin(root, 'app.js'), 'implemented');
  for (const phase of ['execute', 'lightweight', 'review', 'fix-plan', 'final-sync', 'complete']) {
    assert.equal(await prematureImplementation(initialized, state(phase)), null);
  }
  for (const route of ['execute', 'lightweight']) {
    assert.equal(await prematureImplementation(initialized, state('plan', [{ to: route }])), null);
  }
  assert.equal(await prematureImplementation({}, state()), null, 'older initializer output stays compatible');
});

test('every approved repository is covered and untracked symlinks hash link text', async (t) => {
  const first = await fixture(t);
  const second = await fixture(t);
  await symlink('/does-not-exist', artifactJoin(second.root, 'linked.js'));
  const initialized = { implementation_baseline: await implementationBaseline([first.root, second.root]) };
  assert.equal(await prematureImplementation(initialized, state()), null);
  await writeFile(artifactJoin(second.root, 'app.js'), 'changed in sibling');
  assert.match(await prematureImplementation(initialized, state()), /Application files changed/);
  assert.equal(await readFile(artifactJoin(first.root, 'app.js'), 'utf8'), 'existing dirty edit');
});
