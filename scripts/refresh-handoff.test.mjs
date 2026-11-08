import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm,writeFile,symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { refreshHandoff,refreshHandoffHook,evidenceDeliveryHold } from './refresh-handoff.mjs';
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


const pointerPacket = { changed: true, operation: 'pointer-update', root: "/tmp/repo's space", reassessment_command: "node '/plugin/test-strategy.mjs' evidence --root '/tmp/repo'", reassessment_evidence: { files: [{ file: 'test.js', status: 'read', content: 'assert.equal(actual, expected)' }], complete: true, remaining_files: 0 } };
const evidenceEvents = (value, id = 'evidence') => [
 { type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', id }] } },
 { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: typeof value === 'string' ? value : JSON.stringify(value) }] } },
];

test('truncated pointer data holds the handoff and full read-only evidence delivery releases it', () => {
 const cut = JSON.stringify(pointerPacket).slice(0, -10);
 const events = evidenceEvents(cut);
 const held = evidenceDeliveryHold(events);
 assert.equal(held.decision, 'block');
 assert.ok(held.reason.includes(pointerPacket.reassessment_command));
 assert.match(held.reason, /WITHOUT cut\/head/);
 assert.equal(refreshHandoff([...events, message('The map is fresh.')]).decision, 'block');
 const recovered = { operation: 'mapping-evidence', root: pointerPacket.root, reassessment_evidence: pointerPacket.reassessment_evidence };
 const recovery = [...events, ...evidenceEvents(recovered, 'recovery')];
 assert.match(evidenceDeliveryHold(recovery).reason, /regenerate TEST-MAP/);
 assert.deepEqual(evidenceDeliveryHold([...recovery, ...generated()]), {});
 assert.deepEqual(evidenceDeliveryHold(evidenceEvents(pointerPacket)), {});
 assert.equal(evidenceDeliveryHold([...events, ...evidenceEvents({ ...recovered, root: '/another/repo' }, 'other')]).decision, 'block');
 assert.equal(evidenceDeliveryHold([...events, ...evidenceEvents({ changed: false, skipped: null }, 'unchanged')]).decision, 'block');
});

test('evidence checks cover PostToolUse, ignore diagnostic replays and do not conflate a fully delivered partial packet with semantic success', async () => {
 const cut = JSON.stringify(pointerPacket).slice(0, -10);
 assert.equal((await refreshHandoffHook({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_response: { stdout: cut } })).decision, 'block');
 assert.deepEqual(await refreshHandoffHook({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_response: { stdout: JSON.stringify(pointerPacket) } }), {});
 assert.deepEqual(evidenceDeliveryHold(evidenceEvents(cut).map((event) => ({ ...event, type: 'api-request-blob' }))), {});
 const partial = { ...pointerPacket, reassessment_evidence: { files: [{ file: 'missing.js', status: 'unavailable' }], complete: false, remaining_files: 1 } };
 assert.deepEqual(evidenceDeliveryHold(evidenceEvents(partial)), {}, 'Delivery check is not a semantic freshness verdict');
 const events = [...evidenceEvents(cut), { type: 'user', message: { role: 'user', content: 'Stop this run.' } }];
 assert.deepEqual(evidenceDeliveryHold(events), {});
 const failed = evidenceEvents(cut); failed[1].message.content[0].is_error = true;
 assert.deepEqual(evidenceDeliveryHold(failed), {});
});
