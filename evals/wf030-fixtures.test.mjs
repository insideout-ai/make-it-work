import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
async function exercise(makeApp) {
  const events=[];let writes=0;
  const deps={storage:{write:async()=>{writes++;return 'stored'}},audit:{emit:e=>events.push(e)}};
  await assert.rejects(makeApp(deps).transfer({}));const invalid={events:[...events],writes};events.length=0;
  await assert.rejects(makeApp(deps).transfer({name:'ok',extension:'blocked'}));assert.equal(events.length,0);
  await assert.rejects(makeApp({...deps,storage:{write:async()=>{throw Error('storage')}}}).transfer({name:'ok'}));assert.deepEqual(events,['FAILURE']);events.length=0;
  let reject;const pending=new Promise((_,r)=>{reject=r});const result=makeApp({...deps,previewer:{get:()=>pending}}).preview('id');
  const before=[...events];reject(Error('preview failed'));await assert.rejects(result);const after=[...events];events.length=0;
  assert.equal(await makeApp({...deps,previewer:{get:async()=>'data'}}).preview('id'),'data');assert.deepEqual(events,['SUCCESS']);
  return {invalid,before,after};
}
function load(source){const module={exports:{}};vm.runInNewContext(source,{module});return module.exports.makeApp;}
test('WF-030 fixture has passing proxy tests but misses real validation and preview ordering',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'wf030-fixture-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 execFileSync(process.execPath,[path.join(import.meta.dirname,'wf030-fixture.mjs')],{cwd:root,env,stdio:'pipe'});
 execFileSync('npm',['test'],{cwd:root,env,stdio:'pipe'});
 const source=await readFile(path.join(root,'src/flows.cjs'),'utf8');const before=await exercise(load(source));
 assert.deepEqual(before.invalid,{events:['FAILURE'],writes:0});assert.deepEqual(before.before,['SUCCESS']);assert.deepEqual(before.after,['SUCCESS']);
 // Model the two minimal behavioral corrections in memory, preserving the fixture.
 const corrected=source.replace('if (!(error instanceof DeniedError))', 'if (!(error instanceof DeniedError) && !(error instanceof ValidationError))')
  .replace("audit.emit('SUCCESS');\n      const data = await previewer.get(id);", "const data = await previewer.get(id);\n      audit.emit('SUCCESS');");
 const after=await exercise(load(corrected));assert.deepEqual(after.invalid,{events:[],writes:0});assert.deepEqual(after.before,[]);assert.deepEqual(after.after,[]);
 assert.equal(await readFile(path.join(root,'src/flows.cjs'),'utf8'),source);
 assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),'');
});
