#!/usr/bin/env node
import { artifactJoin, artifactResolve } from '../../../scripts/lib/artifact-path.mjs';

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from '../../../scripts/lib/artifact-io.mjs';
import { realpath, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseState } from './render-status.mjs';
import { EXECUTION_OUTCOMES, acceptedUnrelatedGate, readVerification } from './verification.mjs';
import { checkTestingReadiness } from './testing-readiness.mjs';
import { checkRepoImpact, impactSummary } from './repo-impact.mjs';
import { testingPolicy } from './testing-policy.mjs';
import { collectTestingSummary, parseTestingSummary, testingSummaryNotes } from './testing-summary.mjs';
import { assertRunState, runArtifact, runArtifactName, runDirectory } from './artifact-layout.mjs';
import { checkpointResult } from './dashboard-checkpoint.mjs';
import { summarizeAcceptance } from './acceptance-summary.mjs';
import { summarizeAssurance } from './assurance-summary.mjs';
import { checkReviewScope } from './review-scope.mjs';
import { checkSessionRepositories } from '../../../scripts/lib/session-workspace.mjs';
import { snapshotDeliveryRepo } from '../../../scripts/lib/delivery-scope.mjs';
import { checkContextMaintenance } from './context-maintenance.mjs';
import { compareReviewScope, reviewDisclosure, uiVerification } from '../../../scripts/lib/review-evidence.mjs';

import { readAssessment, assessmentSummary } from '../../../scripts/change-assessment.mjs';
import { prepareFinalDraft } from './final-draft.mjs';
import { collectCommandFacts, requireCommandFacts } from '../../../scripts/lib/command-facts.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (message) => { throw new Error(message); };
const LIGHTWEIGHT_VALIDATION = 'Lightweight — no regression gate; verified by independent review';
const UNRELATED_GATE_RESULT = 'fail — accepted: only unrelated pre-existing failures (see Known unrelated regressions)';
const MODE_LABEL = { lightweight: 'Lightweight', tdd: 'TDD', none: 'none' };

function git(repo, args, { acceptDiff = false } = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: null, maxBuffer: 100 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 && !(acceptDiff && result.status === 1)) {
    fail(`git ${args[0]} failed in ${repo}: ${result.stderr.toString('utf8').trim()}`);
  }
  return result.stdout;
}

async function artifact(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) fail(`Invalid artifact path: ${relative}`);
  const resolved = artifactResolve(root, relative);
  if (!resolved.startsWith(`${root}${path.sep}make-it-work${path.sep}`)) fail(`Artifact must be in make-it-work/: ${relative}`);
  const actual = await realpath(resolved);
  if (!actual.startsWith(`${root}${path.sep}make-it-work${path.sep}`)) fail(`Artifact symlink escapes make-it-work/: ${relative}`);
  const bytes = await readFile(actual);
  return { path: relative, sha256: sha(bytes) };
}

function textFileName(ticket, name) { return `${ticket}-final-${name}`; }

function markdown(pkg) {
  const acceptance = summarizeAcceptance(pkg.acceptance);
  const cell = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
  const lines = [
    `# Final approval — ${pkg.ticket}`,
    '',
    ...(pkg.assurance_version === 1 ? [`**Assurance: ${summarizeAssurance(pkg).text}**`, ''] : []),
    pkg.validation.mode === 'lightweight'
      ? `Review: ${pkg.review.status}. Validation: ${pkg.validation.result}.`
      : `Review: ${pkg.review.status}. Validation: ${pkg.validation.mode} — ${pkg.validation.result}.`,
    '',
    ...(acceptance ? [`**${pkg.assurance_version === 1 ? 'Acceptance verification' : 'Verification'}: ${acceptance.text}**`, '', ...(acceptance.pending ? [
      '### Pending verification', '', '| Criterion | Scenario | Verification needed / recorded reason |', '| --- | --- | --- |',
      ...acceptance.pendingCriteria.flatMap(({ criterion, scenarios }) => scenarios.map(({ scenario, clause, note }) => `| ${cell(criterion)} | ${cell(clause ? `${clause} — ${scenario}` : scenario)} | ${cell(note)} |`)), '',
    ] : [])] : []),
    ...(pkg.adaptive ? [`Mode: ${MODE_LABEL[pkg.adaptive.mode]} (${pkg.adaptive.mode_source}) · Risk: ${pkg.adaptive.risk} · Escalations: ${pkg.adaptive.escalations} / 1`, ''] : []),
    ...(pkg.change_assessment ? ['## Change assessment', '', assessmentSummary(pkg.change_assessment), '', pkg.change_assessment.rationale ?? pkg.change_assessment.reason, '', ...Object.values(pkg.change_assessment.reports ?? {}).map(link => `[${path.basename(link)}](${path.basename(link)})`), ...(pkg.change_assessment.stale_history ? [`[Stale history — previous assessment](${pkg.change_assessment.stale_history})`] : []), ''] : []),
    '## Changes',
    '',
  ];
  for (const repo of pkg.repos) {
    lines.push(`### ${repo.name}`, '', `Branch: \`${repo.branch}\` · Base: \`${repo.base}\` (${repo.base_sha.slice(0, 12)})`, '');
    lines.push(`Diff: [${repo.diff_file}](${repo.diff_file})`, '');
    lines.push(repo.paths.length ? repo.paths.map((p) => `- \`${p}\``).join('\n') : '- No changed paths', '');
  }
  for (const row of pkg.repo_impact ?? []) lines.push(`Repository impact — ${row.repo}: ${row.classification}; ${row.reason}; checks: ${row.checks.map(c => `${c.id}: ${c.result}`).join(', ') || 'not required (context only)'}`, '');
  for (const note of testingSummaryNotes(pkg.testing_summary ?? [])) lines.push(`Testing: ${note}`, '');
  lines.push('## Evidence', '');
  if (pkg.review_scope) lines.push(reviewDisclosure(pkg.review_scope, pkg.ui_verification, pkg.validation_notes), '');
  if (pkg.command_facts) {
    lines.push('### Private captured validation records', '', 'Exact command arguments and raw outputs remain private artifacts. Recorded outcomes above do not certify the current tree.', '');
    for (const record of pkg.command_facts.records) lines.push(record.sha256 ? `- Capture ${record.id}: [record](${path.basename(record.path)})` : `- Capture ${record.id}: record unavailable; outcome unknown.`);
    lines.push('');
  }
  for (const record of pkg.test_map_maintenance ?? []) lines.push(`Test-map maintenance — ${path.basename(record.repo)}: ${record.status}; ${record.reason}`, '');
  for (const [name, item] of Object.entries(pkg.evidence)) lines.push(`- ${name}: [${item.path}](${path.basename(item.path)})`);
  lines.push(`- Known unrelated regressions: ${pkg.known_regressions.length ? pkg.known_regressions.join('; ') : 'none'}`);
  lines.push(`- Open review nits (unfixed): ${pkg.open_nits.length ? pkg.open_nits.join('; ') : 'none'}`);
  lines.push(`- Decided findings: ${pkg.decided_findings.length ? pkg.decided_findings.join('; ') : 'none'}`, '');
  if (pkg.acceptance) {
    const clauses = pkg.acceptance.some((item) => item.clause !== undefined);
    lines.push('## Acceptance verification', '', clauses ? '| Criterion | Requirement clause | Scenario | Status | Evidence |' : '| Criterion | Scenario | Status | Evidence |', clauses ? '| --- | --- | --- | --- | --- |' : '| --- | --- | --- | --- |');
    for (const item of pkg.acceptance) {
      lines.push(`| ${cell(item.criterion)} | ${clauses ? `${cell(item.clause)} | ` : ''}${cell(item.scenario)} | ${item.status === 'unverified' ? 'Pending verification' : item.status} | ${cell(item.evidence ? `${item.note}; Source: ${item.evidence.source}; Expected: ${item.evidence.expected}; Observed: ${item.evidence.observed}` : item.note)} |`);
    }
    lines.push('');
  }
  lines.push('## Draft delivery text', '', `Commit: ${pkg.draft.commit_message}`, '', `PR title: ${pkg.draft.pr_title}`, '', pkg.draft.pr_description, '');
  lines.push('Approval covers the exact working tree, evidence, and draft text shown here. Changes require a new package and approval.', '');
  return lines.join('\n');
}

async function atomicWrite(target, bytes) {
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, target);
}

function names(root, ticket) {
  const dir = runDirectory(root, ticket);
  return {
    json: artifactJoin(dir, textFileName(ticket, 'package.json')),
    md: artifactJoin(dir, textFileName(ticket, 'package.md')),
    approval: artifactJoin(dir, textFileName(ticket, 'approval.json')),
  };
}

function assertDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) fail('Draft must be a JSON object.');
  for (const key of ['commit_message', 'pr_title', 'pr_description']) {
    if (typeof draft[key] !== 'string' || !draft[key].trim()) fail(`Draft is missing ${key}.`);
  }
  if (Object.keys(draft).some((key) => !['commit_message', 'pr_title', 'pr_description'].includes(key))) fail('Draft has an unknown field.');
  return draft;
}

async function packageFromState(root, statePath, repoInputs, baseInputs, draftPath, { assuranceVersion = 1 } = {}) {
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  const f = state.fields;
  assertRunState(root, statePath, f.ticket);
  if (f.final_package_version !== '1') fail('This run is not enabled for final packages.');
  if (!['final-approval', 'complete'].includes(f.phase) || f.review !== 'clean') fail('Final package requires completed context sync and clean review.');
  if (!repoInputs.length) fail('At least one affected repo is required.');
  if (baseInputs.length && baseInputs.length !== repoInputs.length) fail('Pass one --base for each --repo.');
  if (f.workspace_version === '1') {
    const contract = JSON.parse(f.workspace_contract);
    await checkSessionRepositories(contract);
    const actual = (await Promise.all(repoInputs.map((repo) => realpath(repo)))).sort();
    if (JSON.stringify(actual) !== JSON.stringify(contract.repos.map((repo) => repo.root).sort())) fail('Final package must include every approved repository exactly once.');
    for (let i = 0; i < repoInputs.length; i++) {
      const canonical = await realpath(repoInputs[i]);
      const selected = contract.repos.find((entry) => entry.root === canonical);
      if (baseInputs[i] !== undefined && baseInputs[i] !== selected.base) fail(`Base differs from approved selection in ${selected.id}.`);
      baseInputs[i] = selected.base;
      if (git(canonical, ['symbolic-ref', '--quiet', '--short', 'HEAD']).toString('utf8').trim() !== selected.branch) fail(`Branch differs from approved selection in ${selected.id}.`);
    }
  }
  const draftRelative = path.relative(root, await realpath(draftPath));
  runArtifactName(draftRelative, f.ticket, 'Draft');
  const draftArtifact = await artifact(root, draftRelative);
  const draft = assertDraft(JSON.parse(await readFile(artifactResolve(root, draftArtifact.path), 'utf8')));
  const adaptive = f.adaptive_version === '1';
  if (adaptive && f.mode === 'lightweight') return lightweightPackage(root, state, repoInputs, baseInputs, draftArtifact, draft, assuranceVersion);
  for (const [name, relative] of [['spec', f.spec], ['plan', f.plan], ['execute', f.execute_report]]) {
    runArtifactName(relative, f.ticket, name);
  }
  const evidence = {
    spec: await artifact(root, f.spec),
    plan: await artifact(root, f.plan),
    execute: await artifact(root, f.execute_report),
    review: await artifact(root, runArtifact(f.ticket, `${f.ticket}-review.md`, f.artifact_naming_version)),
  };
  if (adaptive && f.implementation_report !== 'none') evidence.implementation = await artifact(root, f.implementation_report);
  if (f.testing_readiness !== undefined) {
    runArtifactName(f.testing_readiness, f.ticket, 'Testing readiness');
    evidence.testing_readiness = await artifact(root, f.testing_readiness);
    const readiness = await checkTestingReadiness(root, state, { plan: await readFile(artifactResolve(root, f.plan), 'utf8') });
    if (readiness.required) evidence.testing_readiness_checkpoint = await artifact(root, readiness.receipt);
    testingPolicy(await readFile(artifactResolve(root, f.plan), 'utf8'), { required: true });
  }
  let verification = null;
  const unrelatedGate = f.execution === 'gate-failed';
  if (unrelatedGate && !acceptedUnrelatedGate(state)) fail('A failed gate can be packaged only after triage classified every failure as unrelated and recorded it under Known regressions.');
  if (f.verification_version === '1') {
    if (!EXECUTION_OUTCOMES[f.execution]) fail('Final package requires completed execution, an accepted manual gate, or a gate whose only failures are recorded as unrelated.');
    const relative = runArtifact(f.ticket, `${f.ticket}-verification-v${f.plan_version}.json`, f.artifact_naming_version);
    verification = await readVerification(root, relative, {
      ticket: f.ticket, planVersion: Number(f.plan_version), plan: await readFile(artifactResolve(root, f.plan), 'utf8'),
      outcome: EXECUTION_OUTCOMES[f.execution], requireComplete: true, requireClauses: f.acceptance_evidence_version === '1',
    });
    if (f.execution === 'gate-no-result' && verification.gate.result !== 'manual-accepted') fail('The no-result gate requires an explicit manual acceptance.');
    if (verification.gate.mode !== f.gate) fail('Verification gate mode disagrees with state.');
    evidence.verification = await artifact(root, relative);
  } else if (f.execution !== 'passed' && !unrelatedGate) fail('Final package requires passed execution.');
  const validation = { mode: f.gate, result: unrelatedGate ? UNRELATED_GATE_RESULT : verification ? verification.gate.result : f.gate === 'none' ? 'automated gate skipped; see execution report for manual verification' : 'PASS' };
  return assemble(root, state, repoInputs, baseInputs, draftArtifact, draft, evidence, validation, verification ? { acceptance: verification.acceptance.map((row) => {
    if (!row.clause || row.status === 'unverified') return row;
    const check = verification.steps.find((step) => step.number === row.step).checks.find((item) => item.type === row.status && item.subject === row.scenario && item.assertions?.some((assertion) => assertion.clause === row.clause));
    return { ...row, evidence: check.assertions.find((assertion) => assertion.clause === row.clause) };
  }) } : {}, assuranceVersion);
}

// Adaptive Lightweight runs have no plan, execution report, readiness, or
// verification ledger: the spec, implementation report and clean review are the evidence.
async function lightweightPackage(root, state, repoInputs, baseInputs, draftArtifact, draft, assuranceVersion) {
  const f = state.fields;
  if (f.implementation_report === 'none') fail('Lightweight final package requires an implementation report.');
  runArtifactName(f.spec, f.ticket, 'spec');
  const evidence = {
    spec: await artifact(root, f.spec),
    implementation: await artifact(root, f.implementation_report),
    review: await artifact(root, runArtifact(f.ticket, `${f.ticket}-review.md`, f.artifact_naming_version)),
  };
  return assemble(root, state, repoInputs, baseInputs, draftArtifact, draft, evidence, { mode: 'lightweight', result: LIGHTWEIGHT_VALIDATION }, {}, assuranceVersion);
}

async function assemble(root, state, repoInputs, baseInputs, draftArtifact, draft, evidence, validation, extra, assuranceVersion) {
  const f = state.fields;
  const contract = f.workspace_version === '1' ? JSON.parse(f.workspace_contract) : null;
  const reviewReport = await readFile(artifactResolve(root, evidence.review.path), 'utf8');
  const openNits = [...reviewReport.matchAll(/^\d+\.\s+\*\*\[Minor\]\*\*\s+(.+)$/gm)].map((match) => match[1].trim());
  const repos = [];
  const seen = new Set();
  for (let i = 0; i < repoInputs.length; i += 1) {
    const canonical = await realpath(repoInputs[i]);
    const selected = contract?.repo_naming_version === 1 ? contract.repos.find(repo => repo.root === canonical) : null;
    const snap = await snapshotDeliveryRepo(repoInputs[i], baseInputs[i] ?? f.base, selected ? { name: selected.id } : {});
    if (seen.has(snap.name)) fail(`Duplicate repo name: ${snap.name}`);
    seen.add(snap.name);
    snap.diff_file = path.basename(artifactJoin(runDirectory(root, f.ticket), textFileName(f.ticket, `${snap.name}.diff`)));
    repos.push(snap);
  }
  repos.sort((a, b) => a.name.localeCompare(b.name));
  let reviewEvidence = null;
  const reviewEvidencePath = runArtifact(f.ticket, `${f.ticket}-review-evidence.json`, f.artifact_naming_version);
  const repoImpact = await checkRepoImpact(root, f, { requireChecks: f.mode === 'lightweight' });
  if (repoImpact) evidence.repo_impact = await artifact(root, f.repo_impact);
  const maintenance = await checkContextMaintenance(root, f);
  try {
    reviewEvidence = JSON.parse(await readFile(artifactResolve(root, reviewEvidencePath), 'utf8'));
    if (reviewEvidence.version !== 1 || reviewEvidence.ticket !== f.ticket || reviewEvidence.report_sha256 !== evidence.review.sha256 || !Array.isArray(reviewEvidence.repos)) fail('Review evidence does not match the current report; rerun review.');
    evidence.review_scope = await artifact(root, reviewEvidencePath);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let commandFacts = null;
  if (reviewEvidence?.command_facts) {
    commandFacts = await collectCommandFacts(root, f, reviewEvidence.command_facts.records);
    requireCommandFacts(commandFacts, reviewEvidence.command_facts, reviewEvidence.validation_notes, reviewReport);
  }
  if (f.review_scope_version === '1') {
    const checked = await checkReviewScope(root, artifactJoin(root, runArtifact(f.ticket, `${f.ticket}-state.md`, f.artifact_naming_version)));
    evidence.review_target = await artifact(root, checked.target.path);
    for (const [index, relative] of checked.target_diffs.entries()) evidence[`review_target_diff_${index}`] = await artifact(root, relative);
    if (JSON.stringify(repos.map(({ diff, diff_file, ...repo }) => repo)) !== JSON.stringify(checked.repos)) fail('Final package repositories or bases differ from the reviewed delivery scope.');
  }
  const reviewScope = compareReviewScope(reviewEvidence, repos);
  if (f.review_scope_version === '1' && reviewScope.some((repo) => repo.status !== 'covered')) fail('Final package contains changes outside independent review coverage. Rerun review on the full delivery diff.');
  const testingSummary = await collectTestingSummary(root, f, { final: true });
  if (testingSummary !== null && JSON.stringify(parseTestingSummary(f.testing_summary)) !== JSON.stringify(testingSummary)) fail('Testing summary changed; complete final sync again before packaging.');
  const changeAssessment = f.change_assessment_version === '1' ? await readAssessment(root, f.ticket, repos) : null;
  const pkg = {
    ...(commandFacts ? { command_facts: commandFacts } : {}),
    ...(changeAssessment ? { change_assessment: changeAssessment } : {}),
    ...(testingSummary !== null ? { testing_summary: testingSummary } : {}),
    ...(repoImpact ? { repo_impact: impactSummary(repoImpact, evidence.verification ? JSON.parse(await readFile(artifactResolve(root, evidence.verification.path), 'utf8')).gate : repoImpact.verification) } : {}),
    version: 1, ...(assuranceVersion === 1 ? { assurance_version: 1 } : {}), ...(f.review_context_version === '2' ? { test_map_maintenance: maintenance } : {}), ticket: f.ticket, draft_path: draftArtifact.path, draft_sha256: draftArtifact.sha256,
    draft, evidence, validation,
    ...(f.adaptive_version === '1' ? { adaptive: { mode: f.mode, risk: f.risk, mode_source: f.mode_source, escalations: Number(f.escalations) } } : {}),
    ...extra,
    review: { status: f.review, cycle: state.reviewCycle }, open_nits: openNits,
    ...(f.adaptive_version === '1' || reviewEvidence ? { review_scope: reviewScope, ui_verification: uiVerification(reviewEvidence?.ui_verification),
      ...(Array.isArray(reviewEvidence?.validation_notes) ? { validation_notes: reviewEvidence.validation_notes } : {}) } : {}),
    known_regressions: state.knownRegressions, decided_findings: state.decidedFindings,
    repos: repos.map(({ diff, ...data }) => data),
  };
  const md = markdown(pkg);
  return { pkg, md, repos };
}

async function build(root, statePath, repos, bases, draftPath) {
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  if (state.fields.phase !== 'final-approval') fail('Build is only allowed at final approval.');
  const result = await packageFromState(root, statePath, repos, bases, draftPath);
  const target = names(root, result.pkg.ticket);
  for (const repo of result.repos) await atomicWrite(artifactJoin(runDirectory(root, result.pkg.ticket), repo.diff_file), repo.diff);
  await atomicWrite(target.md, result.md);
  await atomicWrite(target.json, `${JSON.stringify(result.pkg, null, 2)}\n`);
  const hash = sha(JSON.stringify(result.pkg));
  await checkpointResult(statePath, { id: `final-package:${hash}`, text: 'Final approval package built.', reference: `${path.relative(root, target.md)}; sha256:${hash}` });
  return { package: target.md, json: target.json, sha256: hash, ...(result.pkg.change_assessment ? { change_assessment: result.pkg.change_assessment } : {}) };
}

export async function checkFinalPackage(root, statePath, requireApproval = false) {
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  const target = names(root, state.fields.ticket);
  const saved = JSON.parse(await readFile(target.json, 'utf8'));
  if (saved.version !== 1 || saved.ticket !== state.fields.ticket) fail('Final package version or ticket does not match state.');
  if (saved.assurance_version !== undefined && saved.assurance_version !== 1) fail('Unsupported package assurance version.');
  const result = await packageFromState(root, statePath, saved.repos.map((r) => r.path), saved.repos.map((r) => r.base), artifactResolve(root, saved.draft_path), { assuranceVersion: saved.assurance_version ?? null });
  if (JSON.stringify(result.pkg) !== JSON.stringify(saved)) fail('Final package is stale; rebuild it and seek approval again.');
  if (await readFile(target.md, 'utf8') !== result.md) fail('Final package Markdown changed; rebuild it.');
  for (const repo of result.repos) {
    const disk = await readFile(artifactJoin(runDirectory(root, saved.ticket), repo.diff_file));
    if (sha(disk) !== repo.diff_sha256) fail(`Final diff changed: ${repo.name}.`);
  }
  const hash = sha(JSON.stringify(saved));
  let approved = false;
  try {
    const stamp = JSON.parse(await readFile(target.approval, 'utf8'));
    approved = stamp.version === 1 && stamp.ticket === saved.ticket && stamp.package_sha256 === hash;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (requireApproval && !approved) fail('Final package has no current approval.');
  return { current: true, approved, sha256: hash, package: target.md, assurance_summary: summarizeAssurance(saved), verification_summary: summarizeAcceptance(saved.acceptance), review_scope: saved.review_scope ?? compareReviewScope(null, saved.repos), ui_verification: uiVerification(saved.ui_verification), validation_notes: saved.validation_notes ?? [], testing_summary: saved.testing_summary ?? [], testing_notes: testingSummaryNotes(saved.testing_summary ?? []), ...(saved.command_facts ? { command_facts: saved.command_facts } : {}) };
}

export async function approve(root, statePath, expectedHash) {
  const state = parseState(await readFile(statePath, 'utf8'), statePath);
  if (state.fields.phase !== 'final-approval') fail('Approve is only allowed at final approval.');
  const result = await checkFinalPackage(root, statePath);
  if (result.sha256 !== expectedHash) fail('Approval hash does not match the current package.');
  await atomicWrite(names(root, state.fields.ticket).approval, `${JSON.stringify({ version: 1, ticket: state.fields.ticket, package_sha256: expectedHash, approved_at: new Date().toISOString() }, null, 2)}\n`);
  return { approved: true, sha256: expectedHash };
}

async function main(args) {
  const command = args.shift();
  const options = { repo: [], base: [] };
  while (args.length) {
    const flag = args.shift();
    if (!flag?.startsWith('--')) fail(`Invalid argument: ${flag}`);
    if (flag === '--require-approval') { options.requireApproval = true; continue; }
    if (!args.length) fail(`Missing value for ${flag}.`);
    const value = args.shift();
    if (['--commit-file', '--title-file', '--description-file', '--body-width'].includes(flag) && command !== 'draft') fail(`${flag} applies only to draft preparation.`);
    if (flag === '--repo') options.repo.push(value);
    else if (flag === '--base') options.base.push(value);
    else if (['--root', '--state', '--draft', '--hash', '--commit-file', '--title-file', '--description-file', '--body-width'].includes(flag)) options[flag.slice(2)] = value;
    else fail(`Unknown option: ${flag}.`);
  }
  if (!['draft', 'build', 'check', 'approve'].includes(command) || !options.root || !options.state) {
    fail('Usage: final-package.mjs draft|build|check|approve --root ROOT --state STATE [--repo REPO ...] [--base BASE ...] [--draft DRAFT] [--hash SHA256] [--require-approval]; draft --commit-file FILE --title-file FILE --description-file FILE [--body-width N]');
  }
  const root = await realpath(options.root);
  const state = await realpath(options.state);
  const parsed = parseState(await readFile(state, 'utf8'), state);
  assertRunState(root, state, parsed.fields.ticket);
  if (command === 'draft') return prepareFinalDraft(root, state, {
    commit_message: options['commit-file'], pr_title: options['title-file'], pr_description: options['description-file'],
  }, options['body-width'] === undefined ? undefined : Number(options['body-width']));
  if (command === 'build') {
    if (!options.draft) fail('build requires --draft.');
    return build(root, state, options.repo, options.base, artifactResolve(options.draft));
  }
  if (command === 'check') return checkFinalPackage(root, state, options.requireApproval);
  if (!options.hash || !/^[a-f0-9]{64}$/.test(options.hash)) fail('approve requires --hash SHA256.');
  return approve(root, state, options.hash);
}

if (process.argv[1] && artifactResolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((result) => console.log(JSON.stringify(result))).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
