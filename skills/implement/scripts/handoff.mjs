#!/usr/bin/env node

import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseState } from './render-status.mjs';
import { readVerification } from './verification.mjs';

const STAGES = {
  gaps: ['SPEC_SAVED'],
  plan: ['PLAN_SAVED', 'FIX_PLAN_READY'],
  execute: ['PASSED', 'GUARDRAIL', 'RETRY_LIMIT', 'GATE_FAILED', 'GATE_NO_RESULT', 'EXECUTE_STOPPED'],
  review: ['CLEAN', 'FIX_REQUIRED', 'REPLAN_REQUIRED', 'HUMAN_DECISION'],
};
const ROUTES = new Set(['fix', 'replan', 'human']);
const MODES = new Set(['none', 'full-suite', 'scoped']);

function fail(message) { throw new Error(message); }
function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object.`);
  return value;
}
function string(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} must be a nonempty string.`);
  return value;
}
function integer(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${name} must be a nonnegative integer.`);
  return value;
}
function stringList(value, name) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    fail(`${name} must be an array of nonempty strings.`);
  }
  return value;
}
function keys(value, allowed, name) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${name} has an unknown field: ${key}.`);
}

export function validateHandoff(input) {
  const h = object(input, 'handoff');
  keys(h, ['version', 'ticket', 'stage', 'plan_version', 'review_cycle', 'status', 'outcome', 'artifacts', 'data', 'reason', 'code', 'questions'], 'handoff');
  if (h.version !== 1) fail('handoff.version must be 1.');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(h.ticket ?? '')) fail('handoff.ticket is unsafe.');
  if (!Object.hasOwn(STAGES, h.stage)) fail(`Unknown handoff stage: ${h.stage}.`);
  integer(h.plan_version, 'handoff.plan_version');
  if (h.stage !== 'gaps' && h.plan_version < 1) fail('Plan, Execute, and Review require a positive plan_version.');
  if (h.stage === 'review') integer(h.review_cycle, 'handoff.review_cycle');
  else if (h.review_cycle !== undefined) fail('Only Review uses review_cycle.');
  if (!['done', 'blocked', 'needs_input'].includes(h.status)) fail(`Unknown handoff status: ${h.status}.`);
  if (h.status !== 'done') {
    if (h.outcome !== undefined || h.artifacts !== undefined || h.data !== undefined) {
      fail('A non-done handoff cannot claim an outcome or artifacts.');
    }
    if (h.status === 'blocked') {
      string(h.reason, 'handoff.reason');
      if (h.code !== undefined && h.code !== 'PRE_EXISTING_REGRESSION') fail('Unknown blocker code.');
      if (h.code === 'PRE_EXISTING_REGRESSION' && h.stage !== 'plan') fail('Baseline blocker is only valid for planning.');
    }
    if (h.status === 'needs_input') {
      if (!Array.isArray(h.questions) || h.questions.length === 0) fail('needs_input requires questions.');
      h.questions.forEach((q, i) => string(q, `handoff.questions[${i}]`));
    }
    return h;
  }
  if (h.reason !== undefined || h.questions !== undefined || h.code !== undefined) {
    fail('A done handoff cannot contain blocker or question fields.');
  }
  if (!STAGES[h.stage].includes(h.outcome)) fail(`Invalid ${h.stage} outcome: ${h.outcome}.`);
  const artifacts = object(h.artifacts, 'handoff.artifacts');
  const data = object(h.data, 'handoff.data');
  const expectedArtifact = h.stage === 'gaps' ? 'spec' : h.stage === 'plan' ? 'plan' : 'report';
  keys(artifacts, h.stage === 'execute' ? [expectedArtifact, 'verification'] : [expectedArtifact], 'handoff.artifacts');
  string(artifacts[expectedArtifact], `handoff.artifacts.${expectedArtifact}`);
  if (artifacts.verification !== undefined) string(artifacts.verification, 'handoff.artifacts.verification');
  if (h.stage === 'gaps') {
    keys(data, ['tbd_items', 'context_updated'], 'handoff.data');
    integer(data.tbd_items, 'handoff.data.tbd_items');
    stringList(data.context_updated, 'handoff.data.context_updated');
  } else if (h.stage === 'plan') {
    keys(data, ['mode', 'steps_added', 'recommend_replan', 'context_updated'], 'handoff.data');
    if (!['initial', 'replan', 'amend'].includes(data.mode)) fail('Invalid plan mode.');
    if (data.mode === 'initial' && h.plan_version !== 1) fail('Initial plan must be version 1.');
    if (data.mode === 'replan' && h.plan_version < 2) fail('Replan requires plan_version 2 or later.');
    if ((data.mode === 'amend') !== (h.outcome === 'FIX_PLAN_READY')) fail('Plan mode and outcome disagree.');
    if (data.mode === 'amend') integer(data.steps_added, 'handoff.data.steps_added');
    else if (data.steps_added !== null) fail('Initial/replan steps_added must be null.');
    if (data.recommend_replan !== null) string(data.recommend_replan, 'handoff.data.recommend_replan');
    if (data.mode !== 'amend' && data.recommend_replan !== null) fail('Only amend mode can recommend replanning.');
    stringList(data.context_updated, 'handoff.data.context_updated');
  } else if (h.stage === 'execute') {
    keys(data, ['discoveries', 'failing_tests', 'gate'], 'handoff.data');
    stringList(data.discoveries, 'handoff.data.discoveries');
    stringList(data.failing_tests, 'handoff.data.failing_tests');
    if (!MODES.has(data.gate)) fail('Invalid execution gate.');
    if (h.outcome === 'GATE_FAILED' && data.failing_tests.length === 0) {
      fail('GATE_FAILED requires identified failing tests; use needs_input if they are unknown.');
    }
  } else {
    keys(data, ['findings', 'context_gaps'], 'handoff.data');
    if (!Array.isArray(data.findings)) fail('Review findings must be an array.');
    data.findings.forEach((finding, i) => {
      object(finding, `finding ${i}`);
      keys(finding, ['id', 'route', 'region', 'introduced_by_fix_of'], `finding ${i}`);
      string(finding.id, `finding ${i}.id`);
      if (!ROUTES.has(finding.route)) fail(`Invalid finding ${i} route.`);
      string(finding.region, `finding ${i}.region`);
      if (finding.introduced_by_fix_of !== null) string(finding.introduced_by_fix_of, `finding ${i}.introduced_by_fix_of`);
    });
    stringList(data.context_gaps, 'handoff.data.context_gaps');
    const routes = new Set(data.findings.map((f) => f.route));
    const expected = routes.has('replan') ? 'REPLAN_REQUIRED' : routes.has('human') ? 'HUMAN_DECISION' : routes.has('fix') ? 'FIX_REQUIRED' : 'CLEAN';
    if (h.outcome !== expected) fail(`Review outcome ${h.outcome} disagrees with finding routes (${expected}).`);
  }
  return h;
}

export async function validateArtifacts(handoff, root) {
  const h = validateHandoff(handoff);
  if (h.status !== 'done') return h;
  const rootPath = await realpath(root);
  const expectedNames = {
    gaps: [`${h.ticket}-spec.md`],
    plan: [`${h.ticket}-plan.md`, `${h.ticket}-plan-v${h.plan_version}.md`],
    execute: [`${h.ticket}-execute.md`],
    review: [`${h.ticket}-review.md`],
  };
  for (const [kind, artifact] of Object.entries(h.artifacts)) {
    if (path.isAbsolute(artifact)) fail(`Artifact path must be relative: ${artifact}`);
    if (kind === 'verification') {
      const expected = `${h.ticket}-verification-v${h.plan_version}.json`;
      if (path.basename(artifact) !== expected) fail(`Verification artifact does not match ticket and plan version: ${artifact}`);
      const planName = h.plan_version === 1 ? `${h.ticket}-plan.md` : `${h.ticket}-plan-v${h.plan_version}.md`;
      const plan = await readFile(path.join(rootPath, 'make-it-work', planName), 'utf8');
      await readVerification(rootPath, artifact, { ticket: h.ticket, planVersion: h.plan_version, plan, outcome: h.outcome });
      continue;
    }
    if (!expectedNames[h.stage].includes(path.basename(artifact))) fail(`Artifact filename does not match ${h.stage} and ticket: ${artifact}`);
    if (h.stage === 'plan') {
      const expected = h.plan_version === 1 ? `${h.ticket}-plan.md` : `${h.ticket}-plan-v${h.plan_version}.md`;
      if (path.basename(artifact) !== expected) fail(`Plan artifact does not match plan_version: ${artifact}`);
    }
    const resolved = path.resolve(rootPath, artifact);
    if (!resolved.startsWith(`${rootPath}${path.sep}`)) fail(`Artifact escapes project root: ${artifact}`);
    const relative = path.relative(rootPath, resolved);
    if (!relative.startsWith(`make-it-work${path.sep}`)) fail(`Artifact must be under make-it-work/: ${artifact}`);
    const actual = await realpath(resolved);
    if (!actual.startsWith(`${rootPath}${path.sep}make-it-work${path.sep}`)) fail(`Artifact symlink escapes run artifacts: ${artifact}`);
    if (!(await stat(resolved)).isFile()) fail(`Artifact is not a file: ${artifact}`);
    if (h.stage === 'execute' || h.stage === 'review') {
      const report = await readFile(actual, 'utf8');
      const label = h.stage === 'execute' ? 'Execute outcome' : 'Orchestrator outcome';
      const declared = report.match(new RegExp(`^${label}: ([A-Z_]+)\\s*$`, 'gm')) ?? [];
      if (declared.length !== 1 || declared[0].trim() !== `${label}: ${h.outcome}`) {
        fail(`${h.stage} handoff outcome disagrees with its Markdown report.`);
      }
    }
  }
  return h;
}

function outcome(action, reason, extra = {}) { return { action, reason, ...extra }; }
function ask(reason, routes) { return outcome('ask', reason, { choices: Object.keys(routes), routes }); }

function decideCore(state, handoff, { relatedFailures = null, previousReview = null } = {}) {
  const fields = state.fields ?? state;
  const h = validateHandoff(handoff);
  if (h.ticket !== fields.ticket) fail('Handoff ticket does not match state.');
  if (h.plan_version !== Number(fields.plan_version)) fail('Handoff plan_version does not match state.');
  if (h.stage === 'review' && h.review_cycle !== Number(fields.review_cycle)) fail('Handoff review_cycle does not match state.');
  const expectedStage = fields.phase === 'close-the-gaps' ? 'gaps' : fields.phase === 'fix-plan' ? 'plan' : fields.phase;
  if (h.stage !== expectedStage) fail(`Handoff stage ${h.stage} does not match state phase ${fields.phase}.`);
  if (h.stage === 'plan' && h.status === 'done' && ((fields.phase === 'fix-plan') !== (h.data.mode === 'amend'))) fail('Plan mode does not match state phase.');
  if (!['guided', 'autonomous', 'autopilot'].includes(fields.autonomy)) fail('Choose autonomy before routing a handoff.');
  if (h.status === 'blocked') {
    if (h.code === 'PRE_EXISTING_REGRESSION' && fields.autonomy !== 'autopilot') {
      return ask(h.reason, {
        'call-out-and-proceed': outcome('phase', 'Retry planning with the accepted baseline failure.', { phase: fields.phase, operation: 'resume-with-baseline-decision' }),
        stop: outcome('stop', 'Developer stopped at the baseline failure.'),
      });
    }
    return outcome('stop', h.reason);
  }
  if (h.status === 'needs_input') return fields.autonomy === 'autopilot'
    ? outcome('stop', 'Stage needs an answer with no documented safe default.')
    : outcome('ask', 'Stage questions require an answer.', { questions: h.questions });
  const guided = fields.autonomy === 'guided';
  const autopilot = fields.autonomy === 'autopilot';
  const fixes = Number(fields.fix_cycle);
  const reviews = Number(fields.review_cycle);
  const replans = Number(fields.replans_used);
  if (![fixes, reviews, replans].every(Number.isSafeInteger)) fail('State loop counters are invalid.');

  if (h.stage === 'gaps') {
    if (h.data.tbd_items > 0) return autopilot
      ? outcome('stop', 'Refined spec still has unresolved TBD items.')
      : ask('Resolve or explicitly accept unresolved TBD items.', {
        resolve: outcome('phase', 'Refine unresolved items.', { phase: 'close-the-gaps' }),
        proceed: outcome('phase', 'Developer accepted unresolved items.', { phase: guided ? 'spec-approval' : 'plan' }),
        stop: outcome('stop', 'Developer stopped at unresolved items.'),
      });
    return outcome('phase', 'Spec is ready.', { phase: guided ? 'spec-approval' : 'plan' });
  }
  if (h.stage === 'plan' && fields.phase === 'plan') {
    return outcome('phase', 'Plan is ready.', { phase: guided ? 'plan-approval' : 'execute' });
  }
  if (h.stage === 'plan') {
    if (h.data.recommend_replan && replans < 2) return guided
      ? ask(h.data.recommend_replan, {
        replan: outcome('phase', h.data.recommend_replan, { phase: 'plan', operation: 'replan' }),
        continue: outcome('phase', 'Continue with fix plan.', { phase: h.data.steps_added > 0 ? 'execute' : 'review' }),
        stop: outcome('stop', 'Developer stopped after replan recommendation.'),
      })
      : outcome('phase', h.data.recommend_replan, { phase: 'plan', operation: 'replan' });
    return outcome('phase', 'Fix planning finished.', { phase: h.data.steps_added > 0 ? 'execute' : 'review' });
  }
  if (h.stage === 'execute') {
    if (fields.verification_version === '1' && !h.artifacts.verification) fail('New Execute runs require a verification artifact.');
    if (h.outcome === 'PASSED') return outcome('phase', 'Execution passed.', { phase: 'review' });
    if (h.outcome === 'GUARDRAIL' || h.outcome === 'RETRY_LIMIT') {
      if (autopilot) return outcome('stop', `Execution stopped at ${h.outcome}.`);
      if (guided) return ask(`Execution stopped at ${h.outcome}.`, {
        ...(replans < 2 ? { replan: outcome('phase', 'Developer chose replan.', { phase: 'plan', operation: 'replan' }) } : {}),
        'edit-and-resume': outcome('phase', 'Resume execution after developer edits.', { phase: 'execute', operation: 'resume-after-edit' }),
        stop: outcome('stop', 'Developer stopped execution.'),
      });
      return replans < 2 ? outcome('phase', `Execution stopped at ${h.outcome}.`, { phase: 'plan', operation: 'replan' }) : outcome('stop', 'Replan limit reached.');
    }
    if (h.outcome === 'GATE_FAILED') {
      if (relatedFailures === null) return outcome('triage', 'Classify failing tests as related, unrelated, or uncertain.');
      integer(relatedFailures, 'relatedFailures');
      if (relatedFailures > h.data.failing_tests.length) fail('relatedFailures exceeds failing_tests count.');
      if (relatedFailures === 0) return outcome('phase', 'Only unrelated regressions remain.', { phase: 'review' });
      if (fixes >= 3) return outcome('stop', 'Fix round limit reached.');
      return guided ? ask('Confirm the related/unrelated regression split.', {
        'fix-related': outcome('phase', 'Fix related regressions.', { phase: 'fix-plan' }),
        'treat-all-unrelated': outcome('phase', 'Developer accepted all failures as unrelated.', { phase: 'review' }),
        stop: outcome('stop', 'Developer stopped at failed regression gate.'),
      }) : outcome('phase', 'Related regression requires a fix plan.', { phase: 'fix-plan' });
    }
    if (h.outcome === 'GATE_NO_RESULT') return autopilot ? outcome('stop', 'Regression gate produced no result.') : ask('Choose manual test walkthrough or stop.', {
      'manual-walkthrough': outcome('phase', 'Developer accepted manual walkthrough.', { phase: 'review', operation: 'manual-walkthrough' }),
      stop: outcome('stop', 'Developer stopped without a regression result.'),
    });
    return outcome('stop', 'Execution stopped before a completed result.');
  }
  if (h.outcome === 'CLEAN') return outcome('phase', 'Review is clean.', { phase: 'final-sync' });
  if (reviews >= 4) return outcome('stop', 'Review limit reached.');
  if (h.outcome === 'REPLAN_REQUIRED') {
    if (replans >= 2) return outcome('stop', 'Replan limit reached.');
    if (h.data.findings.some((f) => f.route === 'human')) return autopilot
      ? outcome('stop', 'Review requires a human decision.')
      : ask('Resolve human findings, then replan.', {
        'decide-and-replan': outcome('phase', 'Human findings decided.', { phase: 'plan', operation: 'replan' }),
        stop: outcome('stop', 'Developer stopped at review findings.'),
      });
    return outcome('phase', 'Review requires replanning.', { phase: 'plan', operation: 'replan' });
  }
  if (h.outcome === 'HUMAN_DECISION') {
    if (fixes >= 3) return outcome('stop', 'Fix round limit reached.');
    return autopilot ? outcome('stop', 'Review requires a human decision.')
      : ask('Resolve human findings, then fix.', {
        'decide-and-fix': outcome('phase', 'Human findings decided.', { phase: 'fix-plan' }),
        stop: outcome('stop', 'Developer stopped at review findings.'),
      });
  }
  const previous = previousReview ? validateHandoff(previousReview) : null;
  if (previous && (previous.stage !== 'review' || previous.status !== 'done' || previous.ticket !== h.ticket || previous.plan_version !== h.plan_version || previous.review_cycle >= h.review_cycle)) fail('Previous review handoff does not match.');
  const oldRegions = new Set(previous?.data.findings.map((f) => f.region) ?? []);
  const repeat = h.data.findings.some((f) => f.introduced_by_fix_of !== null || oldRegions.has(f.region));
  if (repeat && replans < 2) return guided
    ? ask('Review found a repeat offender; consider replanning.', {
      replan: outcome('phase', 'Developer chose replan for repeat offender.', { phase: 'plan', operation: 'replan' }),
      ...(fixes < 3 ? { 'continue-patching': outcome('phase', 'Developer chose another patch.', { phase: 'fix-plan' }) } : {}),
      stop: outcome('stop', 'Developer stopped at repeat finding.'),
    })
    : outcome('phase', 'Review found a repeat offender.', { phase: 'plan', operation: 'replan' });
  if (fixes >= 3) return outcome('stop', 'Fix round limit reached.');
  if (guided && fixes >= 1) return ask('Choose another patch round or replan.', {
    'patch-again': outcome('phase', 'Developer chose another patch.', { phase: 'fix-plan' }),
    ...(replans < 2 ? { replan: outcome('phase', 'Developer chose replan.', { phase: 'plan', operation: 'replan' }) } : {}),
    stop: outcome('stop', 'Developer stopped at review findings.'),
  });
  return outcome('phase', 'Review findings need a fix plan.', { phase: 'fix-plan' });
}

export function decideNext(state, handoff, options = {}) {
  const result = decideCore(state, handoff, options);
  if (options.choice === undefined) {
    if (result.routes) {
      const { routes, ...visible } = result;
      return visible;
    }
    return result;
  }
  if (result.action !== 'ask' || !result.routes || !Object.hasOwn(result.routes, options.choice)) {
    fail(`Choice ${options.choice} is not valid for this handoff.`);
  }
  return result.routes[options.choice];
}

async function main(args) {
  const command = args.shift();
  const options = {};
  while (args.length) {
    const flag = args.shift();
    if (!flag.startsWith('--') || !args.length) fail(`Invalid argument: ${flag}`);
    options[flag.slice(2)] = args.shift();
  }
  if (!['validate', 'next'].includes(command) || !options.handoff || !options.root) {
    fail('Usage: handoff.mjs validate|next --handoff PATH --root PROJECT_ROOT [--state PATH] [--previous-review PATH] [--related-failures N] [--choice CHOICE]');
  }
  const h = await validateArtifacts(JSON.parse(await readFile(options.handoff, 'utf8')), options.root);
  const expectedDirectory = path.resolve(options.root, 'make-it-work', `${h.ticket}-handoffs`);
  if (path.dirname(path.resolve(options.handoff)) !== expectedDirectory || !new RegExp(`^${h.stage}-[1-9]\\d*\\.json$`).test(path.basename(options.handoff))) {
    fail(`Handoff path must be make-it-work/${h.ticket}-handoffs/${h.stage}-<N>.json.`);
  }
  const currentNumber = Number(path.basename(options.handoff).match(/-(\d+)\.json$/)[1]);
  const numbers = (await readdir(expectedDirectory))
    .map((name) => name.match(new RegExp(`^${h.stage}-([1-9]\\d*)\\.json$`)))
    .filter(Boolean).map((match) => Number(match[1]));
  if (currentNumber !== Math.max(...numbers)) fail('Handoff is stale; use the newest result for this stage.');
  if (command === 'validate') return { valid: true, ticket: h.ticket, stage: h.stage, outcome: h.outcome ?? h.status };
  if (!options.state) fail('next requires --state.');
  const state = parseState(await readFile(options.state, 'utf8'), options.state);
  const previous = options['previous-review'] ? JSON.parse(await readFile(options['previous-review'], 'utf8')) : null;
  const related = options['related-failures'] === undefined ? null : Number(options['related-failures']);
  return decideNext(state, h, { previousReview: previous, relatedFailures: related, choice: options.choice });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((result) => console.log(JSON.stringify(result))).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
