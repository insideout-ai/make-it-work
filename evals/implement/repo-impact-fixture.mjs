// Synthetic multi-repo planning fixtures; no credentials, packages or services.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareScope, approveScope, runScope } from '../../skills/implement/scripts/workspace-scope.mjs';
import { initializeWorkflow } from '../../skills/implement/scripts/workflow.mjs';
import { artifactJoin } from '../../scripts/lib/artifact-path.mjs';
import { digest } from '../../scripts/lib/artifacts.mjs';
const root = process.cwd(), variant = process.argv[2];
if (!/^\/(?:private\/)?(?:tmp|var\/folders)\//.test(root) || !['scope', 'missing'].includes(variant)) throw new Error('Use a disposable temporary directory and a known variant.');
try { execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' }); throw new Error('Existing repository.'); }
catch (e) { if (!e.status) throw e; }
const put = async (file, text) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text); };
const selected = [];
for (const [id, role] of [['api', 'product'], ['web', 'product'], ['context', 'support'], ['qa', 'test']]) {
  const repo = path.join(root, id); await mkdir(repo);
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { stdio: 'pipe' });
  git('init', '-qb', 'main');
  const body = id === 'api' ? 'module.exports = n => ({ total: n });\n' : id === 'web' ? 'module.exports = response => String(response.total);\n' : 'module.exports = "independent documentation tool";\n';
  await put(path.join(repo, 'app.cjs'), body);
  await put(path.join(root, `.eval-${id}.cjs`), body);
  await put(path.join(repo, 'README.md'), id === 'context' ? '# Independent documentation tool\nThis tool has no dependency on API, web or QA. There is no test runner or setup to establish for this task.\n' : '# Task fixture\nUse existing Node tooling only; planning must not change source or tests.\n');
  await put(path.join(repo, 'contract.md'), id === 'context' ? '# Independent tool\nNo connection to the API/consumer contract.\n' : '# Response contract\nAPI currently returns {total:number}. Web reads total only. QA checks the response across API and consumer. Adding currency must preserve total and consumer output.\n');
  if (!(variant === 'missing' && id === 'web') && id !== 'context') {
    await put(path.join(repo, 'package.json'), '{"private":true,"scripts":{"test":"node --test test/contract.test.cjs"}}\n');
    await put(path.join(repo, 'test/contract.test.cjs'), 'const test=require("node:test"),assert=require("node:assert/strict"); test("total remains numeric",()=>assert.equal(typeof require("' + (id === 'qa' ? '../../api/app.cjs' : id === 'web' ? '../../api/app.cjs' : '../app.cjs') + '")(5).total,"number"));\n');
  }
  if (id === 'web' && variant !== 'missing') await put(path.join(repo, 'test/contract.test.cjs'), 'const test=require("node:test"),assert=require("node:assert/strict"); test("consumer preserves display",()=>assert.equal(require("../app.cjs")(require("../../api/app.cjs")(5)),"5"));\n');
  await put(path.join(repo, 'CLAUDE.md'), '# Synthetic fixture\nOnly api/app.cjs needs production edits; web consumes its contract without changes; qa supplies existing external contract checks; context is independent. Use existing commands and no installs or strategy/map generation in unchanged repos. Missing consumer tooling requires explicit gap handling, not automatic manual consent.\n');
  git('add', '.'); git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'baseline');
  selected.push({ id, role, root: repo, reason: `${id}/contract.md`, base: 'main' });
}
const dir = path.join(root, 'make-it-work/IMPACT-1'); await mkdir(dir, { recursive: true });
const report = 'make-it-work/IMPACT-1/IMPACT-1-repos.md'; await put(path.join(root, report), '# Selected repositories\napi, web, context and qa are approved synthetic fixture scope.\n');
const preview = await prepareScope(root, { ticket: 'IMPACT-1', report, repos: selected });
await approveScope(root, 'IMPACT-1', preview.hash, { source: 'user', via: 'chat' }); await runScope(root, 'IMPACT-1', preview.hash);
const initialized = await initializeWorkflow(root, { ticket: 'IMPACT-1', autonomy: 'autopilot', repos: selected.map(r => r.root), branch_guard: 'Fixture user approved exact scope' });
const spec = '# Accepted spec\n\nAdd currency USD to API responses, preserving total. Web output must remain unchanged, and API/web compatibility must be checked using existing targeted checks. QA provides existing external contract coverage. The context documentation tool is unaffected and requires no checks or edits. Only api/app.cjs is an intended production edit. Missing required consumer verification must remain an explicit gap; manual verification is not preauthorized. No test infrastructure work is in scope.\n';
const specPath = artifactJoin(dir, 'IMPACT-1-spec.md'); await put(specPath, spec); await put(path.join(root, '.eval-spec.md'), spec);
const fields = { ...initialized.fields, phase: 'plan', spec: path.relative(root, specPath), spec_hash: digest(spec), mode: 'tdd', mode_source: 'assessed', risk: 'medium', risk_rationale: 'Cross-repo response compatibility.' };
const state = '# Workflow state — IMPACT-1\n\n```\n' + Object.entries(fields).map(([k,v]) => `${k}: ${v}`).join('\n') + '\n```\n\n## Known regressions\n\nNone\n\n## Decided findings\n\nNone\n\n## Context discoveries\n\nNone\n\n## Audit log\n\n| # | Time | From | To | Outcome / reason |\n| --- | --- | --- | --- | --- |\n| 1 | ' + fields.start_time + ' | start | plan | Synthetic accepted spec and approved scope; ready for impact assessment. |\n';
await put(initialized.state, state);
