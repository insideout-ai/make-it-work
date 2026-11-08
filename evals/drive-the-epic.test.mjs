import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { gradeHeadlessLocal, parseGrader, transcriptContext } from './grade-headless.mjs';
import { inspectEpicRun, updateEpicRun } from '../scripts/epic-workflow.mjs';
const base = path.join(path.dirname(fileURLToPath(import.meta.url)), 'drive-the-epic');
async function fixture(t, name) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'drive-epic-eval-')); t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync('bash', [path.join(base, name, 'fixture.sh')], { cwd: root });
  const run = path.basename((await readFile(path.join(root, 'run-location.txt'), 'utf8')).trim());
  return { root, run, context: transcriptContext(JSON.stringify({ type: 'result', result: 'Local grader regression fixture; no model was run.' }), root) };
}
async function grade(f, name, grader) {
  return gradeHeadlessLocal(parseGrader(await readFile(path.join(base, name, 'graders', grader), 'utf8'), grader), f.context);
}
test('Jira-unavailable eval grader rejects an unstopped run and accepts a real controller stop', async (t) => {
  const f = await fixture(t, 'jira-unavailable');
  assert.equal((await grade(f, 'jira-unavailable', 'honest-stop.md')).passed, false);
  await updateEpicRun({ root: f.root, run: f.run, event: { id: 'unavailable', type: 'intake' } });
  assert.equal((await grade(f, 'jira-unavailable', 'honest-stop.md')).passed, true);
});
test('review eval grader requires a real saved pending review and absence of premature slice files', async (t) => {
  const f = await fixture(t, 'review-gate');
  assert.equal((await grade(f, 'review-gate', 'review-is-pending.md')).passed, false);
  await updateEpicRun({ root: f.root, run: f.run, event: { id: 'intake', type: 'intake' } });
  await updateEpicRun({ root: f.root, run: f.run, event: { id: 'draft', type: 'epic', input: { version: 1, mode: 'product', title: 'Exports', categories: [{ id: 3, assessed: true, ready: true, content: 'Let customers reconcile purchases with their own CSV.' }] } } });
  assert.equal((await grade(f, 'review-gate', 'review-is-pending.md')).passed, true);
  assert.equal((await grade(f, 'review-gate', 'no-slices-yet.md')).passed, true);
  const { directory } = await inspectEpicRun(f); await writeFile(path.join(directory, 'slicing-summary.md'), 'Premature backlog');
  assert.equal((await grade(f, 'review-gate', 'no-slices-yet.md')).passed, false);
});
test('scoped-resume fixture and local graders distinguish pending revision from actual preparation completion', async (t) => {
  const f = await fixture(t, 'scoped-resume'); const before = await inspectEpicRun(f);
  assert.equal(before.state.phase, 'slice'); assert.deepEqual(before.state.affected, ['S-2']);
  assert.equal((await grade(f, 'scoped-resume', 'prepared-state.md')).passed, false);
  const input = structuredClone(before.state.slices_input); input.slices[1].content += '\nAnd both start and end dates are inclusive.';
  await updateEpicRun({ root: f.root, run: f.run, event: { id: 'finish-revision', type: 'slices', input } });
  assert.equal((await grade(f, 'scoped-resume', 'prepared-state.md')).passed, true);
  assert.equal((await grade(f, 'scoped-resume', 'html-view.md')).passed, true);
  const after = await inspectEpicRun(f); assert.deepEqual(after.state.epic, before.state.epic); assert.deepEqual(after.state.slices_input.slices[0], before.state.slices_input.slices[0]);
});

test('uncertainty fixtures retain an unresolved source or a real user resolution without new state fields', async (t) => {
  for (const kind of ['unresolved','resolved']) {
    const f = await fixture(t, 'uncertainty-'+kind);
    const { state, directory } = await inspectEpicRun(f);
    const baseline=JSON.parse(await readFile(path.join(f.root,'uncertainty-baseline.json'),'utf8'));
    assert.equal(state.phase,'slice'); assert.equal(state.status,'In Progress');
    assert.deepEqual(state.epic_input,baseline.epic_input);assert.deepEqual(state.sources,baseline.sources);
    if(kind==='unresolved'){
      assert.ok(state.open_items.some(s=>s.includes('Unauthenticated')));
      assert.equal(baseline.userDecisions.length,0);
    }else{
      assert.deepEqual(state.open_items,[]);assert.ok(baseline.userDecisions.length>=1);
      assert.match(state.epic_input.categories[1].content,/ask them to log in/);
      assert.notEqual(state.epic.path,'requirement.md');
      assert.ok((await readFile(path.join(directory,'requirement.md'),'utf8')).includes('undecided'));
    }
    assert.equal((await grade(f,'uncertainty-'+kind,'prepared-state.md')).passed,false);
    assert.equal((await grade(f,'uncertainty-'+kind,'no-questions.md')).passed,true);
  }
});
