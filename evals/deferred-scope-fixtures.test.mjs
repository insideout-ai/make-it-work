import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
for (const [name, proposedType] of [['plan-the-work-deferred-wiring', 8], ['plan-the-work-safe-deferral', 7]]) {
  test(`${name}: actual schema, callback and routing contracts distinguish unsafe assumptions from safe deferral`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'deferred-scope-fixture-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const fixture = path.join(import.meta.dirname, 'plan-the-work', name, 'fixture.sh');
    execFileSync('bash', [fixture], { cwd: root, env, stdio: 'pipe' });
    const query = (args = []) => JSON.parse(execFileSync('python3', ['gateway-db/query.py', ...args], { cwd: root, encoding: 'utf8' }));
    assert.deepEqual(query().gateways, [[1, 7, 'legacy', 1]]);
    const proposed = query(['--proposal']);
    assert.deepEqual(proposed.gateways.find(row => row[2] === 'alternate'), [2, proposedType, 'alternate', 0]);
    const reuse = JSON.parse(execFileSync('python3', ['-c', `import sqlite3, json
from pathlib import Path
c=sqlite3.connect(':memory:')
c.executescript(Path('gateway-db/schema.sql').read_text())
c.executescript(Path('gateway-db/seed.sql').read_text())
try:
 c.execute("INSERT INTO gateways VALUES (2, 7, 'alternate', 0)")
 print(json.dumps({'reuse':True}))
except sqlite3.IntegrityError:
 print(json.dumps({'reuse':False}))
`], { cwd: root, encoding: 'utf8' }));
    assert.equal(reuse.reuse, proposedType === 7);
    const callback = JSON.parse(execFileSync(process.execPath, ['-e', `console.log(JSON.stringify(require('./src/core').handleCallback([{id:20,reference:'r2',gatewayTypeId:${proposedType}}],'r2')))`], { cwd: path.join(root, 'connector-app'), env, encoding: 'utf8' }));
    assert.deepEqual(callback, proposedType === 7 ? { ok: true, id: 20 } : { ok: false, code: 'NOT_FOUND' });
    const routes = JSON.parse(await readFile(path.join(root, 'routing-config/routes.json')));
    for (const environment of ['sandbox', 'production']) assert.equal(Boolean(routes[environment][proposedType]), proposedType === 7);
    assert.equal(spawnSync('npm', ['test'], { cwd: path.join(root, 'connector-app'), env }).status, 0);
    const baseline = JSON.parse(await readFile(path.join(root, 'connector-app/make-it-work/PAY-300/PAY-300-scope-baseline.json')));
    for (const [file, hash] of Object.entries(baseline.protectedFiles)) assert.equal(createHash('sha256').update(await readFile(path.join(root, file))).digest('hex'), hash);
    for (const repo of ['gateway-db', 'routing-config']) assert.equal(execFileSync('git', ['-C', repo, 'status', '--porcelain'], { cwd: root, encoding: 'utf8' }), '');
    const repeated = spawnSync('bash', [fixture], { cwd: root, env, encoding: 'utf8' });
    assert.notEqual(repeated.status, 0);
    assert.match(repeated.stderr, /existing repository/);
  });
}
