import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { initEpicRun,updateEpicRun,inspectEpicRun } from '../../scripts/epic-workflow.mjs';
const kind=process.argv[2];
if(!['unresolved','resolved'].includes(kind))throw new Error('Choose unresolved or resolved uncertainty fixture');
const root=process.cwd();
const question='Unauthenticated export handling is undecided: response, login prompt and redirect are not specified.';
const brief='Logged-in customers download only their own orders as CSV with order_id,date,item,amount,status. Empty exports contain headers. Never expose another customer’s orders. '+question;
const source={id:'brief',reference:'Supplied export requirement',available:true,content:brief};
const result=await initEpicRun({root,input:{title:'Own order export',goal:'Reconcile own purchases',autonomy:'autopilot',sources:[source]}});
let id=0;const apply=(event)=>updateEpicRun({root,run:result.run,event:{id:`seed-${++id}`,...event}});
const input=(resolved)=>({version:1,title:'Own order export',mode:'product',source:resolved?'Requirement plus recorded user clarification':'Supplied export requirement',categories:[{id:3,assessed:true,ready:true,content:'Download own orders for reconciliation.'},{id:5,assessed:true,ready:resolved,content:'Given a logged-in customer\nWhen they export orders\nThen only their own orders appear as CSV with order_id,date,item,amount,status columns.\nAnd empty exports contain headers.\n'+(resolved?'User clarification: If an unauthenticated visitor requests an export, return no order data and ask them to log in.':'> Open item: '+question),open_items:resolved?[]:[question]}],open_items:resolved?[]:[question],decisions:resolved?[{topic:'Unauthenticated handling',decision:'Return no order data and ask the visitor to log in.',status:'Confirmed',source:'user',reference:'Recorded clarification after the first epic draft'}]:[]});
await apply({type:'intake'});await apply({type:'epic',input:input(false)});
if(kind==='resolved'){
 const answer='For unauthenticated export requests, return no order data and ask the visitor to log in. This resolves the earlier question.';
 await apply({type:'decision',source:'user',text:answer,reference:'Recorded clarification after the first epic draft'});
 await apply({type:'revise',scope:'epic',reason:'User resolved unauthenticated handling.',reference:'Recorded clarification after the first epic draft',sources:[source,{id:'clarification',reference:'Recorded clarification after the first epic draft',available:true,content:answer}]});
 await apply({type:'epic',input:input(true)});
}
const state=(await inspectEpicRun({root,run:result.run})).state;
await writeFile('run-location.txt',path.relative(root,result.directory));
await writeFile('uncertainty-baseline.json',JSON.stringify({kind,question,epic:state.epic,epic_input:state.epic_input,sources:state.sources,userDecisions:state.decisions.filter(d=>d.source==='user')},null,2)+'\n');
