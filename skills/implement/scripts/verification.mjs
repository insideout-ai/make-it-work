import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { runArtifact, runDirectory } from './artifact-layout.mjs';
import { testingPolicy, validateManualEvidence } from './testing-policy.mjs';
import { checkpointResult } from './dashboard-checkpoint.mjs';
import { parseState } from './render-status.mjs';

const fail = (message) => { throw new Error(message); };
const nonempty = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} must be nonempty.`);
  return value;
};
const exactKeys = (value, names, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`);
  if (Object.keys(value).some((key) => !names.includes(key))) fail(`${label} has an unknown field.`);
};

export function traceability(plan, { requireClauses = false } = {}) {
  const tail = plan.split(/^\*\*AC traceability:\*\*\s*$/m)[1];
  if (!tail) fail('Plan has no AC traceability table.');
  const rows = [], seen = new Set();
  let columns = null;
  for (const line of tail.split('\n')) {
    if (!line.trim()) { if (rows.length) break; continue; }
    if (!line.startsWith('|')) { if (rows.length) break; continue; }
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (!columns) {
      const header = cells.join('|');
      if (!['Acceptance criterion|Test scenario', 'Acceptance criterion|Requirement clause|Test scenario'].includes(header)) fail('Invalid AC traceability header.');
      columns = cells.length;
      if (requireClauses && columns !== 3) fail('Clause evidence requires a Requirement clause column in AC traceability.');
      continue;
    }
    if (cells.length !== columns) fail('AC traceability row has the wrong number of columns.');
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    if (cells.some((cell) => !cell)) fail('AC traceability row is incomplete.');
    const row = columns === 3 ? { criterion: cells[0], clause: cells[1], scenario: cells[2] } : { criterion: cells[0], scenario: cells[1] };
    const key = JSON.stringify(row);
    if (seen.has(key)) fail('Duplicate AC traceability row.');
    seen.add(key);
    rows.push(row);
  }
  if (!rows.length) fail('Plan has no AC traceability rows.');
  return rows;
}
const acceptanceKey = (row) => JSON.stringify([row.criterion, row.clause ?? null, row.scenario]);

export function validateVerification(value, { ticket, planVersion, plan = null, outcome = null, requireComplete = false, requireClauses = false } = {}) {
  exactKeys(value, ['version', 'ticket', 'plan_version', 'steps', 'gate', 'acceptance'], 'verification');
  if (value.version !== 1 || value.ticket !== ticket || value.plan_version !== planVersion) fail('Verification version, ticket, or plan version mismatch.');
  if (!Array.isArray(value.steps)) fail('Verification steps must be an array.');
  const seenSteps = new Set();
  for (const step of value.steps) {
    exactKeys(step, ['number', 'checks'], 'verification step');
    if (!Number.isSafeInteger(step.number) || step.number < 1 || seenSteps.has(step.number)) fail('Verification step number is invalid or repeated.');
    seenSteps.add(step.number);
    if (!Array.isArray(step.checks) || !step.checks.length) fail(`Step ${step.number} has no verification checks.`);
    for (const check of step.checks) {
      exactKeys(check, ['type', 'subject', 'command', 'result', 'note', 'assertions'], 'verification check');
      if (!['automated', 'manual', 'exempt'].includes(check.type)) fail('Invalid verification check type.');
      nonempty(check.subject, 'verification subject');
      nonempty(check.note, 'verification note');
      if (check.type === 'automated' ? !check.command : check.command !== null) fail('Only automated checks have a command.');
      if (check.type === 'automated') nonempty(check.command, 'verification command');
      if (check.result !== (check.type === 'exempt' ? 'exempt' : 'pass')) fail('Only passing or exempt checks may be checkpointed.');
      if (check.assertions !== undefined) {
        if (check.type === 'exempt' || !Array.isArray(check.assertions) || !check.assertions.length) fail('Assertions require an actual automated or manual check.');
        const clauses = new Set();
        for (const assertion of check.assertions) {
          exactKeys(assertion, ['clause', 'expected', 'observed', 'source'], 'check assertion');
          for (const field of ['clause', 'expected', 'observed', 'source']) nonempty(assertion[field], `assertion ${field}`);
          if (clauses.has(assertion.clause)) fail('Duplicate assertion clause within a check.');
          clauses.add(assertion.clause);
        }
      }
    }
  }
  if (value.gate !== null) {
    exactKeys(value.gate, ['mode', 'result', 'note', 'full_suites'], 'verification gate');
    if (!['none', 'full-suite', 'scoped', 'scoped+full'].includes(value.gate.mode) || !['pass', 'fail', 'no-result', 'manual-accepted'].includes(value.gate.result)) fail('Invalid verification gate.');
    nonempty(value.gate.note, 'verification gate note');
    if (value.gate.mode !== 'none' && value.gate.result === 'manual-accepted') fail('Manual acceptance requires gate mode none.');
    if (value.gate.mode === 'none' && value.gate.result === 'pass') fail('An absent automated gate cannot pass.');
    if (value.gate.full_suites !== undefined) {
      if (!Array.isArray(value.gate.full_suites)) fail('Full-suite evidence must be an array.');
      const repos = new Set();
      for (const suite of value.gate.full_suites) {
        exactKeys(suite, ['repo', 'command', 'result', 'note'], 'full-suite evidence');
        nonempty(suite.repo, 'full-suite repo');
        if (repos.has(suite.repo)) fail('Duplicate full-suite evidence repo.');
        repos.add(suite.repo);
        nonempty(suite.note, 'full-suite note');
        if (!['pass', 'fail', 'not-run'].includes(suite.result)) fail('Invalid full-suite result.');
        if (suite.result === 'not-run' ? suite.command !== null : typeof suite.command !== 'string' || !suite.command.trim()) fail('Executed full suites require a command; not-run suites use null.');
      }
      if (value.gate.mode === 'none' && value.gate.full_suites.some((suite) => suite.result !== 'not-run')) fail('An absent gate cannot claim executed full suites.');
    }
  }
  if (!Array.isArray(value.acceptance)) fail('Verification acceptance must be an array.');
  const seenAcceptance = new Set();
  for (const item of value.acceptance) {
    exactKeys(item, ['criterion', 'clause', 'scenario', 'status', 'step', 'note'], 'verification acceptance');
    nonempty(item.criterion, 'criterion');
    nonempty(item.scenario, 'scenario');
    nonempty(item.note, 'acceptance note');
    if (requireClauses || item.clause !== undefined) nonempty(item.clause, 'requirement clause');
    const key = acceptanceKey(item);
    if (seenAcceptance.has(key)) fail('Duplicate acceptance row.');
    seenAcceptance.add(key);
    if (!['automated', 'manual', 'unverified'].includes(item.status)) fail('Invalid acceptance status.');
    if (item.status === 'unverified') {
      if (item.step !== null) fail('Unverified acceptance must not claim a step.');
    } else {
      if (!Number.isSafeInteger(item.step) || !seenSteps.has(item.step)) fail('Verified acceptance cites an unknown step.');
      const checks = value.steps.find((step) => step.number === item.step).checks;
      if (!checks.some((check) => check.type === item.status && check.subject === item.scenario && check.result === 'pass' &&
          (!(requireClauses || item.clause !== undefined) || check.assertions?.some((assertion) => assertion.clause === item.clause)))) {
        fail(`Acceptance evidence is missing for ${item.criterion}.`);
      }
    }
  }
  if (requireComplete || outcome === 'PASSED' || outcome === 'VERIFIED_MANUALLY' || outcome === 'GATE_FAILED' || outcome === 'GATE_NO_RESULT') {
    if (!value.gate) fail('Terminal verification requires gate evidence.');
    if (outcome === 'PASSED' && value.gate.result !== 'pass') fail('PASSED execution requires a passing gate.');
    if (outcome === 'GATE_FAILED' && value.gate.result !== 'fail') fail('Failed gate evidence disagrees with Execute.');
    if (outcome === 'GATE_NO_RESULT' && !['no-result', 'manual-accepted'].includes(value.gate.result)) fail('No-result gate evidence disagrees with Execute.');
    if (outcome === 'VERIFIED_MANUALLY' && (value.gate.mode !== 'none' || value.gate.result !== 'manual-accepted')) fail('VERIFIED_MANUALLY requires an explicitly accepted manual gate.');
    if (outcome === 'VERIFIED_MANUALLY' && plan === null) fail('Manual completion requires the plan and its verification policy.');
    if (plan !== null) {
      const stepsSection = plan.split(/^## Steps\s*$/m)[1]?.split(/^## Test Plan\s*$/m)[0];
      if (!stepsSection) fail('Plan has no Steps section.');
      const stepNumbers = [...stepsSection.matchAll(/^### Step (\d+)\b/gm)].map((match) => Number(match[1]));
      if (!stepNumbers.length || stepNumbers.length !== seenSteps.size || stepNumbers.some((number) => !seenSteps.has(number))) {
        fail('Terminal verification step evidence does not match the plan.');
      }
      const expected = traceability(plan, { requireClauses }).map(acceptanceKey).sort();
      const actual = [...seenAcceptance].sort();
      if (JSON.stringify(expected) !== JSON.stringify(actual)) fail('Verification acceptance rows do not match the plan AC traceability table.');
      const policy = testingPolicy(plan);
      if (outcome === 'VERIFIED_MANUALLY' && (!policy || policy.some((row) => row.Mode !== 'manual'))) fail('VERIFIED_MANUALLY requires an explicit all-manual policy.');
      if (policy && outcome === 'PASSED' && policy.every((row) => row.Mode === 'manual')) fail('An all-manual policy cannot report an automated PASS.');
      if (policy) {
        const automated = policy.filter((row) => row.Mode === 'automated').map((row) => row.Repo);
        const suites = value.gate.full_suites ?? [];
        if (suites.length !== automated.length || automated.some((repo) => !suites.some((suite) => suite.repo === repo))) fail('Gate evidence must name every automated product repo full suite.');
        if (outcome === 'PASSED' && suites.some((suite) => suite.result !== 'pass')) fail('Required automated full suites did not all pass.');
        if (suites.some((suite) => suite.result === 'fail') && value.gate.result !== 'fail') fail('A failing full suite requires a failed gate.');
      }
      if (outcome === 'PASSED' || outcome === 'VERIFIED_MANUALLY' || (requireComplete && value.gate.result === 'manual-accepted')) validateManualEvidence(plan, value, policy);
    }
  }
  return value;
}

export async function readVerification(root, relative, options) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(options.ticket) ||
      !/^make-it-work\/[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9._-]+-verification-v\d+\.json$/.test(relative) ||
      relative !== runArtifact(options.ticket, path.posix.basename(relative))) fail('Invalid verification artifact path.');
  const rootPath = await realpath(root);
  const resolved = path.resolve(rootPath, relative);
  const actual = await realpath(resolved);
  if (!actual.startsWith(`${runDirectory(rootPath, options.ticket)}${path.sep}`)) fail('Verification artifact escapes run root.');
  return validateVerification(JSON.parse(await readFile(actual, 'utf8')), options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const action = args.shift();
  const options = {};
  while (args.length) {
    const flag = args.shift();
    if (!['--root', '--file', '--ticket', '--plan-version', '--plan', '--outcome', '--state', '--require-clauses'].includes(flag) || !args.length) fail(`Invalid option: ${flag}`);
    options[flag.slice(2).replaceAll('-', '_')] = args.shift();
  }
  if (action !== 'check' || !options.root || !options.file || !options.ticket || !options.plan_version) fail('Usage: verification.mjs check --root ROOT --file RELATIVE --ticket TICKET --plan-version N [--plan PLAN --outcome OUTCOME]');
  if (options.require_clauses !== undefined && options.require_clauses !== '1') fail('--require-clauses must be 1.');
  const plan = options.plan ? await readFile(options.plan, 'utf8') : null;
  const state = options.state ? parseState(await readFile(options.state, 'utf8'), options.state) : null;
  const ledger = await readVerification(options.root, options.file, { ticket: options.ticket, planVersion: Number(options.plan_version), plan, outcome: options.outcome ?? null, requireClauses: state?.fields.acceptance_evidence_version === '1' || options.require_clauses === '1' });
  if (state) {
    if (state.fields.ticket !== options.ticket || state.fields.plan_version !== options.plan_version) fail('Verification audit must belong to this ticket and plan version.');
    const hash = createHash('sha256').update(JSON.stringify(ledger)).digest('hex');
    await checkpointResult(options.state, {
      id: `verification:${hash}:${options.outcome ?? 'partial'}`,
      text: `Verification ledger validated${options.outcome ? ` for ${options.outcome}` : ' (partial check)'}. Gate: ${ledger.gate?.result ?? 'not recorded'}; acceptance: ${ledger.acceptance.filter((item) => item.status !== 'unverified').length}/${ledger.acceptance.length} verified.`,
      reference: `${options.file}; sha256:${hash}`,
    });
  }
  console.log(JSON.stringify({ valid: true }));
}
