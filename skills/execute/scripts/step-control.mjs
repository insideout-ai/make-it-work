#!/usr/bin/env node
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { args, atomicWrite, cli, digest, fail, integer, jsonInput, requireText, withLock } from '../../../scripts/lib/artifacts.mjs';
import { parseSteps, nextBatch, planHash } from '../../../scripts/lib/plan.mjs';
import { inspectPlan, updatePlan, executionDashboardState, checkpointExecutionActivity, completedActivity } from './plan-status.mjs';
import { traceability, validateVerification } from '../../implement/scripts/verification.mjs';

export function mutateExecution(journal, event, steps, completed) {
  const value = structuredClone(journal);
  if (event.action === 'resolve-stop') {
    if (!value.stopped) fail('There is no stopped execution to resolve.');
    if (event.source !== 'user' || !['chat', 'question'].includes(event.via)) fail('Resolving a correctness stop requires explicit user guidance.');
    requireText(event.reason, 'Resolution guidance');
    (value.history ??= []).push({ stopped: value.stopped, attempts: value.attempts, reason: event.reason });
    value.stopped = null; value.stop_detail = null; value.attempts = {}; value.attempt_events = {};
    value.active_steps = []; value.active_dispatch = null;
    return value;
  }
  if (event.action === 'stop' && value.stopped === event.reason && (value.stop_detail ?? null) === (event.detail ?? null)) return value;
  if (value.stopped) fail(`Execution stopped: ${value.stopped}. Resolve it before a fresh invocation.`);
  if (event.action === 'start') {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(event.id ?? '')) fail('A stable dispatch id is required.');
    const ids = event.steps, eligible = nextBatch(steps, completed, ids?.length > 1);
    if (!Array.isArray(ids) || !ids.length || ids.length > eligible.length || ids.some((id, i) => id !== eligible[i])) fail('Dispatch is not the next eligible step/batch.');
    if (value.receipts?.some((receipt) => receipt.checkpointed === false || receipt.steps.some((id) => id > completed))) fail('Recover the pending completion checkpoint before dispatch.');
    const prior = Object.hasOwn(value.dispatch_events ?? {}, event.id) ? value.dispatch_events[event.id] : null;
    if (prior) {
      if (JSON.stringify(prior) !== JSON.stringify(ids) || value.active_dispatch !== event.id) fail('Dispatch id is no longer active or belongs to other steps.');
      return value;
    }
    if (value.active_steps?.length) fail('A step/batch is already active; inspect it before dispatching again.');
    value.active_steps = [...ids]; value.active_dispatch = event.id;
    value.started_at = new Date().toISOString();
    (value.dispatch_events ??= {})[event.id] = [...ids];
  } else if (event.action === 'begin-attempt') {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(event.id ?? '')) fail('A stable fix-attempt id is required.');
    const number = integer(event.step, 'Step', 1);
    const prior = value.attempt_events?.[event.id];
    if (prior !== undefined) {
      if (prior !== number) fail('Attempt id belongs to another step.');
      return value;
    }
    if (number <= completed || !steps[number - 1]) fail('Attempt requires an unfinished existing step.');
    if (!nextBatch(steps, completed, event.parallel === true).includes(number)) fail('Attempt is outside the next eligible batch.');
    if (value.active_steps?.length && !value.active_steps.includes(number)) fail('Attempt is outside the active step/batch.');
    if (steps[number - 1].depends.some((dep) => dep > completed)) fail('Step dependencies are incomplete.');
    const attempts = value.attempts[number] ?? 0;
    if (attempts >= 5) fail('Retry limit reached; no sixth fix attempt.');
    value.attempts[number] = attempts + 1;
    (value.attempt_events ??= {})[event.id] = number;
  } else if (event.action === 'stop') {
    if (!['guardrail', 'retry-limit', 'execution-failed'].includes(event.reason)) fail('Invalid execution stop.');
    if (event.reason === 'execution-failed' || event.detail !== undefined) {
      requireText(event.detail, 'Execution failure detail');
      if (/[\r\n]/.test(event.detail)) fail('Execution failure detail must be one concise line.');
    }
    if (event.reason === 'retry-limit' && !Object.values(value.attempts).some((n) => n === 5)) fail('Retry limit has not been reached.');
    value.stopped = event.reason;
    value.stop_detail = event.detail ?? null;
    value.last_active_steps = value.active_steps ?? []; value.active_steps = []; value.active_dispatch = null;
  } else fail('Unsupported execution event.');
  return value;
}
async function readJournal(file, hash, steps, completed, allowEditedStop = false) {
  const stepHashes = steps.map((step) => digest(JSON.stringify(step)));
  let journal;
  try { journal = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return { version: 1, plan_hash: hash, step_hashes: stepHashes, attempts: {}, stopped: null, receipts: [] }; }
  if (journal.version !== 1 || !journal.attempts || !Array.isArray(journal.receipts) || !Array.isArray(journal.step_hashes) || Object.values(journal.attempts).some((value) => !Number.isSafeInteger(value) || value < 1 || value > 5)) fail('Execution journal is malformed or belongs to a changed plan.');
  if (journal.active_steps !== undefined && (!Array.isArray(journal.active_steps) || new Set(journal.active_steps).size !== journal.active_steps.length || journal.active_steps.some((n) => !Number.isSafeInteger(n) || n <= completed || n > steps.length))) fail('Execution journal has invalid active steps.');
  if (journal.plan_hash !== hash) {
    const prior = journal.step_hashes;
    const editedStop = journal.stopped && allowEditedStop && prior.slice(0, completed).every((value, i) => value === stepHashes[i]) && stepHashes.length >= completed;
    const appended = !journal.stopped && completed === prior.length && prior.length < stepHashes.length && prior.every((value, i) => value === stepHashes[i]);
    if (!editedStop && !appended) fail('Execution journal belongs to a changed plan; only an append-only fix amendment or explicitly resolved stop may retain it.');
    journal.plan_hash = hash; journal.step_hashes = stepHashes; journal.amendment_pending = true;
    await atomicWrite(file, JSON.stringify(journal, null, 2) + '\n');
  }
  return journal;
}
export async function executionControl(planPath, event, { ledgerPath, ticket, planVersion = 1, dashboardState } = {}) {
  if (!(await lstat(planPath)).isFile()) fail('Execution plan must be a regular file.');
  if (ledgerPath && (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ticket ?? '') || !Number.isSafeInteger(planVersion) || planVersion < 1 || path.dirname(path.resolve(ledgerPath)) !== path.dirname(path.resolve(planPath)) || path.basename(ledgerPath) !== `${ticket}-verification-v${planVersion}.json`)) fail('Verification ledger must match ticket/version beside its plan.');
  const journalPath = `${planPath}.execution.json`;
  return withLock(journalPath, async () => {
    const plan = await readFile(planPath, 'utf8');
    const steps = parseSteps(plan);
    const status = inspectPlan(plan);
    if (status.total !== steps.length) fail('Progress total does not match numbered steps.');
    const hash = planHash(plan);
    const resolving = event.action === 'resolve-stop';
    if (resolving && (event.source !== 'user' || !['chat', 'question'].includes(event.via) || !event.reason)) fail('Resolving a correctness stop requires explicit user guidance.');
    let journal = await readJournal(journalPath, hash, steps, status.completed, resolving);
    if (journal.amendment_pending) {
      if (!ledgerPath || !ticket) fail('Fix amendment requires the existing verification ledger.');
      let ledger;
      try { ledger = JSON.parse(await readFile(ledgerPath, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT' || status.completed) throw error; }
      if (ledger) {
      validateVerification(ledger, { ticket, planVersion, plan });
      const expected = traceability(plan);
      if (ledger.acceptance.some((row) => !expected.some((item) => item.criterion === row.criterion && item.scenario === row.scenario))) fail('Amendment changed prior AC traceability; reassess evidence before continuing.');
      for (const row of expected) if (!ledger.acceptance.some((item) => item.criterion === row.criterion && item.scenario === row.scenario)) ledger.acceptance.push({ ...row, status: 'unverified', step: null, note: 'New amendment scenario awaits evidence.' });
      ledger.gate = null;
      await atomicWrite(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
      }
      delete journal.amendment_pending;
      await atomicWrite(journalPath, JSON.stringify(journal, null, 2) + '\n');
    }
    if (['inspect', 'start'].includes(event.action)) {
      if (status.completed) {
        if (!ledgerPath || !ticket) fail('Resume requires the verification ledger.');
        const evidence = JSON.parse(await readFile(ledgerPath, 'utf8'));
        validateVerification(evidence, { ticket, planVersion, plan });
        for (let n = 1; n <= status.completed; n += 1) if (!evidence.steps.some((step) => step.number === n)) fail(`Completed step ${n} has no evidence.`);
      }
      if (event.action === 'inspect') return { ...status, attempts: journal.attempts, stopped: journal.stopped, active_steps: journal.active_steps ?? [], active_dispatch: journal.active_dispatch ?? null, started_at: journal.active_steps?.length ? journal.started_at : null, next: journal.stopped ? [] : nextBatch(steps, status.completed, event.parallel === true) };
    }
    if (event.action !== 'complete') {
      journal = mutateExecution(journal, event, steps, status.completed);
      await atomicWrite(journalPath, JSON.stringify(journal, null, 2) + '\n');
      if (event.action === 'start') {
        const ids = journal.active_steps;
        const subject = ids.length === 1 ? `step ${ids[0]}` : `steps ${ids.join(', ')}`;
        const activity = journal.activity_dispatch === event.id ? undefined : `Running ${subject} of ${status.total} — ${ids.map((id) => steps[id - 1].title).join('; ')}. ${status.completed} of ${status.total} steps verified complete.`;
        if (await checkpointExecutionActivity(planPath, dashboardState, activity)) {
          journal.activity_dispatch = event.id;
          await atomicWrite(journalPath, JSON.stringify(journal, null, 2) + '\n');
        }
      } else if (event.action === 'stop') {
        await checkpointExecutionActivity(planPath, dashboardState, `Execution stopped${journal.last_active_steps?.length ? ` at step ${journal.last_active_steps.join(', ')}` : ''}: ${journal.stopped}${journal.stop_detail ? ` — ${journal.stop_detail}` : ''}. ${status.completed} of ${status.total} steps verified complete.`, true);
      } else if (event.action === 'resolve-stop') {
        await checkpointExecutionActivity(planPath, dashboardState, `Execution stop resolved with user guidance. ${completedActivity(status.completed, status.total)}`, true);
      }
      return journal;
    }
    if (journal.stopped) fail(`Execution stopped: ${journal.stopped}.`);
    if (!ledgerPath || !ticket) fail('Step completion requires a verification ledger and ticket.');
    if (!Array.isArray(event.steps) || !event.steps.length) fail('Completion requires step evidence.');
    const ids = event.steps.map((step) => step.number);
    const receiptHash = digest(JSON.stringify(event.steps));
    const receipt = journal.receipts.find((item) => item.hash === receiptHash);
    const dashboard = await executionDashboardState(planPath, dashboardState);
    if (!receipt && (dashboard?.state.fields.controller_version === '1' || journal.active_steps?.length) && JSON.stringify(journal.active_steps) !== JSON.stringify(ids)) fail('Start the exact step/batch before recording completion.');
    if (receipt && journal.active_steps?.length) fail('Completion receipt is older than the active dispatch.');
    let ledger;
    try { ledger = JSON.parse(await readFile(ledgerPath, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      ledger = { version: 1, ticket, plan_version: planVersion, steps: [], gate: null,
        acceptance: traceability(plan).map((row) => ({ ...row, status: 'unverified', step: null, note: 'No evidence recorded yet.' })) };
    }
    if (!receipt) {
      const eligible = nextBatch(steps, status.completed, ids.length > 1);
      if (ids.length > eligible.length || ids.some((id, i) => id !== eligible[i])) fail('Completion is not the next eligible step/batch.');
      if (event.steps.some((step) => !step.checks?.length || step.checks.some((check) => check.result !== (check.type === 'exempt' ? 'exempt' : 'pass')))) fail('Every batch member requires passing evidence; failed batches do not advance.');
      for (const step of event.steps) {
        const existing = ledger.steps.find((item) => item.number === step.number);
        if (existing && JSON.stringify(existing) !== JSON.stringify(step)) fail('Step already has different evidence.');
        if (!existing) ledger.steps.push(step);
      }
      ledger.steps.sort((a, b) => a.number - b.number);
      for (const item of ledger.acceptance) {
        const step = event.steps.find((s) => s.checks.some((check) => check.subject === item.scenario && check.type !== 'exempt'));
        if (step) { item.step = step.number; item.status = step.checks.find((check) => check.subject === item.scenario && check.type !== 'exempt').type; item.note = 'Recorded step evidence.'; }
      }
      validateVerification(ledger, { ticket, planVersion, plan });
      await atomicWrite(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
      journal.receipts.push({ hash: receiptHash, steps: ids, checkpointed: false });
      journal.active_steps = []; journal.active_dispatch = null;
      await atomicWrite(journalPath, JSON.stringify(journal, null, 2) + '\n');
    } else {
      validateVerification(ledger, { ticket, planVersion, plan });
      for (const step of event.steps) if (JSON.stringify(ledger.steps.find((saved) => saved.number === step.number)) !== JSON.stringify(step)) fail('Saved verification evidence changed.');
    }
    const through = ids.at(-1);
    if (status.completed < through) {
      if (status.completed !== ids[0] - 1) fail('Progress changed during completion recovery.');
      await updatePlan(planPath, ids.length === 1 ? 'complete-step' : 'complete-batch', ids.length === 1 ? { step: through, dashboardState } : { through, dashboardState });
    } else if (status.completed !== through) fail('Completion receipt is older than current Progress.');
    else await checkpointExecutionActivity(planPath, dashboardState, receipt?.checkpointed ? undefined : completedActivity(through, status.total));
    const savedReceipt = journal.receipts.find((item) => item.hash === receiptHash);
    if (!savedReceipt.checkpointed) {
      savedReceipt.checkpointed = true;
      await atomicWrite(journalPath, JSON.stringify(journal, null, 2) + '\n');
    }
    return { completed: through, ledger: ledgerPath, replayed: Boolean(receipt) };
  });
}
cli(import.meta.url, async (argv) => {
  const o = args(argv, ['--plan', '--input', '--ledger', '--ticket', '--plan-version', '--dashboard-state']);
  if (!o.plan) fail('--plan is required.');
  if (!['inspect', 'apply'].includes(o.command)) fail('Use inspect or apply.');
  const event = o.command === 'inspect' ? { action: 'inspect' } : await jsonInput(o.input);
  return executionControl(o.plan, event, { ledgerPath: o.ledger, ticket: o.ticket, planVersion: Number(o['plan-version'] ?? 1), dashboardState: o['dashboard-state'] });
});
