#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { readFile, realpath, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertRunState, runArtifactName, runDirectory } from './artifact-layout.mjs';

const MODES = ['updates', 'comments', 'local'];
const KINDS = ['description', 'attachment', 'comment'];
const fail = (message) => { throw new Error(message); };
function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} must be nonempty text.`);
  return value;
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
export const descriptionHash = (value) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const hash = (value) => createHash('sha256').update(value).digest('hex');
function target(value) {
  text(value?.tracker, 'target.tracker');
  text(value?.issue, 'target.issue');
  const site = new URL(value.site);
  const url = new URL(value.url);
  if (!['https:', 'http:'].includes(site.protocol) || site.username || site.password || url.username || url.password || url.origin !== site.origin) {
    fail('Target must name a tracker site and an issue URL on that site, without credentials.');
  }
  return { tracker: value.tracker, site: site.origin, issue: value.issue, url: url.href };
}
function consent(mode, decision, allowed = mode === 'local' ? [] : mode === 'comments' ? ['attachment', 'comment'] : KINDS) {
  if (!MODES.includes(mode)) fail('Mode must be updates, comments, or local.');
  if (!['user', 'default'].includes(decision?.source)) fail('Decision source must be user or default.');
  if (mode !== 'local' && decision.source !== 'user') fail('Ticket writes require explicit user consent.');
  text(decision.text, 'decision.text');
  if (!Array.isArray(allowed) || new Set(allowed).size !== allowed.length || allowed.some((kind) => !KINDS.includes(kind) || mode === 'local' || (kind === 'description' && mode !== 'updates'))) fail('Allowed operations exceed the selected publication mode.');
  return [...allowed];
}
function permitted(journal, kind, capabilities) {
  if (!KINDS.includes(kind)) fail('Unsupported publication kind.');
  if (!journal.allowed.includes(kind)) fail('Publication is outside saved consent.');
  if (capabilities?.[kind] !== true) fail(`Connector lacks ${kind} capability.`);
}
function descriptionMatches(journal, input) {
  if (!Object.hasOwn(input, 'current_description')) fail('Read the current description before replacing it.');
  if (descriptionHash(input.current_description) !== journal.description_baseline) fail('Live description changed; reconcile before replacement.');
}
function attachmentFilename(value) {
  if (typeof value !== 'string' || !value || path.basename(value) !== value || /[\\/\r\n]/.test(value) || ['.', '..'].includes(value)) fail('Attachment requires a plain filename.');
}
function artifactCommentScope(value = false, allowed) {
  if (typeof value !== 'boolean' || (value && !allowed.includes('comment'))) fail('Artifact comments require explicit comment scope.');
  return value;
}

export function validatePublication(journal) {
  if (journal?.version !== 1 || !Array.isArray(journal.operations)) fail('Invalid publication journal.');
  text(journal.ticket, 'journal.ticket');
  text(journal.run_id, 'journal.run_id');
  text(journal.workflow_start, 'journal.workflow_start');
  target(journal.target);
  if (!Object.hasOwn(journal, 'original_description') || !/^[a-f0-9]{64}$/.test(journal.description_baseline ?? '')) fail('Publication journal lacks a description snapshot/baseline.');
  if (!Number.isSafeInteger(journal.consent_revision) || journal.consent_revision < 1 || !Array.isArray(journal.decisions) || journal.decisions.length !== journal.consent_revision) fail('Invalid publication consent history.');
  for (const item of journal.decisions) {
    if (!Array.isArray(item.allowed)) fail('Publication decision lacks its allowed operations.');
    consent(item.mode, item, item.allowed);
    artifactCommentScope(item.artifact_comments, item.allowed);
  }
  if (journal.mode !== journal.decisions.at(-1).mode) fail('Publication mode disagrees with saved consent.');
  const allowed = consent(journal.mode, journal.decisions.at(-1), journal.allowed);
  if (!Array.isArray(journal.allowed) || allowed.length !== journal.decisions.at(-1).allowed.length || allowed.some((kind) => !journal.decisions.at(-1).allowed.includes(kind))) fail('Allowed operations disagree with saved consent.');
  const artifactComments = artifactCommentScope(journal.artifact_comments, allowed);
  if (artifactComments !== (journal.decisions.at(-1).artifact_comments ?? false)) fail('Artifact-comment scope disagrees with saved consent.');
  const ids = new Set();
  for (const op of journal.operations) {
    text(op.id, 'operation.id');
    if (ids.has(op.id)) fail('Duplicate publication operation ID.');
    ids.add(op.id);
    if (!KINDS.includes(op.kind) || !['prepared', 'in-flight', 'succeeded', 'failed', 'unknown', 'cancelled'].includes(op.status)) fail('Invalid publication operation.');
    text(op.key, 'operation.key');
    text(op.content, 'operation.content');
    if (hash(op.content) !== op.content_hash) fail('Prepared content hash does not match.');
    if (op.source_hash !== undefined && hash(op.source_content ?? op.content) !== op.source_hash) fail('Artifact source hash does not match.');
    if (!Number.isSafeInteger(op.consent_revision) || op.consent_revision < 1 || op.consent_revision > journal.consent_revision) fail('Invalid operation consent revision.');
    if (!journal.decisions[op.consent_revision - 1].allowed.includes(op.kind)) fail('Operation was prepared outside saved consent.');
    if (op.attachment_fallback && (op.kind !== 'comment' || journal.decisions[op.consent_revision - 1].artifact_comments !== true)) fail('Artifact comment was prepared outside saved consent.');
    if (op.kind === 'attachment') attachmentFilename(op.filename);
    else if (op.filename !== null) fail('Only attachments have filenames.');
    if (op.status === 'succeeded') {
      text(op.receipt?.id, 'receipt.id');
      if (op.kind === 'description' && !Object.hasOwn(op.receipt, 'description')) fail('A successful description operation requires its remote description.');
    }
  }
  return journal;
}

/** Local bookkeeping only: this module never calls a connector or grants consent. */
export function initializePublication({ ticket, workflow_start }, input) {
  const mode = input.mode ?? 'local';
  const decision = input.decision ?? { source: 'default', text: 'No ticket-write consent supplied.' };
  const allowed = consent(mode, decision, input.allowed);
  const artifact_comments = artifactCommentScope(input.artifact_comments, allowed);
  if (!Object.hasOwn(input, 'original_description')) fail('Save the original tracker description, including null for an empty description.');
  const now = new Date().toISOString();
  return {
    version: 1, ticket, workflow_start, run_id: randomUUID(), target: target(input.target),
    original_description: input.original_description,
    description_baseline: descriptionHash(input.original_description),
    mode, allowed, artifact_comments, consent_revision: 1, decisions: [{ mode, ...decision, allowed, artifact_comments, at: now }], operations: [],
  };
}

export function updatePublication(previous, action, input = {}) {
  const journal = structuredClone(validatePublication(previous));
  const now = new Date().toISOString();
  if (action === 'consent') {
    const allowed = consent(input.mode, input.decision, input.allowed);
    const artifact_comments = artifactCommentScope(input.artifact_comments ?? (journal.artifact_comments === true && allowed.includes('comment')), allowed);
    if (input.decision.source !== 'user') fail('Consent changes require an explicit user instruction.');
    journal.mode = input.mode;
    journal.allowed = allowed;
    journal.artifact_comments = artifact_comments;
    journal.consent_revision += 1;
    journal.decisions.push({ mode: input.mode, ...input.decision, allowed, artifact_comments, at: now });
    return { journal, result: { mode: journal.mode } };
  }
  if (action === 'baseline') {
    consent('updates', input.decision);
    if (!journal.allowed.includes('description')) fail('Description reconciliation requires description-write consent.');
    if (journal.operations.some((op) => op.kind === 'description' && ['in-flight', 'unknown'].includes(op.status))) fail('Reconcile the unresolved description write first.');
    if (!Object.hasOwn(input, 'current_description')) fail('A reviewed live description is required.');
    journal.description_baseline = descriptionHash(input.current_description);
    for (const op of journal.operations) {
      if (op.kind === 'description' && op.status === 'prepared') op.status = 'cancelled';
    }
    journal.description_reconciliations ??= [];
    journal.description_reconciliations.push({ description: input.current_description, decision: input.decision, at: now });
    return { journal, result: { description_baseline: journal.description_baseline } };
  }
  if (action === 'prepare') {
    const artifactRequest = input.kind === 'attachment' && input.fallback_to_comment === true;
    if (artifactRequest && (input.capabilities?.attachment !== true || !journal.allowed.includes('attachment'))) {
      if (journal.artifact_comments !== true) fail('Artifact-comment fallback is outside saved consent.');
      input = { ...input, kind: 'comment', filename: undefined };
    } else if (artifactRequest && input.source_content !== undefined) {
      input = { ...input, content: input.source_content };
    }
    permitted(journal, input.kind, input.capabilities);
    text(input.key, 'key');
    text(input.content, 'content');
    if (input.kind === 'attachment') attachmentFilename(input.filename);
    else if (input.filename != null) fail('Only attachments have filenames.');
    const contentHash = hash(input.content);
    const sourceContent = artifactRequest ? text(input.source_content ?? input.content, 'source_content') : null;
    const sourceHash = artifactRequest ? hash(sourceContent) : null;
    const matching = journal.operations.filter((op) => op.key === input.key && (artifactRequest
      ? ((op.kind === 'attachment' || op.attachment_fallback === true) && (op.source_hash ?? op.content_hash) === sourceHash)
      : (op.kind === input.kind && op.content_hash === contentHash && op.filename === (input.filename ?? null))));
    // An unresolved write blocks even a changed payload for the same logical update.
    const unresolved = journal.operations.find((op) => (op.key === input.key || (op.kind === 'description' && input.kind === 'description')) && ['in-flight', 'unknown'].includes(op.status));
    if (unresolved) fail(`Reconcile unresolved operation ${unresolved.id} before publishing this update.`);
    if (input.kind === 'description') descriptionMatches(journal, input);
    // Description is a replaceable field; an older successful version may since have been superseded.
    const latestDescription = journal.operations.filter((op) => op.kind === 'description' && op.status === 'succeeded').at(-1);
    const done = input.kind === 'description'
      ? matching.find((op) => op.id === latestDescription?.id && journal.description_baseline === descriptionHash(op.receipt.description))
      : matching.find((op) => op.status === 'succeeded');
    if (done) return { journal, result: { action: 'skip', operation: done } };
    const prepared = matching.find((op) => op.kind === input.kind && op.content_hash === contentHash && op.status === 'prepared' && op.consent_revision === journal.consent_revision);
    if (prepared) return { journal, result: { action: 'ready', operation: prepared } };
    const priorAttempts = artifactRequest ? journal.operations.filter((op) => op.key === input.key) : matching;
    if (priorAttempts.some((op) => op.status === 'failed') && input.retry !== true) fail('A failed publication requires an explicit retry request.');
    for (const op of journal.operations) {
      if ((op.key === input.key || (op.kind === 'description' && input.kind === 'description')) && op.status === 'prepared') op.status = 'cancelled';
    }
    const operation = {
      id: randomUUID(), kind: input.kind, key: input.key, content: input.content,
      content_hash: contentHash, filename: input.filename ?? null,
      consent_revision: journal.consent_revision, status: 'prepared', prepared_at: now,
    };
    if (artifactRequest && input.kind === 'comment') operation.attachment_fallback = true;
    if (artifactRequest) {
      operation.source_hash = sourceHash;
      if (sourceContent !== input.content) operation.source_content = sourceContent;
    }
    journal.operations.push(operation);
    return { journal, result: { action: 'ready', operation } };
  }
  const operation = journal.operations.find((op) => op.id === input.operation_id);
  if (!operation) fail('Unknown publication operation.');
  if (action === 'begin') {
    permitted(journal, operation.kind, input.capabilities);
    if (operation.status !== 'prepared') fail('Only a prepared operation can begin; reconcile uncertain writes instead of retrying.');
    if (operation.consent_revision !== journal.consent_revision) fail('Consent changed; prepare this update again.');
    if (hash(operation.content) !== operation.content_hash) fail('Prepared content hash does not match.');
    if (operation.kind === 'description') descriptionMatches(journal, input);
    operation.status = 'in-flight';
    operation.started_at = now;
    return { journal, result: { target: journal.target, operation } };
  }
  if (action === 'record' || action === 'reconcile') {
    const reconciling = action === 'reconcile';
    if (!(reconciling ? ['in-flight', 'unknown'] : ['in-flight']).includes(operation.status)) fail('Operation is not awaiting a result.');
    if (!(reconciling ? ['succeeded', 'not-applied'] : ['succeeded', 'failed', 'unknown']).includes(input.status)) fail('Invalid publication result.');
    text(input.evidence, 'evidence');
    if (input.status === 'succeeded') {
      text(input.receipt?.id, 'receipt.id');
      if (operation.kind === 'description') {
        if (!Object.hasOwn(input.receipt, 'description')) fail('A description receipt requires the actual remote description.');
        journal.description_baseline = descriptionHash(input.receipt.description);
      }
      operation.receipt = input.receipt;
    }
    operation.status = input.status === 'not-applied' ? 'failed' : input.status;
    operation.evidence = input.evidence;
    operation.recorded_at = now;
    return { journal, result: { operation } };
  }
  fail('Unknown publication action.');
}

async function journalPathFor(root, fields) {
  if (!fields.ticket_publication || fields.ticket_publication === 'none') fail('No publication journal is configured; ticket writes are disabled.');
  const directory = runDirectory(root, fields.ticket);
  if (await realpath(directory) !== directory) fail('Publication directory must not be a symlink.');
  const name = runArtifactName(fields.ticket_publication, fields.ticket, 'ticket_publication');
  if (!name.startsWith(`${fields.ticket}-ticket-publication-`) || !name.endsWith('.json')) fail('Invalid publication journal filename.');
  const journalPath = path.join(directory, name);
  if (await realpath(journalPath) !== journalPath) fail('Publication journal must not be a symlink.');
  return journalPath;
}

async function readBoundJournal(journalPath, fields) {
  const journal = validatePublication(JSON.parse(await readFile(journalPath, 'utf8')));
  if (journal.ticket !== fields.ticket || journal.workflow_start !== (fields.start_time ?? 'none') || path.basename(journalPath) !== `${fields.ticket}-ticket-publication-${journal.run_id}.json`) fail('Publication journal does not belong to this run.');
  return journal;
}

/** Dashboard projection of consent only; never exposes ticket bodies or operation payloads. */
export async function readPublicationPermission(root, fields) {
  if (!fields.ticket_publication || fields.ticket_publication === 'none') return { status: 'off' };
  try {
    const journalPath = await journalPathFor(await realpath(root), fields);
    const journal = await readBoundJournal(journalPath, fields);
    return {
      status: journal.allowed.length ? 'allowed' : 'off',
      allowed: journal.allowed, artifact_comments: journal.artifact_comments === true,
      target: journal.target,
    };
  } catch {
    return { status: 'unknown' };
  }
}

function args(argv) {
  const [action, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!['--root', '--state', '--input'].includes(rest[i]) || !rest[i + 1] || options[rest[i]]) fail('Expected --root, --state, and optionally --input <JSON file>.');
    options[rest[i]] = rest[i + 1];
  }
  if (!['init', 'consent', 'baseline', 'prepare', 'begin', 'record', 'reconcile', 'status'].includes(action) || !options['--root'] || !options['--state'] || (action !== 'status' && !options['--input'])) fail('Usage: ticket-publication.mjs init|consent|baseline|prepare|begin|record|reconcile|status --root <root> --state <state.md> [--input <JSON file>]');
  return { action, ...options };
}

export async function publicationCommand(options) {
  const { action } = options;
  // Lazy loading lets the renderer import the consent reader without a module cycle.
  const { parseState, generateDashboard } = await import('./render-status.mjs');
  const root = await realpath(options['--root']);
  const statePath = await realpath(path.resolve(root, options['--state']));
  const fields = parseState(await readFile(statePath, 'utf8'), statePath).fields;
  const directory = assertRunState(root, statePath, fields.ticket);
  if (await realpath(directory) !== directory) fail('Publication directory must not be a symlink.');
  const input = options['--input'] ? JSON.parse(await readFile(path.resolve(root, options['--input']), 'utf8')) : {};
  if (action === 'init') {
    if (fields.ticket_publication && fields.ticket_publication !== 'none') fail('This run already has a publication journal; use consent to change its policy.');
    const journal = initializePublication({ ticket: fields.ticket, workflow_start: fields.start_time ?? 'none' }, input);
    const name = `${fields.ticket}-ticket-publication-${journal.run_id}.json`;
    await writeFile(path.join(directory, name), `${JSON.stringify(journal, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return { journal: `make-it-work/${fields.ticket}/${name}`, mode: journal.mode };
  }
  const journalPath = await journalPathFor(root, fields);
  const lock = `${journalPath}.lock`;
  const temporary = `${journalPath}.${randomUUID()}.tmp`;
  if (action !== 'status') await writeFile(lock, '', { flag: 'wx', mode: 0o600 });
  try {
    const previous = await readBoundJournal(journalPath, fields);
    if (action === 'status') return previous;
    const { journal, result } = updatePublication(previous, action, input);
    await writeFile(temporary, `${JSON.stringify(journal, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    await rename(temporary, journalPath);
    if (action === 'consent') {
      const dashboard = path.join(directory, `${fields.ticket}-status.html`);
      try {
        await stat(dashboard);
      } catch (error) {
        if (error.code === 'ENOENT') return result;
        throw new Error(`Ticket consent was saved, but dashboard access failed: ${error.message}`);
      }
      try {
        await generateDashboard(statePath);
      } catch (error) {
        throw new Error(`Ticket consent was saved, but dashboard refresh failed: ${error.message}`);
      }
    }
    return result;
  } finally {
    if (action !== 'status') {
      await unlink(temporary).catch(() => {});
      await unlink(lock);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  Promise.resolve().then(() => publicationCommand(args(process.argv.slice(2)))).then(
    (result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`),
    (error) => { process.stderr.write(`ticket-publication: ${error.message}\n`); process.exitCode = 1; },
  );
}
