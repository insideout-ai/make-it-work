import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm,writeFile,symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { refreshHandoff,refreshHandoffHook } from './refresh-handoff.mjs';
const command="node '/plugin version/scripts/test-map-report.mjs' --root . --write";
const message=(text)=>({type:'assistant',message:{role:'assistant',content:[{type:'text',text}]}});
const output=(text,error=false)=>({type:'user',message:{role:'user',content:[{type:'tool_result',tool_use_id:'report',content:text,is_error:error}]}});
const generated=()=>[{type:'assistant',message:{role:'assistant',content:[{type:'tool_use',name:'Bash',id:'report',input:{command:'node report-generator --write'}}]}},output(`Generated .claude/testing/TEST-MAP.md from the saved map.\nRefresh from the product repo root: ${command}`)];
const bad="Refresh command: `node '<plugin>/scripts/test-map-report.mjs' --root . --write`.";
test('fresh report handoff blocks unfinished command variants and supplies the real command',()=>{
 for(const marker of ['plugin','make-it-work','base','skill-dir']){
  const result=refreshHandoff([...generated(),message(bad.replace('<plugin>',`<${marker}>`))]);
  assert.equal(result.decision,'block');assert.ok(result.reason.includes(command));assert.match(result.reason,/no user acknowledgment/);
 }
});
test('resolved command, report link and later corrected text are allowed',()=>{
 for(const final of [`Refresh: \`${command}\``, '[Test map](.claude/testing/TEST-MAP.md): use its Refresh line.', '[Generator](</absolute/path/scripts/test-map-report.mjs>)'])assert.deepEqual(refreshHandoff([...generated(),message(final)]),{});
 assert.deepEqual(refreshHandoff([...generated(),message(bad),message('Use the report’s Refresh line.')]),{});
});
test('no fresh generation, denied writes and new user turns do not impose a handoff check',()=>{
 assert.deepEqual(refreshHandoff([message(bad)]),{});
 const denied=generated();denied[1].message.content[0].is_error=true;assert.deepEqual(refreshHandoff([...denied,message(bad)]),{});
 assert.deepEqual(refreshHandoff([...generated(),{type:'user',message:{role:'user',content:'Explain a template command.'}},message(bad)]),{});
 assert.deepEqual(refreshHandoff([...generated(),{type:'user',message:{role:'user',content:[{type:'text',text:'A new question'}]}},message(bad)]),{});
});
test('already-current report counts, but source examples and thinking are not final output',()=>{
 const events=generated();events[1]=output(`.claude/testing/TEST-MAP.md is already up to date.\nRefresh from the product repo root: ${command}`);
 assert.equal(refreshHandoff([...events,message(bad)]).decision,'block');
 assert.deepEqual(refreshHandoff([...generated(),{type:'assistant',message:{role:'assistant',content:[{type:'thinking',thinking:bad}]}},message('Done; use the report.')]),{});
 const read=generated();read[1]=output(`return 'Generated .claude/testing/TEST-MAP.md from the saved map.';\n${bad}`);assert.deepEqual(refreshHandoff([...read,message(bad)]),{});
});
test('Stop check reads a real transcript without mutating it',async(t)=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'refresh-handoff-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const transcript=path.join(root,'trace.jsonl');const body=[...generated(),message(bad)].map(JSON.stringify).join('\n')+'\n';await writeFile(transcript,body);
 assert.equal((await refreshHandoffHook({hook_event_name:'Stop',transcript_path:transcript})).decision,'block');
 assert.equal(await readFile(transcript,'utf8'),body);assert.deepEqual(await refreshHandoffHook({hook_event_name:'PreToolUse',transcript_path:transcript}),{});
});


test('truncated generator output still blocks a template and the CLI works through an aliased script path',async(t)=>{
 const events=generated();events[1]=output('Generated .claude/testing/TEST-MAP.md from the saved map.');
 assert.equal(refreshHandoff([...events,message(bad)]).decision,'block');
 const root=await mkdtemp(path.join(os.tmpdir(),'refresh-handoff-cli-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const transcript=path.join(root,'trace.jsonl');await writeFile(transcript,[...events,message(bad)].map(JSON.stringify).join('\n')+'\n');
 const alias=path.join(root,'hook-alias.mjs');await symlink(fileURLToPath(new URL('./refresh-handoff.mjs',import.meta.url)),alias);
 const result=JSON.parse(execFileSync(process.execPath,[alias],{input:JSON.stringify({hook_event_name:'Stop',transcript_path:transcript}),encoding:'utf8'}));
 assert.equal(result.decision,'block');assert.match(result.reason,/Refresh line/);
});


test('the Stop payload final message takes precedence over a stale transcript chat block',()=>{
 assert.equal(refreshHandoff([...generated(),message('Checking the report next.')],bad).decision,'block');
 assert.deepEqual(refreshHandoff([...generated(),message(bad)],'Use the report’s resolved Refresh line.'),{});
});
