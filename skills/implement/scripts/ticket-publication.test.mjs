import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { descriptionHash, initializePublication, publicationCommand, updatePublication, validatePublication } from './ticket-publication.mjs';
import { generateDashboard } from './render-status.mjs';

const source = { ticket: 'DEMO', workflow_start: '2026-10-22T10:00:00Z' };
const target = { tracker: 'jira', site: 'https://example.atlassian.net', issue: 'DEMO', url: 'https://example.atlassian.net/browse/DEMO' };
const decision = { source: 'user', text: 'Allow these updates for DEMO during this run.' };
const capabilities = { description: true, attachment: true, comment: true };
const initial = (mode = 'updates') => initializePublication(source, { target, original_description: 'Original requirements', mode, decision });
const request = (kind = 'comment', overrides = {}) => ({ kind, key: kind === 'attachment' ? 'plan-v1' : 'spec', content: 'Finalized requirements', filename: kind === 'attachment' ? 'DEMO-plan-v1.md' : undefined, current_description: 'Original requirements', capabilities, ...overrides });
const withTarget = (overrides) => initializePublication(source, { target: { ...target, ...overrides }, original_description: null });

test('normalizes connector hostnames and preserves explicit HTTP/HTTPS sites and ticket URLs', () => {
  for (const [site, url, origin] of [
    ['example.atlassian.net', target.url, target.site],
    ['  EXAMPLE.atlassian.net  ', target.url, target.site],
    ['example.atlassian.net:443', target.url, target.site],
    ['example.atlassian.net:8443', 'https://example.atlassian.net:8443/browse/DEMO?view=detail#comment-1', 'https://example.atlassian.net:8443'],
    ['http://tracker.internal:8080/', 'http://tracker.internal:8080/issues/DEMO', 'http://tracker.internal:8080'],
    ['https://example.atlassian.net/context?view=detail', target.url, target.site],
    ['[::1]:8443', 'https://[::1]:8443/browse/DEMO', 'https://[::1]:8443'],
  ]) {
    const journal = withTarget({ site, url });
    assert.equal(journal.target.site, origin);
    assert.equal(journal.target.url, url);
    assert.equal(journal.version, 1);
    assert.doesNotThrow(() => validatePublication(JSON.parse(JSON.stringify(journal)), source));
  }
});

test('invalid sites and issue URLs fail with field-specific errors', () => {
  for (const site of [undefined, null, {}, '', ' ', '//example.atlassian.net', 'example.atlassian.net/path',
    'example.atlassian.net?x=1', 'example.atlassian.net#fragment', 'user@example.atlassian.net',
    'example.atlassian.net:invalid', 'example.atlassian.net:65536', 'bad host', 'https:/example.atlassian.net',
    'ftp://example.atlassian.net', 'mailto:user@example.atlassian.net', 'https://user:secret@example.atlassian.net',
    'https://example.\tatlassian.net', 'https://example.atlassian.net\\other']) {
    assert.throws(() => withTarget({ site }), /^Error: target\.site /);
  }
  for (const url of [undefined, null, {}, '', 'example.atlassian.net/browse/DEMO', 'https:/example.atlassian.net',
    'https://', 'ftp://example.atlassian.net/DEMO', 'javascript:alert(1)', 'https://user:secret@example.atlassian.net/browse/DEMO']) {
    assert.throws(() => withTarget({ url }), /^Error: target\.url /);
  }
});

test('normalization never repairs a mismatched scheme, hostname or port by changing the ticket URL', () => {
  for (const url of ['http://example.atlassian.net/browse/DEMO', 'https://other.atlassian.net/browse/DEMO',
    'https://example.atlassian.net:8443/browse/DEMO']) {
    assert.throws(() => withTarget({ site: 'example.atlassian.net', url }), /target\.url.*on that site/);
  }
  assert.throws(() => withTarget({ site: 'example.atlassian.net:8443' }), /target\.url.*on that site/);
});

test('a normalized hostname still defaults to local and needs explicit consent for publication', () => {
  const bareTarget = { ...target, site: 'example.atlassian.net' };
  const local = initializePublication(source, { target: bareTarget, original_description: null });
  assert.equal(local.mode, 'local');
  assert.deepEqual(local.allowed, []);
  assert.throws(() => updatePublication(local, 'prepare', request()), /outside saved consent/);
  assert.throws(() => initializePublication(source, { target: bareTarget, original_description: null,
    mode: 'updates', decision: { source: 'default', text: 'Autopilot default' } }), /explicit user consent/);
});
function prepared(journal = initial(), input = request()) {
  return updatePublication(journal, 'prepare', input);
}
function begun(journal = initial(), input = request()) {
  if (input.kind === 'description') journal = backedUp(journal, input.current_description);
  const ready = prepared(journal, input);
  return updatePublication(ready.journal, 'begin', { operation_id: ready.result.operation.id, capabilities, current_description: input.current_description });
}
function backedUp(journal = initial(), current_description = 'Original requirements') {
  const ready = updatePublication(journal, 'prepare-backup', { current_description, capabilities });
  if (ready.result.action === 'skip') return ready.journal;
  const started = updatePublication(ready.journal, 'begin', { operation_id: ready.result.operation.id, current_description, capabilities });
  return updatePublication(started.journal, 'record', { operation_id: ready.result.operation.id, status: 'succeeded', evidence: 'Connector confirmed the full backup comment', receipt: { id: `backup-${ready.result.operation.id}` } }).journal;
}
function succeeded(journal = initial(), input = request()) {
  const started = begun(journal, input);
  return updatePublication(started.journal, 'record', { operation_id: started.result.operation.id, status: 'succeeded', evidence: 'Connector confirmed the write', receipt: { id: 'remote-123', description: input.content } });
}

test('defaults to local and requires explicit consent for writes, independent of autonomy', () => {
  const local = initializePublication(source, { target, original_description: null });
  assert.equal(local.mode, 'local');
  assert.throws(() => prepared(local), /outside saved consent/);
  for (const mode of ['updates', 'comments']) {
    assert.throws(() => initializePublication(source, { target, original_description: null, mode, decision: { source: 'default', text: 'Autopilot default' } }), /explicit user consent/);
  }
  assert.throws(() => updatePublication(local, 'consent', { mode: 'updates', decision: { source: 'default', text: 'Switched autonomy' } }), /explicit user consent/);
  assert.equal(updatePublication(local, 'consent', { mode: 'updates', decision }).journal.mode, 'updates');
  assert.throws(() => initializePublication(source, { target, mode: 'local' }), /original tracker description/);
  assert.throws(() => initial('invalid'), /Mode must/);
});

test('comments-only permits attachments and comments while excluding all other mutations', () => {
  const journal = initial('comments');
  assert.equal(prepared(journal).result.action, 'ready');
  assert.equal(prepared(journal, request('attachment')).result.action, 'ready');
  assert.throws(() => prepared(journal, request('description')), /outside saved consent/);
  for (const kind of ['transition', 'worklog', 'assignee', 'linked-ticket']) assert.throws(() => prepared(journal, request(kind)), /Unsupported/);
  assert.throws(() => prepared(journal, request('attachment', { capabilities: { comment: true } })), /lacks attachment/);
  assert.throws(() => prepared(journal, request('attachment', { filename: '../plan.md' })), /plain filename/);
  const narrowed = updatePublication(journal, 'consent', { mode: 'comments', allowed: ['attachment'], decision: { source: 'user', text: 'Only attach files for this run.' } }).journal;
  assert.throws(() => prepared(narrowed, request('comment')), /outside saved consent/);
  assert.equal(prepared(narrowed, request('attachment')).result.action, 'ready');
  assert.throws(() => updatePublication(journal, 'consent', { mode: 'comments', allowed: ['description'], decision }), /exceed/);
  assert.throws(() => initializePublication(source, { target: { ...target, url: 'https://other.example/DEMO' }, original_description: null }), /on that site/);
});

const artifactConsent = (allowed = ['attachment', 'comment']) => updatePublication(initial('comments'), 'consent', {
  mode: 'comments', allowed, artifact_comments: true,
  decision: { source: 'user', text: 'Publish accepted artifacts as attachments or comments when uploads are unavailable.' },
}).journal;
const artifactRequest = (overrides = {}) => request('attachment', { fallback_to_comment: true, capabilities: { comment: true }, ...overrides });

test('missing upload tool selects an authorized comment and freezes the accepted artifact content', () => {
  const input = artifactRequest();
  const ready = prepared(artifactConsent(), input);
  assert.equal(ready.result.operation.kind, 'comment');
  assert.equal(ready.result.operation.attachment_fallback, true);
  assert.equal(ready.result.operation.filename, null);
  assert.equal(ready.result.operation.content, input.content);
  const started = updatePublication(ready.journal, 'begin', { operation_id: ready.result.operation.id, capabilities: { comment: true } });
  assert.equal(started.result.target.issue, 'DEMO');
  const done = updatePublication(started.journal, 'record', { operation_id: started.result.operation.id, status: 'succeeded', evidence: 'Comment response', receipt: { id: 'plan-comment-17' } }).journal;
  assert.equal(prepared(JSON.parse(JSON.stringify(done)), input).result.action, 'skip');
  assert.equal(prepared(done, artifactRequest({ capabilities, filename: 'DEMO-plan-v1-later.md' })).result.action, 'skip');
});

test('fallback respects comment-only scope, prefers available authorized uploads, and skips prior attachments', () => {
  assert.equal(prepared(artifactConsent(['comment']), artifactRequest({ capabilities })).result.operation.kind, 'comment');
  assert.equal(prepared(artifactConsent(), artifactRequest({ capabilities })).result.operation.kind, 'attachment');
  assert.equal(prepared(artifactConsent(), artifactRequest({ capabilities, content: 'Fallback summary', source_content: 'Full accepted plan' })).result.operation.content, 'Full accepted plan');
  const uploaded = succeeded(artifactConsent(), artifactRequest({ capabilities })).journal;
  const repeated = prepared(uploaded, artifactRequest());
  assert.equal(repeated.result.action, 'skip');
  assert.equal(repeated.result.operation.kind, 'attachment');
  const summarized = prepared(uploaded, artifactRequest({ content: 'Plan summary', source_content: 'Finalized requirements' }));
  assert.equal(summarized.result.action, 'skip');
  const summaryInput = artifactRequest({ content: 'Plan summary', source_content: 'Full accepted plan' });
  const postedSummary = succeeded(artifactConsent(), summaryInput).journal;
  assert.equal(postedSummary.operations[0].source_content, 'Full accepted plan');
  assert.equal(prepared(postedSummary, artifactRequest({ content: 'Full accepted plan', capabilities })).result.action, 'skip');
  assert.equal(prepared(postedSummary, { ...summaryInput, source_content: 'Revised full plan' }).result.action, 'ready');
});

test('legacy comment consent and local/attachment-only permissions do not authorize artifact fallback', () => {
  const legacy = initial('comments');
  delete legacy.artifact_comments;
  for (const item of legacy.decisions) delete item.artifact_comments;
  assert.doesNotThrow(() => validatePublication(legacy));
  assert.throws(() => prepared(legacy, artifactRequest()), /outside saved consent/);
  assert.throws(() => prepared(initial('local'), artifactRequest()), /outside saved consent/);
  assert.throws(() => updatePublication(initial(), 'consent', { mode: 'updates', allowed: ['attachment'], artifact_comments: true, decision }), /comment scope/);
  assert.throws(() => prepared(artifactConsent(), artifactRequest({ capabilities: {} })), /lacks comment/);
  const revoked = updatePublication(artifactConsent(), 'consent', { mode: 'local', decision }).journal;
  assert.equal(revoked.artifact_comments, false);
  assert.throws(() => prepared(revoked, artifactRequest()), /outside saved consent/);
});

test('uncertain uploads block comment fallback and confirmed failures still require an explicit retry', () => {
  const started = begun(artifactConsent(), artifactRequest({ capabilities }));
  const id = started.result.operation.id;
  assert.throws(() => prepared(started.journal, artifactRequest()), /Reconcile unresolved/);
  const unknown = updatePublication(started.journal, 'record', { operation_id: id, status: 'unknown', evidence: 'Upload timed out' }).journal;
  assert.throws(() => prepared(unknown, artifactRequest({ retry: true })), /Reconcile unresolved/);
  const absent = updatePublication(unknown, 'reconcile', { operation_id: id, status: 'not-applied', evidence: 'Connector audit confirms no upload occurred' }).journal;
  assert.throws(() => prepared(absent, artifactRequest()), /explicit retry/);
  assert.throws(() => prepared(absent, artifactRequest({ content: 'A new fallback summary' })), /explicit retry/);
  assert.equal(prepared(absent, artifactRequest({ retry: true })).result.operation.kind, 'comment');
});

test('fallback cancels unsent uploads and uncertain comments block switching back to attachments', () => {
  const upload = prepared(artifactConsent(), artifactRequest({ capabilities }));
  const comment = prepared(upload.journal, artifactRequest());
  assert.equal(comment.journal.operations[0].status, 'cancelled');
  assert.throws(() => updatePublication(comment.journal, 'begin', { operation_id: upload.result.operation.id, capabilities }), /Only a prepared/);
  const started = updatePublication(comment.journal, 'begin', { operation_id: comment.result.operation.id, capabilities: { comment: true } });
  assert.throws(() => prepared(started.journal, artifactRequest({ capabilities })), /Reconcile unresolved/);
  assert.throws(() => prepared(started.journal, request('attachment', { capabilities })), /Reconcile unresolved/);
});

test('malformed or contradictory saved permission cannot authorize publication', () => {
  const missingHistory = initial();
  delete missingHistory.decisions;
  assert.throws(() => prepared(missingHistory), /consent history/);
  const expanded = initial('comments');
  expanded.mode = 'updates';
  assert.throws(() => prepared(expanded, request('description')), /disagrees with saved consent/);
  const fabricated = initial();
  fabricated.decisions[0].source = 'default';
  assert.throws(() => prepared(fabricated), /explicit user consent/);
  const missingReceipt = succeeded().journal;
  delete missingReceipt.operations[0].receipt;
  assert.throws(() => validatePublication(missingReceipt), /receipt.id/);
  const unsafeFilename = prepared(initial(), request('attachment')).journal;
  unsafeFilename.operations[0].filename = '../outside.md';
  assert.throws(() => validatePublication(unsafeFilename), /plain filename/);
});

test('description writes preserve the source, detect drift at preparation and immediately before dispatch', () => {
  const journal = initial();
  assert.throws(() => prepared(journal, request('description', { current_description: 'A teammate added an AC' })), /Live description changed/);
  const ready = prepared(journal, request('description'));
  assert.throws(() => updatePublication(ready.journal, 'begin', { operation_id: ready.result.operation.id, capabilities, current_description: 'Edited since preparation' }), /Live description changed/);
  const done = succeeded(journal, request('description')).journal;
  assert.equal(done.original_description, 'Original requirements');
  assert.equal(done.description_baseline, descriptionHash('Finalized requirements'));
  assert.equal(prepared(done, request('description', { content: 'Revised spec', current_description: 'Finalized requirements' })).result.action, 'ready');
  assert.equal(descriptionHash({ type: 'doc', version: 1 }), descriptionHash({ version: 1, type: 'doc' }));
});

test('reviewed drift reconciliation needs a user decision and retains the original snapshot', () => {
  assert.throws(() => updatePublication(initial(), 'baseline', { current_description: 'Teammate addition', decision: { source: 'default', text: 'Use latest' } }), /explicit user consent/);
  const reviewed = updatePublication(initial(), 'baseline', { current_description: 'Teammate addition', decision }).journal;
  assert.equal(reviewed.original_description, 'Original requirements');
  assert.equal(reviewed.description_reconciliations[0].description, 'Teammate addition');
  assert.equal(prepared(reviewed, request('description', { current_description: 'Teammate addition', content: 'Merged requirements' })).result.action, 'ready');
});

test('successful comments and attachments are not republished after resume; changed plan content is distinct', () => {
  for (const kind of ['comment', 'attachment', 'description']) {
    const input = request(kind);
    const done = JSON.parse(JSON.stringify(succeeded(initial(), input).journal));
    const repeated = prepared(done, { ...input, current_description: kind === 'description' ? input.content : input.current_description });
    assert.equal(repeated.result.action, 'skip');
    assert.equal(repeated.result.operation.receipt.id, 'remote-123');
    assert.equal(repeated.journal.operations.length, kind === 'description' ? 2 : 1);
  }
  const done = succeeded(initial(), request('attachment')).journal;
  const revision = prepared(done, request('attachment', { content: 'Updated plan', filename: 'DEMO-plan-v1-r2.md' }));
  assert.equal(revision.result.action, 'ready');
  assert.equal(revision.journal.operations.length, 2);
});

test('description deduplication follows the latest remote version and baseline changes invalidate drafts', () => {
  const versionA = request('description', { content: 'Spec A' });
  const first = succeeded(initial(), versionA).journal;
  const versionB = request('description', { content: 'Spec B', current_description: 'Spec A' });
  const second = succeeded(first, versionB).journal;
  assert.equal(prepared(second, { ...versionA, current_description: 'Spec B' }).result.action, 'ready');
  assert.throws(() => prepared(first, { ...versionA, current_description: 'A teammate added requirements' }), /Live description changed/);
  const reviewed = updatePublication(first, 'baseline', { current_description: 'Reviewed teammate addition', decision }).journal;
  assert.equal(prepared(reviewed, { ...versionA, current_description: 'Reviewed teammate addition' }).result.action, 'ready');
  const draft = prepared(initial(), versionA);
  const rebased = updatePublication(draft.journal, 'baseline', { current_description: 'Reviewed teammate addition', decision }).journal;
  assert.throws(() => updatePublication(rebased, 'begin', { operation_id: draft.result.operation.id, capabilities, current_description: 'Reviewed teammate addition' }), /Only a prepared/);
});

test('description dispatch requires a confirmed exact backup; ordinary comments cannot substitute', () => {
  const ready = prepared(initial(), request('description'));
  const begin = (journal) => updatePublication(journal, 'begin', { operation_id: ready.result.operation.id, capabilities, current_description: 'Original requirements' });
  assert.throws(() => begin(ready.journal), /Confirm the original-description backup/);
  const genericComment = succeeded(ready.journal, request('comment', { key: 'ordinary-comment', content: 'Original requirements' })).journal;
  assert.throws(() => begin(genericComment), /Confirm the original-description backup/);
  const confirmed = backedUp(genericComment);
  assert.equal(begin(confirmed).result.operation.status, 'in-flight');
  assert.equal(confirmed.original_description, 'Original requirements');
});

test('backup resume deduplicates by exact pre-update version; each changed version needs its own backup', () => {
  const first = backedUp();
  const repeated = updatePublication(JSON.parse(JSON.stringify(first)), 'prepare-backup', { current_description: 'Original requirements', capabilities });
  assert.equal(repeated.result.action, 'skip');
  assert.equal(repeated.journal.operations.length, 1);
  assert.match(repeated.result.operation.content, /^## Original description before refinement/);
  assert.ok(repeated.result.operation.content.endsWith('Original requirements'));
  const written = succeeded(first, request('description')).journal;
  // Retry of an already confirmed description is skipped without creating a backup of itself.
  assert.equal(prepared(written, request('description', { current_description: 'Finalized requirements' })).result.action, 'skip');
  const revised = prepared(written, request('description', { content: 'Second refinement', current_description: 'Finalized requirements' }));
  assert.throws(() => updatePublication(revised.journal, 'begin', { operation_id: revised.result.operation.id, capabilities, current_description: 'Finalized requirements' }), /Confirm the original-description backup/);
  const backed = backedUp(revised.journal, 'Finalized requirements');
  assert.equal(backed.operations.filter(op => op.backup_hash).length, 2);
  assert.equal(updatePublication(backed, 'begin', { operation_id: revised.result.operation.id, capabilities, current_description: 'Finalized requirements' }).result.operation.status, 'in-flight');
});

test('uncertain and failed backups leave descriptions unchanged and reuse existing reconciliation/retry rules', () => {
  const description = prepared(initial(), request('description'));
  const ready = updatePublication(description.journal, 'prepare-backup', { current_description: 'Original requirements', capabilities });
  const input = { operation_id: ready.result.operation.id, current_description: 'Original requirements', capabilities };
  assert.throws(() => updatePublication(ready.journal, 'begin', { operation_id: description.result.operation.id, current_description: 'Original requirements', capabilities }), /Confirm the original-description backup/);
  const started = updatePublication(ready.journal, 'begin', input);
  const unknown = updatePublication(started.journal, 'record', { operation_id: input.operation_id, status: 'unknown', evidence: 'Comment request timed out' }).journal;
  assert.throws(() => updatePublication(unknown, 'prepare-backup', { current_description: 'Original requirements', capabilities, retry: true }), /Reconcile unresolved/);
  assert.throws(() => updatePublication(unknown, 'begin', { operation_id: description.result.operation.id, current_description: 'Original requirements', capabilities }), /Confirm the original-description backup/);
  const found = updatePublication(unknown, 'reconcile', { operation_id: input.operation_id, status: 'succeeded', receipt: { id: 'found-backup' }, evidence: 'Read exact backup from the recorded ticket' }).journal;
  assert.equal(updatePublication(found, 'prepare-backup', { current_description: 'Original requirements', capabilities }).result.action, 'skip');
  assert.equal(updatePublication(found, 'begin', { operation_id: description.result.operation.id, current_description: 'Original requirements', capabilities }).result.operation.status, 'in-flight');
  const absent = updatePublication(unknown, 'reconcile', { operation_id: input.operation_id, status: 'not-applied', evidence: 'Connector audit confirms no comment applied' }).journal;
  assert.throws(() => updatePublication(absent, 'prepare-backup', { current_description: 'Original requirements', capabilities }), /explicit retry/);
  assert.equal(updatePublication(absent, 'prepare-backup', { current_description: 'Original requirements', capabilities, retry: true }).result.action, 'ready');
});

test('backup checks live drift, connector support and saved consent without expanding permissions', () => {
  const input = { current_description: 'Original requirements', capabilities };
  assert.throws(() => updatePublication(initial('comments'), 'prepare-backup', input), /outside saved consent/);
  const noComments = updatePublication(initial(), 'consent', { mode: 'updates', allowed: ['description'], decision }).journal;
  assert.throws(() => updatePublication(noComments, 'prepare-backup', input), /outside saved consent/);
  assert.throws(() => updatePublication(initial(), 'prepare-backup', { ...input, capabilities: { description: true } }), /lacks comment/);
  assert.throws(() => updatePublication(initial(), 'prepare-backup', { ...input, current_description: 'Teammate edits' }), /Live description changed/);
  const ready = updatePublication(initial(), 'prepare-backup', input);
  const beginInput = { operation_id: ready.result.operation.id, ...input };
  assert.throws(() => updatePublication(ready.journal, 'begin', { ...beginInput, current_description: 'Teammate edits' }), /Live description changed/);
  const revoked = updatePublication(ready.journal, 'consent', { mode: 'local', decision }).journal;
  assert.throws(() => updatePublication(revoked, 'begin', beginInput), /outside saved consent/);
  assert.throws(() => prepared(initial(), request('comment', { key: ready.result.operation.key, content: ready.result.operation.content })), /Use prepare-backup/);
  const changed = updatePublication(backedUp(), 'baseline', { current_description: 'Reviewed teammate edits', decision }).journal;
  const description = prepared(changed, request('description', { current_description: 'Reviewed teammate edits' }));
  assert.throws(() => updatePublication(description.journal, 'begin', { operation_id: description.result.operation.id, current_description: 'Reviewed teammate edits', capabilities }), /Confirm the original-description backup/);
});

test('empty descriptions need no backup; rich-text snapshots retain their complete structure', () => {
  for (const original_description of [null, '']) {
    const journal = initializePublication(source, { target, original_description, mode: 'updates', decision });
    assert.equal(updatePublication(journal, 'prepare-backup', { current_description: original_description, capabilities }).result.action, 'skip');
    const ready = prepared(journal, request('description', { current_description: original_description }));
    assert.equal(updatePublication(ready.journal, 'begin', { operation_id: ready.result.operation.id, current_description: original_description, capabilities }).result.operation.status, 'in-flight');
  }
  const original = { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Original AC', marks: [{ type: 'strong' }] }] }] };
  const journal = initializePublication(source, { target, original_description: original, mode: 'updates', decision });
  const confirmed = backedUp(journal, original);
  const op = confirmed.operations[0];
  assert.deepEqual(op.backup_description, original);
  assert.equal(op.backup_hash, descriptionHash(original));
  assert.deepEqual(JSON.parse(op.content.split('```json\n')[1].split('\n```')[0]), original);
  const reordered = { content: original.content, version: 1, type: 'doc' };
  assert.equal(updatePublication(confirmed, 'prepare-backup', { current_description: reordered, capabilities }).result.action, 'skip');
  const tampered = structuredClone(confirmed);
  tampered.operations[0].backup_description.content = [];
  assert.throws(() => validatePublication(tampered), /Invalid original-description backup/);
});

test('interrupted or ambiguous writes block retries until read-only reconciliation', () => {
  const started = begun();
  const id = started.result.operation.id;
  assert.throws(() => prepared(started.journal), /Reconcile unresolved/);
  assert.throws(() => prepared(started.journal, request('comment', { content: 'Changed payload' })), /Reconcile unresolved/);
  assert.throws(() => updatePublication(started.journal, 'begin', { operation_id: id, capabilities }), /Only a prepared/);
  const unknown = updatePublication(started.journal, 'record', { operation_id: id, status: 'unknown', evidence: 'Connector timed out' }).journal;
  assert.throws(() => prepared(unknown), /Reconcile unresolved/);
  const found = updatePublication(unknown, 'reconcile', { operation_id: id, status: 'succeeded', evidence: 'Read matching comment from the ticket', receipt: { id: 'comment-9' } }).journal;
  assert.equal(prepared(found).result.action, 'skip');
  assert.throws(() => updatePublication(found, 'record', { operation_id: id, status: 'failed', evidence: 'overwrite success' }), /not awaiting/);
});

test('confirmed failures require explicit retries and do not erase successful partial work', () => {
  const withComment = succeeded().journal;
  const started = begun(withComment, request('attachment'));
  const failed = updatePublication(started.journal, 'record', { operation_id: started.result.operation.id, status: 'failed', evidence: 'Attachment permission denied; no upload occurred' }).journal;
  assert.equal(prepared(failed).result.action, 'skip');
  assert.throws(() => prepared(failed, request('attachment')), /explicit retry/);
  assert.equal(prepared(failed, request('attachment', { retry: true })).result.action, 'ready');
  const unknown = begun().journal;
  const absent = updatePublication(unknown, 'reconcile', { operation_id: unknown.operations[0].id, status: 'not-applied', evidence: 'Authoritative connector audit confirms request never applied' }).journal;
  assert.throws(() => prepared(absent), /explicit retry/);
});

test('revoking permission invalidates prepared writes, but actual completed writes can still be recorded', () => {
  const ready = prepared();
  const revoked = updatePublication(ready.journal, 'consent', { mode: 'local', decision: { source: 'user', text: 'Stop updating the ticket' } }).journal;
  assert.throws(() => updatePublication(revoked, 'begin', { operation_id: ready.result.operation.id, capabilities }), /outside saved consent/);
  const restored = updatePublication(revoked, 'consent', { mode: 'updates', decision }).journal;
  assert.throws(() => updatePublication(restored, 'begin', { operation_id: ready.result.operation.id, capabilities }), /Consent changed/);
  const next = prepared(restored);
  assert.equal(next.journal.operations[0].status, 'cancelled');
  assert.notEqual(next.result.operation.id, ready.result.operation.id);
  const started = begun();
  const stopped = updatePublication(started.journal, 'consent', { mode: 'local', decision }).journal;
  assert.equal(updatePublication(stopped, 'record', { operation_id: started.result.operation.id, status: 'succeeded', receipt: { id: 'already-posted' }, evidence: 'Request was sent before revocation' }).journal.operations[0].status, 'succeeded');
});

test('superseded prepared content cannot be dispatched, and capability loss stops dispatch', () => {
  const first = prepared();
  const second = prepared(first.journal, request('comment', { content: 'New summary' }));
  assert.throws(() => updatePublication(second.journal, 'begin', { operation_id: first.result.operation.id, capabilities }), /Only a prepared/);
  assert.throws(() => updatePublication(second.journal, 'begin', { operation_id: second.result.operation.id, capabilities: {} }), /lacks comment/);
  const tampered = structuredClone(second.journal);
  tampered.operations[1].content = 'Unreviewed replacement';
  assert.throws(() => updatePublication(tampered, 'begin', { operation_id: second.result.operation.id, capabilities }), /hash does not match/);
});

async function fixture(t, { initialize = true } = {}) {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'ticket-publication-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const root = await realpath(temp);
  const directory = path.join(root, 'make-it-work/DEMO');
  await mkdir(directory, { recursive: true });
  const state = path.join(directory, 'DEMO-state.md');
  const original = await readFile(new URL('../../../evals/implement/feedback-clean/fixture/fixture-artifacts/DEMO-state.md', import.meta.url), 'utf8');
  await writeFile(state, original.replace(/^start_time: .*$/m, `start_time: ${source.workflow_start}`));
  const input = path.join(directory, 'publication-input.json');
  const options = { '--root': root, '--state': state, '--input': input };
  async function command(action, value) {
    if (value !== undefined) await writeFile(input, JSON.stringify(value));
    return publicationCommand({ ...options, action });
  }
  if (!initialize) return { root, state, input, command };
  const init = await command('init', { target, original_description: 'Original requirements', mode: 'updates', decision });
  await writeFile(state, (await readFile(state, 'utf8')).replace(/^ticket: DEMO$/m, `ticket: DEMO\nticket_publication: ${init.journal}`));
  return { root, state, input, init, command };
}
test('CLI hostname initialization persists the canonical target through resume and failed init leaves no journal', async (t) => {
  const f = await fixture(t, { initialize: false });
  const script = new URL('./ticket-publication.mjs', import.meta.url);
  const args = (action) => [script.pathname, action, '--root', f.root, '--state', f.state, '--input', f.input];
  const before = await readFile(f.state, 'utf8');
  await writeFile(f.input, JSON.stringify({ target: { ...target, site: 'example.atlassian.net/bad-path' }, original_description: null }));
  assert.throws(() => execFileSync(process.execPath, args('init'), { encoding: 'utf8', stdio: 'pipe' }),
    (error) => error.status === 1 && /ticket-publication: target\.site/.test(error.stderr));
  assert.equal(await readFile(f.state, 'utf8'), before);
  assert.deepEqual((await readdir(path.dirname(f.state))).sort(), ['DEMO-state.md', 'publication-input.json']);
  await writeFile(f.input, JSON.stringify({ target: { ...target, site: 'example.atlassian.net' },
    original_description: 'Original requirements', mode: 'updates', decision }));
  const init = JSON.parse(execFileSync(process.execPath, args('init'), { encoding: 'utf8' }));
  await writeFile(f.state, before.replace(/^ticket: DEMO$/m, 'ticket: DEMO\nticket_publication: ' + init.journal));
  const resumed = JSON.parse(execFileSync(process.execPath, args('status'), { encoding: 'utf8' }));
  assert.deepEqual(resumed.target, target);
  const ready = await f.command('prepare', request());
  const dispatch = await f.command('begin', { operation_id: ready.operation.id, capabilities });
  assert.deepEqual(dispatch.target, target);
});
test('disk journal survives CLI resume and stays bound to its original ticket and run', async (t) => {
  const f = await fixture(t);
  const ready = await f.command('prepare', request('attachment'));
  await f.command('begin', { operation_id: ready.operation.id, capabilities });
  await f.command('record', { operation_id: ready.operation.id, status: 'succeeded', receipt: { id: 'attachment-42' }, evidence: 'Upload response' });
  const script = new URL('./ticket-publication.mjs', import.meta.url);
  const cli = JSON.parse(execFileSync(process.execPath, [script.pathname, 'status', '--root', f.root, '--state', f.state], { encoding: 'utf8' }));
  assert.equal(cli.operations[0].receipt.id, 'attachment-42');
  assert.equal((await f.command('prepare', request('attachment'))).action, 'skip');
  await assert.rejects(f.command('init', { target, original_description: null }), /already has/);
  const original = await readFile(f.state, 'utf8');
  await writeFile(f.state, original.replace(/^start_time: .*$/m, 'start_time: 2026-10-23T10:00:00Z'));
  await assert.rejects(f.command('status'), /does not belong to this run/);
});

test('disk and CLI resume cannot dispatch a description until its backup receipt is persisted', async (t) => {
  const f = await fixture(t);
  const description = await f.command('prepare', request('description'));
  const beginDescription = { operation_id: description.operation.id, capabilities, current_description: 'Original requirements' };
  await assert.rejects(f.command('begin', beginDescription), /Confirm the original-description backup/);
  const backupInput = { capabilities, current_description: 'Original requirements' };
  await writeFile(f.input, JSON.stringify(backupInput));
  const script = new URL('./ticket-publication.mjs', import.meta.url);
  const backup = JSON.parse(execFileSync(process.execPath, [script.pathname, 'prepare-backup', '--root', f.root, '--state', f.state, '--input', f.input], { encoding: 'utf8' }));
  await f.command('begin', { ...backupInput, operation_id: backup.operation.id });
  await f.command('record', { operation_id: backup.operation.id, status: 'unknown', evidence: 'Lost response after comment request' });
  await assert.rejects(f.command('begin', beginDescription), /Confirm the original-description backup/);
  await f.command('reconcile', { operation_id: backup.operation.id, status: 'succeeded', evidence: 'Read the exact posted backup', receipt: { id: 'original-comment-1', url: `${target.url}#comment-1` } });
  assert.equal((await f.command('prepare-backup', backupInput)).action, 'skip');
  await f.command('begin', beginDescription);
  await f.command('record', { operation_id: description.operation.id, status: 'succeeded', evidence: 'Read back the updated description', receipt: { id: target.issue, description: 'Finalized requirements' } });
  assert.equal((await f.command('prepare', request('description', { current_description: 'Finalized requirements' }))).action, 'skip');
  const journal = await f.command('status');
  assert.equal(journal.original_description, 'Original requirements');
  assert.equal(journal.operations.length, 2);
  assert.equal(journal.operations.filter(op => op.backup_hash && op.status === 'succeeded').length, 1);
});

test('consent changes refresh an existing badge while legacy runs remain without a dashboard', async (t) => {
  const f = await fixture(t);
  const dashboard = path.join(f.root, 'make-it-work/DEMO/DEMO-status.html');
  await f.command('consent', { mode: 'comments', allowed: ['comment'], artifact_comments: true, decision });
  await assert.rejects(readFile(dashboard), /ENOENT/);
  await generateDashboard(f.state);
  assert.match(await readFile(dashboard, 'utf8'), /Ticket updates: Allowed/);
  await f.command('consent', { mode: 'local', decision: { source: 'user', text: 'Disable ticket updates' } });
  assert.match(await readFile(dashboard, 'utf8'), /Ticket updates: Off/);
  assert.equal((await f.command('status')).mode, 'local');
});

test('dashboard failure reports saved revocation without restoring write permission', async (t) => {
  const f = await fixture(t);
  const dashboard = path.join(f.root, 'make-it-work/DEMO/DEMO-status.html');
  await mkdir(dashboard); // Makes atomic replacement fail after the journal is saved.
  await assert.rejects(f.command('consent', { mode: 'local', decision }), /consent was saved, but dashboard refresh failed/);
  assert.equal((await f.command('status')).mode, 'local');
  assert.deepEqual((await f.command('status')).allowed, []);
});

test('unconfigured legacy runs fail closed and journal locks and paths protect saved decisions', async (t) => {
  const f = await fixture(t);
  const original = await readFile(f.state, 'utf8');
  await writeFile(f.state, original.replace(/^ticket_publication: .*\n/m, ''));
  await assert.rejects(f.command('prepare', request()), /writes are disabled/);
  await writeFile(f.state, original);
  const journalPath = path.join(f.root, f.init.journal);
  await writeFile(`${journalPath}.lock`, '');
  await assert.rejects(f.command('prepare', request()), /EEXIST/);
  assert.equal((await f.command('status')).operations.length, 0);
  await rm(`${journalPath}.lock`);
  const saved = await readFile(journalPath, 'utf8');
  await writeFile(path.join(f.root, 'outside.json'), saved);
  await rm(journalPath);
  await symlink(path.join(f.root, 'outside.json'), journalPath);
  await assert.rejects(f.command('status'), /symlink/);
});
