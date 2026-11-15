import { execFileSync } from 'node:child_process';
import { access, cp, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest } from '../../../scripts/lib/artifacts.mjs';
import { snapshot } from '../../../scripts/lib/repo-state.mjs';
import { planHash } from '../../../scripts/lib/plan.mjs';
import { validatePlan } from '../../../scripts/validate-plan.mjs';
import { parseState } from '../../../skills/implement/scripts/render-status.mjs';

const root = await realpath(process.cwd());
const plugin = await realpath(fileURLToPath(new URL('../../..', import.meta.url)));
if (root === plugin || root.startsWith(plugin + path.sep)) throw new Error('Refusing to seed inside the plugin.');
try { await access(path.join(root, '.git')); throw new Error('Refusing to seed an existing Git repository.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' }).toString().trim();
await cp(fileURLToPath(new URL('../../execute/execute-full-pass/fixture', import.meta.url)), root, { recursive: true });
await writeFile(path.join(root, '.gitignore'), '/make-it-work/\n');
await mkdir(path.join(root, '.claude/skills/domain-greeting'), { recursive: true });
await writeFile(path.join(root, 'CLAUDE.md'), '# Greeting fixture\n\n## Skill Loading Gate\nRead .claude/skills/domain-greeting/SKILL.md before source exploration or edits.\n');
await writeFile(path.join(root, '.claude/skills/domain-greeting/SKILL.md'), '# Greeting rules\nPreserve the existing casual greeting. The formal greeting ends in a period, including an empty name.\n');
const source = 'function greet(name) { return `Hello, ${name}!`; }\nfunction greetFormally(name) { return `Good day, ${name}.`; }\nmodule.exports = { greet, greetFormally };\n';
await writeFile(path.join(root, 'src/greeting.js'), source);
await writeFile(path.join(root, '.eval-baseline-greeting.js'), source);
git('init', '-q', '-b', 'main'); git('add', '.');
git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Previously implemented formal greeting');
git('switch', '-q', '-c', 'DEMO-2');
execFileSync(process.execPath, ['test.js'], { cwd: root, stdio: 'pipe' });
const directory = path.join(root, 'make-it-work/DEMO-2');
const planPath = path.join(directory, 'DEMO-2-plan.md');
let plan = await readFile(planPath, 'utf8');
plan = plan.replaceAll('make-it-work/DEMO-2-spec.md', 'make-it-work/DEMO-2/DEMO-2-spec.md')
  .replace(/\*\*Mode:\*\* Not yet chosen[\s\S]*?(?=\*\*Progress:\*\*)/, '**Mode:** Subagent-Driven — dispatch a fresh subagent per step.\n\n')
  .replace('Step 0 of 1 complete', 'Step 1 of 1 complete');
plan = plan.replace('## Codebase Gaps', '## Domains/UCs Touched\n\n`tiny-greeter-full`: None — no generated use-case IDs.\n\n## Verification Policy\n\n| Repo | Mode | Decision | Reason |\n| --- | --- | --- | --- |\n| tiny-greeter-full | automated | configured | Existing npm test command |\n\n## Codebase Gaps')
  .replace('Happy path row above', 'Happy path — `greetFormally("Ann")` returns `"Good day, Ann."`')
  .replace('Regression row above', 'Regression — `greet("Ann")` still returns `"Hello, Ann!"`');
if (!validatePlan(plan).valid) throw new Error(JSON.stringify(validatePlan(plan)));
await writeFile(planPath, plan);
const spec = '# Formal greeting\nAdd a formal greeting while preserving the casual greeting. Formal output ends with a period, including an empty name.\n';
await writeFile(path.join(directory, 'DEMO-2-spec.md'), spec);
await writeFile(path.join(directory, 'DEMO-2-review.md'), '# Review\n\nRoute: fix\n#1 test.js: the already-correct empty-name formal greeting has no regression assertion. Add coverage without changing production behavior.\n\nOrchestrator outcome: FIX_REQUIRED\n');
const template = await readFile(fileURLToPath(new URL('../feedback-clean/fixture/fixture-artifacts/DEMO-state.md', import.meta.url)), 'utf8');
const fields = { ticket: 'DEMO-2', status: 'In Progress', phase: 'fix-plan', autonomy: 'autopilot', start_time: new Date().toISOString(), plugin_version: JSON.parse(await readFile(path.join(plugin, '.claude-plugin/plugin.json'), 'utf8')).version,
  execution_mode: 'subagent-driven', inline_pause_mode: 'none', spec: 'make-it-work/DEMO-2/DEMO-2-spec.md', spec_hash: digest(spec), plan: 'make-it-work/DEMO-2/DEMO-2-plan.md', plan_hash: planHash(plan), review: 'fix-required', branch: 'DEMO-2', head: git('rev-parse', 'HEAD'), worktree_fingerprint: digest(JSON.stringify(await snapshot([root]))), execute_report: 'none' };
let state = template.replaceAll('DEMO', 'DEMO-2');
for (const [key, value] of Object.entries(fields)) state = state.replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${value}`);
state = state.replace('| review | final-sync | Review cycle 1 clean |', '| review | fix-plan | Review cycle 1 found missing empty-name regression coverage |');
parseState(state, path.join(directory, 'DEMO-2-state.md'));
await writeFile(path.join(directory, 'DEMO-2-state.md'), state);
