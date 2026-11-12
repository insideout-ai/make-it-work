import { readFile, realpath, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { runDirectory } from './artifact-layout.mjs';

export function deliveryPaths(root, ticket) {
  const base = path.join(runDirectory(root, ticket), `${ticket}-delivery`);
  return { plan: `${base}-plan.json`, preview: `${base}-plan.md`, journal: `${base}-progress.json`, lock: `${base}.lock` };
}

const statuses = new Set(['offered', 'awaiting-approval', 'running', 'partial', 'failed', 'delivered', 'declined']);
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const timestamp = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
export function publicUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function summarizeDelivery({ ticket, plan = null, progress = null, locked = false }) {
  if (plan && (plan.version !== 1 || plan.ticket !== ticket || !Array.isArray(plan.repos))) throw new Error('Delivery plan does not match this ticket.');
  if (progress && (progress.version !== 1 || (progress.ticket && progress.ticket !== ticket) || !object(progress.repos))) throw new Error('Invalid delivery progress.');
  if (progress?.plan_sha256 && plan && progress.plan_sha256 !== createHash('sha256').update(JSON.stringify(plan)).digest('hex')) throw new Error('Delivery progress belongs to another plan.');
  const names = plan ? plan.repos.map((repo) => repo.name) : progress?.expected_repos ?? [];
  if (!Array.isArray(names) || names.some((name) => typeof name !== 'string' || !name.trim()) || new Set(names).size !== names.length) throw new Error('Invalid delivery repo list.');
  const entries = progress?.repos ?? {};
  const repos = [...new Set([...names, ...Object.keys(entries)])].map((name) => {
    const item = entries[name] ?? {};
    if (!object(item)) throw new Error('Invalid repository delivery progress.');
    const config = plan?.repos.find((repo) => repo.name === name);
    const commit = typeof item.commit === 'string' && item.commit ? item.commit : null;
    const pushed = Boolean(commit && item.pushed === commit);
    const pr = publicUrl(item.pr?.url);
    const prRecorded = Boolean(pr || (object(item.pr) && (typeof item.pr.id === 'number' || (typeof item.pr.id === 'string' && item.pr.id.trim()))));
    const host = config?.provider === 'github' ? 'github.com' : config?.provider === 'bitbucket' ? 'bitbucket.org' : null;
    const commitUrl = commit && host && config.owner && config.repo
      ? `https://${host}/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/${host === 'github.com' ? 'commit' : 'commits'}/${encodeURIComponent(commit)}` : null;
    return { name, commit, commitUrl, pushed, pr, prRecorded, complete: Boolean(commit && pushed && prRecorded) };
  });
  const complete = names.length > 0 && names.every((name) => repos.find((repo) => repo.name === name)?.complete);
  const anyActions = repos.some((repo) => repo.commit || repo.pushed || repo.prRecorded);
  let status = progress?.status;
  if (status && !statuses.has(status)) throw new Error('Unknown delivery status.');
  if (status === 'delivered' && !complete) throw new Error('Delivered status has incomplete repository evidence.');
  if (!status) status = complete ? 'delivered' : locked ? 'running' : progress ? (anyActions ? 'partial' : 'unknown') : plan ? 'awaiting-approval' : 'not-started';
  return {
    status, repos, anyActions,
    activity: typeof progress?.activity === 'string' ? progress.activity : null,
    error: typeof progress?.error === 'string' ? progress.error : null,
    startedAt: timestamp(progress?.started_at),
    updatedAt: timestamp(progress?.updated_at),
    completedAt: timestamp(progress?.completed_at ?? progress?.stopped_at),
  };
}

async function optionalJson(file) {
  try {
    const actual = await realpath(file);
    if (path.dirname(actual) !== await realpath(path.dirname(file))) throw new Error('Delivery artifact leaves the run directory.');
    return JSON.parse(await readFile(actual, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function readDelivery(root, ticket) {
  const files = deliveryPaths(root, ticket);
  try {
    const [plan, progress, lock] = await Promise.all([
      optionalJson(files.plan), optionalJson(files.journal),
      stat(files.lock).then(() => true, (error) => { if (error.code === 'ENOENT') return false; throw error; }),
    ]);
    return summarizeDelivery({ ticket, plan, progress, locked: lock });
  } catch (error) {
    return { status: 'unknown', repos: [], anyActions: false, error: error.message };
  }
}
