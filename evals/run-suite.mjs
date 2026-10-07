#!/usr/bin/env node
// A maintainer invokes this locally; CI must never run it.
import { execFile, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EVAL_ROOT, REPO_ROOT, validateEvalTree } from './validate.mjs';
import { runBatches } from './run-batches.mjs';

const argv = process.argv.slice(2);
const tier = argv[0];
const dryRun = argv.includes('--dry-run');
const budgetArg = argv.find((arg) => arg.startsWith('--max-cost-usd='));
const caseArg = argv.find((arg) => arg.startsWith('--case='));
const requestedCase = caseArg?.slice('--case='.length);
const budget = budgetArg ? Number(budgetArg.split('=')[1]) : tier === 'smoke' ? 12 : 45;
const concurrency = tier === 'smoke' ? 4 : 1;

if (!['smoke', 'full'].includes(tier) || !Number.isFinite(budget) || budget <= 0 ||
    (caseArg && !requestedCase) ||
    argv.some((arg, index) => index > 0 && arg !== '--dry-run' &&
      !arg.startsWith('--max-cost-usd=') && !arg.startsWith('--case='))) {
  process.stderr.write('Usage: node evals/run-suite.mjs <smoke|full> [--dry-run] [--case=NAME] [--max-cost-usd=N]\n');
  process.exit(64);
}

const { cases, suites, errors } = await validateEvalTree();
if (errors.length) {
  errors.forEach((error) => process.stderr.write(`ERROR: ${error}\n`));
  process.exit(1);
}
const byName = new Map(cases.map((item) => [item.name, item]));
const tierCases = tier === 'smoke' ? suites.smoke.map((name) => byName.get(name)) : cases;
const selected = requestedCase ? tierCases.filter((item) => item.name === requestedCase) : tierCases;
if (!selected.length) {
  process.stderr.write(`Case ${requestedCase} is not in the ${tier} tier.\n`);
  process.exit(64);
}
if (dryRun) {
  for (const item of selected) {
    const mode = suites.headless.includes(item.name) ? 'headless + human review' : 'plugin eval';
    process.stdout.write(`${item.skill}\t${item.name}\t${mode}\n`);
  }
  process.stdout.write(`${selected.length} cases; budget $${budget.toFixed(2)}. No model invoked.\n`);
  process.exit(0);
}

const auth = spawnSync('claude', ['auth', 'status', '--json'], { encoding: 'utf8' });
let loggedIn = false;
try { loggedIn = auth.status === 0 && JSON.parse(auth.stdout).loggedIn === true; } catch { /* fail closed */ }
if (!loggedIn) {
  process.stderr.write('Claude Code is not signed in for this shell. Run `claude auth login` interactively, then retry. No model run started.\n');
  process.exit(69);
}

const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
const reportRoot = process.env.MIW_EVAL_REPORT_ROOT || path.join(EVAL_ROOT, 'results');
const reportDir = path.join(reportRoot, `${tier}-${stamp}`);
await mkdir(reportDir, { recursive: true });
const git = (...args) => spawnSync('git', ['-C', REPO_ROOT, ...args], { encoding: 'utf8' });
const before = { head: git('rev-parse', 'HEAD').stdout.trim(), status: git('status', '--porcelain').stdout };
const version = spawnSync('claude', ['--version'], { encoding: 'utf8' });
if (version.status !== 0) throw new Error('Claude Code is not installed or available on PATH');
const summary = {
  tier, requestedCase, startedAt: new Date().toISOString(),
  commit: process.env.MIW_EVAL_SOURCE_COMMIT || before.head,
  snapshotCommit: process.env.MIW_EVAL_SOURCE_COMMIT ? before.head : undefined,
  claudeVersion: version.stdout.trim(), budgetUsd: budget, concurrency, cases: [],
};
function command(binary, args, cwd, timeoutSeconds) {
  return new Promise((resolve) => {
    execFile(binary, args, {
      cwd, encoding: 'utf8', timeout: (timeoutSeconds + 30) * 1000,
      maxBuffer: 64 * 1024 * 1024, env: process.env,
    }, (error, stdout, stderr) => resolve({
      status: error ? (typeof error.code === 'number' ? error.code : null) : 0,
      error, stdout, stderr,
    }));
  });
}

function promptConfig(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error('prompt.md has no frontmatter');
  const tools = match[1].match(/^allowed_tools:\s*\[([^\]]*)\]/m)?.[1]
    .split(',').map((tool) => tool.trim()).filter(Boolean) ?? [];
  const maxTurns = Number(match[1].match(/^max_turns:\s*(\d+)/m)?.[1] ?? 100);
  const timeoutSeconds = Number(match[1].match(/^timeout_seconds:\s*(\d+)/m)?.[1] ?? 1800);
  return { tools, maxTurns, timeoutSeconds, body: match[2].trim() };
}

async function runCase(item, remaining) {
  const caseReportDir = path.join(reportDir, item.name);
  await mkdir(caseReportDir, { recursive: true });
  const prompt = promptConfig(await readFile(path.join(item.dir, 'prompt.md'), 'utf8'));
  const tools = [...new Set([...prompt.tools, ...(suites.extraTools[item.name] ?? [])])];
  const headless = suites.headless.includes(item.name);
  let result;
  let caseCost = 0;
  let status = 'failed';
  let detail = '';
  let fixtureDir;
  if (headless) {
    fixtureDir = await mkdtemp(path.join(os.tmpdir(), 'make-it-work-eval-'));
    if (item.scaffold) {
      const fixture = await command('bash', [path.join(item.dir, 'fixture.sh')], fixtureDir, 120);
      if (fixture.status !== 0) {
        await writeFile(path.join(caseReportDir, 'fixture-error.txt'), `${fixture.stdout}\n${fixture.stderr}`);
        return { name: item.name, skill: item.skill, mode: 'headless', costUsd: 0,
          status: 'failed', detail: 'fixture setup failed', fixtureDir };
      }
    }
    const args = ['-p', prompt.body, '--plugin-dir', REPO_ROOT, '--allowedTools', ...tools,
      '--max-turns', String(prompt.maxTurns), '--max-budget-usd', remaining.toFixed(2),
      '--output-format', 'stream-json', '--verbose'];
    result = await command('claude', args, fixtureDir, prompt.timeoutSeconds);
    await writeFile(path.join(caseReportDir, 'transcript.jsonl'), result.stdout || '');
    await writeFile(path.join(caseReportDir, 'stderr.txt'), result.stderr || '');
    try {
      const data = result.stdout.trim().split('\n').filter((line) => line.startsWith('{'))
        .map((line) => JSON.parse(line))
        .findLast((line) => line.type === 'result');
      if (!data) throw new Error('No final result in transcript');
      caseCost = Number(data.total_cost_usd ?? 0);
      if (result.status === 0 && !data.is_error && !result.error) {
        status = 'review';
        detail = 'Inspect transcript and fixture against this case’s graders';
      } else detail = data.result || 'Claude returned an error';
    } catch {
      detail = result.error?.message || `Claude exited ${result.status ?? 'without a status'}`;
    }
  } else {
    const args = ['plugin', 'eval', '.', '--case', item.name, '--ablation', 'none', '--runs', '1',
      '--trust-plugin', '--no-publish', '--threshold', '0', '--output-dir', caseReportDir,
      '--max-cost-usd', remaining.toFixed(2), '--allow-tools', ...tools];
    if (item.scaffold) args.push('--scaffold');
    result = await command('claude', args, REPO_ROOT, prompt.timeoutSeconds);
    await writeFile(path.join(caseReportDir, 'runner-stdout.txt'), result.stdout || '');
    await writeFile(path.join(caseReportDir, 'runner-stderr.txt'), result.stderr || '');
    try {
      const data = JSON.parse(await readFile(path.join(caseReportDir, 'aggregate-result.json'), 'utf8'));
      caseCost = Number(data.costUsd ?? 0);
      const evaluated = data.cases.find((entry) => entry.name === item.name);
      const arm = evaluated?.arms?.with?.[0];
      const votes = arm?.graders ?? [];
      const hardFailure = votes.some((vote) => !vote.passed &&
        evaluated.graders.find((grader) => grader.name === vote.name)?.type !== 'llm');
      const judgeFailure = votes.some((vote) => !vote.passed);
      status = result.status !== 0 || data.partial || !evaluated || !arm || arm.error ||
        arm.skippedPaidGraders || votes.length !== evaluated.graders.length || hardFailure ? 'failed' :
        judgeFailure ? 'review' : 'passed';
      detail = data.partialReason === 'auth_failed' ? 'Claude Code authentication failed' :
        hardFailure ? 'Machine grader failed' : judgeFailure ? 'Review LLM grader verdicts' : '';
    } catch {
      detail = result.error?.message || `Eval exited ${result.status ?? 'without a report'}`;
    }
  }
  return { name: item.name, skill: item.skill, mode: headless ? 'headless' : 'plugin-eval',
    costUsd: caseCost, status, detail, fixtureDir,
    report: path.relative(REPO_ROOT, caseReportDir) };
}

process.stdout.write(`Running ${tier}: ${selected.length} cases, ${concurrency} concurrent, cost limit $${budget.toFixed(2)}.\n`);
process.stdout.write(`Reports: ${reportDir}\n`);
const run = await runBatches(selected, {
  concurrency, budget, runCase,
  onStart: (item) => process.stdout.write(`→ ${item.name}\n`),
  onResult: async (entry, cost) => {
    summary.cases.push(entry);
    process.stdout.write(`  ${entry.name}: ${entry.status}; reported usage $${entry.costUsd.toFixed(2)}${entry.detail ? `; ${entry.detail}` : ''}\n`);
    await writeFile(path.join(reportDir, 'summary.json'), JSON.stringify({ ...summary, costUsd: cost }, null, 2) + '\n');
  },
});
const { cost } = run;
summary.stopped = run.stopped;
const after = { head: git('rev-parse', 'HEAD').stdout.trim(), status: git('status', '--porcelain').stdout };
summary.repoUnchanged = before.head === after.head && before.status === after.status;
summary.completedAt = new Date().toISOString();
summary.costUsd = cost;
await writeFile(path.join(reportDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
if (!summary.repoUnchanged) process.stderr.write('ERROR: Plugin checkout changed during the run. Inspect it before trusting results.\n');
const failed = summary.cases.filter((entry) => entry.status === 'failed').length;
const review = summary.cases.filter((entry) => entry.status === 'review').length;
process.stdout.write(`${summary.cases.length}/${selected.length} cases run; ${failed} failed; ${review} require human review; reported usage $${cost.toFixed(2)}.\n`);
if (failed || summary.stopped || summary.cases.length !== selected.length || !summary.repoUnchanged) process.exitCode = 1;
