import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fail = (message) => { throw new Error(message); };
const nonempty = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} must be nonempty.`);
  return value;
};
const exactKeys = (value, names, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`);
  if (Object.keys(value).some((key) => !names.includes(key))) fail(`${label} has an unknown field.`);
};

export function traceability(plan) {
  const tail = plan.split(/^\*\*AC traceability:\*\*\s*$/m)[1];
  if (!tail) fail('Plan has no AC traceability table.');
  const rows = [];
  for (const line of tail.split('\n')) {
    if (!line.trim()) { if (rows.length) break; continue; }
    if (!line.startsWith('|')) { if (rows.length) break; continue; }
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 2) fail('AC traceability table must have exactly two columns.');
    if (cells[0] === 'Acceptance criterion' || /^-+$/.test(cells[0])) continue;
    if (!cells[0] || !cells[1]) fail('AC traceability row is incomplete.');
    rows.push({ criterion: cells[0], scenario: cells[1] });
  }
  if (!rows.length) fail('Plan has no AC traceability rows.');
  return rows;
}

export function validateVerification(value, { ticket, planVersion, plan = null, outcome = null, requireComplete = false } = {}) {
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
      exactKeys(check, ['type', 'subject', 'command', 'result', 'note'], 'verification check');
      if (!['automated', 'manual', 'exempt'].includes(check.type)) fail('Invalid verification check type.');
      nonempty(check.subject, 'verification subject');
      nonempty(check.note, 'verification note');
      if (check.type === 'automated' ? !check.command : check.command !== null) fail('Only automated checks have a command.');
      if (check.type === 'automated') nonempty(check.command, 'verification command');
      if (check.result !== (check.type === 'exempt' ? 'exempt' : 'pass')) fail('Only passing or exempt checks may be checkpointed.');
    }
  }
  if (value.gate !== null) {
    exactKeys(value.gate, ['mode', 'result', 'note'], 'verification gate');
    if (!['none', 'full-suite', 'scoped'].includes(value.gate.mode) || !['pass', 'fail', 'no-result', 'manual-accepted'].includes(value.gate.result)) fail('Invalid verification gate.');
    nonempty(value.gate.note, 'verification gate note');
    if (value.gate.mode !== 'none' && value.gate.result === 'manual-accepted') fail('Manual acceptance requires gate mode none.');
  }
  if (!Array.isArray(value.acceptance)) fail('Verification acceptance must be an array.');
  const seenAcceptance = new Set();
  for (const item of value.acceptance) {
    exactKeys(item, ['criterion', 'scenario', 'status', 'step', 'note'], 'verification acceptance');
    nonempty(item.criterion, 'criterion');
    nonempty(item.scenario, 'scenario');
    nonempty(item.note, 'acceptance note');
    const key = `${item.criterion}\0${item.scenario}`;
    if (seenAcceptance.has(key)) fail('Duplicate acceptance row.');
    seenAcceptance.add(key);
    if (!['automated', 'manual', 'unverified'].includes(item.status)) fail('Invalid acceptance status.');
    if (item.status === 'unverified') {
      if (item.step !== null) fail('Unverified acceptance must not claim a step.');
    } else {
      if (!Number.isSafeInteger(item.step) || !seenSteps.has(item.step)) fail('Verified acceptance cites an unknown step.');
      const checks = value.steps.find((step) => step.number === item.step).checks;
      if (!checks.some((check) => check.type === item.status && check.subject === item.scenario && check.result === 'pass')) {
        fail(`Acceptance evidence is missing for ${item.criterion}.`);
      }
    }
  }
  if (requireComplete || outcome === 'PASSED' || outcome === 'GATE_FAILED' || outcome === 'GATE_NO_RESULT') {
    if (!value.gate) fail('Terminal verification requires gate evidence.');
    if (outcome === 'PASSED' && value.gate.result !== 'pass') fail('PASSED execution requires a passing gate.');
    if (outcome === 'GATE_FAILED' && value.gate.result !== 'fail') fail('Failed gate evidence disagrees with Execute.');
    if (outcome === 'GATE_NO_RESULT' && !['no-result', 'manual-accepted'].includes(value.gate.result)) fail('No-result gate evidence disagrees with Execute.');
    if (plan !== null) {
      const stepsSection = plan.split(/^## Steps\s*$/m)[1]?.split(/^## Test Plan\s*$/m)[0];
      if (!stepsSection) fail('Plan has no Steps section.');
      const stepNumbers = [...stepsSection.matchAll(/^### Step (\d+)\b/gm)].map((match) => Number(match[1]));
      if (!stepNumbers.length || stepNumbers.length !== seenSteps.size || stepNumbers.some((number) => !seenSteps.has(number))) {
        fail('Terminal verification step evidence does not match the plan.');
      }
      const expected = traceability(plan).map((row) => `${row.criterion}\0${row.scenario}`).sort();
      const actual = [...seenAcceptance].sort();
      if (JSON.stringify(expected) !== JSON.stringify(actual)) fail('Verification acceptance rows do not match the plan AC traceability table.');
    }
  }
  return value;
}

export async function readVerification(root, relative, options) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || !/^make-it-work\/[A-Za-z0-9._-]+-verification-v\d+\.json$/.test(relative)) fail('Invalid verification artifact path.');
  const rootPath = await realpath(root);
  const resolved = path.resolve(rootPath, relative);
  const actual = await realpath(resolved);
  if (!actual.startsWith(`${rootPath}${path.sep}make-it-work${path.sep}`)) fail('Verification artifact escapes run root.');
  return validateVerification(JSON.parse(await readFile(actual, 'utf8')), options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const action = args.shift();
  const options = {};
  while (args.length) {
    const flag = args.shift();
    if (!['--root', '--file', '--ticket', '--plan-version', '--plan', '--outcome'].includes(flag) || !args.length) fail(`Invalid option: ${flag}`);
    options[flag.slice(2).replaceAll('-', '_')] = args.shift();
  }
  if (action !== 'check' || !options.root || !options.file || !options.ticket || !options.plan_version) fail('Usage: verification.mjs check --root ROOT --file RELATIVE --ticket TICKET --plan-version N [--plan PLAN --outcome OUTCOME]');
  const plan = options.plan ? await readFile(options.plan, 'utf8') : null;
  await readVerification(options.root, options.file, { ticket: options.ticket, planVersion: Number(options.plan_version), plan, outcome: options.outcome ?? null });
  console.log(JSON.stringify({ valid: true }));
}
