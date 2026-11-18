import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { branchTicket, inspectBranch } from './branch-ticket.mjs';

test('only a clearly different ticket triggers a mismatch', () => {
  for (const branch of ['feature/OLD-42-fix', 'old-42', 'feature/OLD-42-OTHER-8']) {
    assert.equal(branchTicket(branch, 'APP-12', 'main').mismatch, true, branch);
  }
  for (const branch of ['main', '', 'feature/APP-12-fix', 'app-12', 'feature/OLD-42-APP-12', 'cleanup', 'feature/APP-123-fix', 'feature/OLD-42abc']) {
    assert.equal(branchTicket(branch, branch.includes('APP-123') ? 'APP-123' : 'APP-12', 'main').mismatch, false, branch);
  }
  assert.equal(branchTicket('APP-123', 'APP-12', 'main').mismatch, true);
  assert.equal(branchTicket('OLD-42', 'pasted-requirements', 'main').mismatch, false);
  assert.equal(branchTicket('OLD-42', 'APP-12', 'OLD-42').mismatch, false);
});

test('CLI detection preserves HEAD, index, branch and dirty user files', async t => {
  const repo = await realpath(await mkdtemp(path.join(os.tmpdir(), 'branch-ticket-')));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const git = (...argv) => execFileSync('git', ['-C', repo, ...argv], { encoding: 'utf8', stdio: 'pipe' });
  git('init', '-b', 'main');
  await writeFile(path.join(repo, 'user.txt'), 'original');
  git('add', 'user.txt');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-m', 'initial');
  git('switch', '-c', 'feature/OLD-42-fix');
  await writeFile(path.join(repo, 'user.txt'), 'staged change');
  git('add', 'user.txt');
  await writeFile(path.join(repo, 'user.txt'), 'unstaged change');
  await writeFile(path.join(repo, 'notes.txt'), 'user notes');
  const snapshot = async () => ({ head: git('rev-parse', 'HEAD'), status: git('status', '--porcelain=v1'),
    index: await readFile(path.join(repo, '.git/index')), contents: await readFile(path.join(repo, 'user.txt'), 'utf8') });
  const before = await snapshot();
  const result = JSON.parse(execFileSync(process.execPath, [new URL('./branch-ticket.mjs', import.meta.url).pathname,
    'check', '--repo', repo, '--ticket', 'APP-12', '--base', 'main'], { encoding: 'utf8' }));
  assert.equal(result.mismatch, true);
  assert.deepEqual(result.branch_tickets, ['OLD-42']);
  assert.equal(inspectBranch(repo, 'OLD-42', 'main').mismatch, false);
  assert.deepEqual(await snapshot(), before);
  assert.equal(git('branch', '--show-current').trim(), 'feature/OLD-42-fix');
  assert.equal(await readFile(path.join(repo, 'notes.txt'), 'utf8'), 'user notes');
});
