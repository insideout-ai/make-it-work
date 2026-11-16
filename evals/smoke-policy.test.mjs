import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { beginSmoke } from './smoke-policy.mjs';

async function fixture(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'miw-smoke-policy-'));
  try { await run({ directory, pr: '123', ready: true, names: ['a', 'b'], commit: 'first', report: 'initial-report' }); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
const summary = cases => ({ cases: Object.entries(cases).map(([name, status]) => ({ name, status })),
  repoUnchanged: true, selectionComplete: true, completedAt: '2026-11-16T12:00:00Z', costUsd: 1 });

test('smoke requires an explicit PR and readiness declaration', () => fixture(async options => {
  await assert.rejects(beginSmoke({ ...options, pr: undefined }), /--pr=NUMBER/);
  await assert.rejects(beginSmoke({ ...options, ready: false }), /--ready/);
  await assert.rejects(beginSmoke({ ...options, pr: '../123' }), /--pr=NUMBER/);
  await assert.rejects(beginSmoke({ ...options, retryFailed: true }), /no initial smoke/);
}));

test('one full run per PR, failed cases only on later commits, passing evidence retained', () => fixture(async options => {
  const first = await beginSmoke(options);
  assert.deepEqual(first.selected, ['a', 'b']);
  assert.equal(await first.finish(summary({ a: 'passed', b: 'failed' })), false);
  await first.release();
  await assert.rejects(beginSmoke({ ...options, commit: 'fix' }), /already started/);
  const retry = await beginSmoke({ ...options, retryFailed: true, commit: 'fix', report: 'retry-report' });
  assert.deepEqual(retry.selected, ['b']);
  assert.equal(await retry.finish(summary({ b: 'passed' })), true);
  await retry.release();
  const ledger = JSON.parse(await readFile(first.file));
  assert.equal(ledger.cases.a.commit, 'first');
  assert.equal(ledger.cases.b.commit, 'fix');
  assert.equal(ledger.attempts.length, 2);
  await assert.rejects(beginSmoke({ ...options, retryFailed: true }), /all smoke cases already passed/);
  const other = await beginSmoke({ ...options, pr: '124' });
  assert.deepEqual(other.selected, ['a', 'b']);
  await other.release();
}));

test('concurrent attempts are blocked and interrupted attempts must resume', () => fixture(async options => {
  const first = await beginSmoke(options);
  await assert.rejects(beginSmoke(options), /already locked/);
  await first.record({ name: 'a', status: 'passed' }, true);
  await first.release(); // Simulate termination before a final report.
  await assert.rejects(beginSmoke(options), /already started/);
  const retry = await beginSmoke({ ...options, retryFailed: true });
  assert.deepEqual(retry.selected, ['b']);
  await retry.release();
}));

test('missing results and checkout mutations never become passing evidence', () => fixture(async options => {
  const first = await beginSmoke(options);
  await first.finish({ ...summary({ a: 'passed' }), selectionComplete: false });
  await first.release();
  const retry = await beginSmoke({ ...options, retryFailed: true });
  assert.deepEqual(retry.selected, ['b']);
  assert.equal(await retry.finish({ ...summary({ b: 'passed' }), repoUnchanged: false }), false);
  await retry.release();
  await assert.rejects(beginSmoke({ ...options, retryFailed: true, names: ['a', 'b', 'c'] }), /inventory or ledger changed/);
}));
