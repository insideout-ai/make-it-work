import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../scripts/lib/artifacts.mjs';

const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
for (const variant of ['unsupported', 'supported', 'low-risk']) {
  test(`${variant} assumption fixture preserves planning boundaries and separates header forwarding from provider behavior`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'assumption-fixture-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const fixture = path.join(import.meta.dirname, 'plan-the-work', `assumption-${variant}`, 'fixture.sh');
    execFileSync('bash', [fixture], { cwd: root, env, stdio: 'pipe' });
    const baseline = JSON.parse(await readFile(path.join(root, 'make-it-work/ASSUME-1/ASSUME-1-smoke-baseline.json')));
    assert.equal(baseline.variant, variant);
    for (const [file, hash] of Object.entries(baseline.hashes)) assert.equal(digest(await readFile(path.join(root, file))), hash);
    assert.equal(JSON.parse(await readFile(path.join(root, 'package.json'))).scripts?.test, undefined);
    // Two possible server behaviors accept the exact same request headers.
    // This demonstrates why the wrapper alone cannot prove replay safety.
    const observed = JSON.parse(execFileSync(process.execPath, ['-e', `
      const { submitTransfer } = require('./src/transfer');
      async function exercise(deduplicates) {
        let accepted = 0, calls = 0; const seen = new Set(), requests = [];
        const client = { async post(route, payload, options) {
          calls++; requests.push({ route, payload, options });
          const key = options.headers['Idempotency-Key'];
          if (!deduplicates || !seen.has(key)) { accepted++; seen.add(key); }
          if (calls === 1) throw new Error('ETIMEDOUT after acceptance');
          return { id: 'transfer-1' };
        } };
        try { await submitTransfer(client, { amount: 12 }, 'operation-1'); } catch {}
        await submitTransfer(client, { amount: 12 }, 'operation-1');
        return { accepted, requests };
      }
      Promise.all([exercise(false), exercise(true)]).then(([unsafe, safe]) => console.log(JSON.stringify({ unsafe, safe })));
    `], { cwd: root, env, encoding: 'utf8' }));
    assert.equal(observed.unsafe.accepted, 2);
    assert.equal(observed.safe.accepted, 1);
    assert.deepEqual(observed.unsafe.requests, observed.safe.requests);
    assert.equal(observed.safe.requests[0].options.apiVersion, 'v2');
    assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }), '');
    const second = spawnSync('bash', [fixture], { cwd: root, env, encoding: 'utf8' });
    assert.notEqual(second.status, 0); assert.match(second.stderr, /existing repository/);
    for (const [file, hash] of Object.entries(baseline.hashes)) assert.equal(digest(await readFile(path.join(root, file))), hash);
  });
}
