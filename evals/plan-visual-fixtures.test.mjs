import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validatePlan } from '../scripts/validate-plan.mjs';
import { parseSteps } from '../scripts/lib/plan.mjs';

for (const variant of ['flow', 'simple', 'amend']) {
  test(`visual-${variant} seeds an isolated fixture with immutable comparison inputs`, async t => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'plan-visual-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    execFileSync('bash', [path.resolve(`evals/plan-the-work/visual-${variant}/fixture.sh`)], { cwd: root });
    const read = file => readFile(path.join(root, file), 'utf8');
    for (const [file, baseline] of [
      ['src/notifications/sendReminder.js', '.eval-reminder.js'],
      ['make-it-work/VIS-1/VIS-1-spec.md', '.eval-spec.md'],
      ['README.md', '.eval-readme.md'],
    ]) assert.equal(await read(file), await read(baseline));
    assert.equal(execFileSync('git', ['ls-files', 'make-it-work'], { cwd: root, encoding: 'utf8' }), '');
    if (variant === 'simple') assert.match(await read('.eval-spec.md'), /Change only the README heading/);
    else {
      // The accepted mute behavior is actually absent from the fixture's current code.
      const { sendReminder } = await import(path.join(root, 'src/notifications/sendReminder.js'));
      let sends = 0;
      assert.equal(sendReminder({ status: 'open', dueAt: 0, ownerMuted: true }, { send() { sends += 1; } }), true);
      assert.equal(sends, 1);
    }
    if (variant === 'amend') {
      const plan = await read('make-it-work/VIS-1/VIS-1-plan.md');
      assert.equal(plan, await read('.eval-original-plan.md'));
      assert.deepEqual(validatePlan(plan).errors, []);
      assert.equal(parseSteps(plan).length, 1);
      assert.match(plan, /Step 1 of 1 complete/);
      assert.doesNotMatch(plan.split('## Visual Overview')[1].split('## Execution Status')[0], /muted/i);
    }
  });
}
