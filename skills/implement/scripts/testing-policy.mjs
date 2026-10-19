import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fail = (message) => { throw new Error(message); };
const plain = (value) => value.replaceAll('`', '').trim();

function section(markdown, title) {
  const sections = markdown.split(/^## /m).slice(1).filter((part) => part.split('\n')[0].trim() === title);
  if (sections.length > 1) fail(`Duplicate ${title} section.`);
  return sections.length ? sections[0].slice(sections[0].indexOf('\n') + 1) : null;
}

function table(body, headers) {
  const lines = body.split('\n').filter((line) => line.trim().startsWith('|'));
  const rows = lines.map((line) => line.trim().split('|').slice(1, -1).map(plain));
  if (!rows.length || rows[0].join('|') !== headers.join('|')) fail(`Expected table: ${headers.join(' | ')}.`);
  if (!rows[1] || rows[1].length !== headers.length || rows[1].some((cell) => !/^:?-+:?$/.test(cell))) fail('Invalid table separator.');
  return rows.slice(2).map((cells) => {
    if (cells.length !== headers.length || cells.some((cell) => !cell)) fail('Incomplete testing policy/scenario row.');
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  });
}

export function testingPolicy(plan, { required = false } = {}) {
  const body = section(plan, 'Verification Policy');
  if (body === null || /^None(?:\s|$)/.test(body.trim())) {
    if (required) fail('Testing readiness requires a Verification Policy table.');
    return null;
  }
  const rows = table(body, ['Repo', 'Mode', 'Decision', 'Reason']);
  if (!rows.length) fail('Verification Policy has no repos.');
  const names = new Set();
  for (const row of rows) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(row.Repo) || names.has(row.Repo)) fail('Invalid or duplicate verification repo.');
    names.add(row.Repo);
    if (!['automated', 'manual'].includes(row.Mode)) fail('Invalid verification mode.');
    if (!['configured', 'user', 'project-policy', 'autonomy-default'].includes(row.Decision)) fail('Invalid verification decision source.');
    if (row.Mode === 'manual' && !['user', 'project-policy'].includes(row.Decision)) fail('Manual verification requires an explicit user or project-policy decision.');
  }
  const affected = section(plan, 'Affected Code');
  if (affected !== null) {
    const products = [...affected.matchAll(/^### `([^`]+)`[ \t]*([^\n]*)/gm)]
      .filter((match) => !match[2].replace(/<!--.*?-->/g, '').trim().startsWith('(test scope only)')).map((match) => match[1]);
    if (!products.length || products.length !== names.size || products.some((repo) => !names.has(repo))) {
      fail('Verification Policy must cover exactly the affected product repos.');
    }
  }
  return rows;
}

export function validateManualEvidence(plan, ledger, policy = testingPolicy(plan)) {
  const manual = policy?.filter((row) => row.Mode === 'manual') ?? [];
  if (!manual.length) return;
  const body = section(plan, 'Test Plan');
  if (!body) fail('Manual verification requires a Test Plan.');
  const scenarios = table(body.split(/^\*\*AC traceability:\*\*/m)[0], ['Scenario', 'Repo', 'Type', 'File / command']);
  const seen = new Set();
  for (const scenario of scenarios) {
    if (seen.has(scenario.Scenario)) fail('Test Plan scenario names must be unique.');
    seen.add(scenario.Scenario);
    if (!policy.some((row) => row.Repo === scenario.Repo)) fail('Scenario names an unknown verification repo.');
  }
  for (const repo of manual) {
    const relevant = scenarios.filter((row) => row.Repo === repo.Repo);
    if (!relevant.length) fail(`No manual scenarios for ${repo.Repo}.`);
    for (const scenario of relevant) {
      if (scenario.Type !== 'Manual') fail(`Manual repo ${repo.Repo} requires Manual scenarios.`);
      if (!ledger.steps.some((step) => step.checks.some((check) => check.type === 'manual' && check.result === 'pass' && check.subject === scenario.Scenario))) {
        fail(`Manual scenario has no passing evidence: ${scenario.Scenario}.`);
      }
    }
  }
  if (ledger.acceptance.some((row) => row.status === 'unverified')) fail('Manual-policy completion requires evidence for every acceptance criterion.');
}

export function testingScope(plan, options) {
  const policy = testingPolicy(plan, options);
  if (!policy) return { legacy: true };
  return {
    legacy: false,
    automated: policy.filter((row) => row.Mode === 'automated').map((row) => row.Repo),
    manual: policy.filter((row) => row.Mode === 'manual').map((row) => row.Repo),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.shift() !== 'check' || args.shift() !== '--plan' || !args.length) fail('Usage: testing-policy.mjs check --plan PATH [--required]');
  const planPath = args.shift();
  const required = args.length === 1 && args[0] === '--required';
  if (args.length && !required) fail('Unknown testing-policy argument.');
  console.log(JSON.stringify(testingScope(await readFile(planPath, 'utf8'), { required })));
}
