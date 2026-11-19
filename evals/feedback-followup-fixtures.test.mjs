import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { gradeHeadlessLocal, parseGrader } from './grade-headless.mjs';

for (const scenario of ['gaps', 'answered', 'reported']) {
  test(`followup-${scenario}: fixture and graders protect inputs and reject private ledger identifiers`, async t => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'feedback-followup-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const dir = path.join(import.meta.dirname, 'feedback-on-session', `feedback-maintainer-followup-${scenario}`);
    const fixture = path.join(dir, 'fixture.sh');
    const repo = path.dirname(import.meta.dirname);
    const before = await readFile(path.join(repo, 'docs/workflow-findings.md'), 'utf8');
    const refused = spawnSync('bash', [fixture], { cwd: repo, encoding: 'utf8' });
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /refusing to seed/);
    assert.equal(await readFile(path.join(repo, 'docs/workflow-findings.md'), 'utf8'), before);
    execFileSync('bash', [fixture], { cwd: root, stdio: 'pipe' });
    const grader = async name => parseGrader(await readFile(path.join(dir, 'graders', name), 'utf8'), name);
    const grade = rule => gradeHeadlessLocal(rule, { fixtureDir: root });
    const ledger = path.join(root, 'docs/workflow-findings.md');
    const clean = await readFile(ledger, 'utf8');
    const sanitization = await grader('sanitized-ledger.md');
    assert.equal((await grade(sanitization)).passed, true);
    for (const privateName of ['ORBIT-742', 'orbit-service']) {
      await writeFile(ledger, clean + `\nReported answer names ${privateName}.\n`);
      assert.equal((await grade(sanitization)).passed, false);
    }
    await rm(ledger);
    assert.equal((await grade(sanitization)).passed, false, 'Missing ledger cannot pass');
    for (const name of ['input-unchanged.md', 'source-unchanged.md']) {
      const unchanged = await grader(name);
      assert.equal((await grade(unchanged)).passed, true);
      await writeFile(path.join(root, unchanged.path), 'Unapproved rewrite\n');
      assert.equal((await grade(unchanged)).passed, false);
    }
  });
}
