import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseQuestions, resolveQuestions } from '../scripts/questions.mjs';

const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
for (const variant of ['mixed-sources', 'pm-followup', 'stale-recommendation']) {
  test(`decision context ${variant}: source records, question state and current export evidence remain distinct`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'decision-context-fixture-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const fixture = path.join(import.meta.dirname, 'close-the-gaps', `close-the-gaps-${variant}`, 'fixture.sh');
    execFileSync('bash', [fixture], { cwd: root, env, stdio: 'pipe' });
    const prefix = path.join(root, 'make-it-work/DEC-600/DEC-600');
    const questions = await readFile(`${prefix}-questions.md`, 'utf8');
    const resolved = resolveQuestions(parseQuestions(questions));
    assert.deepEqual(resolved.conflicts, []);
    if (variant === 'mixed-sources') {
      assert.deepEqual(resolved.answers.map(q => q.status), ['answered', 'answered', 'blank', 'answered']);
      assert.deepEqual(resolved.answers.map(q => q.answer), ['Truncate to the first 100 and warn', 'CSV-only for now', null, 'Account owners only']);
      assert.match(questions, /Q1: user via live chat/);
      assert.match(questions, /Q2: PM Taylor via Slack.*D_SYNTHETIC\/1793966400\.002/);
      assert.match(questions, /Q4:.*no author or role recorded/);
    } else if (variant === 'pm-followup') {
      assert.deepEqual(resolved.answers.map(q => q.status), ['answered', 'answered']);
      assert.match(questions, /Q1 and Q2 below were answered by the user via live chat/);
      assert.match(questions, /Delivery status: sent/);
      assert.match(questions, /no PM replies as of .*not checked since/);
      assert.match(questions, /Resolution follow-up: not sent/);
      assert.match(questions, /Status:\*\* Awaiting Answers/);
      assert.equal(resolved.tbd_items, 0);
    } else {
      assert.deepEqual(resolved.answers.map(q => q.status), ['blank', 'blank']);
      const current = JSON.parse(execFileSync(process.execPath, ['-e', `
const {fetchExportPage}=require('./src/orders/export');
const orders=Array.from({length:150},(_,i)=>i+1);
const pages=[fetchExportPage(orders,{offset:0}),fetchExportPage(orders,{offset:100}),fetchExportPage(orders,{cursor:'next'})];
console.log(JSON.stringify({total:orders.length,pages,distinct:new Set(pages.flat()).size}));
`], { cwd: root, env, encoding: 'utf8' }));
      assert.equal(current.total, 150);
      assert.equal(current.pages[0].length, 100);
      assert.deepEqual(current.pages[0], current.pages[1]);
      assert.deepEqual(current.pages[0], current.pages[2]);
      assert.equal(current.distinct, 100);
      assert.match(questions, /Automatically paginate to export every order \(Recommended\)/);
      const old = await readFile(path.join(root, 'docs/prior-session.md'), 'utf8');
      assert.match(old, /older claim.*supported cursors/);
      assert.match(old, /Q2 recommended CSV-only/);
      assert.match(await readFile(path.join(root, 'docs/provider-contract.md'), 'utf8'), /no cursor, offset/);
    }
    const baseline = JSON.parse(await readFile(`${prefix}-decision-baseline.json`));
    assert.equal(baseline.variant, variant);
    for (const [file, hash] of Object.entries(baseline.protectedFiles)) assert.equal(createHash('sha256').update(await readFile(path.join(root, file))).digest('hex'), hash);
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    assert.equal(git('status', '--porcelain'), '');
    assert.equal(git('rev-parse', 'HEAD'), baseline.head);
    assert.equal(git('branch', '--show-current'), baseline.branch);
    const repeated = spawnSync('bash', [fixture], { cwd: root, env, encoding: 'utf8' });
    assert.notEqual(repeated.status, 0);
    assert.match(repeated.stderr, /existing repository/);
  });
}
