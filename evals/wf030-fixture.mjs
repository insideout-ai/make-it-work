import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd(), plugin = path.resolve(import.meta.dirname, '..');
if (!/^\/(?:private\/)?(?:tmp|var\/folders)\//.test(root) || root.startsWith(plugin + path.sep)) throw new Error('Disposable directory required.');
try { await lstat('.git'); throw new Error('Refusing existing repo.'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
async function put(file, text) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text); }
await put('.gitignore', 'make-it-work/\n');
await put('package.json', JSON.stringify({name:'boundary-fixture',private:true,scripts:{test:'node --test test/existing.test.cjs'}})+'\n');
await put('CLAUDE.md', '# Local event adapter\nLoad domain-audit for event behavior. Node built-in tests, no dependencies/network. The accepted local spec is requirements authority; prior-report.md contains unverified implementation claims. Do not modify production, existing assertions or the accepted spec during planning.\n');
await put('.claude/rules/product.md', '# Product\nRejected validation emits no event. Failed storage emits FAILURE. Preview emits SUCCESS only on completion.\n');
await put('.claude/rules/architecture.md', '# Architecture\nsrc/flows.cjs owns public transfer/directUpload/preview entry points. Storage, preview generation and event delivery are external dependencies. No architectural extraction is requested.\n');
await put('.claude/skills/domain-audit/SKILL.md', '---\nname: domain-audit\ndescription: Event emission for upload and preview flows.\n---\n\nUse the accepted spec. Inspect real entry points and the existing tests.\n');
await put('src/flows.cjs', `class ValidationError extends Error {}
class DeniedError extends Error {}
function makeApp({storage,audit,previewer,uploadOverride}) {
  async function upload(input) {
    if (input.extension === 'blocked') throw new DeniedError('extension');
    if (!input.name) throw new ValidationError('name required');
    return storage.write(input);
  }
  return {
    async directUpload(input) { return upload(input); },
    async transfer(input) {
      try { return await (uploadOverride || upload)(input); }
      catch (error) { if (!(error instanceof DeniedError)) audit.emit('FAILURE'); throw error; }
    },
    async preview(id) {
      audit.emit('SUCCESS');
      const data = await previewer.get(id);
      return data;
    }
  };
}
module.exports = {makeApp};
`);
await put('test/existing.test.cjs', `const test=require('node:test'),assert=require('node:assert/strict');
const {makeApp}=require('../src/flows.cjs');
test('transfer storage failure produces FAILURE',async()=>{
 const events=[];const error=new Error('storage unavailable');
 const app=makeApp({uploadOverride:async()=>{throw error},audit:{emit:e=>events.push(e)}});
 await assert.rejects(app.transfer({name:'ok'}));assert.deepEqual(events,['FAILURE']);
});
test('direct validation refuses input',async()=>{
 const events=[];const app=makeApp({storage:{write:()=>{throw Error('unexpected')}},audit:{emit:e=>events.push(e)}});
 await assert.rejects(app.directUpload({}));assert.deepEqual(events,[]);
});
`);
await put('prior-report.md', '# Prior worker report\nAll refusal handling is already implemented. No production changes are expected; add documentation and reuse the two passing tests. Existing tests pass, including validation refusal on directUpload and a transfer failure case. Preview happy-path manual inspection looked correct. These are prior implementation claims, not a user restriction on the required behavior.\n');
await put('make-it-work/BOUNDARY-1/BOUNDARY-1-spec.md', '# BOUNDARY-1 — accepted event boundaries\n\n## Goal\nKeep external events consistent with caller-visible outcomes.\n\n## Acceptance Criteria\n- On both directUpload and transfer, request validation rejects with no outgoing event and no storage call.\n- Blocked extensions remain silent. A storage failure from transfer still emits exactly one FAILURE and rethrows.\n- Preview emits one SUCCESS only after preview data is available; pending or rejected preview generation emits none and rejection propagates.\n- Preserve unrelated existing behavior. Existing code is a baseline, not proof of compliance.\n\n## Decisions\nRequirements are accepted; production corrections consistent with these requirements are in scope. No product decision is pending. Networking, dependency installation and architectural restructuring are out of scope.\n');
await put('coordinator-guide.md', await readFile(path.join(plugin,'skills/implement/references/orchestration/planning.md'),'utf8'));
const git=(...a)=>execFileSync('git',a,{stdio:'pipe'});
git('init','-qb','main');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Synthetic behavior baseline');git('switch','-qc','BOUNDARY-1');
