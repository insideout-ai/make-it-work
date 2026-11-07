import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
for (const variant of ['vendor-contract', 'prior-notes', 'boundary-conflict', 'boundary-supported']) {
  test(`fact handoff ${variant}: executable evidence supports the intended planning decision`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'fact-handoff-fixture-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const fixture = path.join(import.meta.dirname, 'plan-the-work', `plan-facts-${variant}`, 'fixture.sh');
    execFileSync('bash', [fixture], { cwd: root, env, stdio: 'pipe' });
    const prefix = path.join(root, 'make-it-work/FACT-500/FACT-500');
    const baseline = JSON.parse(await readFile(`${prefix}-fact-baseline.json`));
    const spec = await readFile(`${prefix}-spec.md`, 'utf8');
    const evaluate = (code) => JSON.parse(execFileSync(process.execPath, ['-e', code], { cwd: root, env, encoding: 'utf8' }));
    if (variant === 'vendor-contract') {
      // Test the actual local contract's predicates, not HTTP status alone.
      const contract = await readFile(path.join(root, 'docs/vendor-create.md'), 'utf8');
      assert.match(contract, /2xx.*body\.status exactly REQUIRES_ACTION.*nonempty string body\.payment_id/);
      assert.match(contract, /non-object body.*non-2xx/);
      assert.match(spec, /docs\/vendor-create\.md/);
      const cases = [
        { statusCode: 201, body: { status: 'REQUIRES_ACTION', payment_id: 'p1' } },
        { statusCode: 200, body: { status: 'PENDING', payment_id: 'p1' } },
        { statusCode: 200, body: { status: 'REQUIRES_ACTION' } },
        { statusCode: 200, body: null },
        { statusCode: 200 },
        { statusCode: 503, body: { status: 'REQUIRES_ACTION', payment_id: 'p1' } },
      ];
      const success = ({ statusCode, body }) => statusCode >= 200 && statusCode < 300 && body?.status === 'REQUIRES_ACTION' && typeof body.payment_id === 'string' && body.payment_id.length > 0;
      assert.deepEqual(cases.map(success), [true, false, false, false, false, false]);
      assert.notDeepEqual(cases.map(({ statusCode }) => statusCode >= 200 && statusCode < 300), cases.map(success));
    } else if (variant === 'prior-notes') {
      const observed = JSON.parse(execFileSync('python3', ['-c', `import json, sqlite3
from pathlib import Path
c=sqlite3.connect(':memory:')
c.execute('PRAGMA foreign_keys = ON')
c.executescript(Path('db/schema.sql').read_text())
c.executescript(Path('db/current.sql').read_text())
try:
 c.execute("INSERT INTO gateways VALUES (2,7,'alternate')")
 reuse=True
except sqlite3.IntegrityError:
 reuse=False
c.executescript(Path('db/alternate-proposal.sql').read_text())
print(json.dumps({'reuse':reuse, 'alternateType':c.execute("SELECT type_id FROM gateways WHERE provider='alternate'").fetchone()[0]}))
`], { cwd: root, encoding: 'utf8' }));
      assert.deepEqual(observed, { reuse: false, alternateType: 8 });
      const note = await readFile(path.join(root, 'docs/research-notes.md'), 'utf8');
      assert.match(note, /reuse gateway type 7/);
      assert.match(note, /schema was not inspected/);
      assert.match(spec, /db\/alternate-proposal\.sql/);
    } else {
      const observed = evaluate(`const {doPreChecks}=require('./reference/prechecks');
const {createPayment}=require('./reference/provider');
let internal;try{doPreChecks({})}catch(e){internal=e.code}
console.log(JSON.stringify({internal,empty:createPayment({}),blank:createPayment({reference:' '}),valid:createPayment({reference:'r1'})}));`);
      assert.deepEqual(observed, { internal: 'VALIDATION_ERROR', empty: { ok: false, code: 'FAILOVER' }, blank: { ok: false, code: 'FAILOVER' }, valid: { ok: true, reference: 'r1' } });
      assert.match(spec, /AC1:.*observable results.*reference\/provider\.js/);
      const expectedCode = variant === 'boundary-conflict' ? 'VALIDATION_ERROR' : 'FAILOVER';
      assert.ok(spec.includes(`AC2: For missing or blank reference, return {ok:false, code:'${expectedCode}'}`));
      assert.equal(expectedCode === observed.empty.code, variant === 'boundary-supported');
      assert.match(await readFile(path.join(root, 'docs/original-ticket.md'), 'utf8'), /VALIDATION_ERROR/);
    }
    assert.equal(spawnSync('npm', ['test'], { cwd: root, env }).status, 0);
    for (const [file, hash] of Object.entries(baseline.protectedFiles)) assert.equal(createHash('sha256').update(await readFile(path.join(root, file))).digest('hex'), hash);
    assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }), '');
    assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), baseline.head);
    const repeated = spawnSync('bash', [fixture], { cwd: root, env, encoding: 'utf8' });
    assert.notEqual(repeated.status, 0);
    assert.match(repeated.stderr, /existing repository/);
  });
}
